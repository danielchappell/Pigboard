// Local request/expectation checks only. This does not validate provider behavior.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const executable = process.argv[2];
if (!executable || !executable.startsWith('/')) throw new Error('Supply absolute locked Bruno 4.2.1 executable path');
const fixtures = JSON.parse(await readFile(join(root, 'fixtures.json'), 'utf8'));
const temp = await mkdtemp(join(tmpdir(), 'pigboard-observations-'));
let requests = [], proxyRequests = 0, response;
const proxy = createServer((req, res) => { proxyRequests++; res.writeHead(502).end(); });
const server = createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  requests.push({ method: req.method, url: req.url, headers: req.headers, body });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response));
});
const listen = s => new Promise((r, reject) => { s.once('error', reject); s.listen(0, '127.0.0.1', r); });
const close = s => new Promise(r => s.close(r));
const run = (args, env) => new Promise((resolveRun, reject) => {
  const child = spawn(executable, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', d => { output += d; });
  child.stderr.on('data', d => { output += d; });
  const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('Local Bruno process exceeded 30 seconds')); }, 30000);
  child.on('error', e => { clearTimeout(timer); reject(e); });
  child.on('close', code => { clearTimeout(timer); resolveRun({ code, output }); });
});
const credentialText = '[pigboard-local-fixture]\naws_access_key_id = AKIDLOCALONLY\naws_secret_access_key = local-only-not-a-secret\n';
async function validateProfile(path) {
  if (await readFile(path, 'utf8') !== credentialText) throw new Error('LOCAL_PROFILE_INVALID');
}
const summary = [];
let completed = false;
try {
  await Promise.all([listen(server), listen(proxy)]);
  const port = server.address().port;
  const credentials = join(temp, 'credentials');
  const config = join(temp, 'config');
  await writeFile(credentials, credentialText, { mode: 0o600 });
  await writeFile(config, '[profile pigboard-local-fixture]\nregion = eu-north-1\n', { mode: 0o600 });
  // No inherited HOME, credentials, Node flags, proxy or PAC settings. Explicit files only.
  const cleanEnv = {
    PATH: process.env.PATH,
    AWS_SHARED_CREDENTIALS_FILE: credentials, AWS_CONFIG_FILE: config,
    AWS_EC2_METADATA_DISABLED: 'true', AWS_SDK_LOAD_CONFIG: '1',
    NO_COLOR: '1', PIGBOARD_JIRA_AUTHORIZATION: 'Basic local-only-dummy'
  };
  const version = await run(['--version'], cleanEnv);
  assert.equal(version.code, 0); assert.equal(version.output.trim(), '4.2.1');
  const base = {
    schema: 'pigboard-observation-binding/v1', mode: 'local_mock', observation: null,
    base: `http://127.0.0.1:${port}`, local_port: port, profile: 'pigboard-local-fixture',
    region: 'eu-north-1', issue_id: fixtures.issue_id, project_id: fixtures.project_id,
    issue_allowlist: [fixtures.issue_id], comment_id: fixtures.comment_id,
    table: 'pigboard-proof-local', key: { pk: { S: 'PROBE#1' } }, expected: fixtures
  };
  const issue = () => ({ id: fixtures.issue_id, fields: { project: { id: fixtures.project_id }, status: { id: fixtures.status_id } } });
  const good = {
    issue: issue(), reconcile: { issues: [issue()], isLast: true },
    comment: { id: fixtures.comment_id, author: { accountId: fixtures.actor_id }, updateAuthor: { accountId: fixtures.actor_id }, created: fixtures.created, updated: fixtures.updated,
      body: { version: 1, type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'json' }, content: [{ type: 'text', text: JSON.stringify(fixtures.record) }] }] } },
    pointer: { key: 'pigboard.work-context', value: fixtures.pointer }, dynamodb: { Item: fixtures.item }
  };
  const names = { issue: 'issue identity and stage', reconcile: 'complete reconciled issue', comment: 'exact comment transport', pointer: 'exact admission pointer', dynamodb: 'strong state observation' };
  const cases = Object.keys(good).map(selector => ({ id: `${selector}-pass`, selector }));
  const bad = (id, selector, mutate) => cases.push({ id, selector, mutate });
  bad('wrong-status', 'issue', d => { d.fields.status.id = 'wrong'; });
  bad('wrong-project', 'issue', d => { d.fields.project.id = 'wrong'; });
  bad('missing-issue', 'reconcile', d => { d.issues = []; });
  bad('extra-issue', 'reconcile', d => { d.issues.push(issue()); });
  bad('wrong-issue', 'reconcile', d => { d.issues[0].id = '99999'; });
  bad('wrong-actor', 'comment', d => { d.author.accountId = 'wrong'; });
  bad('edited-comment', 'comment', d => { d.updated = 'changed'; });
  bad('wrong-record', 'comment', d => { d.body.content[0].content[0].text = '{}'; });
  bad('malformed-record', 'comment', d => { d.body.content[0].content[0].text = 'not-json'; });
  bad('wrong-pointer', 'pointer', d => { d.value = {}; });
  bad('missing-item', 'dynamodb', d => { delete d.Item; });
  bad('wrong-item', 'dynamodb', d => { d.Item.revision.N = '2'; });
  for (const c of cases) {
    response = structuredClone(good[c.selector]);
    c.mutate?.(response);
    requests = [];
    if (c.selector === 'dynamodb') await validateProfile(credentials);
    const report = join(temp, c.id + '.json');
    const env = { ...cleanEnv, PIGBOARD_PROBE_BINDING: JSON.stringify({ ...base, observation: c.selector }) };
    // Intentionally hostile inherited proxy is neutralized by --noproxy.
    env.HTTP_PROXY = env.HTTPS_PROXY = `http://127.0.0.1:${proxy.address().port}`;
    const result = await run(['run', `${c.selector}.bru`, '--sandbox=safe', '--bail', '--noproxy', '--reporter-json', report], env);
    assert.equal(requests.length, 1, c.id + ': request count');
    const sent = requests[0];
    const paths = { issue: `/rest/api/3/issue/${fixtures.issue_id}?fields=status,project`, reconcile: '/rest/api/3/search/jql', comment: `/rest/api/3/issue/${fixtures.issue_id}/comment/${fixtures.comment_id}`, pointer: `/rest/api/3/issue/${fixtures.issue_id}/properties/pigboard.work-context`, dynamodb: '/' };
    assert.equal(sent.url, paths[c.selector]);
    assert.equal(sent.method, ['reconcile', 'dynamodb'].includes(c.selector) ? 'POST' : 'GET');
    if (c.selector === 'reconcile') assert.deepEqual(JSON.parse(sent.body), { jql: 'id = ' + fixtures.issue_id, reconcileIssues: [Number(fixtures.issue_id)], fields: ['status', 'project'], maxResults: 1 });
    if (c.selector === 'dynamodb') {
      assert.deepEqual(JSON.parse(sent.body), { TableName: base.table, Key: base.key, ConsistentRead: true });
      assert.equal(sent.headers['x-amz-target'], 'DynamoDB_20120810.GetItem');
      assert.match(sent.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIDLOCALONLY\/\d{8}\/eu-north-1\/dynamodb\/aws4_request,/);
    } else assert.equal(sent.headers.authorization, 'Basic local-only-dummy');
    const data = JSON.parse(await readFile(report, 'utf8'));
    const entries = data.flatMap(x => x.results || []);
    assert.equal(entries.length, 1, c.id + ': reported request count');
    const entry = entries[0];
    const checks = [...(entry.assertionResults || []), ...(entry.testResults || []), ...(entry.preRequestTestResults || []), ...(entry.postResponseTestResults || [])];
    assert.equal(checks.length, 1, c.id + ': check count');
    assert.equal(checks.some(c => c.isScriptError), false, c.id + ': engine error');
    assert.equal(checks[0].description || checks[0].name, names[c.selector], c.id + ': named check');
    assert.equal(checks[0].status, c.mutate ? 'fail' : 'pass', c.id);
    assert.equal(Boolean(entry.error), false, c.id + ': request/runtime error');
    assert.equal(Boolean(entry.preRequestScriptError || entry.postResponseScriptError || entry.testScriptError), false, c.id + ': script error');
    assert.equal(result.code, c.mutate ? 1 : 0, c.id + ': exit');
    summary.push({ case: c.id, request_count: 1, check_count: 1, expected: c.mutate ? 'named assertion failure' : 'pass', result: 'PASS' });
  }
  for (const [id, binding, error] of [
    ['missing-binding', undefined, 'PROBE_BINDING_REQUIRED'],
    ['unsafe-numeric-id', { ...base, observation: 'issue', issue_id: '99999999999999999', issue_allowlist: ['99999999999999999'] }, 'PROBE_ID_INVALID'],
    ['live-aws-disabled', { ...base, observation: 'dynamodb', mode: 'live', execution_authorized: true, approved_revision: 'fixture', identity_receipt: 'fixture', counter_receipt: 'fixture', base: 'https://scubapig.atlassian.net', site: 'https://scubapig.atlassian.net' }, 'PROBE_LIVE_AWS_DISABLED'],
    ['missing-expectation', { ...base, observation: 'issue', expected: {} }, 'PROBE_EXPECTATION_REQUIRED'],
    ['wrong-selector', { ...base, observation: 'pointer' }, 'PROBE_SELECTOR_MISMATCH'],
    ['bad-target', { ...base, observation: 'issue', base: 'https://example.invalid' }, 'PROBE_LOCAL_TARGET_INVALID'],
    ['live-not-authorized', { ...base, observation: 'issue', mode: 'live' }, 'PROBE_NOT_AUTHORIZED']
  ]) {
    requests = [];
    const env = { ...cleanEnv };
    if (binding) env.PIGBOARD_PROBE_BINDING = JSON.stringify(binding);
    const result = await run(['run', 'issue.bru', '--sandbox=safe', '--bail', '--noproxy', '--reporter-json', join(temp, id + '.json')], env);
    assert.notEqual(result.code, 0); assert.ok(result.output.includes(error), id + ': expected setup error');
    assert.equal(requests.length, 0, id + ': no request');
    summary.push({ case: id, request_count: 0, expected: error, result: 'PASS' });
  }
  for (const [id, file] of [['missing-profile', join(temp, 'absent')], ['malformed-profile', join(temp, 'bad')]]) {
    if (id === 'malformed-profile') await writeFile(file, '[wrong]\n', { mode: 0o600 });
    requests = [];
    await assert.rejects(validateProfile(file));
    assert.equal(requests.length, 0);
    summary.push({ case: id, request_count: 0, expected: 'profile rejected before CLI', result: 'PASS' });
  }
  assert.equal(proxyRequests, 0, 'proxy must receive no traffic');
  completed = true;
  console.log(JSON.stringify({ scope: 'localhost request serialization and assertion checks only', bruno: '4.2.1', provider_requests: 0, proxy_requests: proxyRequests, cases: summary }, null, 2));
} finally {
  await Promise.all([close(server), close(proxy)]);
  if (completed) await rm(temp, { recursive: true, force: true });
  else console.error('Local failure evidence retained privately at ' + temp);
}
