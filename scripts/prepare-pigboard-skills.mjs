#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const bundle = JSON.parse(await readFile(new URL('../config/skill-bundle.json', import.meta.url), 'utf8'));
const digest = value => createHash('sha256').update(value).digest('hex');
const inside = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
};
function command(executable, args, cwd) {
  try { return execFileSync(executable, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }).trim(); }
  catch { throw new Error(`${executable} failed during preparation; check access, ref and dependencies. No release selected.`); }
}
async function canonical(p) {
  const absolute = path.resolve(p);
  try { return await realpath(absolute); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const parent = path.dirname(absolute);
    if (parent === absolute) throw e;
    return path.join(await canonical(parent), path.basename(absolute));
  }
}
async function outsideGit(p) {
  for (let current = p;; current = path.dirname(current)) {
    try { await lstat(path.join(current, '.git')); throw new Error('Cache must be outside every Git checkout.'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (path.dirname(current) === current) return;
  }
}
async function files(root, prefix = '') {
  const result = {};
  for (const name of (await readdir(path.join(root, prefix))).sort()) {
    const relative = path.join(prefix, name);
    const stat = await lstat(path.join(root, relative));
    if (stat.isSymbolicLink()) throw new Error('Skill source contains a symlink.');
    if (stat.isDirectory()) Object.assign(result, await files(root, relative));
    else if (stat.isFile()) result[relative] = digest(await readFile(path.join(root, relative)));
    else throw new Error('Unsupported skill file type.');
  }
  return result;
}

export async function prepare({ source, ref, cache, app }, install = dir => command('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], dir)) {
  if (![source, ref, cache, app].every(v => typeof v === 'string' && v.length)) throw new Error('Required: --source --ref --cache --app');
  if (source.startsWith('-') || ref.startsWith('-') || /[\r\n]/.test(source + ref)) throw new Error('Invalid source or ref.');
  if (/^https?:/.test(source)) {
    const url = new URL(source);
    if (url.username || url.password || url.search || url.hash) throw new Error('Use prepared Git authentication, not credentials in the URL.');
  }
  const application = await realpath(app);
  const root = await canonical(cache);
  if (inside(application, root) || inside(root, application)) throw new Error('Cache and application must be separate directories.');
  await outsideGit(root);
  await mkdir(root, { recursive: true, mode: 0o700 });
  if (await realpath(root) !== root) throw new Error('Cache path changed during preparation.');
  const staging = await mkdtemp(path.join(root, '.prepare-'));
  try {
    const checkout = path.join(staging, 'source');
    await mkdir(checkout);
    command('git', ['init', '--quiet'], checkout);
    command('git', ['-c', 'protocol.file.allow=always', 'fetch', '--quiet', '--depth=1', '--', source, ref], checkout);
    const commit = command('git', ['rev-parse', 'FETCH_HEAD^{commit}'], checkout);
    command('git', ['checkout', '--quiet', '--detach', commit], checkout);
    const sourceRoot = path.join(checkout, 'skills');
    if (!(await lstat(sourceRoot)).isDirectory() || await realpath(sourceRoot) !== sourceRoot) throw new Error('Skill root must be a real directory, not a symlink.');
    const output = path.join(staging, 'release');
    const skillRoot = path.join(output, 'skills');
    await mkdir(skillRoot, { recursive: true });
    for (const name of bundle.skills) {
      const origin = path.join(checkout, 'skills', name);
      if (!(await lstat(origin)).isDirectory()) throw new Error(`Missing skill directory: ${name}`);
      await files(origin);
      if (!(await lstat(path.join(origin, 'SKILL.md'))).isFile()) throw new Error(`Missing SKILL.md: ${name}`);
      await cp(origin, path.join(skillRoot, name), { recursive: true, dereference: false });
    }
    const sourceFiles = await files(skillRoot);
    for (const dependency of bundle.dependencyDirectories) await install(path.join(skillRoot, dependency));
    const manifest = { schemaVersion: 1, commit, bundle, sourceFiles, platform: process.platform, arch: process.arch, node: process.versions.node };
    const releaseId = `${commit}-${digest(JSON.stringify(manifest)).slice(0,16)}-${randomUUID()}`;
    // Separate immutable installations avoid trusting or changing a previous run's files.
    const destination = path.join(root, releaseId);
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await rename(output, destination);
    return { commit, release: destination, skills: path.join(destination, 'skills'), manifest: path.join(destination, 'manifest.json') };
  } finally { await rm(staging, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--source', '--ref', '--cache', '--app'].includes(args[i]) || !args[i+1] || options[args[i].slice(2)]) throw new Error('Usage: prepare-pigboard-skills.mjs --source URL --ref REF --cache DIR --app DIR');
      options[args[i].slice(2)] = args[i+1];
    }
    console.log(JSON.stringify(await prepare(options)));
  } catch (e) { console.error(`Pigboard setup blocked: ${e.message}`); process.exitCode = 1; }
}
