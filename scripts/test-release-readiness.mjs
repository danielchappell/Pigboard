#!/usr/bin/env node
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { humanCaseIds, parseLocalJSON, readLocalInput, workerSources } from '../lib/release/readiness.mjs';
import { runReadinessCommand } from './check-readiness.mjs';

const execute = promisify(execFile);
const source = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(await readFile(new URL('../test/fixtures/release-readiness.json', import.meta.url)));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const namedCheck = (report, id) => report.checks.find(check => check.id === id);
export const help = `Prepare and run only the prescribed local Pig Boss readiness fixtures.
node scripts/test-release-readiness.mjs (--case R1-20-H01 | --all) --output /absolute/NEW_DIRECTORY --release /absolute/actual-prepared-receipt.json --revision FULL_APPROVED_SHA
Cases: R1-20-H01, R1-20-H02, R1-20-H03, R1-20-H04. --case selects one whole group.
The literal fixture supplies DATA-01 canonical configuration and unchanged variants.
Use an already-prepared external release; this command never discovers, fetches or installs one.
Developer assertions and actual readiness results are retained separately; human cases remain NOT_RUN.
--help alone displays this text. No live mode, provider calls, scans or activation.
`;

// Exercise the production subprocess against the same pin as the package.
// With no external bundle (normal CI), C02 deliberately reports missing setup.
export async function checkSavedAlarmSnapshot({ directory, checkout, revision, release, configPath,
  installationPath, manifestPath, health, variant, commands }) {
  const expected = fixture.saved_alarm_readiness.variants[variant];
  await mkdir(directory, { mode: 0o700 });
  const inputs = {};
  for (const [name, filename] of Object.entries({ config: configPath, installation: installationPath, 'package-manifest': manifestPath })) {
    if (!filename) continue;
    const target = path.join(directory, `${name}.json`);
    await writeFile(target, await readFile(filename), { mode: 0o600, flag: 'wx' });
    inputs[name] = target;
  }
  inputs.health = path.join(directory, 'health.json');
  await writeFile(inputs.health, JSON.stringify(health) + '\n', { mode: 0o600, flag: 'wx' });
  const ciRelease = path.join(directory, 'unavailable-ci-release.json');
  if (!release) await writeFile(ciRelease, '{}\n', { mode: 0o600, flag: 'wx' });
  const entry = 'scripts/check-readiness.mjs';
  const args = [entry, '--revision', revision, '--release', release ?? ciRelease,
    ...Object.entries(inputs).flatMap(([name, filename]) => [`--${name}`, filename])];
  const record = { variant, expected, release: release ? 'prepared_external' : 'not_supplied_in_ci', inputs, invocations: {} };
  commands.push(record);
  for (const mode of ['human', 'json']) {
    const argv = mode === 'json' ? [...args, '--json'] : args;
    const { error, status, stdout, stderr, signal } = spawnSync(process.execPath, argv,
      { cwd: checkout, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
    if (error) throw error;
    record.invocations[mode] = { command: [process.execPath, ...argv], cwd: checkout, exit_code: status, stdout, stderr };
    assert.equal(signal, null, stderr);
    assert.equal(stderr, '');
  }
  const { human, json } = record.invocations;
  const report = JSON.parse(json.stdout);
  assert.equal(report.revision, revision);
  assert.equal(report.exit_code, json.exit_code);
  assert.equal(human.exit_code, json.exit_code);
  assert.equal(namedCheck(report, 'C02_RELEASE').status, release ? 'PASS' : 'ERROR', json.stdout);
  if (release) {
    assert.equal(report.status, expected.overall, json.stdout);
    assert.equal(json.exit_code, expected.exit, json.stdout);
  }
  for (const [id, status] of Object.entries({ C04_PACKAGE: 'PASS', C04_INSTALLATION: 'PASS', C05_HEALTH: expected.health })) {
    assert.equal(namedCheck(report, id)?.status, status, `${variant} ${id}: ${json.stdout}`);
    assert(human.stdout.includes(`${status} ${id}:`), human.stdout);
  }
  const saved = namedCheck(report, 'C05_HEALTH');
  if (expected.health_code) assert.equal(saved.code, expected.health_code);
  if (variant === 'malformed') {
    assert.equal(report.status, 'input_error');
    assert.equal(report.exit_code, 2);
    assert.equal(namedCheck(report, 'C03_CONFIGURATION')?.status, 'PASS', json.stdout);
    assert.equal(namedCheck(report, 'C01_INTERNAL'), undefined, json.stdout);
    assert.deepEqual(saved.observed, { alarm: 'measured_budget', source: 'actual', field: 'Dimensions' });
    assert.match(human.stdout, /Pig Boss release readiness: input_error \(exit 2\)/);
    assert.match(human.stdout, /PASS C03_CONFIGURATION:/);
    assert.match(human.stdout, /ERROR C05_HEALTH: HEALTH_INPUT_INVALID\./);
    if (release) assert.match(human.stdout, /PASS C02_RELEASE:/);
  }
  if (expected.alarm_code) {
    const row = saved.observed.alarm_evidence.alarms.find(alarm => alarm.key === 'measured_budget');
    assert.equal(row.code, expected.alarm_code);
    assert(human.stdout.includes(row.name) && human.stdout.includes(expected.alarm_code), human.stdout);
  }
  if (variant === 'matching' || variant === 'inaccessible') {
    const names = health.alarm_evidence.alarms.map(row => row.name).sort();
    assert.equal(names.length, 4);
    assert.deepEqual(saved.observed.alarm_evidence.alarms.map(row => row.name).sort(), names);
    for (const name of names) assert(human.stdout.includes(name), human.stdout);
  }
  assert.deepEqual(report.activation, fixture.expected.activation);
  return report;
}

export async function checkSavedFixtureEvidence({ checkout, revision, configPath, installationPath, health, changes = {} }) {
  // Use the snapshot's comparator so historical and working-tree fixture
  // revisions are resolved against that snapshot's own local Git objects.
  const { checkReadiness } = await import(pathToFileURL(path.join(checkout, 'lib/release/readiness.mjs')).href);
  const [configText, installation] = await Promise.all([
    readFile(configPath, 'utf8'), readFile(installationPath, 'utf8').then(JSON.parse),
  ]);
  return checkReadiness({ revision, configText, installation, health, ...changes });
}

export function compareRetainedAlarmRemoval() {
  return fixture.saved_alarm_readiness.removal.map(packet => {
    const { preview, original_table: table } = packet;
    assert.equal(preview.resources.length, 11);
    assert.equal(preview.resources.filter(row => row.type === 'AWS::CloudWatch::Alarm').length, 4);
    const tableResource = preview.resources.find(row => row.logical === 'StateTable');
    assert.equal(preview.binding.table_id, table.id);
    assert.equal(tableResource.physical, table.name);
    assert.equal(table.arn.split('/').at(-1), table.name);
    assert.equal(tableResource.disposition, 'retained');
    const results = packet.results.map(result => {
      const { terminal, current_observation: current } = result;
      assert.deepEqual(result.binding, preview.binding);
      assert.equal(terminal.observed_at, new Date(terminal.observed_at).toISOString());
      if (current) {
        assert.equal(current.operation, result.operation);
        assert.deepEqual(current.binding, preview.binding);
        assert.equal(current.observed_at, new Date(current.observed_at).toISOString());
        assert(Date.parse(current.observed_at) >= Date.parse(terminal.observed_at));
      }
      const compare = observed => {
        assert.equal(observed.resources.length, preview.resources.length);
        const rows = preview.resources.map(expected => {
          const actual = observed.resources.find(row => row.logical === expected.logical);
          assert.equal(actual?.physical, expected.physical, expected.logical);
          const want = observed.status === 'partial' && expected.logical === 'MeasuredBudgetAlarm'
            ? 'unobservable' : expected.disposition;
          assert.equal(actual.observation, want, expected.logical);
          return { ...expected, observation: actual.observation, cost: actual.cost ?? expected.cost };
        });
        assert.deepEqual(observed.externally_owned, preview.externally_owned);
        assert.equal(observed.table_status, 'retained');
        assert.equal(observed.retention_complete, observed.status === 'removed');
        return { ...observed, resources: rows };
      };
      return { ...result, terminal: compare(terminal), ...(current ? { current_observation: compare(current) } : {}) };
    });
    assert.deepEqual(results.map(result => result.terminal.status), ['removed', 'partial']);
    assert.equal(results[1].current_observation.status, 'partial');
    return { ...packet, results };
  });
}

function optionsFor(argv) {
  const options = {}, seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!['--case', '--all', '--output', '--release', '--revision'].includes(flag) || seen.has(flag)) throw Error('USAGE');
    seen.add(flag);
    if (flag === '--all') { options.all = true; continue; }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw Error('USAGE');
    options[flag.slice(2)] = value;
  }
  if (!!options.all === !!options.case || options.case && !humanCaseIds.includes(options.case) || !options.output || !path.isAbsolute(options.output) || !options.release || !path.isAbsolute(options.release) || !/^[0-9a-f]{40}$/.test(options.revision)) throw Error('USAGE');
  return options;
}

