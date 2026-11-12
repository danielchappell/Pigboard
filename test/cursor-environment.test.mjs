import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installCursorSkills } from '../scripts/install-cursor-skills.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
const bundle = JSON.parse(await readFile(new URL('../config/skill-bundle.json', import.meta.url)));
async function fixture(t) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'pigboard-env-'));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const source = path.join(tmp, 'source'), app = path.join(tmp, 'app'), root = path.join(tmp, 'installed');
  await mkdir(source); await mkdir(app);
  git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  for (const name of bundle.skills) await cp(new URL(`../skills/${name}`, import.meta.url), path.join(source, 'skills', name), { recursive: true, filter: file => !file.includes('node_modules') });
  git(source, 'add', '.'); git(source, 'commit', '-m', 'fixture');
  return { source, app, root, ref: 'main' };
}
async function fakeInstall(dir) {
  const declared = JSON.parse(await readFile(path.join(dir, 'package.json'))).dependencies;
  for (const [name, version] of Object.entries(declared)) {
    const module = path.join(dir, 'node_modules', name);
    await mkdir(module, { recursive: true });
    await writeFile(path.join(module, 'package.json'), JSON.stringify({ name, version, main: 'index.cjs', bin: { bru: 'cli.cjs' } }));
    await writeFile(path.join(module, 'index.cjs'), 'exports.Client = class Client {};');
    await writeFile(path.join(module, 'cli.cjs'), `console.log(${JSON.stringify(version)});`);
  }
}
test('install and refresh expose verified skills without changing app or older release', async t => {
  const o = await fixture(t);
  const first = await installCursorSkills(o, fakeInstall);
  assert.equal(await realpath(first.stableSkills), first.skills);
  assert.equal(first.verification.entrypoints, 10);
  const previous = await readFile(path.join(first.skills, 'qa-api/SKILL.md'), 'utf8');
  await writeFile(path.join(o.source, 'skills/qa-api/SKILL.md'), previous + '\nUpdated fixture.\n');
  git(o.source, 'add', '.'); git(o.source, 'commit', '-m', 'refresh');
  const next = await installCursorSkills(o, fakeInstall);
  assert.notEqual(first.commit, next.commit);
  assert.equal(await realpath(first.stableSkills), next.skills);
  assert.equal(await readFile(path.join(first.skills, 'qa-api/SKILL.md'), 'utf8'), previous);
  assert.deepEqual(await readdir(o.app), []);
});
test('failed fetch, dependency smoke check and changed source preserve previous binding', async t => {
  const o = await fixture(t);
  const first = await installCursorSkills(o, fakeInstall);
  await assert.rejects(installCursorSkills({ ...o, ref: 'missing' }, fakeInstall));
  await assert.rejects(installCursorSkills(o, async dir => {
    await fakeInstall(dir);
    if (dir.includes('qa-bruno')) await writeFile(path.join(dir, 'node_modules/@usebruno/cli/cli.cjs'), 'process.exit(1);');
  }), /smoke check/);
  await assert.rejects(installCursorSkills(o, async dir => {
    await fakeInstall(dir);
    await writeFile(path.join(dir, '../SKILL.md'), 'unexpected modification');
  }), /hash mismatch/);
  assert.equal(await realpath(first.stableSkills), first.skills);
  assert.deepEqual((await readdir(o.root)).sort(), ['releases', 'skills']);
});
test('unsafe roots and unmanaged destinations are rejected before preparation', async t => {
  const o = await fixture(t);
  await assert.rejects(installCursorSkills({ ...o, root: path.join(o.app, 'unsafe') }, fakeInstall), /separate/);
  await assert.rejects(installCursorSkills({ ...o, root: path.dirname(o.app) }, fakeInstall), /separate/);
  await assert.rejects(installCursorSkills({ ...o, root: path.join(o.source, 'unsafe') }, fakeInstall), /Git checkout/);
  await symlink(o.app, o.root);
  await assert.rejects(installCursorSkills(o, fakeInstall), /symlink/);
  await rm(o.root); await mkdir(o.root); await mkdir(path.join(o.root, 'skills'));
  await assert.rejects(installCursorSkills(o, fakeInstall), /unmanaged/);
  await rm(path.join(o.root, 'skills'), { recursive: true });
  await symlink(o.app, path.join(o.root, 'skills'));
  await assert.rejects(installCursorSkills(o, fakeInstall), /unmanaged/);
  assert.deepEqual(await readdir(o.root), ['skills']);
});
