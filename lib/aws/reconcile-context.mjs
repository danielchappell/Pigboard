import canonicalize from 'canonicalize';
import { createHash } from 'node:crypto';
import { completedStop, proofEqual, result } from '../state/contract.mjs';

const digest = value => 'sha256:' + createHash('sha256').update(canonicalize(value)).digest('hex');
const disabled = { schedule_enabled: false, writes_enabled: false, maintenance: true };

// Versioned direct AWS route projection. Each array position is part of the
// digest contract. Canonical JSON sorts object keys within each position.
export function projectBoundRuntime({ binding, config, observed, scope }) {
  const { schedule, asyncConfig, function: fn } = observed;
  const { Target: target, FlexibleTimeWindow: window } = schedule;
  const { stack_id } = binding;
  const expectedSchedule = stack_id.replace(':cloudformation:', ':scheduler:').split(':stack/')[0] +
    ':schedule/default/' + observed.names.schedule_name;
  const hasDestination = [asyncConfig.DestinationConfig?.OnSuccess, asyncConfig.DestinationConfig?.OnFailure]
    .some(value => value && Object.keys(value).length);
  if (!['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(observed.stack.StackStatus) ||
      schedule.Arn !== expectedSchedule || schedule.GroupName !== 'default' ||
      schedule.Name !== observed.names.schedule_name ||
      schedule.ScheduleExpression !== `rate(${config.manager.schedule_minutes} minutes)` ||
      window?.Mode !== 'OFF' || target?.Arn !== fn.FunctionArn ||
      target.DeadLetterConfig || hasDestination || fn.DeadLetterConfig?.TargetArn ||
      fn.Version !== '$LATEST' || asyncConfig.FunctionArn !== fn.FunctionArn + ':$LATEST' ||
      target.RetryPolicy?.MaximumEventAgeInSeconds !== 60 || target.RetryPolicy.MaximumRetryAttempts !== 0 ||
      asyncConfig.MaximumEventAgeInSeconds !== 60 || asyncConfig.MaximumRetryAttempts !== 0) return null;

  const resource_digest = digest(['pigboard-stop-resources/v1', scope, {
    arn: schedule.Arn, group: schedule.GroupName, name: schedule.Name,
    expression: schedule.ScheduleExpression, window_mode: window.Mode,
    target_arn: target.Arn, role_arn: target.RoleArn, input: target.Input
  }, {
    arn: fn.FunctionArn, async_arn: asyncConfig.FunctionArn, qualifier: '$LATEST',
    code_hash: observed.code_hash, role_arn: fn.Role, handler: fn.Handler, runtime: fn.Runtime
  }, {
    configuration_digest: binding.configuration_digest, package_revision: binding.package_revision
  }]);
  const bounds = {
    scheduler_maximum_event_age_seconds: target.RetryPolicy.MaximumEventAgeInSeconds,
    scheduler_maximum_retry_attempts: target.RetryPolicy.MaximumRetryAttempts,
    lambda_maximum_event_age_seconds: asyncConfig.MaximumEventAgeInSeconds,
    lambda_maximum_retry_attempts: asyncConfig.MaximumRetryAttempts,
    invocation_timeout_ms: fn.Timeout * 1000,
    request_timeout_ms: config.jira.read_bounds.request_timeout_ms
  };
  const delays = [bounds.scheduler_maximum_event_age_seconds * 1000, bounds.lambda_maximum_event_age_seconds * 1000,
    bounds.invocation_timeout_ms, bounds.request_timeout_ms];
  const window_ms = delays.reduce((sum, delay) => sum + delay, 0);
  if (delays.some(delay => !Number.isSafeInteger(delay) || delay <= 0) || !Number.isSafeInteger(window_ms)) return null;
  return {
    resource_digest, window_ms,
    bounds_digest: digest(['pigboard-stop-bounds/v1', resource_digest, bounds])
  };
}

// Until PGB-86 supplies a provider-backed producer, production has no positive
// generation observation. The composition below accepts a fixture client only
// through the host's existing programmatic SDK and client injection.
async function currentStopGeneration() {
  return result('unavailable', 'CORE_PREREQUISITE');
}

export async function readReconciliationContext({ binding, config, desired, applied, observed, originEvidence, installation },
  readGeneration = currentStopGeneration) {
  try {
    const controls = source => Object.fromEntries(Object.keys(disabled).map(key => [key, source?.[key]]));
    if (![desired, applied, installation].every(source => source?.configuration_digest === binding.configuration_digest && proofEqual(controls(source), disabled)) ||
        installation.package_revision !== binding.package_revision ||
        !proofEqual(observed.binding, binding) || observed.schedule.State !== 'DISABLED' || observed.concurrency !== 0) {
      return result('conflict', 'CONTROL_MISMATCH');
    }
    if (!originEvidence || observed.table.TableId !== originEvidence.table_id ||
        Number(new Date(observed.table.CreationDateTime)) !== Date.parse(originEvidence.table_created_at)) {
      return result('unavailable', 'ORIGIN_UNVERIFIED');
    }
    const { installation_id, domain_id, site, stack_id, table_arn, installation_generation } = binding;
    const scope = { installation_id, domain_id, site, stack_id, table_arn, table_id: observed.table.TableId, installation_generation };
    const projection = projectBoundRuntime({ binding, config, observed, scope });
    if (!projection) return result('conflict', 'BOUNDS_UNSUPPORTED');
    const stop = completedStop(installation, binding);
    const clockElapsed = Date.parse(stop.pb_stop_completed_at) - Date.parse(stop.pb_stop_started_at);
    const observed_at = new Date().toISOString();
    if (clockElapsed < projection.window_ms || Date.parse(stop.pb_stop_completed_at) > Date.parse(observed_at) ||
        stop.pb_stop_resource_digest !== projection.resource_digest || stop.pb_stop_window_ms !== projection.window_ms ||
        stop.pb_stop_bounds_digest !== projection.bounds_digest) return result('conflict', 'DRAIN_INCOMPLETE');
    const expected = {
      ...scope, producer_generation: 'pigboard-stop-producer/v1',
      stop_id: stop.pb_stop_id, fence_revision: stop.pb_stop_fence_revision,
      configuration_digest: binding.configuration_digest, package_revision: binding.package_revision,
      resource_digest: projection.resource_digest, bounds_digest: projection.bounds_digest
    };
    const generation = await readGeneration(Object.freeze({ ...scope }));
    if (generation?.status !== 'confirmed' || !proofEqual(generation.data, expected)) return result('conflict', 'DRAIN_INCOMPLETE');
    return result('confirmed', 'OK', { stop, observed_at });
  } catch (error) {
    return error.stateResult ?? result('conflict', 'DRAIN_INCOMPLETE');
  }
}