async function manifestTree(directory, prefix = '') {
  const result = {};
  for (const name of (await readdir(path.join(directory, prefix))).sort()) {
    const relative = path.join(prefix, name);
    // The fixture owns this tree. Git operational metadata is not app content.
    if (relative === '.git') continue;
    const stat = await lstat(path.join(directory, relative));
    if (stat.isSymbolicLink()) throw Error('FIXTURE_TREE_CHANGED');
    if (stat.isDirectory()) Object.assign(result, await manifestTree(directory, relative));
    else if (stat.isFile()) result[relative] = digest(await readFile(path.join(directory, relative)));
    else throw Error('FIXTURE_TREE_CHANGED');
  }
  return result;
}

async function makeObservations(directory, revision, configurationDigest, app) {
  const bytes = Buffer.from('DATA-01 simulated inactive setup; no hosted observation or provider action.\n');
  const artifact = path.join(directory, 'saved-setup.txt');
  await writeFile(artifact, bytes, { flag: 'wx' });
  const workers = [];
  for (const [role, files] of Object.entries(workerSources)) {
    const [profile, prompt] = await Promise.all([readFile(path.join(source, files.profile)), readFile(path.join(source, files.prompt))]);
    workers.push({ role, ...structuredClone(fixture.worker_setup[role]), profile_sha256: digest(profile), prompt_sha256: digest(prompt), evidence_ids: ['setup'], capabilities: { status: 'reported_complete', evidence_ids: ['setup'] } });
  }
  return {
    schema: 'pigboard-readiness-observations/v1', revision,
    configuration_digest: configurationDigest, installation_id: fixture.manager_config.manager.installation_id,
    expected_site: 'https://jira.example.invalid', application_path: app,
    application_inspection: { no_skill_copies: true, evidence_ids: ['setup'] },
    artifacts: [{ id: 'setup', path: artifact, sha256: digest(bytes), kind: 'simulated_fixture', observed_at: '2026-11-16T12:00:00Z' }],
    routes: structuredClone(fixture.routes), workers, reviewers: structuredClone(fixture.reviewers),
    acceptance: Object.fromEntries(['installed_package', 'pgb58'].map(key => [key, { result: 'passed', execution: 'simulated', revision, configuration_digest: configurationDigest, installation_id: fixture.manager_config.manager.installation_id, evidence_ids: ['setup'] }])),
  };
}

