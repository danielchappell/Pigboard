import { constants } from 'node:fs';
import { open, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import canonicalize from 'canonicalize';
import { validateManifest, deriveHostControls } from '../aws/installation.mjs';
import { installationResourceMap, lifecycleManifestFields, LIFECYCLE_PACKAGE_SCHEMA } from '../aws/template.mjs';
import { alarmCapabilityFields, alarmDescriptors, alarmDefinitions, compareAlarmDefinition, hasAlarmCapability } from '../aws/alarms.mjs';
import { validBinding, valid, originEvidenceSchema } from '../state/contract.mjs';
import { evidenceRevision, healthSettings, METRICS } from '../manager/health.mjs';
import { parseContract } from '../contracts/work.mjs';

const execute = promisify(execFile);
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const HASH = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const LIMIT = 1048576;
const MANIFEST_LIMIT = 4 * LIMIT;
const INSTALLATION_LIMIT = 8 * LIMIT;
const LIFECYCLE_RECEIPT = 'pigboard-installation-receipt/v2';
const LEGACY_RECEIPT = 'pigboard-installation-receipt/v1';
const ALARM_MODULE = 'lib/aws/alarms.mjs';
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
const eq = (one, other) => canonicalize(one) === canonicalize(other);
const inputError = () => Object.assign(new Error('INPUT_INVALID'), { code: 'INPUT_INVALID' });

function boundValue(value, depth = 0) {
  if (depth > 16 || Array.isArray(value) && value.length > 1000 ||
      typeof value === 'number' && !Number.isFinite(value)) throw inputError();
  if (value && typeof value === 'object') for (const child of Object.values(value)) boundValue(child, depth + 1);
}

function byteLimit(kind, value) {
  if (kind === 'packageManifest' && (value === undefined || value?.schema === LIFECYCLE_PACKAGE_SCHEMA)) return MANIFEST_LIMIT;
  if (kind === 'installation' && (value === undefined || value?.schema === LIFECYCLE_RECEIPT)) return INSTALLATION_LIMIT;
  return LIMIT;
}

function assertEmbeddedManifest(receipt) {
  if (receipt?.manifest !== undefined &&
      Buffer.byteLength(JSON.stringify(receipt.manifest)) > byteLimit('packageManifest', receipt.manifest)) throw inputError();
}

function assertManagerInputBounds(value, kind) {
  boundValue(value);
  if (Buffer.byteLength(JSON.stringify(value)) > byteLimit(kind, value)) throw inputError();
  if (kind === 'installation') assertEmbeddedManifest(value);
}

// Regular files only; a FIFO must not hang a noninteractive invocation.
export async function readLocalInput(filename, json = true, kind) {
  if (!absolute(filename)) throw inputError();
  let file;
  try {
    file = await open(filename, constants.O_RDONLY | constants.O_NONBLOCK);
    if (!(await file.stat()).isFile()) throw inputError();
    const limit = byteLimit(kind);
    const buffer = Buffer.alloc(limit + 1);
    let count = 0;
    while (count < buffer.length) {
      const { bytesRead } = await file.read(buffer, count, buffer.length - count, null);
      if (!bytesRead) break;
      count += bytesRead;
    }
    if (count > limit) throw inputError();
    const bytes = buffer.subarray(0, count);
    if (json === 'bytes') return bytes;
    if (!json) return bytes.toString('utf8');
    return parseLocalJSON(bytes, kind);
  } catch { throw inputError(); }
  finally { await file?.close(); }
}

export function parseLocalJSON(bytes, kind) {
  try {
    const size = Buffer.byteLength(bytes);
    if (size > byteLimit(kind)) throw inputError();
    const value = JSON.parse(bytes.toString('utf8'));
    if (size > byteLimit(kind, value)) throw inputError();
    boundValue(value);
    if (kind === 'installation') assertEmbeddedManifest(value);
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

async function pinnedAlarmCapability(revision) {
  try {
    const { stdout } = await execute('git', ['ls-tree', revision + '^{commit}', '--', ALARM_MODULE],
      { cwd: sourceRoot, maxBuffer: 1024, timeout: 5000 });
    if (!stdout) return 'historical';
    if (/^100(?:644|755) blob [a-f0-9]{40}\tlib\/aws\/alarms\.mjs\n$/.test(stdout)) return 'quartet';
  } catch { /* A missing commit cannot establish a historical package. */ }
  return 'unverified';
}

function managerInputBounded(value, kind) {
  if (value === undefined) return true;
  try { assertManagerInputBounds(value, kind); return true; }
  catch { return false; }
}

async function lifecyclePackage(report, inputs, context) {
  const manifest = context.manifest;
  const failed = new Set();
  const expectedCapability = await pinnedAlarmCapability(report.revision);
  context.alarmCapability = expectedCapability;
  const declared = Object.hasOwn(manifest, 'alarm_capability') || Object.hasOwn(manifest.payload_hashes ?? {}, ALARM_MODULE);
  const capabilityMatched = expectedCapability === 'quartet' ? hasAlarmCapability(manifest) :
    expectedCapability === 'historical' ? !declared : null;
  if (capabilityMatched === false) failed.add('alarm_capability');
  if (hasAlarmCapability(manifest) && !eq(manifest.alarm_capability, alarmCapabilityFields())) failed.add('alarm_capability');
  if (manifest.source_revision !== report.revision) failed.add('source_revision');
  try {
    context.projection = deriveHostControls(inputs.configText, { package_revision: manifest.source_revision });
    context.config = parseContract(inputs.configText);
  } catch { failed.add('canonical_config'); }
  const projection = context.projection;
  const canonicalMatches = !!projection && eq(context.config, manifest.canonical_config);
  if (!canonicalMatches) failed.add('canonical_config');
  if (manifest.configuration_digest !== report.configuration_digest) failed.add('configuration_digest');
  if (manifest.installation_id !== projection?.installation_id) failed.add('installation_id');
  if (manifest.domain_id !== projection?.domain_id) failed.add('domain_id');
  const inactive = projection?.control.schedule_enabled === false && projection?.control.writes_enabled === false;
  if (projection && !inactive) failed.add('inactive_controls');
  if (manifest.runtime !== 'nodejs24.x') failed.add('runtime');
  if (manifest.sender !== true) failed.add('sender');

  let resourceMapMatches = false, compatibilityMatches = false;
  let logicalResources = [];
  if (projection && UUID.test(manifest.installation_generation)) {
    context.physical = installationResourceMap(projection.installation_id, manifest).physical;
  }
  try {
    const generated = lifecycleManifestFields({ installationId: projection.installation_id,
      generation: manifest.installation_generation, previousRevision: manifest.compatibility?.previous_revision });
    logicalResources = generated.logical_resources;
    resourceMapMatches = eq(manifest.resource_map, generated.resource_map);
    compatibilityMatches = eq(manifest.compatibility, generated.compatibility) &&
      manifest.compatibility.previous_revision !== manifest.source_revision;
    if (!eq(manifest.logical_resources, logicalResources)) failed.add('logical_resources');
    if (!resourceMapMatches) failed.add('resource_map');
    if (!compatibilityMatches) failed.add('compatibility');
  } catch {
    if (!UUID.test(manifest.installation_generation)) failed.add('installation_generation');
    else if (projection) failed.add('compatibility');
  }

  const payload = object(manifest.payload_hashes) ? Object.values(manifest.payload_hashes) : [];
  const dependencies = object(manifest.dependency_hashes) ? Object.values(manifest.dependency_hashes) : [];
  const validDigest = value => typeof value === 'string' && DIGEST.test(value);
  const payloadValid = payload.length > 0 && payload.every(validDigest);
  const dependenciesValid = dependencies.every(validDigest) &&
    validDigest(manifest.dependency_hashes?.root) && validDigest(manifest.dependency_hashes?.aws);
  if (!payloadValid) failed.add('payload_hashes');
  if (!dependenciesValid) failed.add('dependency_hashes');
  if (!validDigest(manifest.zip_digest)) failed.add('zip_digest');
  try { validateManifest(manifest, inputs.configText); }
  catch (error) {
    if (error.code === 'PACKAGE_ROUTING_UNSUPPORTED') failed.add('topic_routing');
    else if (error.code === 'ALARM_WINDOW_UNSUPPORTED') failed.add('alarm_window');
    else if (!failed.size) failed.add(hasAlarmCapability(manifest) ? 'alarm_capability_or_embedded_digest' : 'manifest');
  }

  const status = failed.size ? 'FAIL' : expectedCapability === 'unverified' ? 'UNVERIFIED' : 'PASS';
  context.packageStatus = status;
  context.packagePassed = status === 'PASS';
  const code = failed.has('source_revision') ? 'MANAGER_REVISION_MISMATCH' :
    failed.has('alarm_capability') ? 'ALARM_CAPABILITY_MISMATCH' :
    status === 'FAIL' ? 'LIFECYCLE_PACKAGE_MISMATCH' :
    status === 'UNVERIFIED' ? 'PINNED_ALARM_CAPABILITY_UNVERIFIED' : 'APPROVED_LIFECYCLE_PACKAGE_MATCHED';
  add(report, 'C04_PACKAGE', status, code,
    { schema: LIFECYCLE_PACKAGE_SCHEMA, source_revision: report.revision, runtime: 'nodejs24.x', sender: true,
      schedule_enabled: false, writes_enabled: false, capability: expectedCapability },
    { schema: LIFECYCLE_PACKAGE_SCHEMA, source_revision: manifest.source_revision, configuration_digest: manifest.configuration_digest,
      installation_id: manifest.installation_id === projection?.installation_id ? projection.installation_id : null,
      domain_id: manifest.domain_id === projection?.domain_id ? projection.domain_id : null,
      installation_generation: UUID.test(manifest.installation_generation) ? manifest.installation_generation : null,
      runtime: manifest.runtime === 'nodejs24.x' ? manifest.runtime : 'unsupported', sender: manifest.sender === true,
      logical_resources: logicalResources.filter(key => manifest.logical_resources.includes(key)),
      controls: projection?.control ?? null, canonical_config_matched: canonicalMatches, resource_map_matched: resourceMapMatches,
      compatibility_matched: compatibilityMatches, capability: expectedCapability, capability_matched: capabilityMatched,
      alarm_count: expectedCapability === 'quartet' ? alarmCapabilityFields().logical_resources.length : 0,
      metadata: { payload_hash_count: payload.length, dependency_hash_count: dependencies.length,
        payload_hashes_valid: payloadValid, dependency_hashes_valid: dependenciesValid,
        zip_digest: validDigest(manifest.zip_digest) ? manifest.zip_digest : null,
        manifest_digest: 'sha256:' + hash(canonicalize(manifest)) },
      failed_fields: [...failed] }, [],
    status === 'PASS' ? 'Retain the package summary with the input hashes. Deployed Lambda bytes need separate verification.' :
      status === 'UNVERIFIED' ? 'Make the approved Git revision readable locally, then repeat the saved comparison.' :
        'Use the installation guide to compare the listed fields with the complete package from the approved revision.');
}

function lifecycleReceiptMismatches(receipt, context) {
  const binding = receipt.binding;
  const failed = [];
  if (canonicalTimestamp(receipt.observed_at) === null) failed.push('observed_at');
  const originalKeys = ['stack_id', 'table_name', 'table_arn', 'installation_generation'];
  if (!object(receipt.original) || !binding || originalKeys.some(key => receipt.original[key] !== binding[key])) failed.push('original');
  const origin = receipt.origin;
  if (!valid(origin, originEvidenceSchema) || !UUID.test(origin?.table_id) || !binding ||
      ['installation_id', 'domain_id', 'site', 'stack_id', 'table_arn', 'installation_generation'].some(key => origin[key] !== binding[key])) failed.push('origin');
  if (!SHA.test(receipt.birth_package_revision)) failed.push('birth_package_revision');
  if (!DIGEST.test(receipt.birth_manifest_digest)) failed.push('birth_manifest_digest');
  if (context.config && receipt.birth_operator_role !== context.config.manager.aws.operator_role_arn) failed.push('birth_operator_role');
  if (context.config && context.physical) {
    const { account_id, region, stack_name } = context.config.manager.aws;
    const stackPrefix = `arn:aws:cloudformation:${region}:${account_id}:stack/${stack_name}/`;
    const stackMatches = typeof binding?.stack_id === 'string' && binding.stack_id.startsWith(stackPrefix) &&
      /^[A-Za-z0-9-]+$/.test(binding.stack_id.slice(stackPrefix.length));
    if (!stackMatches) failed.push('stack_id');
    const { table_name } = context.physical;
    if (binding?.table_name !== table_name || binding?.table_arn !== `arn:aws:dynamodb:${region}:${account_id}:table/${table_name}`) failed.push('table');
  }
  return failed;
}

async function managerEvidence(report, inputs) {
  const receipt = inputs.installation;
  const invalidInstallation = receipt !== undefined && !object(receipt);
  const objectReceipt = object(receipt) ? receipt : undefined;
  const manifest = inputs.packageManifest !== undefined ? inputs.packageManifest : objectReceipt?.manifest;
  const manifestBounded = managerInputBounded(manifest, 'packageManifest');
  const receiptBounded = managerInputBounded(receipt, 'installation');
  const lifecycle = manifest?.schema === LIFECYCLE_PACKAGE_SCHEMA;
  const receiptSchema = lifecycle ? LIFECYCLE_RECEIPT : LEGACY_RECEIPT;
  const context = { manifest, binding: objectReceipt?.binding, projection: null, packagePassed: false, installationPassed: false };
  if (manifest === undefined) add(report, 'C04_PACKAGE', 'UNVERIFIED', 'EVIDENCE_MISSING', 'matching approved ordinary manager manifest', null, [], 'Supply a manager package manifest or the full successful installation receipt.');
  else if (!manifestBounded || !object(manifest) || !SHA.test(manifest.source_revision) || !DIGEST.test(manifest.configuration_digest) || !text(manifest.installation_id) || !text(manifest.domain_id) || !text(manifest.installation_generation) || !Array.isArray(manifest.logical_resources) || !manifest.logical_resources.every(text)) {
    add(report, 'C04_PACKAGE', 'ERROR', 'PACKAGE_INPUT_INVALID', 'complete declared manager manifest', null, [], 'Supply the actual complete saved package manifest; do not reconstruct it from partial output.');
  }
  else if (lifecycle) await lifecyclePackage(report, inputs, context);
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
    const metadataValid = object(manifest.payload_hashes) && Object.keys(manifest.payload_hashes).length > 0 && object(manifest.dependency_hashes) && Object.hasOwn(manifest.dependency_hashes, 'root') && Object.hasOwn(manifest.dependency_hashes, 'aws') && Object.values(manifest.payload_hashes).every(value => DIGEST.test(value)) && Object.values(manifest.dependency_hashes).every(value => DIGEST.test(value)) && DIGEST.test(manifest.zip_digest);
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
  if (invalidInstallation || !receiptBounded) add(report, 'C04_INSTALLATION', 'ERROR', 'INSTALLATION_INPUT_INVALID', 'complete saved successful installation receipt', null, [], 'Supply the complete saved successful installation receipt.');
  else if (receipt === undefined) add(report, 'C04_INSTALLATION', 'UNVERIFIED', 'EVIDENCE_MISSING', 'full successful installation receipt', null, [], 'Supply the matching successful installation receipt to compare its installed binding.');
  else {
    const successful = receipt.schema === receiptSchema && !receipt.recovery_only && receipt.package_verified !== false;
    let matches = false;
    try {
      const binding = receipt.binding, projection = context.projection;
      matches = successful && manifestBounded && object(receipt.original) && text(receipt.observed_at) && projection && validBinding(binding, projection.control) &&
        binding.package_revision === manifest.source_revision && binding.package_revision === report.revision &&
        binding.installation_id === projection.installation_id && binding.domain_id === projection.domain_id && binding.configuration_digest === projection.configuration_digest &&
        deriveHostControls(inputs.configText, { package_revision: manifest.source_revision, binding }) &&
        binding.installation_generation === manifest.installation_generation && canonicalize(receipt.manifest) === canonicalize(manifest) &&
        ['stack_id', 'table_name', 'table_arn', 'installation_generation'].every(key => receipt.original[key] === binding[key]);
    } catch { /* A recovery envelope or invalid binding is never a successful receipt. */ }
    const failedFields = lifecycle && successful ? lifecycleReceiptMismatches(receipt, context) : [];
    if (lifecycle && successful && !matches) {
      if (!eq(receipt.manifest, manifest)) failedFields.push('embedded_manifest');
      else if (!failedFields.length && context.projection) failedFields.push('binding');
    }
    if (lifecycle && matches && failedFields.length) matches = false;
    if (matches && lifecycle) context.origin = receipt.origin;
    const revisionMismatch = manifest && manifest.source_revision !== report.revision || receipt.binding?.package_revision !== report.revision;
    context.installationPassed = !!matches && context.packagePassed;
    const unverified = lifecycle && matches && context.packageStatus === 'UNVERIFIED';
    const status = context.installationPassed ? 'PASS' : unverified ? 'UNVERIFIED' : 'FAIL';
    const code = revisionMismatch && (!lifecycle || successful) ? 'MANAGER_REVISION_MISMATCH' :
      !successful ? 'SUCCESSFUL_RECEIPT_REQUIRED' :
      unverified ? 'PINNED_ALARM_CAPABILITY_UNVERIFIED' : context.installationPassed ? 'SUPPLIED_INSTALLATION_MATCHED' : 'INSTALLATION_BINDING_MISMATCH';
    add(report, 'C04_INSTALLATION', status, code, { package_revision: report.revision, successful_receipt: true },
      { schema: successful ? receipt.schema : 'unsupported_or_recovery', binding: matches ? receipt.binding : null,
        observed_at: (lifecycle ? canonicalTimestamp(receipt.observed_at) !== null : text(receipt.observed_at)) ? receipt.observed_at : null,
        package_revision: SHA.test(receipt.binding?.package_revision) ? receipt.binding.package_revision : null,
        ...(lifecycle ? { failed_fields: failedFields, origin_matched: matches, embedded_manifest_matched: manifestBounded && eq(receipt.manifest, manifest),
          table_id: matches ? receipt.origin.table_id : null, birth_package_revision: SHA.test(receipt.birth_package_revision) ? receipt.birth_package_revision : null,
          birth_manifest_digest: DIGEST.test(receipt.birth_manifest_digest) ? receipt.birth_manifest_digest : null } : {}) }, [],
      context.installationPassed ? 'Retain the supplied binding and observation time for this installation.' :
        unverified ? 'Make the approved Git revision readable, then compare the same saved receipt.' :
          'Supply the matching full successful receipt. If publication failed, retain the emitted receipt and follow the recovery steps in the installation guide.');
  }
  return context;
}

function canonicalTimestamp(value) {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value ? time : null;
}

function retainedMetricRecord(name, record, window) {
  if (!object(record) || !['points', 'maximum', 'latest_at'].every(field => Object.hasOwn(record, field)) || !Number.isInteger(record.points) || record.points < 0 || record.points > 1440) return false;
  if (record.points === 0) return record.maximum === null && record.latest_at === null;
  const latest = canonicalTimestamp(record.latest_at);
  return Number.isFinite(record.maximum) && record.maximum >= 0 && (!name.endsWith('Presence') || record.maximum <= 1) && latest !== null && (!window || latest >= Math.floor(window.start / 60000) * 60000 && latest < window.end);
}

function savedHealthMetadata(input, computed) {
  const reasons = [], current = input.current;
  const observed = canonicalTimestamp(input.observed_at);
  if (observed === null) reasons.push('HEALTH_OBSERVATION_INCOMPLETE');
  const noEpoch = current.health_generation === null && current.health_enabled_at === null;
  const enabled = canonicalTimestamp(current.health_enabled_at);
  if (noEpoch ? current.evidence_revision !== null : computed === null || enabled === null || observed !== null && enabled > observed) reasons.push('HEALTH_EPOCH_INCOMPLETE');

  const flags = [input.desired_enabled, input.observed_enabled, input.applied_controls?.schedule_enabled, input.applied_controls?.writes_enabled];
  if (!object(input.applied_controls) || flags.some(flag => flag !== false) || input.writes !== 0 || input.worker_health !== 'not_observed' || input.state !== 'disabled' || input.exit_code !== 0) reasons.push('INACTIVE_HEALTH_NOT_CONFIRMED');

  const coverage = input.query_coverage;
  const start = canonicalTimestamp(coverage?.start), end = canonicalTimestamp(coverage?.end);
  const window = start !== null && end !== null && start < end ? { start, end } : null;
  if (!object(coverage) || !window || observed !== null && end !== observed || coverage.complete !== true ||
      !Number.isInteger(coverage.pages) || coverage.pages < 1 || coverage.pages > 10 ||
      !Number.isInteger(coverage.fetched_events) || coverage.fetched_events < 0 || coverage.fetched_events > 1000 ||
      !Number.isInteger(coverage.decoded_bytes) || coverage.decoded_bytes < 0 || coverage.decoded_bytes > 1048576 ||
      coverage.last_complete_absence !== 'within_query_window_only' ||
      (coverage.fetched_events === 0 ? coverage.decoded_bytes !== 0 : coverage.decoded_bytes < coverage.fetched_events)) reasons.push('HEALTH_WINDOW_INCOMPLETE');

  const metrics = input.metric_evidence;
  if (!object(metrics) || metrics.statistics !== 'Maximum' || !object(metrics.metrics)) reasons.push('METRIC_COVERAGE_INCOMPLETE');
  if (noEpoch) {
    if (metrics?.status !== 'not_applicable' || !object(metrics?.metrics) || Object.keys(metrics.metrics).length !== 0) reasons.push('INITIAL_DISABLED_METRIC_EVIDENCE_MISSING');
  } else if (metrics?.status !== 'observed' || !METRICS.every(name => retainedMetricRecord(name, metrics?.metrics?.[name], window))) reasons.push('METRIC_COVERAGE_INCOMPLETE');
  return reasons;
}

const actionFields = ['AlarmActions', 'OKActions', 'InsufficientDataActions'];
const readStates = ['aligned', 'mismatch', 'unknown'];
const routingStates = ['verified', 'console_only', 'misconfigured', 'unknown'];
const knownAlarmMismatches = ['ALARM_DUPLICATE', 'ALARM_IDENTITY_MISMATCH', 'ALARM_DEFINITION_MISMATCH',
  'ALARM_ACTION_DESTINATION_MISMATCH', 'ALARM_QUARTET_MISMATCH', 'ALARM_OWNERSHIP_UNCONFIRMED'];
const knownTopicMismatches = ['SNS_TOPIC_ARN_MISMATCH', 'SNS_TOPIC_NOT_FOUND', 'SNS_TOPIC_POLICY_DENIED', 'SNS_TOPIC_POLICY_INSUFFICIENT'];
const producerCodes = new Set([
  'OK', ...knownAlarmMismatches, 'ALARM_MISSING', 'ALARM_READ_DENIED', 'ALARM_READ_UNAVAILABLE',
  'ALARM_READ_INVALID', 'ALARM_READ_INCOMPLETE', 'ALARM_INVENTORY_UNAVAILABLE', 'ALARM_INTENT_UNAVAILABLE',
  'ALARM_EXPECTATION_UNAVAILABLE', 'ALARM_PACKAGE_UNVERIFIED', 'EVIDENCE_UNAVAILABLE', 'LIFECYCLE_OPERATION_PENDING',
  'HOST_OR_STATE_CHANGED_OR_UNCONFIRMED', 'HEALTH_DEADLINE', 'ALARM_ROUTING_UNVERIFIED',
  'SNS_TOPIC_NOT_CONFIGURED', ...knownTopicMismatches, 'SNS_TOPIC_ARN_MISSING',
  'SNS_TOPIC_READ_DENIED', 'SNS_TOPIC_READ_UNAVAILABLE', 'SNS_TOPIC_POLICY_UNKNOWN'
]);
const codeOrNull = value => producerCodes.has(value) ? value : null;
const timestampOrNull = value => canonicalTimestamp(value) === null ? null : value;
const awsArnOrNull = value => typeof value === 'string' && value.length <= 400 &&
  /^arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]{12}:[A-Za-z0-9_+=,.@/:\-]+$/.test(value) ? value : null;
const tokenOrNull = value => typeof value === 'string' && /^[A-Za-z0-9._:-]{1,255}$/.test(value) ? value : null;
const boolOrNull = value => typeof value === 'boolean' ? value : null;
const allowed = (value, options) => options.includes(value) ? value : null;

function issues() {
  const failed = new Set(), missing = new Set();
  return { failed, missing, status: () => failed.size ? 'FAIL' : missing.size ? 'UNVERIFIED' : 'PASS' };
}

function requireFact(result, observed, expected, missingCode, mismatchCode = missingCode) {
  if (observed === undefined || expected === undefined || observed === null && expected !== null) result.missing.add(missingCode);
  else if (observed !== expected) result.failed.add(mismatchCode);
}

function alarmReadProblem(fallback, result, status, code, { complete = false } = {}) {
  if (knownAlarmMismatches.includes(code) || complete && code === 'ALARM_MISSING') result.failed.add(code);
  else if (status !== 'aligned' || code !== 'OK') result.missing.add(code !== 'OK' && codeOrNull(code) || fallback);
}

function actionEvidence(actions) {
  return Object.fromEntries(actionFields.map(key => {
    const value = actions?.[key];
    return [key, Array.isArray(value) && value.length <= 1 && value.every(awsArnOrNull) ? value : null];
  }));
}

function savedAlarmRow(descriptor, definition, matches, complete, stable) {
  const { key, name, arn, logical_id, link, custom } = descriptor;
  const [row] = matches;
  const result = issues();
  let definitionMatched = null;
  if (!stable) result.missing.add('HOST_OR_STATE_CHANGED_OR_UNCONFIRMED');
  else if (!matches.length) result.missing.add('ALARM_ROW_MISSING');
  else if (matches.length > 1) result.failed.add('ALARM_DUPLICATE');
  else {
    alarmReadProblem('ALARM_ROW_UNVERIFIED', result, row.status, row.code, { complete });
    requireFact(result, row.logical_id, logical_id, 'ALARM_IDENTITY_UNVERIFIED', 'ALARM_IDENTITY_MISMATCH');
    requireFact(result, row.name, name, 'ALARM_IDENTITY_UNVERIFIED', 'ALARM_IDENTITY_MISMATCH');
    requireFact(result, row.arn, arn, 'ALARM_IDENTITY_UNVERIFIED', 'ALARM_IDENTITY_MISMATCH');
    requireFact(result, row.actual_arn, arn, 'ALARM_IDENTITY_UNVERIFIED', 'ALARM_IDENTITY_MISMATCH');
    requireFact(result, row.actions_enabled, false, 'ALARM_ACTIONS_UNVERIFIED', 'ALARM_ACTIONS_ENABLED');
    if (!definition || !object(row.expected)) result.missing.add('ALARM_EXPECTATION_UNAVAILABLE');
    else if (!compareAlarmDefinition(definition, row.expected)) result.failed.add('ALARM_EXPECTATION_MISMATCH');
    if (definition) for (const key of actionFields) {
      const observed = [row.observed_actions?.[key], row.expected_actions?.[key], row.actual?.[key]];
      if (observed.some(value => value == null)) result.missing.add('ALARM_ACTIONS_UNVERIFIED');
      if (observed.some(value => value != null && !eq(value, definition[key]))) result.failed.add('ALARM_ACTION_DESTINATION_MISMATCH');
    }
    if (!object(row.actual)) result.missing.add('ALARM_DEFINITION_UNVERIFIED');
    else if (definition) {
      definitionMatched = compareAlarmDefinition(definition, row.actual);
      if (!definitionMatched) result.failed.add('ALARM_DEFINITION_MISMATCH');
    }
  }
  const status = result.status();
  const raw = { raw_state: allowed(row?.raw_state, ['OK', 'ALARM', 'INSUFFICIENT_DATA']),
    raw_state_updated_at: timestampOrNull(row?.raw_state_updated_at) };
  return { key, name, logical_id, link, status,
    code: result.failed.values().next().value ?? result.missing.values().next().value ?? 'OK',
    comparison_reasons: [...result.failed, ...result.missing],
    expected: { arn, definition }, observed: stable ? {
      actual_arn: awsArnOrNull(row?.actual_arn), actions_enabled: boolOrNull(row?.actions_enabled),
      observed_actions: actionEvidence(row?.observed_actions), definition_matched: definitionMatched,
      threshold: Number.isFinite(row?.actual?.Threshold) ? row.actual.Threshold : null,
      evaluation: custom && status === 'PASS' && row?.evaluation === 'dormant' ? 'dormant' : 'unverified', ...raw
    } : { attribution: 'earlier_unverified', ...raw } };
}

function savedAlarmRouting(routing, expectedTopic, stable, quartetReadComplete, rows) {
  const result = issues();
  const status = allowed(routing?.status, routingStates);
  const code = codeOrNull(routing?.code);
  const topicStatus = allowed(routing?.topic_read_status, routingStates);
  const topicCode = codeOrNull(routing?.topic_read_code);
  const wantedStatus = expectedTopic ? 'verified' : 'console_only';
  const wantedCode = expectedTopic ? 'OK' : 'SNS_TOPIC_NOT_CONFIGURED';
  const snapshot = { status, code, topic_read_status: topicStatus, topic_read_code: topicCode,
    expected_topic_arn: expectedTopic ?? null, observed_topic_arn: stable ? awsArnOrNull(routing?.observed_topic_arn) : null,
    observed_at: stable ? timestampOrNull(routing?.observed_at) : null, delivery: stable ?
      expectedTopic ? 'customer_confirmation_required' : 'console_only' : 'unverified' };
  if (!stable || expectedTopic === undefined || !object(routing)) result.missing.add('ALARM_ROUTING_UNVERIFIED');
  else {
    if (!quartetReadComplete) result.missing.add('ALARM_ROUTING_UNVERIFIED');
    requireFact(result, routing.expected_topic_arn, expectedTopic, 'SNS_TOPIC_IDENTITY_UNVERIFIED', 'SNS_TOPIC_ARN_MISMATCH');
    requireFact(result, routing.observed_topic_arn, expectedTopic, 'SNS_TOPIC_IDENTITY_UNVERIFIED', 'SNS_TOPIC_ARN_MISMATCH');
    const topicCodes = [code, topicCode].filter(value => knownTopicMismatches.includes(value));
    for (const mismatch of topicCodes) result.failed.add(mismatch);
    if (status === 'misconfigured' && (knownAlarmMismatches.includes(code) || code === 'ALARM_MISSING')) result.failed.add(code);
    if (status !== wantedStatus || code !== wantedCode) {
      if (!expectedTopic && status === 'verified' || expectedTopic && status === 'console_only') result.failed.add('SNS_TOPIC_ROUTING_MISMATCH');
      else if (!result.failed.size) result.missing.add(code && code !== 'OK' ? code : 'ALARM_ROUTING_UNVERIFIED');
    }
    if (expectedTopic && (topicStatus !== 'verified' || topicCode !== 'OK')) {
      if (topicStatus === 'console_only') result.failed.add('SNS_TOPIC_ROUTING_MISMATCH');
      else if (!topicCodes.length) result.missing.add(topicCode && topicCode !== 'OK' ? topicCode : 'SNS_TOPIC_READ_UNVERIFIED');
    }
    for (const row of rows) {
      if (row.comparison_reasons.includes('ALARM_ACTION_DESTINATION_MISMATCH')) result.failed.add('ALARM_ACTION_DESTINATION_MISMATCH');
      else if (actionFields.some(key => row.observed.observed_actions[key] === null)) result.missing.add('ALARM_ROUTING_UNVERIFIED');
    }
  }
  return { ...snapshot, comparison_status: result.status(), comparison_reasons: [...result.failed, ...result.missing] };
}

function savedAlarmScope(alarms) {
  const account = alarms?.operator_account_id;
  const concurrency = alarms?.concurrency;
  return { stack_id: awsArnOrNull(alarms?.stack_id), function_name: tokenOrNull(alarms?.function_name),
    installation_generation: UUID.test(alarms?.installation_generation) ? alarms.installation_generation : null,
    region: tokenOrNull(alarms?.region),
    concurrency: Number.isInteger(concurrency) && concurrency >= 0 ? concurrency : null,
    operator_account_id: typeof account === 'string' && /^[0-9]{12}$/.test(account) ? account : null,
    operator_role_arn: awsArnOrNull(alarms?.operator_role_arn),
    table_id: UUID.test(alarms?.table_id) ? alarms.table_id : null };
}

function savedRetainedEpoch(epoch, cutoff, result) {
  if (epoch === null) return null;
  if (!object(epoch)) {
    result.missing.add('RETAINED_EPOCH_UNVERIFIED');
    return null;
  }
  const enabledAt = canonicalTimestamp(epoch.health_enabled_at);
  if (!UUID.test(epoch.health_generation) || enabledAt === null || cutoff === null) result.missing.add('RETAINED_EPOCH_UNVERIFIED');
  if (cutoff !== null && enabledAt !== null && enabledAt > cutoff) result.failed.add('RETAINED_EPOCH_AFTER_OBSERVATION');
  requireFact(result, epoch.evidence_revision, null, 'RETAINED_EPOCH_UNVERIFIED', 'RETAINED_EPOCH_ATTRIBUTION_MISMATCH');
  requireFact(result, epoch.attribution, 'unknown', 'RETAINED_EPOCH_UNVERIFIED', 'RETAINED_EPOCH_ATTRIBUTION_MISMATCH');
  return { health_generation: UUID.test(epoch.health_generation) ? epoch.health_generation : null,
    health_enabled_at: timestampOrNull(epoch.health_enabled_at), evidence_revision: null, attribution: 'unknown', scope: 'historical' };
}

function awareHealthFacts(input, context, expected, result) {
  const { current, alarm_evidence: alarms } = input;
  if (!context.packagePassed || !context.installationPassed) result.missing.add('INSTALLATION_EVIDENCE_UNVERIFIED');
  for (const [key, value] of Object.entries(expected.current)) {
    requireFact(result, current[key], value ?? undefined, 'HEALTH_IDENTITY_MISSING',
      key === 'package_revision' ? 'MANAGER_REVISION_MISMATCH' : 'HEALTH_IDENTITY_MISMATCH');
  }
  if (context.manifest?.source_revision !== expected.current.package_revision) result.failed.add('MANAGER_REVISION_MISMATCH');
  const inactiveFlags = {
    requested_enabled: input.requested_enabled, desired_enabled: input.desired_enabled, observed_enabled: input.observed_enabled,
    schedule_enabled: input.applied_controls?.schedule_enabled, writes_enabled: input.applied_controls?.writes_enabled
  };
  for (const observed of Object.values(inactiveFlags)) requireFact(result, observed, false, 'INACTIVE_HEALTH_NOT_CONFIRMED', 'ACTIVE_HEALTH_CONTROLS');
  requireFact(result, input.writes, 0, 'INACTIVE_HEALTH_NOT_CONFIRMED', 'ACTIVE_HEALTH_CONTROLS');
  if (Array.isArray(input.reasons)) for (const code of ['SCHEDULE_MISMATCH', 'APPLIED_CONTROL_MISMATCH']) {
    if (input.reasons.includes(code)) result.failed.add(code);
  }
  if (['latest_complete', 'latest_attempt', 'latest_failure', 'latest_unbound_failure', 'maximum_budget_utilization'].some(key => input[key] != null)) {
    result.failed.add('INACTIVE_CURRENT_TELEMETRY_MISMATCH');
  }
  requireFact(result, current.mode, context.projection?.mode, 'HEALTH_MODE_UNVERIFIED', 'HEALTH_MODE_MISMATCH');
  for (const key of ['freshness_seconds', 'warning_percent']) {
    requireFact(result, input.settings?.[key], expected.settings?.[key], 'HEALTH_SETTINGS_UNVERIFIED', 'HEALTH_SETTINGS_MISMATCH');
  }
  for (const key of ['health_generation', 'health_enabled_at', 'evidence_revision']) {
    requireFact(result, current[key], null, 'HEALTH_EPOCH_INCOMPLETE', 'INACTIVE_HEALTH_EPOCH_MISMATCH');
    requireFact(result, alarms.current?.[key], null, 'ALARM_EPOCH_UNVERIFIED', 'INACTIVE_HEALTH_EPOCH_MISMATCH');
  }
  for (const reason of savedHealthMetadata(input, evidenceRevision(current))) result.missing.add(reason);

  const intent = alarms.intent;
  if (intent === 'scheduled' || intent === 'manual-writes-only') result.failed.add('ACTIVE_ALARM_INTENT');
  else if (intent === 'disabled' || intent === 'upgrade-maintenance') {
    const maintenance = intent === 'upgrade-maintenance' ? true : context.projection?.control.maintenance;
    requireFact(result, input.applied_controls?.maintenance, maintenance, 'ALARM_INTENT_UNVERIFIED', 'ALARM_INTENT_MISMATCH');
    requireFact(result, alarms.maintenance_reason, intent === 'disabled' ? 'CONFIGURED_DISABLED' : 'UPGRADE_MAINTENANCE',
      'ALARM_INTENT_UNVERIFIED', 'ALARM_INTENT_MISMATCH');
  } else result.missing.add('ALARM_INTENT_UNVERIFIED');
  if (alarms.pending_operation === undefined) result.missing.add('ALARM_INTENT_UNVERIFIED');
  else if (alarms.pending_operation !== null) result.missing.add('LIFECYCLE_OPERATION_PENDING');

  for (const [key, expectedValue] of Object.entries(expected.scope)) {
    requireFact(result, alarms[key], expectedValue, `ALARM_${key.toUpperCase()}_UNVERIFIED`,
      key === 'concurrency' ? 'ACTIVE_ALARM_CONCURRENCY' : `ALARM_${key.toUpperCase()}_MISMATCH`);
  }
  if (alarms.inventory_code !== null) {
    const target = alarms.inventory_code === 'ALARM_OWNERSHIP_UNCONFIRMED' ? result.failed : result.missing;
    target.add(codeOrNull(alarms.inventory_code) ?? 'ALARM_INVENTORY_UNAVAILABLE');
  }
  if (alarms.status !== 'aligned' || alarms.code !== null) {
    const target = knownAlarmMismatches.includes(alarms.code) ? result.failed : result.missing;
    target.add(codeOrNull(alarms.code) ?? 'ALARM_OBSERVATION_UNVERIFIED');
  }
  alarmReadProblem('ALARM_READ_UNVERIFIED', result, alarms.read_status, alarms.read_code,
    { complete: ['aligned', 'mismatch'].includes(alarms.read_status) });

  const queryStart = canonicalTimestamp(input.query_coverage?.start);
  const queryEnd = canonicalTimestamp(input.query_coverage?.end);
  const cutoff = canonicalTimestamp(input.observed_at);
  if (queryStart !== null && queryEnd !== null && queryStart >= queryEnd ||
      queryEnd !== null && cutoff !== null && queryEnd !== cutoff) result.failed.add('HEALTH_WINDOW_TIME_MISMATCH');
  const ordered = [cutoff, ...[alarms.observed_from, alarms.observed_at, alarms.topic_routing?.observed_at,
    alarms.observed_to].map(canonicalTimestamp)];
  const knownTimes = ordered.filter(value => value !== null);
  if (knownTimes.length !== ordered.length) result.missing.add('ALARM_OBSERVATION_TIME_UNVERIFIED');
  if (knownTimes.some((value, index) => index > 0 && knownTimes[index - 1] > value)) result.failed.add('ALARM_OBSERVATION_TIME_MISMATCH');
  requireFact(result, alarms.delivery, expected.topic_arn === undefined ? undefined :
    expected.topic_arn ? 'customer_confirmation_required' : 'console_only',
    'ALARM_DELIVERY_QUALIFICATION_UNVERIFIED', 'ALARM_DELIVERY_QUALIFICATION_MISMATCH');
}

function savedAlarmHealth(report, input, context) {
  const alarms = input.alarm_evidence;
  const stable = alarms?.stable_host_and_state === true;
  const result = issues();
  const current = input.current;
  const { config, physical, binding, origin } = context;
  const aws = config?.manager.aws;
  const expected = {
    current: { package_revision: report.revision, installation_id: context.projection?.installation_id, configuration_digest: report.configuration_digest },
    settings: config ? healthSettings(config) : null,
    scope: { stack_id: origin ? binding.stack_id : undefined, function_name: physical?.function_name,
      region: aws?.region, installation_generation: physical ? context.manifest.installation_generation : undefined, concurrency: 0,
      operator_account_id: aws?.account_id, operator_role_arn: aws?.operator_role_arn, table_id: origin?.table_id },
    topic_arn: config ? config.manager.health?.sns_topic_arn ?? null : undefined
  };
  const owner = aws && physical ? { function_name: physical.function_name, account_id: aws.account_id, region: aws.region } : null;
  const descriptors = owner ? alarmDescriptors(owner) : [];
  let definitions = new Map();
  try {
    if (owner) definitions = new Map(alarmDefinitions({ config, ...owner,
      package_revision: report.revision, configuration_digest: report.configuration_digest, actions_enabled: false })
      .map(alarm => [alarm.key, alarm.definition]));
  } catch { result.missing.add('ALARM_DEFINITIONS_UNAVAILABLE'); }
  const rows = Array.isArray(alarms?.alarms) ? alarms.alarms : [];
  const expectedKeys = new Set(descriptors.map(alarm => alarm.key));
  if (!stable) result.missing.add(object(alarms) ? 'HOST_OR_STATE_CHANGED_OR_UNCONFIRMED' : 'ALARM_EVIDENCE_MISSING');
  else {
    awareHealthFacts(input, context, expected, result);
    if (expectedKeys.size && rows.some(row => object(row) && typeof row.key === 'string' && !expectedKeys.has(row.key))) result.failed.add('ALARM_QUARTET_MISMATCH');
    if (!Array.isArray(alarms.alarms) || rows.some(row => !object(row) || typeof row.key !== 'string')) result.missing.add('ALARM_ROW_UNVERIFIED');
  }
  const completeRead = ['aligned', 'mismatch'].includes(alarms?.read_status);
  const named = descriptors.map(alarm => savedAlarmRow(alarm, definitions.get(alarm.key) ?? null,
    rows.filter(row => row?.key === alarm.key), completeRead, stable));
  for (const row of named) {
    if (row.status === 'FAIL') result.failed.add(row.code);
    if (row.status === 'UNVERIFIED') result.missing.add(row.code);
  }
  const quartetReadComplete = completeRead && alarms.inventory_code === null && alarms.read_code !== 'ALARM_QUARTET_MISMATCH' &&
    !!expectedKeys.size && rows.length === expectedKeys.size && named.every(row => !row.comparison_reasons.includes('ALARM_DUPLICATE'));
  const routing = savedAlarmRouting(alarms?.topic_routing, expected.topic_arn, stable, quartetReadComplete, named);
  for (const reason of routing.comparison_reasons) (routing.comparison_status === 'FAIL' ? result.failed : result.missing).add(reason);
  const observedAt = timestampOrNull(input.observed_at);
  const retained = stable ? savedRetainedEpoch(alarms.retained_epoch, canonicalTimestamp(observedAt), result) : null;
  const prior = input.prior_observation;
  const historical = stable ? input.latest_historical_scan : prior?.latest_historical_scan;
  const coverage = input.query_coverage;
  const status = result.status();
  const comparison = {
    current: { installation_id: stable ? tokenOrNull(current.installation_id) : null,
      package_revision: stable && SHA.test(current.package_revision) ? current.package_revision : null,
      configuration_digest: stable && DIGEST.test(current.configuration_digest) ? current.configuration_digest : null,
      mode: stable ? allowed(current.mode, ['preview', 'apply']) : null,
      health_generation: stable ? tokenOrNull(current.health_generation) : null,
      health_enabled_at: stable ? timestampOrNull(current.health_enabled_at) : null,
      evidence_revision: stable && DIGEST.test(current.evidence_revision) ? current.evidence_revision : null },
    observed_at: observedAt, state: input.state, exit_code: input.exit_code,
    desired_enabled: stable ? boolOrNull(input.desired_enabled) : null,
    observed_enabled: stable ? boolOrNull(input.observed_enabled) : null,
    applied_controls: stable ? { schedule_enabled: boolOrNull(input.applied_controls?.schedule_enabled),
      writes_enabled: boolOrNull(input.applied_controls?.writes_enabled), maintenance: boolOrNull(input.applied_controls?.maintenance) } : null,
    settings: stable ? { freshness_seconds: Number.isFinite(input.settings?.freshness_seconds) ? input.settings.freshness_seconds : null,
      warning_percent: Number.isFinite(input.settings?.warning_percent) ? input.settings.warning_percent : null } : null,
    query_coverage: { start: timestampOrNull(coverage?.start), end: timestampOrNull(coverage?.end), complete: boolOrNull(coverage?.complete) },
    metric_evidence: { status: allowed(input.metric_evidence?.status, ['not_applicable', 'unknown', 'observed']),
      statistics: allowed(input.metric_evidence?.statistics, ['Maximum']), metric_count: Object.keys(input.metric_evidence?.metrics ?? {}).length },
    writes: Number.isInteger(input.writes) ? input.writes : null,
    worker_health: allowed(input.worker_health, ['not_observed']),
    alarm_evidence: {
      status: stable ? allowed(alarms.status, readStates) : 'unknown', code: stable ? codeOrNull(alarms.code) : null,
      intent: stable ? allowed(alarms.intent, ['disabled', 'upgrade-maintenance', 'scheduled', 'manual-writes-only']) : null,
      stable_host_and_state: boolOrNull(alarms?.stable_host_and_state),
      expected_scope: expected.scope, observed_scope: stable ? savedAlarmScope(alarms) : null,
      observed_from: timestampOrNull(alarms?.observed_from), observed_to: timestampOrNull(alarms?.observed_to),
      observed_at: timestampOrNull(alarms?.observed_at),
      read_status: stable ? allowed(alarms.read_status, readStates) : 'unknown', read_code: stable ? codeOrNull(alarms.read_code) : null,
      inventory_code: stable ? codeOrNull(alarms.inventory_code) : null, retained_epoch: retained,
      topic_routing: routing, alarms: named
    },
    comparison_reasons: [...new Set([...result.failed, ...result.missing])],
    ...(object(historical) ? { latest_historical_scan: { attribution: 'historical_unverified', ended_at: timestampOrNull(historical.ended_at),
      evidence_revision: DIGEST.test(historical.evidence_revision) ? historical.evidence_revision : null,
      maximum_budget_utilization: Number.isFinite(historical.maximum_budget_utilization) ? historical.maximum_budget_utilization : null } } : {}),
    ...(!stable && object(prior) ? { prior_observation: { attribution: 'unverified', observed_at: timestampOrNull(prior.observed_at),
      observed_scope: savedAlarmScope({ ...alarms, operator_account_id: prior.alarm_diagnostics?.operator_account_id,
        operator_role_arn: prior.alarm_diagnostics?.operator_role_arn, table_id: prior.alarm_diagnostics?.table_id }),
      inventory_code: codeOrNull(prior.alarm_diagnostics?.inventory_code), read_code: codeOrNull(prior.alarm_diagnostics?.read_code) } } : {})
  };
  const next = status === 'PASS' ? 'Retain the query cutoff and alarm observation interval. Follow the health guide for current inspection and any customer notification confirmation.' :
    result.missing.has('ALARM_READ_DENIED') ? 'Check CloudWatch read access for the configured operator, then save a new manager-health report using the same receipt.' :
      routing.comparison_status !== 'PASS' && stable ? 'Follow the health guide to check the named alarm destinations and the configured topic, then save a new inspection.' :
        'Inspect the named observations with manager-health using the same installation receipt and configured operator. Follow the health guide to resolve any mismatch.';
  return add(report, 'C05_HEALTH', status, result.failed.has('MANAGER_REVISION_MISMATCH') ? 'MANAGER_REVISION_MISMATCH' :
    status === 'PASS' ? 'SUPPLIED_INACTIVE_HEALTH_MATCHED' : 'SAVED_HEALTH_REQUIRES_ATTENTION',
    expected.current, comparison, [], next);
}

function savedHealth(report, input, context) {
  if (input === undefined) return add(report, 'C05_HEALTH', 'UNVERIFIED', 'EVIDENCE_MISSING', 'saved basic-health report for the same approved installation', null, [], 'Supply saved manager-health output from a separately authorized read; readiness never runs the reader.');
  if (!object(input) || input.schema !== 'pigboard-manager-health/v1' || !object(input.current) || !['healthy', 'disabled', 'degraded', 'stale', 'starting', 'unknown'].includes(input.state) || ![0, 1, 2].includes(input.exit_code)) return add(report, 'C05_HEALTH', 'ERROR', 'HEALTH_INPUT_INVALID', 'pigboard-manager-health/v1 envelope with object current and declared state/exit code', null, [], 'Supply the complete original health-reader JSON output.');
  if (context.alarmCapability === 'quartet' ||
      context.manifest?.schema === LIFECYCLE_PACKAGE_SCHEMA && context.alarmCapability !== 'historical' && !!input.alarm_evidence) {
    return savedAlarmHealth(report, input, context);
  }
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
  const flags = [input.desired_enabled, input.observed_enabled, input.applied_controls?.schedule_enabled, input.applied_controls?.writes_enabled];
  if (flags.some(flag => flag === true) || Number.isFinite(input.writes) && input.writes > 0) { failed = true; reasons.push('ACTIVE_HEALTH_CONTROLS'); }
  const metadataReasons = savedHealthMetadata(input, computed);
  if (metadataReasons.length) { incomplete = true; reasons.push(...metadataReasons); }
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
  const streams = new Map();
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
    if (stream?.mapped) {
      if (!streams.has(stream.key)) streams.set(stream.key, { project_id: route.project_id, full_label: route.full_label, roles: new Set() });
      if (!mismatch && !active) streams.get(stream.key).roles.add(route.role);
    }
  }
  for (const [key, stream] of streams) for (const role of roles) {
    if (!stream.roles.has(role)) rows.push({ project_id: stream.project_id, full_label: stream.full_label, role, stream_key: key, status: 'UNVERIFIED', code: 'STREAM_ROLE_MISSING', evidence_ids: [] });
  }
  for (const project of scope.projects) {
    if (!supplied.some(route => route.project_id === project.id)) for (const role of roles) rows.push({ project_id: project.id, role, full_label: null, stream_key: null, status: 'UNVERIFIED', code: 'PROJECT_ROLE_MISSING', evidence_ids: [] });
  }
  rows.sort((a, b) => a.project_id.localeCompare(b.project_id) || roles.indexOf(a.role) - roles.indexOf(b.role) || (a.full_label ?? '').localeCompare(b.full_label ?? ''));
  const state = rows.some(row => row.status === 'FAIL') ? 'FAIL' : rows.some(row => row.status !== 'PASS') ? 'UNVERIFIED' : 'PASS';
  add(report, 'C03_ROUTES', state, state === 'PASS' ? 'ALL_INACTIVE_ROUTES_MATCHED' : 'SAVED_ROUTES_REQUIRE_ATTENTION', 'All three Story/Bug ordinary roles and both flags false for each observed full numbered label; every configured project represented', rows, [], 'Supply all three inactive roles for each observed full numbered label and setup evidence for every configured project.');
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
  const context = await managerEvidence(report, inputs);
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
    supplied_health: { status: health.status, observed_at: context.alarmCapability === 'quartet' ?
      health.observed?.observed_at ?? null : inputs.health?.observed_at ?? null },
    pgb58_delivery_acceptance: suppliedAcceptance(report, 'pgb58', observations, artifacts, observationsMatch, context),
    human_review: { status: 'NOT_RUN', reviewers: { developer: observations?.reviewers?.developer ?? null, human_qa: observations?.reviewers?.human_qa ?? null }, cases: report.human_cases },
    activation: { ...report.activation },
  };
  report.checks.sort((a, b) => a.id.slice(0, 3).localeCompare(b.id.slice(0, 3)));
  return finish(report);
}

