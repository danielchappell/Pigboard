import { alarmPackageSchema, valid, completedStop, failure, nextRevision, operatorActorId, proofEqual, STOP_KEYS, transitionProof } from '../state/contract.mjs';

export const disabledLifecycleControls = Object.freeze({ schedule_enabled: false, writes_enabled: false, maintenance: true });

export function stopGeneration(origin, stop) {
  const scope = Object.fromEntries(['installation_id', 'domain_id', 'site', 'stack_id', 'table_arn', 'table_id', 'installation_generation'].map(key => [key, origin[key]]));
  return { ...scope, producer_generation: 'pigboard-stop-producer/v1',
    stop_id: stop.pb_stop_id, fence_revision: stop.pb_stop_fence_revision,
    configuration_digest: stop.pb_stop_config_digest, package_revision: stop.pb_stop_package_revision,
    resource_digest: stop.pb_stop_resource_digest, bounds_digest: stop.pb_stop_bounds_digest };
}

export function pendingRecovery(attempts) {
  return attempts.map(attempt => {
    const proof = transitionProof(attempt);
    if (proof.state === 'unsupported') throw failure('UNSUPPORTED_PROOF');
    // Preparation may have stopped before any request could be committed.
    // Its absence remains a durable restart hold without blocking preservation.
    return { attempt_id: attempt.attempt_id, request_digest: proof.request_digest,
      publication_digest: attempt.extensions.pb_capture_publication_digest ?? null };
  });
}

export function verifyLifecycleRecovery(recovery, decisions, stopId) {
  if (recovery.some(reference => !decisions.some(decision =>
    decision.attempt_id === reference.attempt_id && decision.request_digest === reference.request_digest &&
    decision.publication_digest === reference.publication_digest && decision.stop_id === stopId))) {
    throw failure('OPERATOR_PROVENANCE_UNAVAILABLE');
  }
}

const conflict = () => { throw failure('REVISION_CONFLICT', 'conflict'); };

export function recoverableSupersededUpdate(operation) {
  const { owner, terminal } = operation ?? {};
  return operation?.outcome === 'superseded' && ['upgrade', 'configure'].includes(owner?.kind) &&
    terminal?.status === 'host_updated_admission_fenced' && terminal.provider?.status === 'UPDATE_COMPLETE' &&
    ['DISABLED', 'ENABLED'].includes(terminal.observed?.schedule) && [0, 1].includes(terminal.observed.concurrency) &&
    terminal.observed?.package_revision === owner.details.target?.package_revision &&
    terminal.observed?.configuration_digest === owner.details.target?.configuration_digest &&
    owner.effects.some(effect => effect.name === 'execute-change-set' && effect.state === 'settled') &&
    owner.effects.every(effect => effect.state !== 'claimed');
}

export function currentSupersededUpdate(operation, { lifecycle, installation }) {
  return recoverableSupersededUpdate(operation) && lifecycle.bootstrapped &&
    operation.fence_id === lifecycle.fence_id && operation.owner.id === lifecycle.last_operation_id &&
    !lifecycle.owner && lifecycle.generation === null &&
    Object.entries(disabledLifecycleControls).every(([key, value]) => installation[key] === value) &&
    operation.owner.details.source?.package_revision === installation.package_revision &&
    operation.owner.details.source?.configuration_digest === installation.configuration_digest;
}

export function rotateHealthEpoch(installation, desired) {
  const { health_generation: generation, health_enabled_at: enabledAt } = installation.extensions;
  const validEpoch = typeof generation === 'string' && /^[-A-Za-z0-9._:]{1,255}$/.test(generation) &&
    typeof enabledAt === 'string' && Number.isFinite(Date.parse(enabledAt)) && new Date(enabledAt).toISOString() === enabledAt;
  return desired.schedule_enabled && (!installation.schedule_enabled ||
    installation.configuration_digest !== desired.configuration_digest || !validEpoch);
}

export const alarmEffects = Object.freeze({
  suppress: 'disable-alarm-actions',
  native: 'enable-native-alarm-actions',
  completion: 'put-completion-alarm',
  budget: 'put-budget-alarm'
});
const cloudFormation = ['create-change-set', 'execute-change-set'];
const hostStop = ['disable-schedule', 'disable-concurrency'];
const customEffects = [alarmEffects.completion, alarmEffects.budget];
const directAlarmEffects = new Set(Object.values(alarmEffects));

