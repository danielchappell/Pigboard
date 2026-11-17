import { constants } from 'node:fs';
import { open, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalize from 'canonicalize';
import { validateManifest, deriveHostControls } from '../aws/installation.mjs';
import { validBinding } from '../state/contract.mjs';
import { evidenceRevision, METRICS } from '../manager/health.mjs';
import { parseContract } from '../contracts/work.mjs';

const execute = promisify(execFile);
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const HASH = /^[0-9a-f]{64}$/;
const LIMIT = 1048576;
const roles = ['implementer', 'reviewer', 'qa'];
export const workerSources = Object.freeze({
  implementer: { profile: 'skills/implementer-entrypoint/references/cursor.md', prompt: 'config/cursor/implementer-prompt.txt', stage: 'In Progress', outcome: 'In Review' },
  reviewer: { profile: 'skills/pigboard-pr-review/references/cursor.md', prompt: 'config/cursor/pr-review-prompt.txt', stage: 'In Review', outcome: 'QA' },
  qa: { profile: 'skills/qa-entrypoint/references/cursor.md', prompt: 'config/cursor/qa-prompt.txt', stage: 'QA', outcome: 'Human Review' },
});
export const humanCaseIds = Object.freeze(['R1-20-H01', 'R1-20-H02', 'R1-20-H03', 'R1-20-H04']);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 255 && !/[\u0000-\u001f\u007f]/u.test(value);
const identity = value => typeof value === 'string' && /^[0-9]{1,255}$/.test(value);
const closed = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const references = value => Array.isArray(value) && value.every(text) && new Set(value).size === value.length;
const absolute = value => typeof value === 'string' && path.isAbsolute(value);
const inputError = () => Object.assign(new Error('INPUT_INVALID'), { code: 'INPUT_INVALID' });

function boundValue(value, depth = 0) {
  if (depth > 16 || Array.isArray(value) && value.length > 1000) throw inputError();
  if (value && typeof value === 'object') for (const child of Object.values(value)) boundValue(child, depth + 1);
}

// Regular files only; a FIFO must not hang a noninteractive invocation.
export async function readLocalInput(filename, json = true) {
  if (!absolute(filename)) throw inputError();
  let file;
  try {
    file = await open(filename, constants.O_RDONLY | constants.O_NONBLOCK);
    if (!(await file.stat()).isFile()) throw inputError();
    const buffer = Buffer.alloc(LIMIT + 1);
    let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await file.read(buffer, count, buffer.length - count, null);
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count > LIMIT) throw inputError();
    const bytes = buffer.subarray(0, count);
    if (json === 'bytes') return bytes;
    if (!json) return bytes.toString('utf8');
    return parseLocalJSON(bytes);
  } catch { throw inputError(); }
  finally { await file?.close(); }
}

export function parseLocalJSON(bytes) {
  try {
    if (Buffer.byteLength(bytes) > LIMIT) throw inputError();
    const value = JSON.parse(bytes.toString('utf8'));
    boundValue(value);
    return value;
  } catch { throw inputError(); }
}

export function validateObservations(value) {
  boundValue(value);
  if (Buffer.byteLength(JSON.stringify(value)) > LIMIT || !closed(value, ['schema', 'revision', 'configuration_digest', 'installation_id', 'expected_site', 'application_path', 'application_inspection', 'artifacts', 'routes', 'workers', 'acceptance', 'reviewers']) || value.schema !== 'pigboard-readiness-observations/v1' || !SHA.test(value.revision) || !DIGEST.test(value.configuration_digest) || !text(value.installation_id)) throw inputError();
  if (value.expected_site !== undefined && typeof value.expected_site !== 'string' || value.application_path !== undefined && !absolute(value.application_path)) throw inputError();
  for (const key of ['artifacts', 'routes', 'workers']) if (value[key] !== undefined && !Array.isArray(value[key])) throw inputError();
  for (const artifact of value.artifacts ?? []) {
    if (!closed(artifact, ['id', 'path', 'sha256', 'kind', 'observed_at']) || !text(artifact.id) || !absolute(artifact.path) || !HASH.test(artifact.sha256) || !['original_observation', 'simulated_fixture'].includes(artifact.kind) || !text(artifact.observed_at)) throw inputError();
  }
  if (new Set((value.artifacts ?? []).map(item => item.id)).size !== (value.artifacts ?? []).length) throw inputError();
  const ids = new Set((value.artifacts ?? []).map(item => item.id));
  const refs = list => references(list) && list.every(id => ids.has(id));
  if (value.application_inspection !== undefined && (!closed(value.application_inspection, ['no_skill_copies', 'evidence_ids']) || typeof value.application_inspection.no_skill_copies !== 'boolean' || !refs(value.application_inspection.evidence_ids))) throw inputError();
  for (const route of value.routes ?? []) {
    if (!closed(route, ['project_id', 'full_label', 'role', 'story_type_id', 'bug_type_id', 'stage_id', 'jira_rule_enabled', 'cursor_automation_enabled', 'evidence_ids']) || !identity(route.project_id) || !text(route.full_label) || !roles.includes(route.role) || !identity(route.story_type_id) || !identity(route.bug_type_id) || !identity(route.stage_id) || !refs(route.evidence_ids)) throw inputError();
    for (const flag of ['jira_rule_enabled', 'cursor_automation_enabled']) if (route[flag] !== undefined && typeof route[flag] !== 'boolean') throw inputError();
  }
  for (const worker of value.workers ?? []) {
    if (!closed(worker, ['role', 'profile_sha256', 'prompt_sha256', 'model', 'effort', 'fast', 'phase_bindings', 'capabilities', 'evidence_ids']) || !roles.includes(worker.role) || !HASH.test(worker.profile_sha256) || !HASH.test(worker.prompt_sha256) || !text(worker.model) || !['High', 'Medium'].includes(worker.effort) || typeof worker.fast !== 'boolean' || !refs(worker.evidence_ids)) throw inputError();
    if (!closed(worker.capabilities, ['status', 'evidence_ids']) || !['reported_complete', 'partial', 'missing'].includes(worker.capabilities.status) || !refs(worker.capabilities.evidence_ids)) throw inputError();
    if (worker.phase_bindings !== undefined && !Array.isArray(worker.phase_bindings)) throw inputError();
    for (const phase of worker.phase_bindings ?? []) {
      if (!closed(phase, ['phase', 'subagent_type', 'model', 'machine', 'foreground', 'fresh_context', 'accepted_agent_id', 'setup_evidence_ids', 'telemetry']) || !['review', 'execution'].includes(phase.phase) || !text(phase.subagent_type) || !text(phase.model) || !text(phase.machine) || typeof phase.foreground !== 'boolean' || typeof phase.fresh_context !== 'boolean' || !text(phase.accepted_agent_id) || !refs(phase.setup_evidence_ids) || !(phase.telemetry === 'not_returned' || closed(phase.telemetry, ['model', 'effort']) && text(phase.telemetry.model) && text(phase.telemetry.effort))) throw inputError();
    }
  }
  if (value.acceptance !== undefined) {
    if (!closed(value.acceptance, ['installed_package', 'pgb58'])) throw inputError();
    for (const acceptance of Object.values(value.acceptance)) {
      if (!closed(acceptance, ['result', 'execution', 'revision', 'configuration_digest', 'installation_id', 'evidence_ids']) || !['passed', 'failed', 'partial', 'not_run'].includes(acceptance.result) || !['actual_installed', 'simulated', 'local_only'].includes(acceptance.execution) || !SHA.test(acceptance.revision) || !DIGEST.test(acceptance.configuration_digest) || !text(acceptance.installation_id) || !refs(acceptance.evidence_ids)) throw inputError();
    }
  }
  if (value.reviewers !== undefined && (!closed(value.reviewers, ['developer', 'human_qa']) || Object.values(value.reviewers).some(value => !text(value)))) throw inputError();
  return value;
}

