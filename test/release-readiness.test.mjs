import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReadiness, readLocalInput } from '../lib/release/readiness.mjs';
import { runReadinessCommand } from '../scripts/check-readiness.mjs';
import { runFixtureCommand } from '../scripts/test-release-readiness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(await readFile(new URL('./fixtures/release-readiness.json', import.meta.url)));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const check = (report, id) => report.checks.find(value => value.id === id);
async function inputs(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pgb90-readiness-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const setup = path.join(directory, 'saved-setup.bin');
  // Caller-labelled simulation, with non-UTF8 bytes to check byte-exact hashing.
  const bytes = Buffer.from([0, 255, 128, 10]);
  await writeFile(setup, bytes);
  return { directory, setup, bytes, configText: JSON.stringify(fixture.config), revision, observations: {
    schema: 'pigboard-readiness-observations/v1', revision,
    configuration_digest: fixture.configuration_digest, installation_id: 'dummy-installation',
    expected_site: 'https://jira.example.invalid',
    artifacts: [{ id: 'setup', path: setup, sha256: createHash('sha256').update(bytes).digest('hex'), kind: 'simulated_fixture', observed_at: '2026-11-16T12:00:00Z' }],
    routes: structuredClone(fixture.routes), reviewers: { developer: 'Designated fixture developer', human_qa: 'Designated fixture human QA' },
  } };
}

test('early H02: absent installed acceptance remains unverified and human/activation boundaries survive', async t => {
  const input = await inputs(t);
  const report = await checkReadiness(input);
  assert.equal(report.configuration_digest, fixture.configuration_digest);
  assert.equal(check(report, 'C03_CONFIGURATION').status, 'PASS');
  assert.equal(check(report, 'C03_ROUTES').status, 'PASS');
  assert.equal(check(report, 'C08_INSTALLED_ACCEPTANCE').status, 'UNVERIFIED');
  assert.equal(check(report, 'C08_INSTALLED_ACCEPTANCE').code, 'ACCEPTANCE_MISSING');
  assert.equal(check(report, 'C08_PGB58').status, 'UNVERIFIED');
  assert.equal(check(report, 'C04_INSTALLATION').status, 'UNVERIFIED');
  assert.equal(check(report, 'C05_HEALTH').status, 'UNVERIFIED');
  assert.equal(report.evidence_layers.human_review.reviewers.developer, 'Designated fixture developer');
  assert.equal(report.human_cases.length, 4);
  assert.ok(report.human_cases.every(value => value.status === fixture.expected.human_status));
  assert.deepEqual(report.activation, fixture.expected.activation);
  assert.deepEqual(await readFile(input.setup), input.bytes);
});

test('early H02: active saved rule fails independently of missing release evidence', async t => {
  const input = await inputs(t);
  input.observations.routes[0].jira_rule_enabled = true;
  const report = await checkReadiness(input);
  assert.equal(check(report, 'C03_ROUTES').status, 'FAIL');
  assert.equal(check(report, 'C03_ROUTES').observed[0].code, 'ACTIVE_TRIGGER');
  assert.equal(check(report, 'C08_INSTALLED_ACCEPTANCE').status, 'UNVERIFIED');
  assert.deepEqual(report.activation, fixture.expected.activation);
  assert.deepEqual(await readFile(input.setup), input.bytes);
});

test('early H04: same full label retains two project identities and native ordinary mappings', async t => {
  const report = await checkReadiness(await inputs(t));
  const projection = report.inactive_setup;
  assert.equal(projection.kind, 'local_inactive_projection');
  assert.deepEqual(projection.projects.map(project => project.project_id), fixture.expected.projects);
  assert.deepEqual(projection.projects.map(project => project.routes.map(route => route.stage_id)), fixture.expected.ordinary_stages);
  for (const project of projection.projects) {
    assert.equal(project.story_type_id, '22'); assert.equal(project.bug_type_id, '23');
    assert.deepEqual(project.routes.map(route => route.role), fixture.expected.roles);
    assert.deepEqual(project.routes.map(route => route.outcome), ['In Review', 'QA', 'Human Review']);
    assert.ok(project.routes.every(route => route.jira_rule_enabled === false && route.cursor_automation_enabled === false));
  }
  const routes = check(report, 'C03_ROUTES').observed;
  assert.deepEqual([...new Set(routes.map(route => route.stream_key))], fixture.expected.stream_keys);
  assert.equal(routes.length, 6);
  assert.ok(routes.every(route => route.status === 'PASS'));
});