export function alarmOperationEffects(kind, plan, hostPrefix = hostStop) {
  if (kind === 'bootstrap') return [...cloudFormation];
  if (kind === 'stop') return [...hostStop, alarmEffects.suppress];
  const scheduled = plan.intent === 'scheduled';
  const manual = plan.intent === 'manual-writes-only';
  return [
    ...hostPrefix, ...(plan.source ? [alarmEffects.suppress] : []), ...cloudFormation,
    ...(scheduled ? [alarmEffects.native] : []),
    ...(scheduled || manual ? ['enable-concurrency'] : []),
    ...(scheduled ? ['enable-schedule'] : []),
    ...(scheduled || plan.source ? customEffects : [])
  ];
}

function verifiedAlarmActions(terminal, enabled) {
  const observed = terminal.alarms, rows = observed?.alarms;
  return observed?.status === 'aligned' && Array.isArray(rows) && rows.length === 4 &&
    new Set(rows.map(row => row.name)).size === 4 &&
    rows.every(row => row.status === 'aligned' && row.actions_enabled === enabled);
}

function verifiesAlarmUpdate(owner, terminal, installation) {
  const { details } = owner, { target, alarm_plan: plan } = details;
  return terminal.provider?.status === 'UPDATE_COMPLETE' && terminal.provider.operation === owner.id &&
    terminal.provider.stack_id === details.stack_id && terminal.provider.change_set_id === details.change_set_id &&
    verifiedAlarmActions(terminal, plan.intent === 'scheduled') &&
    terminal.observed?.package_revision === target.package_revision &&
    terminal.observed?.configuration_digest === target.configuration_digest &&
    terminal.observed?.code_hash === Buffer.from(target.zip_digest.slice(7), 'hex').toString('base64') &&
    terminal.observed.schedule === (plan.intent === 'scheduled' ? 'ENABLED' : 'DISABLED') &&
    terminal.observed.concurrency === (['scheduled', 'manual-writes-only'].includes(plan.intent) ? 1 : 0) &&
    (plan.intent !== 'scheduled' || (details.rotate_health_epoch
      ? recordedEnablement(owner)
      : savedLifecycleEpoch(installation) && details.source.configuration_digest === target.configuration_digest &&
        details.source.package_revision === target.package_revision));
}

function savedLifecycleEpoch(installation) {
  return !rotateHealthEpoch({ ...installation, schedule_enabled: true },
    { schedule_enabled: true, configuration_digest: installation.configuration_digest });
}

function validateKnownFailure(owner, lifecycle, installation, terminal) {
  const source = owner.details.held ?? owner.details.source;
  const committed = lifecycle.current_alarm_package;
  const expected = source ?? committed;
  const actual = terminal.observed;
  if (terminal.status !== 'known_update_failure' || terminal.source_agreement !== 'committed_source' ||
      !expected || actual?.schedule !== 'DISABLED' || actual.concurrency !== 0 ||
      actual.package_revision !== expected.package_revision || actual.configuration_digest !== expected.configuration_digest ||
      actual.code_hash !== Buffer.from(expected.zip_digest.slice(7), 'hex').toString('base64') ||
      installation.package_revision !== expected.package_revision || installation.configuration_digest !== expected.configuration_digest ||
      (committed && committed.manifest_digest !== expected.manifest_digest)) conflict();
  const denied = owner.effects.find(effect => effect.state === 'rejected');
  if (denied && !proofEqual(denied, terminal.rejected_effect)) conflict();
}

