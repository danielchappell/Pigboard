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
import { compareRetainedAlarmRemoval, runFixtureCommand } from '../scripts/test-release-readiness.mjs';
import { evidenceRevision } from '../lib/manager/health.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(await readFile(new URL('./fixtures/release-readiness.json', import.meta.url)));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const check = (report, id) => report.checks.find(value => value.id === id);

test('R1-23-H04 reconciles retained removal receipts and preserves the original partial outcomes', () => {
  const packets = compareRetainedAlarmRemoval();
  assert.deepEqual(packets.map(({ case: id }) => id), ['R1-23-H02', 'R1-23-H03-C']);
  for (const packet of packets) {
    const [complete, partial] = packet.results;
    assert.equal(complete.terminal.resources.find(row => row.logical === 'LogGroup').observation, 'deleted');
    assert.equal(complete.terminal.resources.find(row => row.logical === 'StateTable').observation, 'retained');
    assert.equal(partial.terminal.status, 'partial');
    assert.equal(partial.current_observation.operation, partial.operation);
    const missing = partial.current_observation.resources.find(row => row.logical === 'MeasuredBudgetAlarm');
    assert.equal(missing.observation, 'unobservable');
    assert.match(missing.cost, /CloudWatch alarm charges/);
  }
  assert.equal(packets[0].preview.externally_owned.filter(row => typeof row.reference === 'string' && row.reference.startsWith('arn:aws:sns:')).length, 0);
  assert.equal(packets[1].preview.externally_owned.filter(row => typeof row.reference === 'string' && row.reference.startsWith('arn:aws:sns:')).length, 1);
});
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