function assertionsFor(report, specification, variant, before, after, diff, providerTrace) {
  const assertions = Object.entries(specification.expected_checks ?? {}).map(([id, expected]) => ({ id, expected, observed: namedCheck(report, id)?.status ?? null, passed: namedCheck(report, id)?.status === expected }));
  for (const [id, expected] of Object.entries(specification.expected_code ?? {})) assertions.push({ id: `${id}.code`, expected, observed: namedCheck(report, id)?.code ?? null, passed: namedCheck(report, id)?.code === expected });
  if (specification.expected_worker_reason) {
    const reasons = (namedCheck(report, 'C07_WORKERS')?.observed ?? []).flatMap(worker => worker.reasons);
    assertions.push({ id: 'worker_reason', expected: specification.expected_worker_reason, observed: reasons, passed: reasons.includes(specification.expected_worker_reason) });
  }
  if (specification.expected_route_code) {
    const codes = (namedCheck(report, 'C03_ROUTES')?.observed ?? []).map(route => route.code);
    assertions.push({ id: 'route_code', expected: specification.expected_route_code, observed: codes, passed: codes.includes(specification.expected_route_code) });
  }
  if (['complete_external_bundle_inactive_setup', 'two_project_configuration'].includes(variant)) {
    const actual = [...new Set((namedCheck(report, 'C03_ROUTES')?.observed ?? []).map(route => route.stream_key))];
    assertions.push({ id: 'two_project_full_label_identity', expected: fixture.expected.stream_keys, observed: actual, passed: JSON.stringify(actual) === JSON.stringify(fixture.expected.stream_keys) });
    const stages = report.inactive_setup?.projects.map(project => project.routes.map(route => route.stage_id));
    assertions.push({ id: 'native_ordinary_routes', expected: fixture.expected.ordinary_stages, observed: stages ?? null, passed: JSON.stringify(stages) === JSON.stringify(fixture.expected.ordinary_stages) });
  }
  if (variant === 'designated_humans_pending_walkthrough') assertions.push({ id: 'designated_reviewers', expected: fixture.reviewers, observed: report.evidence_layers.human_review?.reviewers ?? null, passed: JSON.stringify(report.evidence_layers.human_review?.reviewers) === JSON.stringify(fixture.reviewers) });
  assertions.push(
    { id: 'all_human_groups_not_run', expected: '4/4 NOT_RUN', observed: report.human_cases, passed: report.human_cases.length === 4 && report.human_cases.every(value => value.status === 'NOT_RUN') },
    { id: 'activation_not_authorized_or_performed', expected: fixture.expected.activation, observed: report.activation, passed: JSON.stringify(report.activation) === JSON.stringify(fixture.expected.activation) },
    { id: 'application_content_unchanged', expected: before, observed: after, passed: JSON.stringify(before) === JSON.stringify(after) && diff === '' },
    { id: 'fixture_provider_trace_empty', expected: [], observed: providerTrace, passed: providerTrace.length === 0 },
  );
  return assertions;
}

