import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { control } from '../evals/reuse-parser/control.mjs';
import { compare } from '../lib/evaluation/compare.mjs';
import { bindPacket, digest, digestValue, parse, validate } from '../lib/evaluation/contracts.mjs';
import { load, prepare, record } from '../lib/evaluation/store.mjs';

const cli = fileURLToPath(new URL('../scripts/evaluate-skills.mjs', import.meta.url));
let temporary, seed, loaded;
before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'pgb-evaluation-tests-'));
  seed = await control(path.join(temporary, 'control'));
  loaded = await load(seed.store);
});
after(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });
const copy = value => structuredClone(value);
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 30000 });
function pair() { return { campaign: copy(loaded.campaign), packets: copy(loaded.packets) }; }
function packetBy(packets, arm) { return packets.find(p => p.arm === arm); }
function green(packet) {
  packet.author_verification.result = 'PASS';
  packet.assertions.forEach(a => { a.result = 'PASS'; });
}
async function emptyStore(t) {
  const root = await mkdtemp(path.join(temporary, 'case-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = path.join(root, 'store');
  await prepare(path.join(seed.output, 'campaign-input.json'), store);
  return { root, store };
}
async function packetCopy(root, arm = 'candidate') {
  const target = path.join(root, 'packet');
  await cp(path.dirname(seed.packets[arm]), target, { recursive: true });
  const file = path.join(target, 'packet.json');
  return { file, value: JSON.parse(await readFile(file)), root: target };
}

test('real CLI/library control detects the defect, records source and replays a complete report', async () => {
  const report = compare(loaded.campaign, loaded.packets);
  assert.equal(report.kind, 'synthetic_control');
  assert.equal(report.direction, 'PROMISING');
  assert.equal(report.qualification, 'PASS');
  assert.equal(report.planned_attempts, 2);
  assert.equal(report.recorded_attempts, 2);
  const baseline = report.pairs[0].baseline, candidate = report.pairs[0].candidate;
  assert(baseline.failures.includes('ASSERTION:library_delimiter'));
  assert(baseline.failures.includes('ASSERTION:cli_delimiter'));
  assert.equal(candidate.success, true);
  assert(candidate.evidence.some(e => e.id === 'parser_mjs'));
  const first = run('compare', seed.store), second = run('compare', seed.store);
  assert.equal(first.status, 0, first.stdout);
  assert.equal(first.stdout, second.stdout);
  assert.match(JSON.parse(first.stdout).interpretation, /no model performance/);
});

test('campaign and packet contracts reject unsafe, ambiguous and incomplete identities', () => {
  const c = loaded.campaign, p = loaded.packets[0];
  for (const change of [
    x => { x.extra = true; },
    x => { x.cases.push(copy(x.cases[0])); },
    x => { x.cases[0].min_successes = 2; },
    x => { x.candidate.digest = x.baseline.digest; },
    x => { x.cases[0].assertions.push(copy(x.cases[0].assertions[0])); },
  ]) { const next = copy(c); change(next); assert.throws(() => validate(next, 'campaign')); }
  for (const change of [
    x => { x.binding.profile = digest('different'); },
    x => { x.case = 'not_scheduled'; },
    x => { x.repetition = 2; },
    x => { x.assertions.pop(); },
    x => { x.assertions[0].evidence = ['unknown']; },
    x => { x.evidence[0].path = '../outside'; },
    x => { x.evidence[0].path = '/absolute'; },
    x => { x.evidence[0].path = 'a//b'; },
    x => { x.metrics.tokens = 9007199254740992; },
  ]) { const next = copy(p); change(next); assert.throws(() => bindPacket(c, next)); }
  const raw = JSON.stringify(c);
  assert.throws(() => parse(Buffer.from(raw.slice(0, -1) + ',"kind":"model"}'), 'campaign'));
  assert.throws(() => parse(Buffer.from([0xff]), 'campaign'));
  assert.throws(() => parse(Buffer.alloc(262145, 32), 'campaign'));
});

test('record refuses duplicate slots/run IDs and leaves accepted attempts unchanged', async t => {
  const { root, store } = await emptyStore(t);
  const original = await record(store, seed.packets.candidate);
  const before = await readFile(path.join(original.directory, 'packet.json'));
  await assert.rejects(record(store, seed.packets.candidate), { code: 'DUPLICATE' });
  const copied = await packetCopy(root, 'baseline');
  copied.value.run_id = JSON.parse(before).run_id;
  await writeFile(copied.file, JSON.stringify(copied.value));
  await assert.rejects(record(store, copied.file), { code: 'DUPLICATE' });
  assert.deepEqual(await readFile(path.join(original.directory, 'packet.json')), before);
  assert.equal((await readdir(path.join(store, 'runs'))).length, 1);
});

test('record rejects changed evidence, symlinks and outside paths without partial publication', async t => {
  for (const kind of ['changed', 'link', 'parent-link', 'outside', 'directory']) {
    const { root, store } = await emptyStore(t), p = await packetCopy(root);
    const evidence = path.join(p.root, p.value.evidence[0].path);
    if (kind === 'changed') await writeFile(evidence, 'altered');
    if (kind === 'link') { await rm(evidence); await symlink(path.join(seed.output, 'report.json'), evidence); }
    if (kind === 'parent-link') {
      await symlink(path.dirname(seed.packets.candidate), path.join(p.root, 'linked'));
      p.value.evidence[0].path = 'linked/' + p.value.evidence[0].path;
    }
    if (kind === 'outside') p.value.evidence[0].path = '../report.json';
    if (kind === 'directory') { await rm(evidence); await mkdir(evidence); }
    await writeFile(p.file, JSON.stringify(p.value));
    await assert.rejects(record(store, p.file), { code: 'EVIDENCE' });
    assert.deepEqual(await readdir(path.join(store, 'runs')), []);
    assert(!(await readdir(store)).some(name => name.startsWith('.record-')));
  }
});

test('campaign/packet/evidence drift is an integrity failure and repeat prepare never overwrites', async t => {
  for (const kind of ['campaign', 'packet', 'evidence']) {
    const root = await mkdtemp(path.join(temporary, 'drift-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const store = path.join(root, 'copy'); await cp(seed.store, store, { recursive: true });
    const attempt = path.join(store, 'runs', 'reuse_parser--1--candidate');
    const target = kind === 'campaign' ? path.join(store, 'campaign.json') :
      kind === 'packet' ? path.join(attempt, 'packet.json') : path.join(attempt, 'evidence/grade');
    await writeFile(target, '{}');
    await assert.rejects(load(store), { code: 'INTEGRITY' });
    assert.equal(run('compare', store).status, 2);
    await assert.rejects(prepare(path.join(seed.output, 'campaign-input.json'), store), { code: 'DUPLICATE' });
  }
});

test('missing attempts and incomplete observations retain the planned denominator', () => {
  const { campaign, packets } = pair();
  let report = compare(campaign, []);
  assert.equal(report.direction, 'INCOMPLETE');
  assert.equal(report.qualification, 'INCOMPLETE');
  assert.equal(report.planned_attempts, 2); assert.equal(report.recorded_attempts, 0);
  assert.equal(report.missing.length, 2);
  const candidate = packetBy(packets, 'candidate');
  candidate.host = null; candidate.graders = []; candidate.metrics.tokens = null;
  candidate.author_verification.result = 'NOT_APPLICABLE';
  report = compare(campaign, packets);
  assert.equal(report.qualification, 'INCOMPLETE'); assert.equal(report.gate, 'FAIL');
  assert.equal(report.direction, 'INCOMPLETE');
  assert(report.gaps.some(g => g.reason === 'AUTHOR_VERIFICATION_MISSING'));
  assert(report.gaps.some(g => g.reason === 'INDEPENDENT_GRADING_MISSING'));
  assert.equal(report.totals.candidate.missing_costs, 1);
});

test('equal hard failures cannot pass or hide behind unchanged comparison direction', () => {
  const { campaign, packets } = pair();
  campaign.cases[0].assertions[0].kind = 'integrity';
  for (const p of packets) { green(p); p.assertions[0].result = 'FAIL'; }
  const report = compare(campaign, packets);
  assert.equal(report.direction, 'NO_MEASURED_CHANGE');
  assert.equal(report.qualification, 'FAIL'); assert.equal(report.gate, 'FAIL');
  assert(report.blocking.some(b => b.reason.startsWith('HARD_FAILURE:')));
});

test('known regression remains visible alongside missing evidence and quality tradeoffs', () => {
  const { campaign, packets } = pair();
  packets.forEach(green);
  const baseline = packetBy(packets, 'baseline'), candidate = packetBy(packets, 'candidate');
  candidate.assertions[0].result = 'FAIL';
  candidate.assertions[1].result = 'INCOMPLETE';
  let report = compare(campaign, packets);
  assert.equal(report.direction, 'REGRESSION'); assert.equal(report.gate, 'FAIL');
  assert.equal(report.qualification, 'FAIL');
  assert(report.blocking.some(b => b.reason === 'SUCCESS_FLOOR'));
  assert(report.gaps.length);
  campaign.cases[0].dimensions = ['reuse'];
  baseline.quality = [{ id: 'reuse', applicable: true, score: 1, reason: 'Synthetic grade', evidence: ['grade'] }];
  candidate.quality = [{ ...baseline.quality[0], score: 2 }];
  report = compare(campaign, packets);
  assert.equal(report.direction, 'MIXED');
  assert.equal(report.pairs[0].quality[0].delta, 1);
});

test('definitive failure and infrastructure failure cannot count toward a possible success floor', () => {
  for (const failure of ['assertion', 'outcome', 'budget', 'infrastructure']) {
    const { campaign, packets } = pair(); packets.forEach(green);
    const candidate = packetBy(packets, 'candidate');
    candidate.metrics.tokens = null;
    if (failure === 'assertion') candidate.assertions[0].result = 'FAIL';
    if (failure === 'outcome') candidate.outcome = 'BLOCKED';
    if (failure === 'budget') candidate.status = 'BUDGET_EXHAUSTED';
    if (failure === 'infrastructure') candidate.status = 'INFRASTRUCTURE_FAILURE';
    const report = compare(campaign, packets);
    assert.equal(report.qualification, 'FAIL', failure);
    assert(report.blocking.some(b => b.reason === 'SUCCESS_FLOOR'), failure);
    assert(report.gaps.some(g => g.reason === 'COST_UNKNOWN'), failure);
  }
});

test('bounded campaign serialization remains readable after preparation', async t => {
  const { root } = await emptyStore(t), campaign = copy(loaded.campaign);
  campaign.cases = Array.from({ length: 30 }, (_, i) => ({ ...copy(campaign.cases[0]), id: `case${i}`,
    assertions: Array.from({ length: 64 }, (_, j) => ({ id: `a${String(j).padStart(2, '0')}${'x'.repeat(61)}`, kind: 'behavior', must_pass: false })) }));
  const raw = JSON.stringify(campaign);
  assert(Buffer.byteLength(raw) < 262144);
  assert(Buffer.byteLength(JSON.stringify(campaign, null, 2)) > 262144);
  const file = path.join(root, 'large.json'), store = path.join(root, 'large');
  await writeFile(file, raw); await prepare(file, store);
  const result = await load(store);
  assert.equal(result.campaign.cases.length, 30);
  assert.equal(run('compare', store).status, 1); // Missing runs, not damaged storage.
});

test('retained packet size is checked before publication, including rewritten paths', async t => {
  for (const padding of [53, 54]) {
    const { root } = await emptyStore(t), campaign = copy(loaded.campaign);
    const p = JSON.parse(await readFile(seed.packets.candidate));
    const ids = Array.from({ length: 64 }, (_, i) => `e${String(i).padStart(2, '0')}${'x'.repeat(padding)}`);
    campaign.cases[0].assertions = ids.map((_, i) => ({ id: `assert${i}`, kind: 'behavior', must_pass: false }));
    p.campaign = digestValue(campaign);
    p.assertions = campaign.cases[0].assertions.map(a => ({ id: a.id, result: 'PASS', evidence: ids }));
    p.evidence = ids.map((id, i) => ({ id, path: `e${i}`, digest: digest('evidence') }));
    p.author_verification.evidence = [ids[0]]; p.host.receipt = ids[0]; p.graders[0].report = ids[0];
    for (let i = 0; i < ids.length; i++) await writeFile(path.join(root, `e${i}`), 'evidence');
    const campaignFile = path.join(root, 'large-campaign.json'), packetFile = path.join(root, 'large-packet.json');
    await writeFile(campaignFile, JSON.stringify(campaign)); await writeFile(packetFile, JSON.stringify(p));
    assert(Buffer.byteLength(JSON.stringify(p)) < 262144);
    assert(Buffer.byteLength(JSON.stringify(p, null, 2)) > 262144);
    const store = path.join(root, 'large-store'); await prepare(campaignFile, store);
    if (padding === 53) {
      await record(store, packetFile);
      assert.equal((await load(store)).packets.length, 1);
      assert.equal(run('compare', store).status, 1);
    } else {
      await assert.rejects(record(store, packetFile), { code: 'LIMIT' });
      assert.deepEqual(await readdir(path.join(store, 'runs')), []);
      assert(!(await readdir(store)).some(name => name.startsWith('.record-')));
    }
  }
});

test('quality applicability, independent grading and required final checks cannot be waived', () => {
  const { campaign, packets } = pair(); packets.forEach(green);
  campaign.cases[0].dimensions = ['maintainability'];
  for (const p of packets) p.quality = [{ id: 'maintainability', applicable: true, score: 2, reason: 'Synthetic grade', evidence: ['grade'] }];
  const candidate = packetBy(packets, 'candidate');
  candidate.quality[0] = { ...candidate.quality[0], applicable: false, score: null };
  assert.equal(compare(campaign, packets).qualification, 'INCOMPLETE');
  candidate.quality[0] = copy(packetBy(packets, 'baseline').quality[0]);
  candidate.graders[0].id = candidate.host.actor;
  assert.equal(compare(campaign, packets).qualification, 'INCOMPLETE');
  candidate.graders[0].id = 'independent'; candidate.author_verification.result = 'FAIL';
  assert.equal(compare(campaign, packets).qualification, 'FAIL');
});

test('correct stops succeed, limits/floors matter and cost-only changes do not claim improvement', () => {
  const { campaign, packets } = pair(); packets.forEach(green);
  campaign.cases[0].expected_outcome = 'BLOCKED';
  for (const p of packets) { p.outcome = 'BLOCKED'; p.author_verification.result = 'NOT_APPLICABLE'; }
  packetBy(packets, 'candidate').metrics.tokens = 0;
  assert.equal(compare(campaign, packets).direction, 'NO_MEASURED_CHANGE');
  assert.equal(compare(campaign, packets).qualification, 'PASS');
  packetBy(packets, 'candidate').status = 'BUDGET_EXHAUSTED';
  assert.equal(compare(campaign, packets).qualification, 'FAIL');
  const candidate = packetBy(packets, 'candidate'); candidate.status = 'COMPLETED';
  campaign.cases[0].repetitions = 2;
  campaign.cases[0].min_successes = 1;
  campaign.cases[0].assertions[0].must_pass = true;
  const second = packets.map(p => ({ ...copy(p), repetition: 2, run_id: randomUUID() }));
  packetBy(second, 'candidate').assertions[0].result = 'FAIL';
  const report = compare(campaign, [...packets, ...second]);
  assert.equal(report.cases[0].successes.candidate, 1);
  assert.equal(report.qualification, 'FAIL');
});

test('CLI reports missing runs and invalid usage with distinct nonzero exits', async t => {
  const { store } = await emptyStore(t);
  assert.equal(run('compare', store).status, 1);
  for (const args of [[], ['unknown'], ['compare', store, '--extra'], ['--help', 'extra']]) {
    const result = run(...args); assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).code, 'USAGE');
  }
  const help = run('--help'); assert.equal(help.status, 0); assert.match(help.stdout, /No model execution/);
});

test('an interrupted recording lock is visible and concurrent writers do not overwrite', async t => {
  const { store } = await emptyStore(t);
  await mkdir(path.join(store, '.record-lock'));
  await assert.rejects(record(store, seed.packets.baseline), { code: 'BUSY' });
  await rm(path.join(store, '.record-lock'), { recursive: true });
  const results = await Promise.allSettled([record(store, seed.packets.candidate), record(store, seed.packets.candidate)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await load(store)).packets.length, 1);
});