function add(report, id, status, code, expected, observed, evidence, next) {
  const check = { id, status, code, expected, observed, evidence, next_step: next };
  report.checks.push(check);
  return check;
}

function finish(report) {
  const states = report.checks.filter(check => check.id !== 'C08_PGB58').map(check => check.status);
  report.exit_code = states.includes('ERROR') ? 2 : states.some(state => state !== 'PASS') ? 1 : 0;
  report.status = states.includes('ERROR') ? 'input_error' : states.includes('FAIL') ? 'incompatible' : states.includes('UNVERIFIED') ? 'unverified' : 'compatible_supplied_evidence';
  return report;
}

export function emptyReadiness(revision = null) {
  return {
    schema: 'pigboard-release-readiness/v1', status: 'input_error', exit_code: 2,
    revision, configuration_digest: null, checks: [], inactive_setup: null,
    evidence_layers: {}, human_cases: humanCaseIds.map(id => ({ id, status: 'NOT_RUN' })),
    activation: { authorized: false, performed: false },
    limitations: [
      'Supplied observations are not authenticated or refreshed by this local checker.',
      'Compatible supplied evidence does not establish current cloud readiness, human acceptance or activation authority.',
      'Release verification executes prepared local dependency code and creates/removes disposable smoke inputs.',
    ],
  };
}

