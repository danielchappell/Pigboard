import { completedStop, failure, nextRevision, operatorActorId, proofEqual, STOP_KEYS, transitionProof } from '../state/contract.mjs';

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
    if (type === 'retain-recovery') {
      if (superseded || owner.kind !== 'upgrade' || owner.effects.some(effect => effect.state === 'claimed') ||
          new Set(action.recovery.map(reference => reference.attempt_id)).size !== action.recovery.length) conflict();
      const records = new Map(lifecycle.recovery.map(reference => [reference.attempt_id, reference]));
      for (const reference of action.recovery) {
        if (records.has(reference.attempt_id) && !proofEqual(records.get(reference.attempt_id), reference)) conflict();
        records.set(reference.attempt_id, reference);
      }
      next.recovery = [...records.values()];
    } else if (type === 'claim' || type === 'settle' || type === 'skip') {
      const effect = owner.effects.find(effect => effect.state !== 'settled');
      const claim = type === 'claim';
      if (!effect || effect.name !== action.effect || effect.state !== (type === 'settle' ? 'claimed' : 'pending') || type !== 'settle' && superseded) conflict();
      next.owner = { ...owner, phase: claim ? 'dispatching' : 'settled', effects: owner.effects.map(candidate =>
        candidate === effect ? { ...effect, state: claim ? 'claimed' : 'settled' } : candidate) };
    } else if (type === 'finish') {
      if (owner.effects.some(effect => effect.state === 'claimed') ||
          (action.outcome === 'completed' && owner.effects.some(effect => effect.state !== 'settled')) ||
          (action.outcome === 'superseded') !== superseded) conflict();
      const disabled = Object.keys(disabledLifecycleControls).every(key => installation[key] === disabledLifecycleControls[key]);
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
        next.bootstrapped = true;
      }
      if (action.outcome !== 'completed' && (action.controls || action.stop || action.recovery)) conflict();
      if (action.controls) {
        if (!['bootstrap', 'configure', 'upgrade', 'maintenance-only', 'maintenance_only'].includes(owner.kind) ||
            owner.kind !== 'configure' && (action.controls.schedule_enabled || action.controls.writes_enabled)) conflict();
        Object.assign(changes, action.controls);
        if (owner.kind === 'configure' && (action.controls.schedule_enabled !== (owner.details.schedule_enabled === true) ||
            owner.details.target?.configuration_digest !== action.controls.configuration_digest ||
            owner.details.target?.package_revision !== action.controls.package_revision)) conflict();
        if (action.controls.schedule_enabled && owner.details.rotate_health_epoch === true) {
          changes.extensions = { ...installation.extensions, health_generation: id, health_enabled_at: now };
        }
      }
      if (action.stop) {
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