function validateAlarmPlan(action, lifecycle) {
  const plan = action.details.alarm_plan;
  if (!plan) {
    if (action.effects.some(effect => directAlarmEffects.has(effect))) conflict();
    if (action.type === 'reserve' && lifecycle.current_alarm_package &&
        ['configure', 'upgrade', 'maintenance-only'].includes(action.kind)) conflict();
    return;
  }
  const { kind, effects, details } = action;
  const allowed = { bootstrap: ['disabled'], stop: ['disabled'], upgrade: ['upgrade-maintenance'],
    configure: ['scheduled', 'manual-writes-only', 'disabled'], 'maintenance-only': ['disabled'] };
  if (Object.keys(plan).length !== 3 || plan.version !== 1 || typeof plan.source !== 'boolean' ||
      !allowed[kind]?.includes(plan.intent) || kind === 'upgrade' && plan.source !== Boolean(lifecycle.current_alarm_package) ||
      kind === 'bootstrap' && (!plan.source || lifecycle.current_alarm_package || !proofEqual(details.source, details.target)) ||
      kind === 'stop' && (!plan.source || lifecycle.current_alarm_package?.intent !== 'disabled') ||
      kind === 'maintenance-only' && (!plan.source || !details.held || !details.predecessor_fence ||
        details.superseded_operation === action.id || details.predecessor_fence === action.id) ||
      kind === 'configure' && (!plan.source || !lifecycle.current_alarm_package ||
        details.schedule_enabled !== (plan.intent === 'scheduled') ||
        details.enabling !== (plan.intent !== 'disabled'))) conflict();
  if (kind !== 'stop' && !valid({ ...details.target, intent: plan.intent }, alarmPackageSchema)) conflict();
  if (!['stop', 'bootstrap', 'maintenance-only'].includes(kind) &&
      !valid({ ...details.source, intent: plan.intent }, alarmPackageSchema)) conflict();
  if (kind === 'stop' && lifecycle.current_alarm_package.manifest_digest !== details.source_manifest) conflict();
  if (['upgrade', 'configure', 'maintenance-only'].includes(kind) && lifecycle.current_alarm_package) {
    const { intent, ...current } = lifecycle.current_alarm_package;
    if (!proofEqual(current, details.held ?? details.source)) conflict();
  }
  const prefix = kind === 'maintenance-only' ? hostStop.filter(effect => effects.includes(effect)) : hostStop;
  if (!proofEqual(effects, alarmOperationEffects(kind, plan, prefix))) conflict();
}

export function recordedEnablement(owner) {
  const epoch = owner.verified_enablement;
  if (epoch?.health_generation !== owner.id || !Number.isFinite(Date.parse(epoch.health_enabled_at)) ||
      new Date(epoch.health_enabled_at).toISOString() !== epoch.health_enabled_at ||
      Date.parse(epoch.health_enabled_at) < Date.parse(owner.created_at)) return null;
  if (!owner.details.alarm_plan) return owner.phase === 'enablement-recorded' ? epoch : null;
  const prefix = owner.effects.slice(0, -customEffects.length);
  const suffix = owner.effects.slice(-customEffects.length);
  return owner.details.alarm_plan.intent === 'scheduled' && prefix.at(-1)?.name === 'enable-schedule' &&
    prefix.every(effect => effect.state === 'settled') &&
    proofEqual(suffix.map(effect => effect.name), customEffects) ? epoch : null;
}