test('missing project and missing inactive flag cannot disappear from route diagnostics', async t => {
  const input = await inputs(t);
  input.observations.routes = input.observations.routes.filter(route => route.project_id === '10001');
  delete input.observations.routes[0].cursor_automation_enabled;
  const report = await checkReadiness(input);
  const routes = check(report, 'C03_ROUTES');
  assert.equal(routes.status, 'UNVERIFIED');
  assert.equal(routes.observed.filter(route => route.project_id === '10002' && route.code === 'PROJECT_ROLE_MISSING').length, 3);
  assert.equal(routes.observed[0].status, 'UNVERIFIED');
});

test('CLI rejects undeclared/duplicate flags, relative inputs, malformed revisions and unsafe file input', async t => {
  const input = await inputs(t);
  assert.equal((await runReadinessCommand(['--help'])).exitCode, 0);
  for (const argv of [[], ['--help', '--json'], ['--config', 'relative.json', '--release', '/receipt.json', '--revision', revision], ['--config', '/config.json', '--release', '/receipt.json', '--revision', revision, '--json', '--json'], ['--unknown'], ['--config', '/config.json', '--release', '/receipt.json', '--revision', revision.toUpperCase()]]) {
    const result = await runReadinessCommand(argv);
    assert.equal(result.exitCode, 2);
    assert.equal(result.outcome.checks[0].code, 'USAGE');
  }
  const malformed = path.join(input.directory, 'malformed.json');
  await writeFile(malformed, '{"PRIVATE_SENTINEL":');
  const result = await runReadinessCommand(['--config', malformed, '--release', malformed, '--revision', revision, '--json']);
  assert.equal(result.exitCode, 2);
  assert.equal(result.outcome.checks[0].code, 'INPUT_UNREADABLE_OR_MALFORMED');
  assert.ok(!result.stdout.includes('PRIVATE_SENTINEL'));
  await writeFile(malformed, ' '.repeat(1048577));
  await assert.rejects(readLocalInput(malformed));
});

test('explicitly unreadable optional evidence preserves independent CLI configuration results', async t => {
  const input = await inputs(t);
  const config = path.join(input.directory, 'config.json');
  const observations = path.join(input.directory, 'observations.json');
  await writeFile(config, input.configText);
  await writeFile(observations, JSON.stringify(input.observations));
  const result = await runReadinessCommand(['--config', config, '--release', '/nonexistent-pgb90-release.json', '--revision', revision, '--observations', observations, '--health', '/nonexistent-pgb90-health.json', '--json']);
  assert.equal(result.exitCode, 2);
  assert.equal(check(result.outcome, 'C03_CONFIGURATION').status, 'PASS');
  assert.equal(check(result.outcome, 'C03_ROUTES').status, 'PASS');
  assert.ok(result.outcome.checks[0].observed.fields.includes('health'));
  assert.equal(JSON.parse(result.stdout).schema, 'pigboard-release-readiness/v1');
});