function renderAlarmHealth(observed) {
  const alarm = observed.alarm_evidence;
  const from = alarm.observed_from ?? 'unobserved', to = alarm.observed_to ?? 'unobserved';
  const scope = alarm.observed_scope ?? observed.prior_observation?.observed_scope;
  const earlier = alarm.stable_host_and_state !== true;
  const lines = [
    `  Installation ${observed.current.installation_id ?? 'unverified'}. Query cutoff ${observed.query_coverage.end ?? 'unobserved'}.`,
    `  ${earlier ? 'Earlier alarm interval' : 'Alarm interval'} ${from} through ${to}. ${earlier ? 'Closing host and State unverified.' : 'Closing host and State matched.'}`
  ];
  if (scope) {
    lines.push(`  ${earlier ? 'Earlier scope' : 'Observed scope'} account=${scope.operator_account_id ?? 'unobserved'} region=${scope.region ?? 'unobserved'} table=${scope.table_id ?? 'unobserved'} role=${scope.operator_role_arn ?? 'unobserved'}.`);
    if (!earlier) {
      const differences = Object.entries(alarm.expected_scope).filter(([key, value]) => value !== undefined && value !== scope[key]);
      if (differences.length) lines.push(`  Expected scope differences ${differences.map(([key, value]) => `${key}=${value}`).join(', ')}.`);
    }
  }
  if (observed.comparison_reasons.length) lines.push(`  Observations requiring attention: ${observed.comparison_reasons.join(', ')}.`);
  for (const row of alarm.alarms) {
    const raw = row.observed.raw_state ? ` Raw state ${row.observed.raw_state} at ${row.observed.raw_state_updated_at ?? 'unobserved'}.` : '';
    lines.push(`  ${row.status} ${row.name}: ${row.code}.${raw}`);
  }
  const route = alarm.topic_routing;
  const topicStatus = route.topic_read_status ? ` Topic read ${route.topic_read_status} (${route.topic_read_code ?? 'unverified'}).` : '';
  lines.push(`  Routing ${route.comparison_status}: ${route.status ?? 'unknown'} (${route.code ?? 'unverified'}).${topicStatus}`);
  if (route.expected_topic_arn) lines.push(`    Expected topic ${route.expected_topic_arn}. Observed topic ${route.observed_topic_arn ?? 'unverified'}.`);
  if (route.delivery === 'customer_confirmation_required') lines.push('    Customer notification delivery requires separate confirmation.');
  if (alarm.retained_epoch) lines.push(`  Historical enablement ${alarm.retained_epoch.health_generation ?? 'unverified'} at ${alarm.retained_epoch.health_enabled_at ?? 'unobserved'}. Attribution unknown.`);
  return lines;
}