export function lifecycleTransition(snapshot, action, actor, ensureRecord) {
  const { installation, lifecycle } = snapshot;
  const { type, now, id } = action;
  let owner = lifecycle.owner;
  const next = { ...lifecycle, revision: nextRevision(lifecycle.revision) };
  const changes = { revision: nextRevision(installation.revision), updated_at: now };
  let operation = null;
  if (type === 'reserve' || type === 'emergency') {
    if (type === 'reserve' && owner) conflict();
    if (!owner) {
      validateAlarmPlan(action, lifecycle);
      owner = { id, kind: action.kind, fence_id: id, phase: 'reserved', details: action.details,
        effects: action.effects.map(name => ({ name, state: 'pending' })), actor, created_at: now,
        installation_revision: changes.revision };
      if (new Set(action.effects).size !== action.effects.length) conflict();
      next.owner = owner;
    }
    next.fence_id = id;
    next.generation = null;
    Object.assign(changes, disabledLifecycleControls, {
      extensions: Object.fromEntries(Object.entries(installation.extensions).filter(([key]) => !STOP_KEYS.includes(key)))
    });
    if (type === 'reserve' && action.kind === 'configure') {
      const rotate = rotateHealthEpoch(installation, { schedule_enabled: action.details.schedule_enabled === true,
        configuration_digest: action.details.target?.configuration_digest });
      owner = next.owner = { ...owner, details: { ...owner.details, rotate_health_epoch: rotate } };
      // Budget for the final revision, which will advance as effects settle.
      if (rotate) ensureRecord({ ...installation, ...changes,
        configuration_digest: action.details.target.configuration_digest,
        package_revision: action.details.target.package_revision,
        revision: Number.MAX_SAFE_INTEGER,
        extensions: { ...changes.extensions, health_generation: id, health_enabled_at: now } });
    }
  } else {
    if (!owner || owner.id !== id) conflict();
    const superseded = owner.fence_id !== lifecycle.fence_id;
    if (type === 'record-enablement') {
      const prefix = owner.details.alarm_plan ? owner.effects.slice(0, -customEffects.length) : owner.effects;
      const suffix = owner.details.alarm_plan ? owner.effects.slice(-customEffects.length) : [];
      if (superseded || !proofEqual(actor, owner.actor) || owner.kind !== 'configure' || owner.details.rotate_health_epoch !== true ||
          owner.details.schedule_enabled !== true || owner.details.enabling !== true || owner.verified_enablement ||
          owner.phase !== 'settled' || prefix.some(effect => effect.state !== 'settled') ||
          suffix.some(effect => effect.state !== 'pending') ||
          !['execute-change-set', 'enable-concurrency', 'enable-schedule'].every(name =>
            owner.effects.some(effect => effect.name === name)) ||
          !Object.entries(disabledLifecycleControls).every(([key, value]) => installation[key] === value) ||
          Date.parse(now) < Date.parse(owner.created_at)) conflict();
      next.owner = { ...owner, phase: 'enablement-recorded', verified_enablement: { health_generation: id, health_enabled_at: now } };
    } else if (type === 'retain-recovery') {
      if (superseded || owner.kind !== 'upgrade' || owner.effects.some(effect => effect.state === 'claimed') ||
          new Set(action.recovery.map(reference => reference.attempt_id)).size !== action.recovery.length) conflict();
      const records = new Map(lifecycle.recovery.map(reference => [reference.attempt_id, reference]));
      for (const reference of action.recovery) {
        if (records.has(reference.attempt_id) && !proofEqual(records.get(reference.attempt_id), reference)) conflict();
        records.set(reference.attempt_id, reference);
      }
      next.recovery = [...records.values()];
    } else if (['claim', 'settle', 'skip', 'reject-alarm'].includes(type)) {
      const effect = owner.effects.find(effect => effect.state !== 'settled');
      const claim = type === 'claim', reject = type === 'reject-alarm';
      const direct = directAlarmEffects.has(action.effect);
      if (!effect || effect.name !== action.effect || effect.state !== (type === 'settle' || reject ? 'claimed' : 'pending') ||
          type !== 'settle' && superseded || direct && (!owner.details.alarm_plan || !proofEqual(actor, owner.actor)) ||
          reject && !direct || type === 'skip' && (direct || ['enable-concurrency', 'enable-schedule'].includes(effect.name)) ||
          claim && customEffects.includes(effect.name) && owner.details.rotate_health_epoch === true && !recordedEnablement(owner)) conflict();
      next.owner = { ...owner, phase: claim ? 'dispatching' : 'settled', effects: owner.effects.map(candidate =>
        candidate === effect ? { ...effect, state: reject ? 'rejected' : claim ? 'claimed' : 'settled',
          ...(reject ? { rejection: action.rejection } : {}) } : candidate) };
    } else if (type === 'finish') {
      if (owner.effects.some(effect => effect.state === 'claimed') ||
          (action.outcome === 'completed' && owner.effects.some(effect => effect.state !== 'settled')) ||
          (action.outcome === 'superseded') !== superseded) conflict();
      const disabled = Object.keys(disabledLifecycleControls).every(key => installation[key] === disabledLifecycleControls[key]);
      const marked = Boolean(owner.details.alarm_plan);
      if (marked && !proofEqual(actor, owner.actor)) conflict();
      if (marked && action.outcome === 'completed' && (owner.kind === 'stop' ? !action.stop : !action.controls)) conflict();
      if (marked && action.outcome === 'partial' &&
          (owner.effects.some(effect => effect.state === 'rejected') ||
           /UPDATE_ROLLBACK/.test(action.terminal.provider?.status ?? ''))) {
        if (!disabled) conflict();
        validateKnownFailure(owner, lifecycle, installation, action.terminal);
      }
      if (superseded && (!disabled || lifecycle.generation !== null || action.controls || action.stop || action.recovery)) conflict();
      if (action.terminal.bootstrap_acknowledged !== undefined) {
        const { status, observed, provider } = action.terminal;
        const { source, target } = owner.details;
        if (action.terminal.bootstrap_acknowledged !== true || action.terminal.bootstrap_pin !== lifecycle.origin.table_id ||
            !superseded || lifecycle.bootstrapped || owner.kind !== 'bootstrap' ||
            owner.effects.length !== 2 || !['create-change-set', 'execute-change-set'].every(name =>
              owner.effects.some(effect => effect.name === name && effect.state === 'settled')) ||
            !source || !proofEqual(source, target) || owner.details.stack_id !== lifecycle.origin.stack_id ||
            owner.details.table_id !== lifecycle.origin.table_id || owner.details.installation_generation !== lifecycle.origin.installation_generation ||
            status !== 'host_updated_admission_fenced' || provider?.status !== 'UPDATE_COMPLETE' ||
            observed?.schedule !== 'DISABLED' || observed.concurrency !== 0 || observed.writes_intended !== false ||
            observed.configuration_digest !== source.configuration_digest || source.configuration_digest !== installation.configuration_digest ||
            observed.package_revision !== source.package_revision || source.package_revision !== installation.package_revision) conflict();
        if (owner.details.alarm_plan) {
          const commitment = { ...source, intent: 'disabled' };
          if (lifecycle.current_alarm_package || !proofEqual(action.terminal.alarm_package, commitment) ||
              !verifiesAlarmUpdate(owner, action.terminal, installation)) conflict();
          next.current_alarm_package = commitment;
        }
        next.bootstrapped = true;
      }
      if (action.outcome !== 'completed' && (action.controls || action.stop || action.recovery)) conflict();
      if (action.controls) {
        if (!['bootstrap', 'configure', 'upgrade', 'maintenance-only', 'maintenance_only'].includes(owner.kind) ||
            owner.kind !== 'configure' && (action.controls.schedule_enabled || action.controls.writes_enabled)) conflict();
        if (owner.details.alarm_plan) {
          const { intent } = owner.details.alarm_plan, { target } = owner.details;
          const expectedStatus = { bootstrap: 'bootstrapped', upgrade: 'upgraded',
            configure: 'configured', 'maintenance-only': 'configured' }[owner.kind];
          const commitment = { ...target, intent };
          if (!expectedStatus || action.terminal.status !== expectedStatus ||
              !verifiesAlarmUpdate(owner, action.terminal, installation) ||
              !proofEqual(action.terminal.alarm_package, commitment) ||
              !proofEqual(action.terminal.committed_controls, action.controls) ||
              action.controls.package_revision !== target.package_revision ||
              action.controls.configuration_digest !== target.configuration_digest ||
              action.controls.schedule_enabled !== (intent === 'scheduled') ||
              ['scheduled', 'manual-writes-only'].includes(intent) &&
                action.controls.writes_enabled !== action.terminal.observed.writes_intended ||
              intent === 'manual-writes-only' && !action.controls.writes_enabled ||
              intent === 'disabled' && action.controls.writes_enabled ||
              intent === 'upgrade-maintenance' && (!action.controls.maintenance || action.controls.writes_enabled) ||
              action.controls.maintenance && (action.controls.writes_enabled || action.controls.schedule_enabled)) conflict();
          next.current_alarm_package = commitment;
        }
        Object.assign(changes, action.controls);
        if (owner.kind === 'configure' && (action.controls.schedule_enabled !== (owner.details.schedule_enabled === true) ||
            owner.details.target?.configuration_digest !== action.controls.configuration_digest ||
            owner.details.target?.package_revision !== action.controls.package_revision)) conflict();
        if (action.controls.schedule_enabled && owner.details.rotate_health_epoch === true) {
          const epoch = recordedEnablement(owner);
          if (!epoch) throw failure('ENABLEMENT_UNVERIFIED', 'conflict');
          changes.extensions = { ...installation.extensions, ...epoch };
        }
      }
      if (action.stop) {
        if (marked && (action.terminal.status !== 'drained' || !verifiedAlarmActions(action.terminal, false))) conflict();
        if (!lifecycle.bootstrapped || owner.kind !== 'stop' || action.stop.pb_stop_id !== owner.id ||
            action.stop.pb_stop_fence_revision !== owner.installation_revision ||
            action.stop.pb_stop_actor !== operatorActorId(owner.actor)) conflict();
        changes.extensions = { ...installation.extensions, ...action.stop };
        const updated = { ...installation, ...changes };
        const stop = completedStop(updated, updated);
        if (!proofEqual(stop, action.stop) || Date.parse(stop.pb_stop_completed_at) - Date.parse(stop.pb_stop_started_at) < stop.pb_stop_window_ms) conflict();
        next.generation = stopGeneration(lifecycle.origin, stop);
      }
      if (action.recovery) next.recovery = action.recovery;
      if (owner.kind === 'bootstrap' && action.outcome === 'completed') next.bootstrapped = true;
      next.owner = null;
      next.last_operation_id = id;
      operation = { schema: 'pigboard-lifecycle-operation/v1', origin: lifecycle.origin, owner,
        fence_id: lifecycle.fence_id, outcome: action.outcome, terminal: action.terminal, actor, recorded_at: now };
    }
  }
  return { lifecycle: next, installation: { ...installation, ...changes }, changes, operation };
}
