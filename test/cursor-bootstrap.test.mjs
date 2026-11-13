import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../config/cursor/environment-install.sh', import.meta.url));
const revision = '1'.repeat(40);
test('deploy-key bootstrap isolates credentials and cleans up on success and failed fetch', async t => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'pigboard-bootstrap-test-'));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const bin = path.join(tmp, 'bin'), app = path.join(tmp, 'app'), evidence = path.join(tmp, 'evidence');
  await mkdir(bin); await mkdir(app);
  const probe = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
if (process.env.PIGBOARD_DEPLOY_KEY || process.env.PIGBOARD_KEY_MATERIAL) throw Error('raw key inherited');
const name = path.basename(process.argv[1]);
const args = process.argv.slice(2);
if (name === 'git' && args.includes('fetch')) {
  const root = args[1];
  const key = path.join(root, 'deploy-key');
  fs.appendFileSync(process.env.EVIDENCE, JSON.stringify({root, source:args.at(-2), mode:fs.statSync(key).mode & 0o777, ssh:process.env.GIT_SSH_COMMAND, hosts:fs.readFileSync(path.join(root,'known_hosts'),'utf8')})+'\\n');
  if(process.env.FAIL_FETCH) process.exit(1);
}
if (name === 'git' && args.includes('rev-parse')) console.log(args.includes('HEAD') ? process.env.PIGBOARD_REVISION : process.env.PIGBOARD_APP);
if (name === 'node' && args[0]?.endsWith('/install-cursor-skills.mjs')) fs.appendFileSync(process.env.EVIDENCE, JSON.stringify({installed:true,args})+'\\n');
if (name === 'node' && args[0]?.endsWith('/install-cursor-agents.mjs')) fs.appendFileSync(process.env.EVIDENCE, JSON.stringify({agents:true,args})+'\\n');
`;
  for (const name of ['git', 'node', 'sudo']) {
    await writeFile(path.join(bin, name), probe); await chmod(path.join(bin, name), 0o755);
  }
  const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH,
    PIGBOARD_REVISION: revision, PIGBOARD_APP: app, PIGBOARD_DEPLOY_KEY: 'fixture-private-key', EVIDENCE: evidence };
  for (const fail of [false, true]) {
    await writeFile(evidence, '');
    if (fail) assert.throws(() => execFileSync('bash', [script], { env: { ...env, FAIL_FETCH: '1' }, stdio: 'pipe' }), /cannot fetch/);
    else execFileSync('bash', [script], { env, stdio: 'pipe' });
    const records = (await readFile(evidence, 'utf8')).trim().split('\n').map(JSON.parse);
    const auth = records[0];
    assert.equal(auth.mode, 0o600);
    assert.equal(auth.source, 'ssh://git@ssh.github.com:443/danielchappell/Pigboard.git');
    assert.match(auth.hosts, /^\[ssh.github.com\]:443 ssh-ed25519 /);
    for (const setting of ['BatchMode=yes', 'IdentitiesOnly=yes', 'IdentityAgent=none', 'StrictHostKeyChecking=yes', 'HostKeyAlgorithms=ssh-ed25519']) assert.ok(auth.ssh.includes(setting));
    assert.equal(records.length, fail ? 1 : 3);
    if (!fail) {
      assert.ok(records[1].args.includes(auth.source));
      assert.equal(records[2].agents,true);
      assert.deepEqual(records[2].args.slice(1),['--app',app]);
    }
    await assert.rejects(stat(auth.root), { code: 'ENOENT' });
  }
});
