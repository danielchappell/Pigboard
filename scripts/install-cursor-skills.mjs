#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readlink, realpath, rename, rm, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare } from './prepare-pigboard-skills.mjs';

const bundle = JSON.parse(await readFile(new URL('../config/skill-bundle.json', import.meta.url)));
const inside = (root, candidate) => candidate === root || candidate.startsWith(root + path.sep);
async function statIfPresent(file) {
  try { return await lstat(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
async function canonical(file) {
  try { return await realpath(file); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const parent = path.dirname(file);
    if (parent === file) throw e;
    return path.join(await canonical(parent), path.basename(file));
  }
}
async function checkRoot(root, app) {
  if ((await statIfPresent(root))?.isSymbolicLink()) throw new Error('Install root must not be a symlink.');
  const resolved = await canonical(root);
  const application = await realpath(app);
  if (inside(application, resolved) || inside(resolved, application)) throw new Error('Install root and application must be separate.');
  for (let dir = resolved;; dir = path.dirname(dir)) {
    if (await statIfPresent(path.join(dir, '.git'))) throw new Error('Install root must be outside Git checkouts.');
    if (path.dirname(dir) === dir) break;
  }
  const stable = path.join(resolved, 'skills');
  const existing = await statIfPresent(stable);
  if (existing) {
    if (!existing.isSymbolicLink()) throw new Error('Refusing to replace an unmanaged skills destination.');
    const target = path.resolve(resolved, await readlink(stable));
    const release = path.dirname(target);
    if (path.basename(target) !== 'skills' || path.dirname(release) !== path.join(resolved, 'releases') ||
        await realpath(target) !== target || !(await statIfPresent(path.join(release, 'manifest.json')))?.isFile()) {
      throw new Error('Refusing to replace an unmanaged skills link.');
    }
  }
  return resolved;
}

export async function verifyRelease(receipt) {
  const manifest = JSON.parse(await readFile(receipt.manifest));
  if (manifest.commit !== receipt.commit || JSON.stringify(manifest.bundle) !== JSON.stringify(bundle)) throw new Error('Release manifest mismatch.');
  for (const name of bundle.skills) {
    if (!manifest.sourceFiles[`${name}/SKILL.md`]) throw new Error(`Missing entrypoint: ${name}`);
  }
  for (const [relative, hash] of Object.entries(manifest.sourceFiles)) {
    const file = path.resolve(receipt.skills, relative);
    if (!inside(receipt.skills, file) || !(await lstat(file)).isFile() || await realpath(file) !== file) throw new Error('Invalid release source path.');
    if (createHash('sha256').update(await readFile(file)).digest('hex') !== hash) throw new Error('Release source hash mismatch.');
  }
  for (const dir of bundle.dependencyDirectories) {
    const base = path.join(receipt.skills, dir);
    const declared = JSON.parse(await readFile(path.join(base, 'package.json'))).dependencies;
    for (const [name, version] of Object.entries(declared)) {
      const installed = JSON.parse(await readFile(path.join(base, 'node_modules', name, 'package.json')));
      if (installed.version !== version) throw new Error(`Dependency version mismatch: ${name}`);
    }
  }
  const database = createRequire(path.join(receipt.skills, 'qa-database/scripts/package.json'))('pg');
  if (typeof database.Client !== 'function') throw new Error('Database helper cannot load pg.Client.');
  const cliRoot = path.join(receipt.skills, 'qa-bruno/scripts/node_modules/@usebruno/cli');
  const cli = JSON.parse(await readFile(path.join(cliRoot, 'package.json')));
  try {
    const version = execFileSync(process.execPath, [path.join(cliRoot, cli.bin.bru), '--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }).trim();
    if (version !== cli.version) throw new Error('Unexpected Bruno version.');
  } catch { throw new Error('Bruno executable smoke check failed.'); }
  return { entrypoints: bundle.skills.length, sourceFiles: Object.keys(manifest.sourceFiles).length, dependencies: 'verified', smokeChecks: ['pg.Client', 'bru --version'] };
}

export async function installCursorSkills({ source, ref, app, root = '/opt/pigboard' }, install) {
  if (![source, ref, app, root].every(v => typeof v === 'string' && v.length)) throw new Error('Required: --source --ref --app; optional --root.');
  root = await checkRoot(path.resolve(root), app);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const receipt = await prepare({ source, ref, app, cache: path.join(root, 'releases') }, install);
  const verification = await verifyRelease(receipt);
  const temporary = path.join(root, `.skills-${randomUUID()}`);
  try {
    await checkRoot(root, app);
    await symlink(receipt.skills, temporary);
    await rename(temporary, path.join(root, 'skills'));
  } finally { await rm(temporary, { force: true }); }
  return { ...receipt, stableSkills: path.join(root, 'skills'), verification };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--source', '--ref', '--app', '--root'].includes(args[i]) || !args[i + 1] || options[args[i].slice(2)]) throw new Error('Usage: install-cursor-skills.mjs --source URL --ref REF --app DIR [--root DIR]');
      options[args[i].slice(2)] = args[i + 1];
    }
    console.log(JSON.stringify(await installCursorSkills(options)));
  } catch (e) { console.error(`Pigboard environment blocked: ${e.message}`); process.exitCode = 1; }
}