export function renderReadiness(report) {
  const lines = [`Pig Boss release readiness: ${report.status} (exit ${report.exit_code})`, `Revision: ${report.revision ?? 'missing'}`, `Configuration: ${report.configuration_digest ?? 'unverified'}`];
  for (const check of report.checks) {
    lines.push(`${check.status} ${check.id}: ${check.code}. ${check.next_step}`);
    if (check.id === 'C05_HEALTH' && check.observed?.alarm_evidence) lines.push(...renderAlarmHealth(check.observed));
    else if (check.status === 'ERROR' || check.status === 'FAIL') lines.push(`  Expected: ${JSON.stringify(check.expected)}; observed: ${JSON.stringify(check.observed)}`);
    else if (check.id === 'C04_PACKAGE' && check.observed?.schema === LIFECYCLE_PACKAGE_SCHEMA) {
      const metadata = check.observed.metadata;
      lines.push(`  Package capability ${check.observed.capability}, manifest ${metadata.manifest_digest}, ${metadata.payload_hash_count} payload hashes.`);
    } else if (check.id === 'C04_INSTALLATION' && check.observed?.schema === LIFECYCLE_RECEIPT && check.observed.binding) {
      lines.push(`  Installation ${check.observed.binding.installation_id}, table ${check.observed.table_id}, receipt observation ${check.observed.observed_at}.`);
    } else if (check.id === 'C03_ROUTES') for (const row of check.observed ?? []) lines.push(`  ${row.status} project=${row.project_id} label=${row.full_label ?? 'missing'} role=${row.role}: ${row.code}`);
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