test('H02 model/capability comparison reports conflicting controls and missing profile coverage', async t => {
  const input = await inputs(t);
  input.observations.workers = [{ role: 'implementer', profile_sha256: '0'.repeat(64), prompt_sha256: '0'.repeat(64), model: 'grok-4.7-high', effort: 'High', fast: true, evidence_ids: ['setup'], capabilities: { status: 'partial', evidence_ids: ['setup'] }, phase_bindings: [
    { phase: 'review', subagent_type: 'generalPurpose', model: 'grok-4.7-high', machine: 'same_machine', foreground: true, fresh_context: true, accepted_agent_id: 'review-001', setup_evidence_ids: ['setup'], telemetry: 'not_returned' },
    { phase: 'execution', subagent_type: 'generalPurpose', model: 'grok-4.7-medium', machine: 'same_machine', foreground: true, fresh_context: false, accepted_agent_id: 'execution-001', setup_evidence_ids: ['setup'], telemetry: { model: 'grok-4.7-high', effort: 'High' } },
  ] }];
  const report = await checkReadiness(input);
  const workers = check(report, 'C07_WORKERS');
  assert.equal(workers.status, 'FAIL');
  assert.deepEqual(workers.observed[0].reasons, ['WORKER_SELECTION_MISMATCH', 'CAPABILITY_COVERAGE_INCOMPLETE', 'EXECUTION_TELEMETRY_CONFLICT']);
  assert.equal(workers.observed[0].qualification.per_call_model_telemetry[0].telemetry, 'not_returned');
  assert.equal(workers.observed[1].status, 'UNVERIFIED');
  assert.equal(workers.observed[2].status, 'UNVERIFIED');
  assert.equal(check(report, 'C03_ROUTES').status, 'PASS');
});

test('C06 supplied simulation cannot become installed/PGB58 acceptance or original app inspection', async t => {
  const input = await inputs(t);
  input.observations.acceptance = Object.fromEntries(['installed_package', 'pgb58'].map(key => [key, { result: 'passed', execution: 'simulated', revision, configuration_digest: fixture.configuration_digest, installation_id: 'dummy-installation', evidence_ids: ['setup'] }]));
  input.observations.application_inspection = { no_skill_copies: true, evidence_ids: ['setup'] };
  const report = await checkReadiness(input);
  assert.equal(check(report, 'C06_OBSERVATIONS').status, 'PASS');
  assert.equal(check(report, 'C06_APPLICATION').status, 'UNVERIFIED');
  assert.equal(check(report, 'C08_INSTALLED_ACCEPTANCE').status, 'UNVERIFIED');
  assert.equal(check(report, 'C08_PGB58').status, 'UNVERIFIED');
  assert.equal(report.evidence_layers.supplied_ordinary_installed_acceptance.supplied.execution, 'simulated');
  assert.equal(report.evidence_layers.human_review.status, 'NOT_RUN');
  assert.deepEqual(report.activation, fixture.expected.activation);
});

test('C09 selects only original whole groups with explicit prepared receipt/revision and a new absolute output', async t => {
  const input = await inputs(t);
  const output = path.join(input.directory, 'must-not-be-created');
  const common = ['--output', output, '--release', '/explicit-prepared-receipt.json', '--revision', revision];
  assert.equal((await runFixtureCommand(['--help'])).exitCode, 0);
  for (const argv of [common, ['--case', 'R1-20-H05', ...common], ['--case', 'R1-20-H01', '--all', ...common], ['--all', ...common, '--live'], ['--all', '--output', 'relative', '--release', '/explicit-prepared-receipt.json', '--revision', revision], ['--all', ...common, '--revision', revision]]) {
    const result = await runFixtureCommand(argv);
    assert.equal(result.exitCode, 2);
    assert.equal(result.outcome.code, 'USAGE');
  }
  await assert.rejects(readFile(path.join(output, 'fixture-run.json')));
  assert.deepEqual(fixture.human_cases.map(group => group.id), ['R1-20-H01', 'R1-20-H02', 'R1-20-H03', 'R1-20-H04']);
  assert.equal(fixture.human_cases[1].variants.length, 5);
  assert.equal(fixture.human_cases[3].variants.length, 3);
  assert.equal(fixture.preparation.id, 'PREP-01');
  assert.equal(fixture.data.id, 'DATA-01');
  assert.ok(fixture.human_cases.every(group => group.original_human_case.execution === 'human' && group.status === 'NOT_RUN'));
});
