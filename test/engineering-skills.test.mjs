import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { prepare } from '../scripts/prepare-pigboard-skills.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = JSON.parse(await readFile(path.join(root, 'config/skill-bundle.json')));
const methods = ['engineering-principles', 'investigate-codebase', 'design-change',
  'planner', 'diagnose-problem', 'verify-change'];
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'pgb-engineering-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = path.join(temporary, 'source'), app = path.join(temporary, 'app');
  await mkdir(source); await mkdir(app);
  for (const name of bundle.skills) {
    await cp(path.join(root, 'skills', name), path.join(source, 'skills', name), { recursive: true });
  }
  for (const file of bundle.validatorPayload.sources) {
    await mkdir(path.dirname(path.join(source, file)), { recursive: true });
    await cp(path.join(root, file), path.join(source, file));
  }
  git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.name', 'Fixture');
  git(source, 'config', 'user.email', 'fixture@example.invalid');
  git(source, 'add', '.'); git(source, 'commit', '-m', 'actual source skills');
  return { source, app, cache: path.join(temporary, 'cache'), ref: 'main' };
}

// Packaging evidence only. These checks do not measure an agent's decisions.
test('prepared engineering methods retain source, new-method closure and direct integration links', async t => {
  const input = await fixture(t);
  const installed = await prepare(input, async directory => mkdir(directory, { recursive: true }));
  const receipt = JSON.parse(await readFile(installed.manifest));
  const visited = new Set();
  const changed = new Set([...methods.map(name => `${name}/SKILL.md`),
    'planner/references/plan.md', 'implementer-job/SKILL.md', 'pr-review/SKILL.md',
    'implementer-entrypoint/references/plan-review.md']);
  async function inspect(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const bytes = await readFile(file), text = bytes.toString('utf8');
    const relative = path.relative(installed.skills, file);
    assert.equal(hash(bytes), receipt.sourceFiles[relative], relative);
    if (path.basename(file) === 'SKILL.md') {
      const frontmatter = /^---\n([\s\S]+?)\n---\n/.exec(text);
      assert(frontmatter, relative);
      const metadata = parse(frontmatter[1]);
      assert.equal(metadata.name, path.basename(path.dirname(file)));
      assert.equal(typeof metadata.description, 'string');
      assert(metadata.description.trim().length > 0);
    }
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      if (/^[a-z]+:/i.test(match[1])) continue;
      const [target, anchor] = match[1].split('#');
      const resolved = target ? path.resolve(path.dirname(file), target) : file;
      const inside = path.relative(installed.skills, resolved);
      assert(!inside.startsWith('..') && !path.isAbsolute(inside), match[1]);
      const content = await readFile(resolved, 'utf8');
      if (anchor) {
        const headings = content.split('\n').filter(line => /^#+ /.test(line)).map(line =>
          line.replace(/^#+ /, '').toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-'));
        assert(headings.includes(anchor), match[1]);
      }
      // Follow all new/changed instructions. Existing reference internals belong
      // to their own contract checks; do not claim a full legacy-bundle link audit.
      if (changed.has(path.relative(installed.skills, resolved))) await inspect(resolved);
    }
  }
  for (const name of methods) {
    assert(bundle.skills.includes(name));
    await inspect(path.join(installed.skills, name, 'SKILL.md'));
  }
  await inspect(path.join(installed.skills, 'implementer-job/SKILL.md'));
  await inspect(path.join(installed.skills, 'pr-review/SKILL.md'));
  assert.equal((await readdir(input.app)).length, 0);
  assert(visited.has(path.join(installed.skills, 'planner/references/plan.md')));
});

test('a missing required engineering method cannot publish a prepared bundle', async t => {
  const input = await fixture(t);
  await rm(path.join(input.source, 'skills/investigate-codebase'), { recursive: true });
  git(input.source, 'add', '-A'); git(input.source, 'commit', '-m', 'incomplete bundle');
  await assert.rejects(prepare(input, async () => {}));
  assert.deepEqual(await readdir(input.cache), []);
  assert.deepEqual(await readdir(input.app), []);
});