function managerEvidence(report, inputs) {
  const receipt = inputs.installation;
  const invalidInstallation = receipt !== undefined && !object(receipt);
  const objectReceipt = object(receipt) ? receipt : undefined;
  const manifest = inputs.packageManifest !== undefined ? inputs.packageManifest : objectReceipt?.manifest;
  const context = { manifest, binding: objectReceipt?.binding, projection: null, packagePassed: false, installationPassed: false };
  if (manifest === undefined) add(report, 'C04_PACKAGE', 'UNVERIFIED', 'EVIDENCE_MISSING', 'matching approved ordinary manager manifest', null, [], 'Supply a manager package manifest or the full successful installation receipt.');
  else if (!object(manifest) || !SHA.test(manifest.source_revision) || !DIGEST.test(manifest.configuration_digest) || !text(manifest.installation_id) || !text(manifest.domain_id) || !text(manifest.installation_generation) || !Array.isArray(manifest.logical_resources) || !manifest.logical_resources.every(text)) {
    add(report, 'C04_PACKAGE', 'ERROR', 'PACKAGE_INPUT_INVALID', 'complete declared manager manifest', null, [], 'Supply the actual complete saved package manifest; do not reconstruct it from partial output.');
  }
  else {
    let projection, error = null;
    try {
      boundValue(manifest);
      projection = validateManifest(manifest, inputs.configText);
      // The supplier validates format/configuration. This comparator owns the
      // additional equality with the operator-approved skill/source revision.
      context.projection = deriveHostControls(inputs.configText, { package_revision: manifest.source_revision });
    } catch { error = 'MANAGER_PACKAGE_CONFIG_MISMATCH'; }
    const approved = manifest.source_revision === report.revision;
    const resources = ['Function', 'Schedule', 'LogGroup', 'StateTable', 'RuntimeRole', 'SchedulerRole'];
    const metadataValid = object(manifest.payload_hashes) && object(manifest.dependency_hashes) && Object.values(manifest.payload_hashes).every(value => DIGEST.test(value)) && Object.values(manifest.dependency_hashes).every(value => DIGEST.test(value)) && DIGEST.test(manifest.zip_digest);
    let canonicalMatches = false;
    try { canonicalMatches = canonicalize(manifest.canonical_config) === canonicalize(parseContract(inputs.configText)) && projection?.configuration_digest === report.configuration_digest; } catch { /* Invalid canonical metadata is a mismatch. */ }
    const inactive = projection?.control.schedule_enabled === false && projection?.control.writes_enabled === false;
    const supported = manifest.schema === 'pigboard-manager-package/v1' && manifest.sender === true && manifest.runtime === 'nodejs24.x' && Array.isArray(manifest.logical_resources) && canonicalize([...manifest.logical_resources].sort()) === canonicalize([...resources].sort());
    const code = !approved ? 'MANAGER_REVISION_MISMATCH' : error ?? (!supported ? 'ORDINARY_PACKAGE_REQUIRED' : !metadataValid || !canonicalMatches ? 'PACKAGE_METADATA_MISMATCH' : !inactive ? 'ACTIVE_DESIRED_CONTROLS' : 'APPROVED_ORDINARY_PACKAGE_MATCHED');
    context.packagePassed = approved && !error && supported && metadataValid && canonicalMatches && inactive;
    add(report, 'C04_PACKAGE', context.packagePassed ? 'PASS' : 'FAIL', code,
      { source_revision: report.revision, runtime: 'nodejs24.x', sender: true, schedule_enabled: false, writes_enabled: false },
      { source_revision: manifest.source_revision, configuration_digest: manifest.configuration_digest, installation_id: manifest.installation_id, domain_id: manifest.domain_id, installation_generation: manifest.installation_generation, runtime: manifest.runtime === 'nodejs24.x' ? manifest.runtime : 'unsupported', sender: manifest.sender === true, logical_resources: resources.filter(resource => manifest.logical_resources.includes(resource)), controls: projection?.control ?? null, activation_declarations: projection?.activation ?? null, metadata: metadataValid ? { payload_hashes: manifest.payload_hashes, dependency_hashes: manifest.dependency_hashes, zip_digest: manifest.zip_digest } : null }, [],
      !approved ? 'Supply the manager package/receipt at the same operator-approved revision as the skills.' : context.packagePassed ? 'Retain package metadata; it does not independently hash deployed Lambda code or prove installed acceptance.' : 'Compare the ordinary package and inactive controls with the canonical configuration; use the existing installation guide.');
  }
  if (invalidInstallation) add(report, 'C04_INSTALLATION', 'ERROR', 'INSTALLATION_INPUT_INVALID', 'complete saved successful installation receipt', null, [], 'Supply the complete saved successful installation receipt.');
  else if (receipt === undefined) add(report, 'C04_INSTALLATION', 'UNVERIFIED', 'EVIDENCE_MISSING', 'full successful installation receipt', null, [], 'Supply the saved pigboard-installation-receipt/v1; package compatibility alone is not installed binding.');
  else {
    let matches = false;
    try {
      const binding = receipt.binding, projection = context.projection;
      matches = receipt.schema === 'pigboard-installation-receipt/v1' && object(receipt.original) && text(receipt.observed_at) && projection && validBinding(binding, projection.control) &&
        binding.package_revision === manifest.source_revision && binding.package_revision === report.revision &&
        binding.installation_id === projection.installation_id && binding.domain_id === projection.domain_id && binding.configuration_digest === projection.configuration_digest &&
        deriveHostControls(inputs.configText, { package_revision: manifest.source_revision, binding }) &&
        binding.installation_generation === manifest.installation_generation && canonicalize(receipt.manifest) === canonicalize(manifest) &&
        ['stack_id', 'table_name', 'table_arn', 'installation_generation'].every(key => receipt.original[key] === binding[key]);
    } catch { /* A recovery envelope or invalid binding is never a successful receipt. */ }
    const revisionMismatch = manifest && manifest.source_revision !== report.revision || receipt.binding?.package_revision !== report.revision;
    context.installationPassed = !!matches && context.packagePassed;
    add(report, 'C04_INSTALLATION', context.installationPassed ? 'PASS' : 'FAIL', revisionMismatch ? 'MANAGER_REVISION_MISMATCH' : receipt.schema !== 'pigboard-installation-receipt/v1' ? 'SUCCESSFUL_RECEIPT_REQUIRED' : context.installationPassed ? 'SUPPLIED_INSTALLATION_MATCHED' : 'INSTALLATION_BINDING_MISMATCH', { package_revision: report.revision, successful_receipt: true },
      { schema: receipt.schema === 'pigboard-installation-receipt/v1' ? receipt.schema : 'unsupported_or_recovery', binding: matches ? receipt.binding : null, observed_at: text(receipt.observed_at) ? receipt.observed_at : null, package_revision: SHA.test(receipt.binding?.package_revision) ? receipt.binding.package_revision : null }, [],
      context.installationPassed ? 'Retain this supplied binding; authenticity and current deployed state are not reobserved.' : 'Supply the matching full successful receipt. For publication failure retain the emitted receipt; do not repeat configure or reconstruct recovery authority.');
  }
  return context;
}

