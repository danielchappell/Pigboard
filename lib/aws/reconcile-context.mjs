import { completedStop, operatorActorId, proofEqual, result, failure, valid, schemas } from '../state/contract.mjs';

function designatedOperator(operator) {
  if (!operator || typeof operator.arn !== 'string' || typeof operator.operator_role_arn !== 'string') return false;
  const role = /^arn:(aws(?:-us-gov|-cn)?):iam::([0-9]{12}):role\/([A-Za-z0-9_+=,.@/-]+)$/.exec(operator.operator_role_arn);
  const caller = /^arn:(aws(?:-us-gov|-cn)?):sts::([0-9]{12}):assumed-role\/([A-Za-z0-9_+=,.@-]+)\/([A-Za-z0-9_+=,.@-]+)$/.exec(operator.arn);
  return !!role && !!caller && role[1] === caller[1] && role[2] === caller[2] && role[2] === operator.account_id && role[3].split('/').at(-1) === caller[3];
}
/** Private composition ports have no production default or public loader. The
 * actual83 projection owns source tuples/complete route derivation, not85. */
export async function readReconciliationContext({ binding, canonicalConfig, state, stateView }, { readBoundRuntime, projectBoundRuntime } = {}) {
  try {
    if (typeof readBoundRuntime !== 'function' || typeof projectBoundRuntime !== 'function') return result('unavailable', 'CORE_PREREQUISITE');
    const observation = await readBoundRuntime({ binding, canonicalConfig });
    if (observation?.status !== 'confirmed' || !observation.data) return result('conflict', observation?.status === 'unsupported' ? 'BOUNDS_UNSUPPORTED' : 'CONTROL_MISMATCH');
    const runtime = observation.data, installed = stateView.installation;
    for (const k of ['installation_id', 'installation_generation', 'configuration_digest', 'package_revision']) if (runtime[k] !== binding[k]) throw failure('CONTROL_MISMATCH', 'conflict');
    if (!valid(runtime.observed_at, schemas.timestamp)) throw failure('CONTROL_MISMATCH', 'conflict');
    const disabled = { schedule_enabled: false, writes_enabled: false, maintenance: true };
    if (runtime.controls?.agree !== true || !proofEqual(runtime.controls.desired, disabled) || !proofEqual(runtime.controls.applied, disabled) || runtime.scheduler?.state !== 'disabled') throw failure('CONTROL_MISMATCH', 'conflict');
    if (!designatedOperator(runtime.operator)) throw failure('OPERATOR_UNAUTHORIZED', 'conflict');
    const actor_id = operatorActorId(runtime.operator);
    const projection = await projectBoundRuntime({ observation, binding, canonicalConfig });
    if (projection?.status !== 'confirmed' || !projection.data) throw failure('BOUNDS_UNSUPPORTED', 'conflict');
    const p = projection.data, hash = { type: 'string', pattern: '^sha256:[0-9a-f]{64}$' };
    if (!valid(p, schemas.obj({ resource_digest: hash, bounds_digest: hash, window_ms: { ...schemas.revision, minimum: 1 } }))) throw failure('BOUNDS_UNSUPPORTED', 'conflict');
    const bounds = [runtime.scheduler?.delivery_bound_ms, runtime.function?.invocation_timeout_ms, runtime.function?.request_timeout_ms];
    if (bounds.some((n, i) => !Number.isSafeInteger(n) || n < (i === 0 ? 0 : 1)) || !Number.isSafeInteger(bounds.reduce((a, b) => a + b, 0)) || bounds.reduce((a, b) => a + b, 0) !== p.window_ms || typeof runtime.function?.resource_arn !== 'string' || runtime.scheduler.target_function_arn !== runtime.function.resource_arn) throw failure('BOUNDS_UNSUPPORTED', 'conflict');
    const stop = completedStop(installed, binding);
    if (stop.pb_stop_resource_digest !== p.resource_digest || stop.pb_stop_bounds_digest !== p.bounds_digest || stop.pb_stop_window_ms !== p.window_ms) throw failure('DRAIN_INCOMPLETE', 'conflict');
    const fresh = await state.readAttempt({ attempt_id: stateView.attempt.attempt_id });
    if (fresh.status !== 'confirmed' || !proofEqual(fresh.data.installation, installed) || !proofEqual(fresh.data.stream, stateView.stream) || !proofEqual(fresh.data.attempt, stateView.attempt)) throw failure('REVISION_CONFLICT', 'conflict');
    return result('confirmed', 'OK', { binding, canonicalConfig, actor_id, stop, observed_at: runtime.observed_at });
  } catch (error) { return error.stateResult ?? result('unavailable', 'UNAVAILABLE'); }
}
