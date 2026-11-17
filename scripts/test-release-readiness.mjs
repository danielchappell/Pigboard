#!/usr/bin/env node
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
The unpublished milestone still has pending actual package/health fixture integration.
--help alone displays this text. No live mode, provider calls, scans or activation.
`;

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
    configuration_digest: configurationDigest, installation_id: 'dummy-installation',
    expected_site: 'https://jira.example.invalid', application_path: app,
    application_inspection: { no_skill_copies: true, evidence_ids: ['setup'] },
    artifacts: [{ id: 'setup', path: artifact, sha256: digest(bytes), kind: 'simulated_fixture', observed_at: '2026-11-16T12:00:00Z' }],
    routes: structuredClone(fixture.routes), workers, reviewers: structuredClone(fixture.reviewers),
    acceptance: Object.fromEntries(['installed_package', 'pgb58'].map(key => [key, { result: 'passed', execution: 'simulated', revision, configuration_digest: configurationDigest, installation_id: 'dummy-installation', evidence_ids: ['setup'] }])),
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
  if (specification.pending_contract) {
    record.developer_status = 'pending_supplier_contract';
    record.reason = specification.reason;
    await writeFile(path.join(directory, 'result.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
    return record;
  }
  const app = path.join(directory, 'application');
  await mkdir(app);
  await writeFile(path.join(app, 'README.md'), 'DATA-01 disposable application; shared skills stay external.\n', { flag: 'wx' });
  await execute('git', ['init', '--quiet'], { cwd: app });
  await execute('git', ['add', 'README.md'], { cwd: app });
  const before = await manifestTree(app);
  const beforeStatus = (await execute('git', ['status', '--porcelain'], { cwd: app })).stdout;
  const observations = await makeObservations(directory, options.revision, fixture.configuration_digest, app);
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
  await writeFile(configPath, JSON.stringify(fixture.config, null, 2) + '\n', { flag: 'wx' });
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
  const argv = ['--config', configPath, '--release', receiptPath, '--revision', options.revision, '--observations', observationsPath, '--json'];
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
    const config = parseConfig(JSON.stringify(fixture.config));
    if (!config.valid || config.configuration_digest !== fixture.configuration_digest) throw Error('FIXTURE_CONFIG');
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
      packet_complete: false, limitations: ['Actual C04/C05 package/installation/health fixture composition remains pending.', 'No full packet PASS or human acceptance is claimed.'],
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