function savedHealth(report, input, context) {
  if (input === undefined) return add(report, 'C05_HEALTH', 'UNVERIFIED', 'EVIDENCE_MISSING', 'saved basic-health report for the same approved installation', null, [], 'Supply saved manager-health output from a separately authorized read; readiness never runs the reader.');
  if (!object(input) || input.schema !== 'pigboard-manager-health/v1' || !object(input.current) || !['healthy', 'disabled', 'degraded', 'stale', 'starting', 'unknown'].includes(input.state) || ![0, 1, 2].includes(input.exit_code) || !text(input.observed_at) || [input.desired_enabled, input.observed_enabled].some(value => value !== null && typeof value !== 'boolean') || input.applied_controls !== null && !object(input.applied_controls) || input.query_coverage !== null && !object(input.query_coverage) || input.metric_evidence !== null && !object(input.metric_evidence)) return add(report, 'C05_HEALTH', 'ERROR', 'HEALTH_INPUT_INVALID', 'complete pigboard-manager-health/v1 shape', null, [], 'Supply the complete original health-reader JSON output.');
  const current = input.current ?? {}, reasons = [];
  let failed = false, incomplete = !context.packagePassed || !context.installationPassed;
  const expected = { package_revision: report.revision, installation_id: context.projection?.installation_id ?? null, configuration_digest: report.configuration_digest };
  for (const [key, value] of Object.entries(expected)) {
    if (current[key] == null || value == null) { incomplete = true; reasons.push('HEALTH_IDENTITY_MISSING'); }
    else if (current[key] !== value) { failed = true; reasons.push(key === 'package_revision' ? 'MANAGER_REVISION_MISMATCH' : 'HEALTH_IDENTITY_MISMATCH'); }
  }
  if (context.manifest && context.manifest.source_revision !== report.revision) { failed = true; reasons.push('MANAGER_REVISION_MISMATCH'); }
  const computed = evidenceRevision(current);
  if (current.evidence_revision === undefined) { incomplete = true; reasons.push('EVIDENCE_REVISION_MISSING'); }
  else if (current.evidence_revision !== computed) { failed = true; reasons.push('HEALTH_EVIDENCE_REVISION_MISMATCH'); }
  const noEpoch = current.health_generation === null && current.health_enabled_at === null;
  if (!noEpoch && (!text(current.health_generation) || !text(current.health_enabled_at))) { incomplete = true; reasons.push('HEALTH_EPOCH_INCOMPLETE'); }
  const flags = [input.desired_enabled, input.observed_enabled, input.applied_controls?.schedule_enabled, input.applied_controls?.writes_enabled];
  if (flags.some(flag => flag === true) || Number.isFinite(input.writes) && input.writes > 0) { failed = true; reasons.push('ACTIVE_HEALTH_CONTROLS'); }
  if (flags.some(flag => flag !== false) || input.writes !== 0 || input.worker_health !== 'not_observed' || input.query_coverage?.complete !== true || input.state !== 'disabled' || input.exit_code !== 0) { incomplete = true; reasons.push('INACTIVE_HEALTH_NOT_CONFIRMED'); }
  if (!noEpoch && (input.metric_evidence?.status !== 'observed' || !METRICS.every(name => object(input.metric_evidence.metrics?.[name])))) { incomplete = true; reasons.push('METRIC_COVERAGE_INCOMPLETE'); }
  if (noEpoch && !(computed === null && ['not_applicable', 'observed'].includes(input.metric_evidence?.status))) { incomplete = true; reasons.push('INITIAL_DISABLED_METRIC_EVIDENCE_MISSING'); }
  const status = failed ? 'FAIL' : incomplete ? 'UNVERIFIED' : 'PASS';
  return add(report, 'C05_HEALTH', status, reasons.includes('MANAGER_REVISION_MISMATCH') ? 'MANAGER_REVISION_MISMATCH' : status === 'PASS' ? 'SUPPLIED_INACTIVE_HEALTH_MATCHED' : 'SAVED_HEALTH_REQUIRES_ATTENTION', expected,
    { current: { installation_id: current.installation_id ?? null, package_revision: current.package_revision ?? null, configuration_digest: current.configuration_digest ?? null, health_generation: current.health_generation ?? null, health_enabled_at: current.health_enabled_at ?? null, evidence_revision: current.evidence_revision ?? null }, observed_at: input.observed_at ?? null, state: input.state ?? null, exit_code: input.exit_code ?? null, desired_enabled: input.desired_enabled ?? null, observed_enabled: input.observed_enabled ?? null, applied_controls: input.applied_controls ?? null, query_coverage: input.query_coverage ?? null, metric_evidence: input.metric_evidence ?? null, reasons: input.reasons ?? [], omissions: input.omissions ?? [], links: input.links ?? {}, writes: input.writes ?? null, worker_health: input.worker_health ?? null, comparison_reasons: [...new Set(reasons)] }, [],
    status === 'PASS' ? 'Retain the producer observation time/query window; this local comparison does not refresh or authenticate it.' : 'Inspect the saved health omissions and the same installation through the separate authorized health guide; do not start a scan or invent missing resources.');
}