function managerInputs(input, managerRevision = revision, explicit = true) {
  const manifest = structuredClone(fixture.manager_evidence.manifest);
  manifest.source_revision = managerRevision;
  const installation = structuredClone(fixture.manager_evidence.installation);
  installation.manifest = structuredClone(manifest);
  installation.binding.package_revision = managerRevision;
  const health = structuredClone(fixture.manager_evidence.health);
  health.current.package_revision = managerRevision;
  return { ...input, configText: JSON.stringify(fixture.manager_config), ...(explicit ? { packageManifest: manifest } : {}), installation, health, observations: { ...input.observations, configuration_digest: fixture.manager_configuration_digest, installation_id: 'fixture' } };
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

  const mib = 1024 * 1024;
  const config = path.join(input.directory, 'config.json');
  const release = path.join(input.directory, 'unavailable-release.json');
  const manifest = path.join(input.directory, 'manifest.json');
  const installation = path.join(input.directory, 'installation.json');
  const packageEnvelope = { schema: 'pigboard-manager-package/v2' };
  const receiptEnvelope = { schema: 'pigboard-installation-receipt/v2' };
  await writeFile(config, input.configText);
  await writeFile(release, '{}');
  await writeFile(manifest, JSON.stringify({ ...packageEnvelope, padding: 'x'.repeat(4 * mib) }));
  await writeFile(installation, JSON.stringify({ ...receiptEnvelope, manifest: { ...packageEnvelope, padding: 'x'.repeat(4 * mib) } }));
  const common = ['--config', config, '--release', release, '--revision', revision, '--package-manifest', manifest, '--installation', installation, '--json'];
  const oversized = await runReadinessCommand(common);
  assert.equal(oversized.exitCode, 2);
  assert.deepEqual(check(oversized.outcome, 'C01_INPUT').observed.fields, ['installation', 'packageManifest']);
  await writeFile(manifest, JSON.stringify({ schema: 'pigboard-manager-package/v1', padding: 'x'.repeat(mib) }));
  await writeFile(installation, JSON.stringify({ ...receiptEnvelope, padding: 'x'.repeat(8 * mib) }));
  const otherEnvelopeAndWholeReceipt = await runReadinessCommand(common);
  assert.equal(otherEnvelopeAndWholeReceipt.exitCode, 2);
  assert.deepEqual(check(otherEnvelopeAndWholeReceipt.outcome, 'C01_INPUT').observed.fields, ['installation', 'packageManifest']);
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

test('C04/C05 matching supplied ordinary package, binding and initial disabled health compare through actual pure owners', async t => {
  const input = managerInputs(await inputs(t));
  const report = await checkReadiness(input);
  for (const id of ['C04_PACKAGE', 'C04_INSTALLATION', 'C05_HEALTH']) assert.equal(check(report, id).status, 'PASS', id);
  assert.equal(report.configuration_digest, fixture.manager_configuration_digest);
  assert.equal(check(report, 'C05_HEALTH').observed.current.evidence_revision, null);
  assert.equal(check(report, 'C05_HEALTH').observed.metric_evidence.status, 'not_applicable');
  const independentBase = 'pigboard-fixture-' + createHash('sha256').update('fixture').digest('hex').slice(0, 32);
  assert.equal(independentBase, 'pigboard-fixture-f16d05ec6b29248d2c61adb1e9263f78');
  assert.equal(input.installation.binding.table_name, independentBase + '-state');
  assert.equal(input.installation.original.table_name, input.installation.binding.table_name);
  assert.equal(check(report, 'C08_INSTALLED_ACCEPTANCE').status, 'UNVERIFIED');
  assert.deepEqual(report.activation, fixture.expected.activation);
});

test('H04 old evidence retains approved manager revision failure for both manifest routes with matching control', async t => {
  const base = await inputs(t);
  const control = await checkReadiness(managerInputs(base));
  for (const id of ['C04_PACKAGE', 'C04_INSTALLATION', 'C05_HEALTH']) assert.equal(check(control, id).status, 'PASS', `control ${id}`);
  for (const explicit of [true, false]) {
    const old = managerInputs(base, fixture.manager_evidence.old_revision, explicit);
    const report = await checkReadiness(old);
    for (const id of ['C04_PACKAGE', 'C04_INSTALLATION', 'C05_HEALTH']) {
      assert.equal(check(report, id).status, 'FAIL', `${explicit ? 'explicit' : 'embedded'} ${id}`);
      assert.equal(check(report, id).code, 'MANAGER_REVISION_MISMATCH');
    }
    assert.notEqual(report.status, 'compatible_supplied_evidence');
    assert.equal(check(report, 'C03_ROUTES').status, 'PASS');
  }
});

test('H04 missing resource uses the actual reader unknown shape and cannot become disabled health', async t => {
  const input = managerInputs(await inputs(t));
  input.health = structuredClone(fixture.manager_evidence.missing_resource_health);
  const report = await checkReadiness(input);
  assert.equal(check(report, 'C04_INSTALLATION').status, 'PASS');
  assert.equal(check(report, 'C05_HEALTH').status, 'UNVERIFIED');
  assert.equal(check(report, 'C05_HEALTH').observed.state, 'unknown');
  assert.equal(check(report, 'C05_HEALTH').observed.query_coverage, null);
  assert.deepEqual(check(report, 'C05_HEALTH').observed.omissions, fixture.manager_evidence.missing_resource_health.omissions);
});

test('C01 distinguishes explicit malformed manager roots from omitted and valid embedded evidence', async t => {
  const base = await inputs(t);
  const nullManifest = await checkReadiness({ ...managerInputs(base), packageManifest: null });
  assert.equal(check(nullManifest, 'C04_PACKAGE').status, 'ERROR');
  assert.equal(check(nullManifest, 'C04_PACKAGE').code, 'PACKAGE_INPUT_INVALID');
  assert.equal(check(nullManifest, 'C04_PACKAGE').observed, null);
  assert.equal(nullManifest.status, 'input_error');
  assert.equal(nullManifest.exit_code, 2);
  assert.equal(check(nullManifest, 'C03_CONFIGURATION').status, 'PASS');
  assert.notEqual(check(nullManifest, 'C04_INSTALLATION').status, 'PASS');
  assert.equal(nullManifest.evidence_layers.supplied_installation_binding.status, 'UNVERIFIED');

  const falseInstallation = await checkReadiness({ ...managerInputs(base), installation: false });
  assert.equal(check(falseInstallation, 'C04_INSTALLATION').status, 'ERROR');
  assert.equal(check(falseInstallation, 'C04_INSTALLATION').code, 'INSTALLATION_INPUT_INVALID');
  assert.equal(check(falseInstallation, 'C04_INSTALLATION').observed, null);
  assert.equal(falseInstallation.status, 'input_error');
  assert.equal(falseInstallation.exit_code, 2);
  assert.equal(check(falseInstallation, 'C03_CONFIGURATION').status, 'PASS');
  assert.equal(check(falseInstallation, 'C04_PACKAGE').status, 'PASS');
  assert.equal(falseInstallation.evidence_layers.supplied_installation_binding.status, 'UNVERIFIED');

  const omitted = managerInputs(base);
  delete omitted.packageManifest;
  delete omitted.installation;
  const omittedReport = await checkReadiness(omitted);
  for (const id of ['C04_PACKAGE', 'C04_INSTALLATION']) {
    assert.equal(check(omittedReport, id).status, 'UNVERIFIED');
    assert.equal(check(omittedReport, id).code, 'EVIDENCE_MISSING');
  }
  const embedded = await checkReadiness(managerInputs(base, revision, false));
  for (const id of ['C04_PACKAGE', 'C04_INSTALLATION']) assert.equal(check(embedded, id).status, 'PASS');
  const recoveryInput = managerInputs(base);
  recoveryInput.installation = { recovery_receipt: recoveryInput.installation, recovery_metadata: { package_verified: false } };
  const recovery = await checkReadiness(recoveryInput);
  assert.equal(check(recovery, 'C04_PACKAGE').status, 'PASS');
  assert.equal(check(recovery, 'C04_INSTALLATION').status, 'FAIL');
  assert.equal(recovery.evidence_layers.supplied_installation_binding.status, 'UNVERIFIED');
});

test('Codex C03 keeps all ordinary roles within each observed numbered stream', async t => {
  const cases = [
    { name: 'disjoint role labels', labels: ['AI-Daniel-1', 'AI-Daniel-2', 'AI-Daniel-3'], extra: [], expected: 'UNVERIFIED', missing: [['AI-Daniel-1', 'reviewer'], ['AI-Daniel-1', 'qa'], ['AI-Daniel-2', 'implementer'], ['AI-Daniel-2', 'qa'], ['AI-Daniel-3', 'implementer'], ['AI-Daniel-3', 'reviewer']] },
    { name: 'complete stream plus partial stream', labels: null, extra: ['implementer'], expected: 'UNVERIFIED', missing: [['AI-Daniel-2', 'reviewer'], ['AI-Daniel-2', 'qa']] },
    { name: 'two complete streams', labels: null, extra: ['implementer', 'reviewer', 'qa'], expected: 'PASS', missing: [] },
  ];
  for (const row of cases) {
    const input = await inputs(t);
    const firstProject = input.observations.routes.filter(route => route.project_id === '10001');
    if (row.labels) for (const [index, route] of firstProject.entries()) route.full_label = row.labels[index];
    for (const role of row.extra) input.observations.routes.push({ ...firstProject.find(route => route.role === role), full_label: 'AI-Daniel-2' });
    const report = await checkReadiness(input);
    const routes = check(report, 'C03_ROUTES');
    assert.equal(routes.status, row.expected, row.name);
    assert.ok(routes.observed.every(route => route.status !== 'FAIL'), row.name);
    const missing = routes.observed.filter(route => route.code === 'STREAM_ROLE_MISSING');
    assert.deepEqual(missing.map(route => [route.full_label, route.role]).sort(), row.missing.slice().sort(), row.name);
    for (const route of missing) {
      assert.equal(route.project_id, '10001');
      assert.equal(route.stream_key, JSON.stringify(['https://jira.example.invalid', '10001', route.full_label]));
      assert.equal(route.status, 'UNVERIFIED');
    }
    assert.equal(routes.observed.filter(route => route.code === 'PROJECT_ROLE_MISSING').length, 0);
    assert.ok(report.inactive_setup.projects.every(project => project.routes.every(route => !route.jira_rule_enabled && !route.cursor_automation_enabled)));
    assert.ok(report.human_cases.every(human => human.status === 'NOT_RUN'));
    assert.deepEqual(report.activation, fixture.expected.activation);
  }
});

test('Codex C04 requires minimum declared dependency and payload digests', async t => {
  const cases = [
    { name: 'empty payload map', explicit: true, mutation: 'empty_payload', expected: 'FAIL' },
    { name: 'empty dependency map', explicit: false, mutation: 'empty_dependencies', expected: 'FAIL' },
    { name: 'missing aws dependency', explicit: false, mutation: 'missing_aws', expected: 'FAIL' },
    { name: 'illustrative saved metadata control', explicit: true, mutation: null, expected: 'PASS' },
  ];
  for (const row of cases) {
    const input = managerInputs(await inputs(t), revision, row.explicit);
    for (const manifest of [input.packageManifest, input.installation.manifest].filter(Boolean)) {
      if (row.mutation === 'empty_payload') manifest.payload_hashes = {};
      if (row.mutation === 'empty_dependencies') manifest.dependency_hashes = {};
      if (row.mutation === 'missing_aws') delete manifest.dependency_hashes.aws;
    }
    const report = await checkReadiness(input);
    assert.equal(check(report, 'C04_PACKAGE').status, row.expected, row.name);
    if (row.expected === 'FAIL') {
      assert.equal(check(report, 'C04_PACKAGE').code, 'PACKAGE_METADATA_MISMATCH', row.name);
      assert.notEqual(check(report, 'C04_INSTALLATION').status, 'PASS', row.name);
      assert.equal(report.evidence_layers.supplied_installation_binding.status, 'UNVERIFIED', row.name);
    } else {
      assert.equal(check(report, 'C04_INSTALLATION').status, 'PASS');
      assert.equal(Object.keys(check(report, 'C04_PACKAGE').observed.metadata.payload_hashes).length, 1);
    }
    assert.ok(report.human_cases.every(human => human.status === 'NOT_RUN'));
    assert.deepEqual(report.activation, fixture.expected.activation);
  }
});

test('Codex C05 checks retained metric tuples while preserving zero observations', async t => {
  const names = ['CompletePresence', 'AttemptPresence', 'FailurePresence', 'MaximumBudgetUtilization', 'DurationMilliseconds'];
  const cases = [
    { name: 'five empty records', mutation: 'empty', expected: 'UNVERIFIED' },
    { name: 'string point count', mutation: 'string_points', expected: 'UNVERIFIED' },
    { name: 'zero count with maximum', mutation: 'zero_maximum', expected: 'UNVERIFIED' },
    { name: 'retained zero observations', mutation: null, expected: 'PASS' },
    { name: 'mixed observed and zero records', mutation: 'mixed', expected: 'PASS' },
    { name: 'invalid enablement and truncated coverage', mutation: 'epoch_coverage', expected: 'UNVERIFIED', reasons: ['HEALTH_EPOCH_INCOMPLETE', 'HEALTH_WINDOW_INCOMPLETE'] },
    { name: 'invalid saved observation timestamp', mutation: 'observation', expected: 'UNVERIFIED', reasons: ['HEALTH_OBSERVATION_INCOMPLETE'] },
    { name: 'enablement after saved observation', mutation: 'future_epoch', expected: 'UNVERIFIED', reasons: ['HEALTH_EPOCH_INCOMPLETE'] },
    { name: 'retained generation cannot bind', mutation: 'generation', expected: 'UNVERIFIED', reasons: ['HEALTH_EPOCH_INCOMPLETE'] },
    { name: 'reversed and observation-mismatched window', mutation: 'window', expected: 'UNVERIFIED', reasons: ['HEALTH_WINDOW_INCOMPLETE'] },
    { name: 'invalid coverage counters and absence declaration', mutation: 'counters', expected: 'UNVERIFIED', reasons: ['HEALTH_WINDOW_INCOMPLETE'] },
    { name: 'invalid metric statistic and window timestamp', mutation: 'metric_window', expected: 'UNVERIFIED', reasons: ['METRIC_COVERAGE_INCOMPLETE'] },
    { name: 'observed metrics without an epoch', mutation: 'no_epoch', expected: 'UNVERIFIED', reasons: ['INITIAL_DISABLED_METRIC_EVIDENCE_MISSING'] },
  ];
  for (const row of cases) {
    const input = managerInputs(await inputs(t));
    Object.assign(input.health.current, { health_generation: 'retained-epoch-001', health_enabled_at: '2026-11-16T11:00:00.000Z' });
    input.health.current.evidence_revision = evidenceRevision(input.health.current);
    const metrics = Object.fromEntries(names.map(name => [name, { maximum: null, points: 0, latest_at: null }]));
    if (row.mutation === 'empty') for (const name of names) metrics[name] = {};
    if (row.mutation === 'string_points') metrics.CompletePresence.points = '0';
    if (row.mutation === 'zero_maximum') metrics.CompletePresence.maximum = 0;
    if (row.mutation === 'mixed') {
      metrics.CompletePresence = { maximum: 1, points: 1, latest_at: '2026-11-16T11:59:00.000Z' };
      metrics.DurationMilliseconds = { maximum: 25, points: 2, latest_at: '2026-11-16T11:59:00.000Z' };
    }
    input.health.metric_evidence = { status: 'observed', reason: null, statistics: 'Maximum', metrics };
    if (row.mutation === 'epoch_coverage') {
      input.health.current.health_enabled_at = 'not-a-date';
      input.health.query_coverage = { complete: true };
    }
    if (row.mutation === 'observation') input.health.observed_at = 'not-a-date';
    if (row.mutation === 'future_epoch') input.health.current.health_enabled_at = '2026-11-16T12:01:00.000Z';
    if (row.mutation === 'generation') {
      input.health.current.health_generation = 'invalid generation';
      input.health.current.evidence_revision = evidenceRevision(input.health.current);
    }
    if (row.mutation === 'window') Object.assign(input.health.query_coverage, { start: '2026-11-16T12:00:00.000Z', end: '2026-11-16T11:59:00.000Z' });
    if (row.mutation === 'counters') {
      Object.assign(input.health.query_coverage, { pages: '1', fetched_events: 0, decoded_bytes: 1 });
      delete input.health.query_coverage.last_complete_absence;
    }
    if (row.mutation === 'metric_window') {
      input.health.metric_evidence.statistics = 'Average';
      metrics.CompletePresence = { maximum: 1, points: 1, latest_at: '2026-11-16T12:00:00.000Z' };
    }
    if (row.mutation === 'no_epoch') {
      input.health = structuredClone(fixture.manager_evidence.health);
      input.health.current.package_revision = revision;
      input.health.metric_evidence = { status: 'observed', reason: null, statistics: 'Maximum', metrics };
    }
    const report = await checkReadiness(input);
    assert.equal(check(report, 'C04_PACKAGE').status, 'PASS', row.name);
    assert.equal(check(report, 'C04_INSTALLATION').status, 'PASS', row.name);
    const health = check(report, 'C05_HEALTH');
    assert.equal(health.status, row.expected, row.name);
    if (row.reasons) for (const reason of row.reasons) assert.ok(health.observed.comparison_reasons.includes(reason), `${row.name}: ${reason}`);
    else assert.equal(health.observed.comparison_reasons.includes('METRIC_COVERAGE_INCOMPLETE'), row.expected === 'UNVERIFIED', row.name);
    assert.equal(health.observed.observed_at, input.health.observed_at);
    assert.ok(report.human_cases.every(human => human.status === 'NOT_RUN'));
    assert.deepEqual(report.activation, fixture.expected.activation);
    t.diagnostic(JSON.stringify({ row: row.name, status: health.status, comparison_reasons: health.observed.comparison_reasons }));
  }
});