async function runVariant(options, group, variant, shared) {
  const specification = fixture.variant_details[variant];
  const directory = path.join(options.output, group, variant);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const record = { case_id: group, variant, human_execution: 'NOT_RUN', preparation_id: 'PREP-01', fixture_id: 'DATA-01', source_revision: shared.sourceRevision, approved_revision: options.revision, provider_calls: [], developer_assertions: [], readiness_report: null };
  const app = path.join(directory, 'application');
  await mkdir(app);
  await writeFile(path.join(app, 'README.md'), 'DATA-01 disposable application; shared skills stay external.\n', { flag: 'wx' });
  await execute('git', ['init', '--quiet'], { cwd: app });
  await execute('git', ['add', 'README.md'], { cwd: app });
  const before = await manifestTree(app);
  const beforeStatus = (await execute('git', ['status', '--porcelain'], { cwd: app })).stdout;
  const observations = await makeObservations(directory, options.revision, fixture.manager_configuration_digest, app);
  if (variant === 'old_worker_contract') observations.workers.find(worker => worker.role === specification.mutation.role).profile_sha256 = specification.mutation.profile_sha256;
  if (variant === 'model_capability_mismatch') {
    const worker = observations.workers.find(worker => worker.role === specification.mutation.role);
    worker.effort = specification.mutation.effort;
    worker.capabilities.status = specification.mutation.capability_status;
  }
  if (variant === 'active_rule_flag') observations.routes[specification.mutation.route_index].jira_rule_enabled = true;
  if (variant === 'absent_installed_acceptance') delete observations.acceptance.installed_package;
  const configPath = path.join(directory, 'config.json');
  const observationsPath = path.join(directory, 'observations.json');
  await writeFile(configPath, JSON.stringify(fixture.manager_config, null, 2) + '\n', { flag: 'wx' });
  await writeFile(observationsPath, JSON.stringify(observations, null, 2) + '\n', { flag: 'wx' });
  let receiptPath = options.release;
  if (variant === 'missing_helper') {
    if (!shared.releaseVerified) {
      record.developer_status = 'pending_prepared_release_verification';
      record.reason = 'The preceding ordinary variant did not verify the actual prepared pinned release. No release was copied or damaged.';
      await writeFile(path.join(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
      return record;
    }
    // Damage only this owned copy of the actual verified release. Preserve
    // relative symlink text in already-prepared dependencies; install nothing.
    const ownedRelease = path.join(directory, 'damaged-release');
    await cp(shared.receipt.release, ownedRelease, { recursive: true, dereference: false, verbatimSymlinks: true });
    await rm(path.join(ownedRelease, specification.mutation.remove_owned_release_path), { recursive: true });
    const receipt = { ...shared.receipt, release: ownedRelease, skills: path.join(ownedRelease, 'skills'), manifest: path.join(ownedRelease, 'manifest.json') };
    receiptPath = path.join(directory, 'damaged-release-receipt.json');
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  }
  const managerRevision = variant === 'old_evidence_revision' ? fixture.manager_evidence.old_revision : options.revision;
  const manifest = structuredClone(fixture.manager_evidence.manifest);
  manifest.source_revision = managerRevision;
  const installation = structuredClone(fixture.manager_evidence.installation);
  installation.manifest = structuredClone(manifest);
  installation.binding.package_revision = managerRevision;
  const health = structuredClone(variant === 'missing_health_resource' ? fixture.manager_evidence.missing_resource_health : fixture.manager_evidence.health);
  if (variant !== 'missing_health_resource') health.current.package_revision = managerRevision;
  const manifestPath = path.join(directory, 'manager-manifest.json'), installationPath = path.join(directory, 'installation.json'), healthPath = path.join(directory, 'health.json');
  for (const [filename, value] of [[manifestPath, manifest], [installationPath, installation], [healthPath, health]]) await writeFile(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const commonArgs = ['--config', configPath, '--release', receiptPath, '--revision', options.revision, '--observations', observationsPath];
  const argv = [...commonArgs, '--package-manifest', manifestPath, '--installation', installationPath, '--health', healthPath, '--json'];
  const result = await runReadinessCommand(argv);
  const report = result.outcome;
  if (namedCheck(report, 'C02_RELEASE')?.status === 'PASS') shared.releaseVerified = true;
  await writeFile(path.join(directory, 'readiness.json'), result.stdout, { flag: 'wx' });
  const after = await manifestTree(app);
  const diff = (await execute('git', ['diff', '--no-ext-diff', '--'], { cwd: app })).stdout;
  const afterStatus = (await execute('git', ['status', '--porcelain'], { cwd: app })).stdout;
  await writeFile(path.join(directory, 'application-diff.txt'), diff, { flag: 'wx' });
  const assertionInput = { before, after, before_status: beforeStatus, after_status: afterStatus };
  await writeFile(path.join(directory, 'application-inspection.json'), JSON.stringify(assertionInput, null, 2) + '\n', { flag: 'wx' });
  const assertions = assertionsFor(report, specification, variant, before, after, diff, record.provider_calls);
  if (specification.expected_health_state) assertions.push({ id: 'saved_health_state', expected: specification.expected_health_state, observed: namedCheck(report, 'C05_HEALTH')?.observed?.state ?? null, passed: namedCheck(report, 'C05_HEALTH')?.observed?.state === specification.expected_health_state });
  if (variant === 'old_evidence_revision') {
    record.additional_runs = [];
    const embeddedArgs = [...commonArgs, '--installation', installationPath, '--health', healthPath, '--json'];
    const embedded = await runReadinessCommand(embeddedArgs);
    await writeFile(path.join(directory, 'readiness-embedded.json'), embedded.stdout, { flag: 'wx' });
    for (const [id, expected] of Object.entries(specification.expected_code)) assertions.push({ id: `embedded.${id}`, expected, observed: namedCheck(embedded.outcome, id)?.code ?? null, passed: namedCheck(embedded.outcome, id)?.status === 'FAIL' && namedCheck(embedded.outcome, id)?.code === expected });
    record.additional_runs.push({ route: 'receipt_embedded_only', invocation: { executable: process.execPath, argv: [path.join(source, 'scripts/check-readiness.mjs'), ...embeddedArgs] }, actual_exit_code: embedded.exitCode, report: path.join(directory, 'readiness-embedded.json') });
    const controlManifest = { ...manifest, source_revision: options.revision }, controlInstallation = { ...installation, manifest: controlManifest, binding: { ...installation.binding, package_revision: options.revision } }, controlHealth = { ...health, current: { ...health.current, package_revision: options.revision } };
    const controlManifestPath = path.join(directory, 'control-manifest.json'), controlInstallationPath = path.join(directory, 'control-installation.json'), controlHealthPath = path.join(directory, 'control-health.json');
    for (const [filename, value] of [[controlManifestPath, controlManifest], [controlInstallationPath, controlInstallation], [controlHealthPath, controlHealth]]) await writeFile(filename, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
    const controlArgs = [...commonArgs, '--package-manifest', controlManifestPath, '--installation', controlInstallationPath, '--health', controlHealthPath, '--json'];
    const control = await runReadinessCommand(controlArgs);
    await writeFile(path.join(directory, 'readiness-control.json'), control.stdout, { flag: 'wx' });
    for (const [id, expected] of Object.entries(specification.control_expected_checks)) assertions.push({ id: `control.${id}`, expected, observed: namedCheck(control.outcome, id)?.status ?? null, passed: namedCheck(control.outcome, id)?.status === expected });
    record.additional_runs.push({ route: 'matching_control', invocation: { executable: process.execPath, argv: [path.join(source, 'scripts/check-readiness.mjs'), ...controlArgs] }, actual_exit_code: control.exitCode, report: path.join(directory, 'readiness-control.json') });
  }
  assertions.push({ id: 'application_git_status_unchanged', expected: beforeStatus, observed: afterStatus, passed: beforeStatus === afterStatus });
  const prerequisite = variant === 'missing_helper' ? shared.releaseVerified : namedCheck(report, 'C02_RELEASE')?.status === 'PASS';
  record.invocation = { executable: process.execPath, argv: [path.join(source, 'scripts/check-readiness.mjs'), ...argv] };
  record.readiness_report = path.join(directory, 'readiness.json');
  record.actual_exit_code = result.exitCode;
  record.developer_assertions = assertions;
  record.developer_status = !prerequisite ? 'pending_prepared_release_verification' : assertions.every(assertion => assertion.passed) ? 'passed_local_assertions' : 'failed_local_assertions';
  record.failure_classification = !prerequisite ? 'setup_or_evidence_gap' : assertions.every(assertion => assertion.passed) ? null : 'requires_contract_classification';
  record.input_hashes = report.evidence_layers.local_compatibility?.input_files ?? [];
  record.qualifications = ['All setup/provider observations are simulated.', 'A caller-generated empty fixture trace is not a live-provider audit.', 'Local developer assertions do not pass human cases or establish actual installed/PGB-58 acceptance.'];
  await writeFile(path.join(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  return record;
}

export async function runFixtureCommand(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { exitCode: 0, stdout: help, outcome: { help } };
  let options;
  try { options = optionsFor(argv); }
  catch { return { exitCode: 2, stdout: 'Use --case or --all, a new absolute --output, an explicit --release receipt and full --revision. Run --help alone.\n', outcome: { status: 'input_error', code: 'USAGE' } }; }
  try {
    const receiptBytes = await readLocalInput(options.release, 'bytes');
    const receipt = parseLocalJSON(receiptBytes);
    if (!receipt || !/^[0-9a-f]{40}$/.test(receipt.commit) || !['release', 'skills', 'manifest'].every(key => typeof receipt[key] === 'string' && path.isAbsolute(receipt[key]))) throw Error('INPUT');
    // Never infer the approved revision from the supplied receipt.
    const sourceRevision = (await execute('git', ['rev-parse', 'HEAD'], { cwd: source })).stdout.trim();
    const { parseConfig } = await import('../lib/config/parse.mjs');
    const config = parseConfig(JSON.stringify(fixture.manager_config));
    if (!config.valid || config.configuration_digest !== fixture.manager_configuration_digest) throw Error('FIXTURE_CONFIG');
    await mkdir(options.output, { mode: 0o700 });
    const shared = { receipt, sourceRevision, releaseVerified: false };
    const selected = fixture.human_cases.filter(group => options.all || group.id === options.case);
    const results = [];
    for (const group of selected) for (const variant of group.variants) results.push(await runVariant(options, group.id, variant, shared));
    const failed = results.some(result => result.developer_status === 'failed_local_assertions');
    const pending = results.some(result => result.developer_status.startsWith('pending_'));
    const outcome = {
      schema: 'pigboard-readiness-fixture-run/v1', status: failed ? 'failed_local_assertions' : pending ? 'incomplete' : 'completed_local_assertions',
      source_revision: sourceRevision, approved_revision: options.revision, invocation: { executable: process.execPath, argv: [path.join(source, 'scripts/test-release-readiness.mjs'), ...argv] },
      fixture_id: 'DATA-01', preparation_id: 'PREP-01', release_receipt: { path: options.release, sha256: digest(receiptBytes) },
      selected_cases: selected.map(group => ({ id: group.id, human_execution: 'NOT_RUN', variants: group.variants, original_human_case: group.original_human_case })),
      developer_results: results, human_cases: humanCaseIds.map(id => ({ id, status: 'NOT_RUN' })),
      preparation: fixture.preparation, data: fixture.data, ai_cases: [], no_ai_cases_reason: fixture.no_ai_cases_reason,
      activation: { authorized: false, performed: false },
      packet_complete: selected.length === 4 && !failed && !pending, limitations: ['Provider/installation/health observations are literal simulations, with actual prepared skill-release verification kept separate.', 'Developer assertions never establish actual installed/PGB-58 acceptance or human PASS.'],
      cleanup: { owner: 'human QA reviewer', retain: 'Retain this exact evidence directory first.', remove_only: options.output, live_changes: 'none authorized; do not change live records/resources' },
    };
    await writeFile(path.join(options.output, 'fixture-run.json'), JSON.stringify(outcome, null, 2) + '\n', { flag: 'wx' });
    return { exitCode: failed || pending ? 1 : 0, stdout: JSON.stringify(outcome, null, 2) + '\n', outcome };
  } catch {
    return { exitCode: 2, stdout: 'Fixture input/setup failed. Retain any existing output and inspect the explicit prepared receipt, source dependencies and NEW output path; no setup repair was attempted.\n', outcome: { status: 'input_error', code: 'FIXTURE_INPUT_OR_SETUP', output: options.output } };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runFixtureCommand(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}