async function checkRelease(report, receipt, revision) {
  if (!object(receipt) || !SHA.test(receipt.commit) || !['release', 'skills', 'manifest'].every(key => absolute(receipt[key]))) {
    add(report, 'C02_RELEASE', 'ERROR', 'RELEASE_RECEIPT_INVALID', { commit: revision, paths: 'absolute' }, null, [], 'Supply the complete skill-release receipt for the approved revision.');
    return false;
  }
  const receiptMatches = receipt.commit === revision;
  if (!receiptMatches) add(report, 'C02_RELEASE_IDENTITY', 'FAIL', 'SKILL_REVISION_MISMATCH', revision, receipt.commit, [], 'Supply the actual prepared skill receipt at the operator-approved revision.');
  try {
    const [head, status] = await Promise.all([
      execute('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot }),
      execute('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: sourceRoot }),
    ]);
    if (head.stdout.trim() !== revision || status.stdout.trim()) {
      add(report, 'C02_RELEASE', 'ERROR', 'APPROVED_SOURCE_REQUIRED', { revision, clean: true }, { source_revision: SHA.test(head.stdout.trim()) ? head.stdout.trim() : null, source_clean: !status.stdout.trim() }, [], 'Use a clean source checkout and an already-prepared external release at the exact approved revision.');
      return false;
    }
    let file, manifest;
    try {
      file = await open(receipt.manifest, constants.O_RDONLY | constants.O_NONBLOCK);
      if (!(await file.stat()).isFile()) throw inputError();
      // Preserve the existing release catalogue format and size; user note-file
      // limits must not truncate a legitimate complete installer manifest.
      manifest = JSON.parse(await file.readFile('utf8'));
    } finally { await file?.close(); }
    if (!receiptMatches || manifest.commit !== revision) {
      add(report, 'C02_RELEASE', 'FAIL', 'RELEASE_MANIFEST_REVISION_MISMATCH', revision, { receipt_matches: receiptMatches, manifest_matches: manifest.commit === revision }, [], 'Supply the matching approved receipt and complete release manifest.');
      return false;
    }
    const { verifyRelease } = await import('../../scripts/install-cursor-skills.mjs');
    const verification = await verifyRelease(receipt);
    add(report, 'C02_RELEASE', 'PASS', 'PINNED_RELEASE_VERIFIED', { revision }, verification, [{ kind: 'local_release', path: receipt.manifest }], 'Retain this exact receipt and verification result.');
    return true;
  } catch {
    add(report, 'C02_RELEASE', 'ERROR', 'RELEASE_VERIFICATION_UNAVAILABLE', { revision }, null, [], 'Inspect the existing installer verification and prepared dependency prerequisites; retain the previous Build.');
    return false;
  }
}

async function externalPlacement(report, receipt, observations) {
  if (!observations?.application_path) return add(report, 'C02_EXTERNAL_PLACEMENT', 'UNVERIFIED', 'APPLICATION_LOCATION_MISSING', 'external release and skills', null, [], 'Supply the application location and saved application inspection.');
  try {
    const app = await realpath(observations.application_path);
    const files = await Promise.all([realpath(receipt.release), realpath(receipt.skills)]);
    const outside = files.every(file => { const relative = path.relative(app, file); return relative !== '' && (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)); });
    return add(report, 'C02_EXTERNAL_PLACEMENT', outside ? 'PASS' : 'FAIL', outside ? 'EXTERNAL_RELEASE' : 'APPLICATION_LOCAL_RELEASE', 'outside application repository', outside ? 'external' : 'inside application', [], 'Keep complete shared skills outside application repositories; inspect app copies separately.');
  } catch {
    return add(report, 'C02_EXTERNAL_PLACEMENT', 'ERROR', 'PLACEMENT_INPUT_UNREADABLE', 'readable local locations', null, [], 'Supply existing readable application and release paths.');
  }
}

async function inspectArtifacts(observations) {
  const results = [];
  for (const artifact of observations?.artifacts ?? []) {
    try {
      const bytes = await readLocalInput(artifact.path, 'bytes');
      results.push({ ...artifact, status: hash(bytes) === artifact.sha256 ? 'PASS' : 'FAIL' });
    } catch { results.push({ ...artifact, status: 'ERROR' }); }
  }
  return results;
}

function evidenceState(ids, artifacts, original = false) {
  if (!ids?.length) return false;
  return ids.every(id => artifacts.some(artifact => artifact.id === id && artifact.status === 'PASS' && (!original || artifact.kind === 'original_observation')));
}

function inspectRoutes(report, parsed, observations, artifacts, projectHelpers, observationsMatch) {
  if (!parsed?.valid) return add(report, 'C03_ROUTES', 'UNVERIFIED', 'CONFIGURATION_REQUIRED', 'valid canonical scope', null, [], 'Correct canonical configuration before comparing saved routes.');
  const scope = parsed.resolved_scope;
  const rows = [];
  const supplied = observations?.routes ?? [];
  for (const route of supplied) {
    const project = scope.projects.find(project => project.id === route.project_id);
    let stream;
    try { stream = projectHelpers.inspectStreams(scope, route.full_label).find(stream => stream.project_id === route.project_id); }
    catch { /* Invalid full labels are failed comparisons, not missing routes. */ }
    const key = JSON.stringify([route.project_id, route.role, route.full_label]);
    const duplicated = supplied.filter(value => JSON.stringify([value.project_id, value.role, value.full_label]) === key).length > 1;
    const active = route.jira_rule_enabled === true || route.cursor_automation_enabled === true;
    const mismatch = !project || !stream?.mapped || duplicated || route.story_type_id !== project.types.story || route.bug_type_id !== project.types.bug || route.stage_id !== project.stages[workerSources[route.role].stage];
    const complete = observationsMatch && evidenceState(route.evidence_ids, artifacts) && route.jira_rule_enabled === false && route.cursor_automation_enabled === false;
    rows.push({ project_id: route.project_id, full_label: route.full_label, role: route.role, stream_key: stream?.key ?? null, status: active || mismatch ? 'FAIL' : complete ? 'PASS' : 'UNVERIFIED', code: active ? 'ACTIVE_TRIGGER' : mismatch ? 'ROUTE_MISMATCH' : complete ? 'INACTIVE_ROUTE_MATCHED' : 'ROUTE_EVIDENCE_MISSING', evidence_ids: route.evidence_ids });
  }
  for (const project of scope.projects) for (const role of roles) {
    if (!supplied.some(route => route.project_id === project.id && route.role === role)) rows.push({ project_id: project.id, role, full_label: null, stream_key: null, status: 'UNVERIFIED', code: 'PROJECT_ROLE_MISSING', evidence_ids: [] });
  }
  rows.sort((a, b) => a.project_id.localeCompare(b.project_id) || roles.indexOf(a.role) - roles.indexOf(b.role) || (a.full_label ?? '').localeCompare(b.full_label ?? ''));
  const state = rows.some(row => row.status === 'FAIL') ? 'FAIL' : rows.some(row => row.status !== 'PASS') ? 'UNVERIFIED' : 'PASS';
  add(report, 'C03_ROUTES', state, state === 'PASS' ? 'ALL_INACTIVE_ROUTES_MATCHED' : 'SAVED_ROUTES_REQUIRE_ATTENTION', 'Story/Bug ordinary routes and both flags false for every project', rows, [], 'Compare each project and full numbered label with the canonical inactive projection; keep hosted triggers inactive.');
}

function suppliedAcceptance(report, key, observations, artifacts, observationsMatch, context) {
  const value = observations?.acceptance?.[key];
  const matched = value && observationsMatch && value.revision === report.revision && value.configuration_digest === report.configuration_digest && value.installation_id === observations.installation_id;
  const compatible = matched && context.installationPassed && value.result === 'passed' && value.execution === 'actual_installed' && evidenceState(value.evidence_ids, artifacts, true);
  const status = value && observationsMatch && !matched || matched && value.result === 'failed' ? 'FAIL' : compatible ? 'PASS' : 'UNVERIFIED';
  const layer = { status: compatible ? 'supplied_compatible' : 'unverified', supplied: value ? { ...value } : null, installed_binding: context.installationPassed ? 'supplied_compatible' : 'UNVERIFIED' };
  add(report, key === 'pgb58' ? 'C08_PGB58' : 'C08_INSTALLED_ACCEPTANCE', status, compatible ? 'SUPPLIED_ACTUAL_ACCEPTANCE_MATCHED' : value && observationsMatch && !matched ? 'ACCEPTANCE_IDENTITY_MISMATCH' : value ? 'ACCEPTANCE_REQUIRES_MATCHED_ORIGINAL_INSTALLED_EVIDENCE' : 'ACCEPTANCE_MISSING', 'matching actual-installed original observations', layer, value?.evidence_ids ?? [], key === 'pgb58' ? 'Retain separate PGB-58 delivery acceptance; local fixtures cannot satisfy it.' : 'Supply original installed-package acceptance and its matching successful installation receipt.');
  return layer;
}

async function inspectWorkers(report, observations, artifacts, releaseVerified, observationsMatch, receipt) {
  const supplied = observations?.workers ?? [];
  const results = [];
  for (const role of roles) {
    const candidates = supplied.filter(worker => worker.role === role);
    const worker = candidates[0];
    let profileHash = null, promptHash = null;
    try {
      // A verified release supplies complete profile bytes. Prompts belong to the
      // same approved source checkout; they are deliberately outside the bundle.
      const profilePath = releaseVerified ? path.join(receipt.skills, workerSources[role].profile.slice('skills/'.length)) : path.join(sourceRoot, workerSources[role].profile);
      [profileHash, promptHash] = await Promise.all([readFile(profilePath).then(hash), readFile(path.join(sourceRoot, workerSources[role].prompt)).then(hash)]);
    } catch { /* Missing source/setup bytes remain explicit below. */ }
    const reasons = [];
    let failed = false, incomplete = !releaseVerified || !observationsMatch;
    if (candidates.length > 1) { failed = true; reasons.push('DUPLICATE_WORKER_ROLE'); }
    if (!worker) { incomplete = true; reasons.push('WORKER_OBSERVATION_MISSING'); }
    else {
      if (!profileHash || !promptHash) { incomplete = true; reasons.push('PINNED_PROFILE_UNREADABLE'); }
      if (releaseVerified && (worker.profile_sha256 !== profileHash || worker.prompt_sha256 !== promptHash)) { failed = true; reasons.push('WORKER_CONTRACT_MISMATCH'); }
      if (!/^grok[- ]/i.test(worker.model) || worker.effort !== 'High' || worker.fast !== false) { failed = true; reasons.push('WORKER_SELECTION_MISMATCH'); }
      if (!evidenceState(worker.evidence_ids, artifacts)) { incomplete = true; reasons.push('SETUP_EVIDENCE_MISSING'); }
      if (worker.capabilities.status !== 'reported_complete' || !evidenceState(worker.capabilities.evidence_ids, artifacts)) { incomplete = true; reasons.push('CAPABILITY_COVERAGE_INCOMPLETE'); }
      if (role === 'implementer') {
        if (worker.model !== 'grok-4.7-high') { failed = true; reasons.push('IMPLEMENTER_PARENT_SELECTION_MISMATCH'); }
        for (const [phase, model, effort] of [['review', 'grok-4.7-high', 'High'], ['execution', 'grok-4.7-medium', 'Medium']]) {
          const bindings = (worker.phase_bindings ?? []).filter(binding => binding.phase === phase);
          const binding = bindings[0];
          if (!binding || !evidenceState(binding.setup_evidence_ids, artifacts)) { incomplete = true; reasons.push(`${phase.toUpperCase()}_ACCEPTED_BINDING_MISSING`); }
          if (bindings.length > 1 || binding && (binding.subagent_type !== 'generalPurpose' || binding.model !== model || binding.machine !== 'same_machine' || binding.foreground !== true || phase === 'review' && binding.fresh_context !== true)) { failed = true; reasons.push(`${phase.toUpperCase()}_BINDING_MISMATCH`); }
          if (binding?.telemetry !== undefined && binding.telemetry !== 'not_returned' && (binding.telemetry.model !== model || binding.telemetry.effort !== effort)) { failed = true; reasons.push(`${phase.toUpperCase()}_TELEMETRY_CONFLICT`); }
        }
        const [review, execution] = ['review', 'execution'].map(phase => worker.phase_bindings?.find(binding => binding.phase === phase));
        if (review && execution && review.accepted_agent_id === execution.accepted_agent_id) { failed = true; reasons.push('REVIEW_CONTEXT_NOT_INDEPENDENT'); }
      }
    }
    results.push({ role, status: failed ? 'FAIL' : incomplete ? 'UNVERIFIED' : 'PASS', reasons, expected: { ...workerSources[role], profile_sha256: profileHash, prompt_sha256: promptHash }, observed: worker ?? null,
      qualification: { profile_hash_source: releaseVerified ? 'verified_release' : 'unverified_source_checkout', model_observation: 'caller_supplied_setup_selection', latest_availability: 'not_reobserved', capability_completeness: 'caller_supplied', per_call_model_telemetry: role === 'implementer' ? (worker?.phase_bindings ?? []).map(binding => ({ phase: binding.phase, telemetry: binding.telemetry })) : 'not_supplied' } });
  }
  const status = results.some(worker => worker.status === 'FAIL') ? 'FAIL' : results.some(worker => worker.status !== 'PASS') ? 'UNVERIFIED' : 'PASS';
  add(report, 'C07_WORKERS', status, status === 'PASS' ? 'SUPPLIED_WORKER_PROFILES_MATCHED' : 'WORKER_PROFILE_EVIDENCE_INCOMPLETE_OR_MISMATCHED', 'three pinned profiles/prompts; explicit phase selections; Fast off; saved capability and independent setup evidence', results, [], 'Use exact pinned profiles and prompts; retain accepted dispatch and setup evidence. Missing telemetry stays labelled not returned.');
}

export async function checkReadiness(inputs) {
  const report = emptyReadiness(SHA.test(inputs.revision) ? inputs.revision : null);
  if (!report.revision) {
    add(report, 'C01_INPUT', 'ERROR', 'REVISION_INVALID', 'full lowercase 40-hex approved revision', null, [], 'Supply --revision with the complete approved Git commit.');
    return finish(report);
  }
  let observations = inputs.observations;
  if (observations !== undefined) {
    try { validateObservations(observations); }
    catch { observations = undefined; add(report, 'C06_INPUT', 'ERROR', 'OBSERVATIONS_INVALID', 'bounded declared observations format', null, [], 'Correct the saved observations file using docs/release-readiness.md.'); }
  }
  const releaseVerified = await checkRelease(report, inputs.release, report.revision);
  await externalPlacement(report, inputs.release, observations);
  let parsed, helpers;
  try {
    const [{ parseConfig }, projectHelpers] = await Promise.all([import('../config/parse.mjs'), import('../config/projects.mjs')]);
    helpers = projectHelpers;
    parsed = parseConfig(inputs.configText, observations?.expected_site === undefined ? {} : { expectedSite: observations.expected_site });
    report.configuration_digest = parsed.configuration_digest;
    add(report, 'C03_CONFIGURATION', parsed.valid ? 'PASS' : 'ERROR', parsed.valid ? 'CANONICAL_CONFIGURATION_VALID' : 'CONFIGURATION_INVALID', 'canonical configuration', { valid: parsed.valid, destination_authority: parsed.destination_authority, live_readiness: parsed.live_readiness, diagnostics: parsed.diagnostics }, [], parsed.valid ? 'Compare the generated inactive setup with saved observations.' : 'Correct canonical configuration using its safe diagnostics.');
    if (parsed.valid) report.inactive_setup = {
      kind: 'local_inactive_projection', configuration_digest: parsed.configuration_digest, site: parsed.resolved_scope.site,
      projects: parsed.resolved_scope.projects.map(project => ({ project_id: project.id, project_key: project.key, story_type_id: project.types.story, bug_type_id: project.types.bug, actors: project.actors, repositories: project.repositories, opt_in_label: project.opt_in_label, worker_prefixes: project.worker_prefixes, routes: roles.map(role => ({ role, stage: workerSources[role].stage, stage_id: project.stages[workerSources[role].stage], outcome: workerSources[role].outcome, outcome_stage_id: project.stages[workerSources[role].outcome], profile: workerSources[role].profile, prompt: workerSources[role].prompt, jira_rule_enabled: false, cursor_automation_enabled: false })) })),
    };
  } catch {
    add(report, 'C03_CONFIGURATION', 'ERROR', 'CONFIGURATION_RUNTIME_UNAVAILABLE', 'prepared local configuration runtime', null, [], 'Prepare source dependencies outside the delivery run; no install or repair was attempted.');
  }
  const artifacts = await inspectArtifacts(observations);
  const context = managerEvidence(report, inputs);
  const health = savedHealth(report, inputs.health, context);
  let configuredInstallation = null;
  try { configuredInstallation = parseContract(inputs.configText).manager?.installation_id ?? null; } catch { /* Safe config diagnostics already exist. */ }
  const observationsMatch = !!(observations && parsed?.valid && observations.revision === report.revision && observations.configuration_digest === report.configuration_digest && (!configuredInstallation || observations.installation_id === configuredInstallation));
  if (helpers) inspectRoutes(report, parsed, observations, artifacts, helpers, observationsMatch);
  else add(report, 'C03_ROUTES', 'UNVERIFIED', 'CONFIGURATION_REQUIRED', 'canonical routing runtime', null, [], 'Restore the prepared runtime before comparing saved routing.');
  const artifactError = artifacts.some(item => item.status === 'ERROR');
  const artifactMismatch = artifacts.some(item => item.status === 'FAIL');
  add(report, 'C06_OBSERVATIONS', artifactError ? 'ERROR' : artifactMismatch || observations && !observationsMatch ? 'FAIL' : observationsMatch ? 'PASS' : 'UNVERIFIED', artifactError ? 'ARTIFACT_UNREADABLE' : artifactMismatch ? 'ARTIFACT_HASH_MISMATCH' : observations && !observationsMatch ? 'OBSERVATION_IDENTITY_MISMATCH' : observationsMatch ? 'SUPPLIED_NOTES_MATCHED' : 'OBSERVATIONS_MISSING', { revision: report.revision, configuration_digest: report.configuration_digest, installation_id: configuredInstallation }, { identity_matched: observationsMatch, installation_identity: configuredInstallation ? 'compared_with_canonical_configuration' : 'not_evaluated', artifacts }, [], 'Retain original input hashes; caller-labelled observations do not authenticate their source.');
  const app = observations?.application_inspection;
  const appState = app?.no_skill_copies === false ? 'FAIL' : observationsMatch && app?.no_skill_copies === true && evidenceState(app.evidence_ids, artifacts, true) ? 'PASS' : 'UNVERIFIED';
  add(report, 'C06_APPLICATION', appState, appState === 'FAIL' ? 'APPLICATION_SKILL_COPIES' : appState === 'PASS' ? 'SUPPLIED_NO_COPY_OBSERVATION' : 'APPLICATION_INSPECTION_MISSING', 'original saved inspection showing no application-local skill copies', app ? { no_skill_copies: app.no_skill_copies } : null, app?.evidence_ids ?? [], 'Supply the saved application diff/inspection separately from external bundle verification.');
  await inspectWorkers(report, observations, artifacts, releaseVerified, observationsMatch, inputs.release);
  report.evidence_layers = {
    local_compatibility: { release_verified: releaseVerified, configuration: parsed?.valid ? 'PASS' : 'ERROR' },
    supplied_installation_binding: { status: context.installationPassed ? 'supplied_compatible' : 'UNVERIFIED' },
    supplied_ordinary_installed_acceptance: suppliedAcceptance(report, 'installed_package', observations, artifacts, observationsMatch, context),
    supplied_health: { status: health.status, observed_at: inputs.health?.observed_at ?? null },
    pgb58_delivery_acceptance: suppliedAcceptance(report, 'pgb58', observations, artifacts, observationsMatch, context),
    human_review: { status: 'NOT_RUN', reviewers: { developer: observations?.reviewers?.developer ?? null, human_qa: observations?.reviewers?.human_qa ?? null }, cases: report.human_cases },
    activation: { ...report.activation },
  };
  report.checks.sort((a, b) => a.id.slice(0, 3).localeCompare(b.id.slice(0, 3)));
  return finish(report);
}

export function renderReadiness(report) {
  const lines = [`Pig Boss release readiness: ${report.status} (exit ${report.exit_code})`, `Revision: ${report.revision ?? 'missing'}`, `Configuration: ${report.configuration_digest ?? 'unverified'}`];
  for (const check of report.checks) {
    lines.push(`${check.status} ${check.id}: ${check.code}. ${check.next_step}`);
    if (check.status === 'ERROR' || check.status === 'FAIL') lines.push(`  Expected: ${JSON.stringify(check.expected)}; observed: ${JSON.stringify(check.observed)}`);
    else if (check.id === 'C03_ROUTES') for (const row of check.observed ?? []) lines.push(`  ${row.status} project=${row.project_id} label=${row.full_label ?? 'missing'} role=${row.role}: ${row.code}`);
    else if (check.id === 'C07_WORKERS') for (const row of check.observed ?? []) {
      lines.push(`  ${row.status} ${row.role}: ${row.reasons.join(', ') || 'supplied controls match'}; setup model=${row.observed?.model ?? 'missing'} effort=${row.observed?.effort ?? 'missing'} Fast=${row.observed?.fast ?? 'missing'}; latest availability not reobserved.`);
      for (const binding of row.qualification.per_call_model_telemetry ?? []) if (typeof binding === 'object') lines.push(`    ${binding.phase} per-call telemetry: ${JSON.stringify(binding.telemetry)}`);
    }
    for (const reference of check.evidence ?? []) lines.push(`  Evidence: ${typeof reference === 'string' ? reference : JSON.stringify(reference)}`);
  }
  if (report.inactive_setup) {
    lines.push(`Inactive projection: ${report.inactive_setup.kind}; site=${report.inactive_setup.site}`);
    for (const project of report.inactive_setup.projects) {
      lines.push(`  Project ${project.project_id} (${project.project_key}): Story=${project.story_type_id}, Bug=${project.bug_type_id}; prefixes=${JSON.stringify(project.worker_prefixes)}; opt-in=${project.opt_in_label}`);
      lines.push(`    Actors=${JSON.stringify(project.actors)}; repositories=${JSON.stringify(project.repositories)}`);
      for (const route of project.routes) lines.push(`    ${route.stage} (${route.stage_id}) -> ${route.role} -> ${route.outcome} (${route.outcome_stage_id}); Jira=false, Cursor=false; profile=${route.profile}; prompt=${route.prompt}`);
    }
  }
  const observations = report.checks.find(check => check.id === 'C06_OBSERVATIONS')?.observed;
  for (const artifact of observations?.artifacts ?? []) lines.push(`Saved artifact ${artifact.id}: ${artifact.status}, ${artifact.kind}, observed_at=${artifact.observed_at}, sha256=${artifact.sha256}; ${artifact.path}`);
  for (const [name, layer] of Object.entries(report.evidence_layers)) if (!['human_review', 'activation'].includes(name)) lines.push(`Evidence layer ${name}: ${JSON.stringify(layer)}`);
  const reviewers = report.evidence_layers.human_review?.reviewers;
  lines.push(`Designated developer: ${reviewers?.developer ?? 'MISSING'}; human QA reviewer: ${reviewers?.human_qa ?? 'MISSING'}`);
  for (const human of report.human_cases) lines.push(`${human.id}: ${human.status}`);
  lines.push('Activation: authorized=false; performed=false.', 'Full structured comparisons and input hashes are available with --json.', ...report.limitations);
  return lines.join('\n') + '\n';
}
