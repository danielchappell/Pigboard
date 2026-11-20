import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import canonicalize from 'canonicalize';
import { snsTopicArnContract } from '../config/parse.mjs';
import { parseContract } from '../contracts/work.mjs';
import { evidenceRevision, healthSettings } from '../manager/health.mjs';

const ALARM_TYPE = 'AWS::CloudWatch::Alarm';
const MODULE = 'lib/aws/alarms.mjs';
const CONFIG_SCHEMA = 'contracts/config-v1.schema.json';
const CONFIG_PARSER = 'lib/config/parse.mjs';
const EMBEDDED_MANIFEST = 'package-manifest.json';
const DORMANT_REVISION = 'pigboard-unbound-v1';
const NAMESPACE = 'Pigboard/Manager';
const signals = [
  { key: 'missing_completion', logical_id: 'MissingCompletionAlarm', suffix: 'missing-completion', custom: true },
  { key: 'lambda_errors', logical_id: 'LambdaErrorsAlarm', suffix: 'lambda-errors', custom: false },
  { key: 'lambda_throttles', logical_id: 'LambdaThrottlesAlarm', suffix: 'lambda-throttles', custom: false },
  { key: 'measured_budget', logical_id: 'MeasuredBudgetAlarm', suffix: 'measured-budget', custom: true }
];
const alarmResourceType = /^AWS::CloudWatch::.*Alarm$/;

const hash = value => 'sha256:' + createHash('sha256').update(value).digest('hex');
const digest = value => typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value);
const same = (one, other) => canonicalize(one) === canonicalize(other);
const error = (code, facts) => Object.assign(new Error(code), { code, ...facts });
const own = (object, property) => Object.hasOwn(object ?? {}, property);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function alarmCapabilityFields() {
  return { schema: 'pigboard-manager-alarms/v1', logical_resources: signals.map(signal => signal.logical_id) };
}

export function hasAlarmCapability(manifest) {
  return manifest?.alarm_capability?.schema === 'pigboard-manager-alarms/v1';
}

function embeddedManifest(manifest) {
  const { zip_digest, ...contents } = manifest;
  const { [EMBEDDED_MANIFEST]: self, ...payload_hashes } = manifest.payload_hashes;
  return { ...contents, payload_hashes };
}

// The Lambda reads the pre-zip embedded form. Operator inputs have the outer
// digest and self-entry and must prove both in tandem.
export function assertAlarmManifest(manifest) {
  if (!own(manifest, 'alarm_capability')) {
    if (own(manifest?.payload_hashes, MODULE)) throw error('PACKAGE_MISMATCH');
    return;
  }
  if (!same(manifest.alarm_capability, alarmCapabilityFields()) ||
      !object(manifest.payload_hashes) || !digest(manifest.payload_hashes[MODULE])) {
    throw error('PACKAGE_MISMATCH');
  }
  if (own(manifest, 'zip_digest') || own(manifest.payload_hashes, EMBEDDED_MANIFEST)) {
    const expectedSelf = hash(JSON.stringify(embeddedManifest(manifest), null, 2) + '\n');
    if (!digest(manifest.zip_digest) || manifest.payload_hashes[EMBEDDED_MANIFEST] !== expectedSelf) {
      throw error('PACKAGE_MISMATCH');
    }
  }
}

export function supportsTopicRoutingSchema(schema) {
  const health = schema?.properties?.manager?.properties?.health;
  return health?.type === 'object' && health.additionalProperties === false &&
    Object.keys(health).every(key => ['type', 'additionalProperties', 'properties'].includes(key)) &&
    same(health.properties?.sns_topic_arn, snsTopicArnContract);
}

export function assertTopicRoutingManifest(manifest, config = manifest?.canonical_config) {
  if (config?.manager?.health?.sns_topic_arn &&
      (manifest?.schema !== 'pigboard-manager-package/v2' || !hasAlarmCapability(manifest) ||
        !digest(manifest.payload_hashes?.[CONFIG_SCHEMA]) || !digest(manifest.payload_hashes?.[CONFIG_PARSER]))) {
    throw error('PACKAGE_ROUTING_UNSUPPORTED');
  }
}

export function alarmDescriptors({ function_name, account_id, region }) {
  return signals.map(({ key, logical_id, suffix, custom }) => {
    const name = `${function_name}-${suffix}`;
    return {
      key, logical_id, name, arn: `arn:aws:cloudwatch:${region}:${account_id}:alarm:${name}`,
      link: `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:alarm/${encodeURIComponent(name)}`,
      output_id: logical_id + 'ConsoleUrl', custom
    };
  });
}

export function alarmWindow(config) {
  const cadence_seconds = config.manager.schedule_minutes * 60;
  const { freshness_seconds } = healthSettings(config);
  const evaluation_periods = Math.ceil(freshness_seconds / cadence_seconds);
  return {
    cadence_seconds, freshness_seconds, evaluation_periods,
    window_seconds: evaluation_periods * cadence_seconds,
    limit_seconds: cadence_seconds < 3600 ? 86400 : 604800,
    valid_example: { cadence_seconds: 300, freshness_seconds: 900 }
  };
}

export function assertAlarmWindow(config) {
  const window = alarmWindow(config);
  if (window.window_seconds > window.limit_seconds) throw error('ALARM_WINDOW_UNSUPPORTED', { alarm_window: window });
  return window;
}

const dimensions = pairs => Object.entries(pairs).map(([Name, Value]) => ({ Name, Value }));
const plainMetric = (Namespace, MetricName, Period, Statistic, Dimensions) => ({
  Namespace, MetricName, Period, Statistic, Dimensions
});

export function alarmDefinitions({
  config, function_name, account_id = config.manager.aws.account_id, region = config.manager.aws.region,
  package_revision, configuration_digest, epoch, actions_enabled = false
}) {
  const window = assertAlarmWindow(config);
  const topicArn = config.manager.health?.sns_topic_arn;
  const period = window.cadence_seconds;
  const revision = epoch ? evidenceRevision({
    package_revision, configuration_digest, health_generation: epoch.health_generation
  }) : DORMANT_REVISION;
  const enabledAt = epoch ? Date.parse(epoch.health_enabled_at) : null;
  if (epoch && (!revision || !Number.isFinite(enabledAt) || new Date(enabledAt).toISOString() !== epoch.health_enabled_at)) {
    throw error('ALARM_EPOCH_UNVERIFIED');
  }
  const customDimensions = dimensions({ InstallationId: config.manager.installation_id, EvidenceRevision: revision });
  const nativeDimensions = dimensions({ FunctionName: function_name });
  const completionMetric = { Namespace: NAMESPACE, MetricName: 'CompletePresence', Dimensions: customDimensions };
  const completion = epoch ? {
    Metrics: [
      { Id: 'm1', ReturnData: false, MetricStat: { Metric: completionMetric, Period: period, Stat: 'Maximum' } },
      { Id: 'e1', ReturnData: true, Expression: `IF(EPOCH(TIME_SERIES(1)) <= ${Math.floor(enabledAt / 1000) + window.freshness_seconds}, 1, FILL(m1, 0))` }
    ],
    TreatMissingData: 'breaching'
  } : plainMetric(NAMESPACE, 'CompletePresence', period, 'Maximum', customDimensions);
  const native = key => plainMetric('AWS/Lambda', key, 60, 'Sum', nativeDimensions);
  const definitions = {
    missing_completion: {
      ...completion, ComparisonOperator: 'LessThanThreshold', Threshold: 1,
      EvaluationPeriods: window.evaluation_periods, DatapointsToAlarm: window.evaluation_periods
    },
    lambda_errors: { ...native('Errors'), Threshold: 1 },
    lambda_throttles: { ...native('Throttles'), Threshold: 1 },
    measured_budget: {
      ...plainMetric(NAMESPACE, 'MaximumBudgetUtilization', period, 'Maximum', customDimensions),
      Threshold: healthSettings(config).warning_percent
    }
  };
  return alarmDescriptors({ function_name, account_id, region }).map(alarm => ({
    ...alarm,
    definition: {
      AlarmName: alarm.name, ActionsEnabled: actions_enabled && (!alarm.custom || !!epoch),
      AlarmActions: topicArn ? [topicArn] : [], OKActions: [], InsufficientDataActions: [],
      ComparisonOperator: 'GreaterThanOrEqualToThreshold', EvaluationPeriods: 1,
      DatapointsToAlarm: 1, TreatMissingData: 'notBreaching', ...definitions[alarm.key]
    }
  }));
}

const actions = ['AlarmActions', 'OKActions', 'InsufficientDataActions'];
const properties = [
  'AlarmName', 'ActionsEnabled', ...actions, 'ComparisonOperator', 'Threshold', 'EvaluationPeriods',
  'DatapointsToAlarm', 'TreatMissingData', 'Namespace', 'MetricName', 'Period', 'Statistic',
  'Dimensions', 'Metrics', 'Unit', 'ThresholdMetricId', 'ExtendedStatistic',
  'EvaluateLowSampleCountPercentile', 'EvaluationWindow', 'WarmUpConfiguration', 'EvaluationCriteria',
  'EvaluationInterval', 'ActionConfiguration'
];

function sortNamed(items, key) {
  return Array.isArray(items) ? items.toSorted((a, b) => String(a?.[key]).localeCompare(String(b?.[key]))) : items;
}

function normalizeDefinition(input) {
  const definition = Object.fromEntries(properties.filter(k => input[k] !== undefined).map(k => [k, input[k]]));
  // CloudWatch can omit empty actions, M of N when M equals N, and the
  // generated display label for a query. These do not change evaluation.
  for (const action of actions) {
    if (definition[action] === undefined) definition[action] = [];
    if (Array.isArray(definition[action])) definition[action] = definition[action].toSorted();
  }
  if (definition.DatapointsToAlarm === undefined) definition.DatapointsToAlarm = definition.EvaluationPeriods;
  if (definition.EvaluateLowSampleCountPercentile === 'evaluate') delete definition.EvaluateLowSampleCountPercentile;
  if (definition.Metrics?.length === 0 && Array.isArray(definition.Metrics)) delete definition.Metrics;
  if (definition.Dimensions?.length === 0 && Array.isArray(definition.Dimensions)) delete definition.Dimensions;
  if (definition.Dimensions !== undefined) definition.Dimensions = sortNamed(definition.Dimensions, 'Name');
  if (Array.isArray(definition.Metrics)) {
    definition.Metrics = sortNamed(definition.Metrics, 'Id').map(query => {
      if (!object(query)) return query;
      const { Label, ...metricQuery } = query;
      const stat = metricQuery.MetricStat;
      if (object(stat?.Metric) && stat.Metric.Dimensions !== undefined) {
        metricQuery.MetricStat = {
          ...stat, Metric: { ...stat.Metric, Dimensions: sortNamed(stat.Metric.Dimensions, 'Name') }
        };
      }
      return metricQuery;
    });
  }
  return definition;
}

export function compareAlarmDefinition(expected, actual) {
  return object(expected) && object(actual) && same(normalizeDefinition(expected), normalizeDefinition(actual));
}

function isoTime(value) {
  const instant = value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(instant) ? new Date(instant).toISOString() : null;
}

function safeDefinition(alarm) {
  const definition = normalizeDefinition(alarm);
  // The report should never grow with an unexpected alarm body.
  const serialized = JSON.stringify(definition);
  return serialized.length <= 8192 ? definition : null;
}

const denied = new Set(['AccessDenied', 'AccessDeniedException', 'UnauthorizedOperation']);

function actionDestinationsMatch(actual, expected, topicArn) {
  if (!expected && topicArn === undefined) return true;
  const desired = expected ?? { AlarmActions: topicArn ? [topicArn] : [], OKActions: [], InsufficientDataActions: [] };
  return actions.every(action => {
    const observed = actual[action] === undefined ? [] : actual[action];
    return Array.isArray(observed) && same(observed, desired[action] ?? []);
  });
}

export async function readAlarms(options) {
  const { descriptors, expected, describe, now = () => new Date() } = options;
  // Original callers expect empty actions. Transitional callers can explicitly
  // leave the destination unknown until the target definitions are established.
  const expectedTopicArn = own(options, 'expected_topic_arn') ? options.expected_topic_arn : null;
  const observations = new Map();
  const names = new Set(descriptors.map(alarm => alarm.name));
  const definitions = new Map((expected ?? []).map(alarm => [alarm.name, alarm.definition]));
  let incomplete = null, unexpected = false;
  try {
    const response = await describe({ AlarmNames: [...names], AlarmTypes: ['MetricAlarm'] });
    if (!object(response) || (response.MetricAlarms !== undefined && !Array.isArray(response.MetricAlarms))) {
      incomplete = 'ALARM_READ_INVALID';
    } else {
      if (response.NextToken !== undefined && response.NextToken !== '') incomplete = 'ALARM_READ_INCOMPLETE';
      if (response.CompositeAlarms?.length || response.LogAlarms?.length) unexpected = true;
      if ((response.MetricAlarms?.length ?? 0) > names.size) unexpected = true;
      for (const item of (response.MetricAlarms ?? []).slice(0, names.size + 1)) {
        if (!names.has(item?.AlarmName)) {
          unexpected = true;
          continue;
        }
        const name = item.AlarmName;
        if (observations.has(name)) {
          observations.set(name, null);
          unexpected = true;
        } else {
          observations.set(name, item);
        }
      }
    }
  } catch (cause) {
    incomplete = denied.has(cause?.name) || denied.has(cause?.code) ? 'ALARM_READ_DENIED'
      : cause?.code === 'HEALTH_DEADLINE' ? 'HEALTH_DEADLINE' : 'ALARM_READ_UNAVAILABLE';
  }
  const observed_at = isoTime(now());
  const alarms = descriptors.map(descriptor => {
    const value = observations.get(descriptor.name);
    const definition = definitions.get(descriptor.name) ?? null;
    const owned = value?.AlarmArn === descriptor.arn;
    let status = 'unknown', code = incomplete ?? 'ALARM_EXPECTATION_UNAVAILABLE';
    if (observations.has(descriptor.name) && !value) {
      status = 'mismatch';
      code = 'ALARM_DUPLICATE';
    } else if (!value && !incomplete) {
      status = 'mismatch';
      code = 'ALARM_MISSING';
    } else if (value && (!owned || !actionDestinationsMatch(value, definition, expectedTopicArn))) {
      status = 'mismatch';
      code = owned ? 'ALARM_ACTION_DESTINATION_MISMATCH' : 'ALARM_IDENTITY_MISMATCH';
    } else if (value && definition) {
      status = compareAlarmDefinition(definition, value) ? 'aligned' : 'mismatch';
      code = status === 'aligned' ? 'OK' : 'ALARM_DEFINITION_MISMATCH';
    }
    return {
      ...descriptor, expected: definition, actual: value ? safeDefinition(value) : null,
      actual_arn: value?.AlarmArn === descriptor.arn ? descriptor.arn : null,
      actions_enabled: owned && typeof value.ActionsEnabled === 'boolean' ? value.ActionsEnabled : null,
      raw_state: owned && ['OK', 'ALARM', 'INSUFFICIENT_DATA'].includes(value.StateValue) ? value.StateValue : null,
      raw_state_updated_at: owned ? isoTime(value.StateUpdatedTimestamp) : null,
      evaluation: 'unverified', status, code
    };
  });
  const status = incomplete ? 'unknown' : unexpected || alarms.some(alarm => alarm.status === 'mismatch') ? 'mismatch'
    : alarms.every(alarm => alarm.status === 'aligned') ? 'aligned' : 'unknown';
  const code = incomplete ?? (unexpected ? 'ALARM_QUARTET_MISMATCH'
    : alarms.find(alarm => alarm.status !== 'aligned')?.code ?? 'OK');
  return { status, code, observed_at, alarms };
}

const MAX_TOPIC_POLICY_BYTES = 30 * 1024;
const MAX_TOPIC_POLICY_STATEMENTS = 100;
const MAX_TOPIC_POLICY_LIST = 128;
const policyDocumentKeys = new Set(['Version', 'Id', 'Statement']);
const policyStatementKeys = new Set(['Sid', 'Effect', 'Principal', 'Action', 'Resource', 'Condition']);
const policyPrincipalKeys = new Set(['Service', 'AWS', 'Federated', 'CanonicalUser']);
const cloudWatchService = 'cloudwatch.amazonaws.com';
const wildcard = value => /[*?]|\$\{/.test(value);
const policyList = value => Array.isArray(value) ? value : [value];
const policyStrings = list => list.length > 0 && list.every(value => typeof value === 'string' && value.length > 0);

// Model only predicates we can interpret against this exact publication. A
// false selector rules out the statement; an unknown selector is never read as false.
function policyMatch(value, expected, { insensitive = false, star = false } = {}) {
  const list = policyList(value);
  if (!policyStrings(list)) return 'invalid';
  if (list.some(item => wildcard(item) && (!star || item !== '*'))) return 'unknown';
  if (list.includes('*')) return 'broad';
  return list.includes(expected) || (insensitive && list.some(item => item.toLowerCase() === expected))
    ? 'exact' : 'irrelevant';
}

function principalMatch(principal) {
  if (principal === '*') return 'broad';
  if (!object(principal) || !Object.keys(principal).length ||
      Object.keys(principal).some(key => !policyPrincipalKeys.has(key)) ||
      Object.values(principal).some(value => !policyStrings(policyList(value)))) return 'invalid';
  if (policyList(principal.AWS).includes('*')) return 'broad';
  if (Object.entries(principal).some(([kind, value]) => kind !== 'Service' && policyList(value).some(wildcard))) return 'unknown';
  return own(principal, 'Service') ? policyMatch(principal.Service, cloudWatchService) : 'irrelevant';
}

function conditionMatch(condition, accountId, alarmArn) {
  if (condition === undefined) return { state: 'match', scoped: false };
  if (!object(condition) || !Object.keys(condition).length) return { state: 'invalid', scoped: false };
  const predicates = [];
  for (const [operator, entries] of Object.entries(condition)) {
    const keys = object(entries) ? Object.keys(entries).map(key => key.toLowerCase()) : [];
    if (!keys.length || new Set(keys).size !== keys.length) {
      predicates.push({ match: 'invalid' });
      continue;
    }
    for (const [key, value] of Object.entries(entries)) {
      const context = key.toLowerCase();
      const account = operator === 'StringEquals' && context === 'aws:sourceaccount';
      const alarm = ['ArnEquals', 'ArnLike'].includes(operator) && context === 'aws:sourcearn';
      predicates.push({ account, alarm, match: account || alarm
        ? policyMatch(value, account ? accountId : alarmArn) : 'unknown' });
    }
  }
  if (predicates.some(item => item.match === 'irrelevant')) return { state: 'irrelevant', scoped: false };
  if (predicates.some(item => item.match === 'invalid')) return { state: 'invalid', scoped: false };
  if (predicates.some(item => item.match === 'unknown')) return { state: 'unknown', scoped: false };
  return { state: 'match', scoped: predicates.some(item => item.account) && predicates.some(item => item.alarm) };
}

function statementMatch(statement, topicArn, accountId, alarmArn) {
  if (!object(statement)) return 'unknown';
  const principal = own(statement, 'NotPrincipal') ? 'unknown' : principalMatch(statement.Principal);
  const action = own(statement, 'NotAction') ? 'unknown'
    : policyMatch(statement.Action, 'sns:publish', { insensitive: true, star: true });
  const resource = own(statement, 'NotResource') ? 'unknown' : policyMatch(statement.Resource, topicArn, { star: true });
  const selectors = [principal, action, resource];
  const condition = conditionMatch(statement.Condition, accountId, alarmArn);
  if (selectors.includes('irrelevant') || condition.state === 'irrelevant') return 'irrelevant';
  if (selectors.includes('invalid') || condition.state === 'invalid' ||
      Object.keys(statement).some(key => !policyStatementKeys.has(key))) return 'unknown';
  if (statement.Effect === 'Allow') {
    // An additional Allow cannot defeat independent scoped coverage. It also
    // cannot establish scoped coverage if its own predicates are indeterminate.
    return condition.scoped && selectors.every(match => match === 'exact') ? 'scoped_allow' : 'unscoped_allow';
  }
  return statement.Effect === 'Deny' && !selectors.includes('unknown') && condition.state === 'match'
    ? 'deny' : 'unknown';
}

function topicPolicyEvidence(rawPolicy, topicArn, descriptors, accountId) {
  if (typeof rawPolicy !== 'string' || rawPolicy.length > MAX_TOPIC_POLICY_BYTES ||
      Buffer.byteLength(rawPolicy, 'utf8') > MAX_TOPIC_POLICY_BYTES ||
      descriptors?.length !== signals.length || new Set(descriptors.map(alarm => alarm?.arn)).size !== signals.length ||
      descriptors.some(alarm => typeof alarm?.arn !== 'string')) return 'unknown';

  let statements;
  try {
    // SNS returns JSON. The contract parser also rejects duplicate keys and
    // bounds all nested arrays, including lists in otherwise unsupported forms.
    JSON.parse(rawPolicy);
    const policy = parseContract(rawPolicy, { bytes: MAX_TOPIC_POLICY_BYTES, list: MAX_TOPIC_POLICY_LIST, depth: 12 });
    if (!['2008-10-17', '2012-10-17'].includes(policy.Version) ||
        Object.keys(policy).some(key => !policyDocumentKeys.has(key))) return 'unknown';
    statements = policyList(policy.Statement);
    if (statements.length > MAX_TOPIC_POLICY_STATEMENTS || !statements.every(object)) return 'unknown';
  } catch {
    return 'unknown';
  }

  const matches = descriptors.map(alarm => statements.map(statement => statementMatch(statement, topicArn, accountId, alarm.arn)));
  if (matches.some(result => result.includes('deny'))) return 'denied';
  if (matches.some(result => result.includes('unknown') ||
      (result.includes('unscoped_allow') && !result.includes('scoped_allow')))) return 'unknown';
  return matches.every(result => result.includes('scoped_allow')) ? 'verified' : 'insufficient';
}

const observedArnPattern = /^arn:[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]*:[0-9]*:[A-Za-z0-9_./:-]+$/;
const topicReadDenied = new Set([...denied, 'AuthorizationError', 'AuthorizationErrorException', 'Forbidden']);
const topicNotFound = new Set(['NotFound', 'NotFoundException', 'ResourceNotFound', 'ResourceNotFoundException']);

export async function readTopicRouting({ config, descriptors, getAttributes }) {
  const expected_topic_arn = config.manager.health?.sns_topic_arn ?? null;
  let observed_topic_arn = null;
  const result = (status, code, next_step) => ({ status, code, expected_topic_arn, observed_topic_arn, next_step });
  if (!expected_topic_arn) return result('console_only', 'SNS_TOPIC_NOT_CONFIGURED', 'Inspect the four alarms in CloudWatch or this report.');
  let attributes;
  try {
    attributes = (await getAttributes(expected_topic_arn))?.Attributes;
  } catch (cause) {
    const codes = [cause?.name, cause?.code, cause?.Code];
    if (codes.some(code => topicReadDenied.has(code))) return result('unknown', 'SNS_TOPIC_READ_DENIED',
      'Grant the configured operator sns:GetTopicAttributes on this exact topic and retry.');
    if (codes.some(code => topicNotFound.has(code))) return result('misconfigured', 'SNS_TOPIC_NOT_FOUND',
      'Check that the existing topic ARN in manager.health.sns_topic_arn is correct.');
    return result('unknown', 'SNS_TOPIC_READ_UNAVAILABLE', 'Restore SNS read access for the verified operator and retry.');
  }
  const arn = attributes?.TopicArn;
  if (typeof arn !== 'string' || !arn) return result('unknown', 'SNS_TOPIC_ARN_MISSING',
    'Use the configured operator to check the exact topic ARN in this account and region.');
  if (arn.length <= 400 && observedArnPattern.test(arn)) observed_topic_arn = arn;
  if (arn !== expected_topic_arn) return result('misconfigured', 'SNS_TOPIC_ARN_MISMATCH',
    'Check the topic ARN returned by SNS and correct manager.health.sns_topic_arn.');
  const evidence = topicPolicyEvidence(attributes.Policy, expected_topic_arn, descriptors, config.manager.aws.account_id);
  switch (evidence) {
    case 'denied': return result('misconfigured', 'SNS_TOPIC_POLICY_DENIED',
      'Ask the topic owner to resolve the explicit denial of CloudWatch publication for the four named alarms.');
    case 'insufficient': return result('misconfigured', 'SNS_TOPIC_POLICY_INSUFFICIENT',
      'Ask the topic owner to authorize CloudWatch publication from this account and each of the four named alarms.');
    case 'verified': return result('verified', 'OK',
      'Confirm the customer subscriptions, any encryption key permissions, and actual notification receipt.');
    default: return result('unknown', 'SNS_TOPIC_POLICY_UNKNOWN',
      'Ask the topic owner to check the policy for the four named alarms against the supported policy example.');
  }
}

export function alarmTemplate(alarms) {
  return {
    resources: Object.fromEntries(alarms.map(alarm => [alarm.logical_id, {
      Type: ALARM_TYPE, Properties: alarm.definition
    }])),
    outputs: Object.fromEntries(alarms.map(alarm => [alarm.output_id, { Value: alarm.link }]))
  };
}

export function alarmStackMatches({ descriptors, resources, outputs, stackId }) {
  // Count all alarm types as well as all entries using Pigboard's expected IDs.
  // That catches extra alarms and substitutions at an expected logical ID.
  const alarmRows = resources.filter(row => alarmResourceType.test(row.ResourceType ?? '') ||
    descriptors.some(alarm => alarm.logical_id === row.LogicalResourceId || alarm.name === row.PhysicalResourceId));
  return alarmRows.length === descriptors.length && descriptors.every(alarm =>
    alarmRows.filter(row => row.LogicalResourceId === alarm.logical_id &&
      row.PhysicalResourceId === alarm.name && row.ResourceType === ALARM_TYPE && row.StackId === stackId).length === 1 &&
    outputs[alarm.output_id] === alarm.link);
}

const MAX_ZIP_BYTES = 250 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;

function readZip(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.size < 22 || info.size > MAX_ZIP_BYTES) throw error('PACKAGE_ZIP_MISMATCH');
    const bytes = Buffer.allocUnsafe(info.size);
    for (let offset = 0; offset < bytes.length;) {
      const length = readSync(fd, bytes, offset, bytes.length - offset, null);
      if (!length) throw error('PACKAGE_ZIP_MISMATCH');
      offset += length;
    }
    if (fstatSync(fd).size !== info.size) throw error('PACKAGE_ZIP_MISMATCH');
    return bytes;
  } finally {
    closeSync(fd);
  }
}

// Package-manager writes one unencrypted, single-volume zip using zip -X.
// Inspect its central directory and only decompress the small entries used
// as provenance. The versioned asset SHA-256 covers the entire archive.
function zipEntries(zip) {
  const end = zip.length - 22;
  if (zip.readUInt32LE(end) !== 0x06054b50 || zip.readUInt16LE(end + 20) !== 0 ||
      zip.readUInt32LE(end + 4) !== 0 || zip.readUInt16LE(end + 8) !== zip.readUInt16LE(end + 10)) {
    throw error('PACKAGE_ZIP_MISMATCH');
  }
  const count = zip.readUInt16LE(end + 10), start = zip.readUInt32LE(end + 16);
  if (start + zip.readUInt32LE(end + 12) !== end) throw error('PACKAGE_ZIP_MISMATCH');
  const entries = new Map();
  let cursor = start;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || zip.readUInt32LE(cursor) !== 0x02014b50) throw error('PACKAGE_ZIP_MISMATCH');
    const nameLength = zip.readUInt16LE(cursor + 28), nameEnd = cursor + 46 + nameLength;
    const next = nameEnd + zip.readUInt16LE(cursor + 30) + zip.readUInt16LE(cursor + 32);
    if (!nameLength || next > end) throw error('PACKAGE_ZIP_MISMATCH');
    const name = zip.toString('utf8', cursor + 46, nameEnd);
    if (entries.has(name)) throw error('PACKAGE_ZIP_MISMATCH');
    entries.set(name, {
      flags: zip.readUInt16LE(cursor + 8), method: zip.readUInt16LE(cursor + 10),
      compressed: zip.readUInt32LE(cursor + 20), size: zip.readUInt32LE(cursor + 24),
      offset: zip.readUInt32LE(cursor + 42)
    });
    cursor = next;
  }
  if (cursor !== end) throw error('PACKAGE_ZIP_MISMATCH');
  return { entries, start };
}

function zipEntry(zip, archive, name) {
  const entry = archive.entries.get(name);
  if (!entry || entry.size > MAX_MANIFEST_BYTES || entry.offset + 30 > archive.start ||
      (entry.flags & 1) || ![0, 8].includes(entry.method) || zip.readUInt32LE(entry.offset) !== 0x04034b50 ||
      zip.readUInt16LE(entry.offset + 6) !== entry.flags || zip.readUInt16LE(entry.offset + 8) !== entry.method) {
    throw error('PACKAGE_ZIP_MISMATCH');
  }
  const nameEnd = entry.offset + 30 + zip.readUInt16LE(entry.offset + 26);
  const start = nameEnd + zip.readUInt16LE(entry.offset + 28), end = start + entry.compressed;
  if (end > archive.start || zip.toString('utf8', entry.offset + 30, nameEnd) !== name) {
    throw error('PACKAGE_ZIP_MISMATCH');
  }
  const compressed = zip.subarray(start, end);
  const bytes = entry.method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: MAX_MANIFEST_BYTES });
  if (bytes.length !== entry.size) throw error('PACKAGE_ZIP_MISMATCH');
  return bytes;
}

export function verifyAlarmPackage({ manifest, manifestPath, zipDigest, config = manifest?.canonical_config }) {
  assertAlarmManifest(manifest);
  assertTopicRoutingManifest(manifest, config);
  try {
    const bytes = readZip(join(dirname(manifestPath), 'manager.zip'));
    if (!digest(zipDigest) || manifest.zip_digest !== zipDigest || hash(bytes) !== zipDigest) {
      throw error('PACKAGE_ZIP_MISMATCH');
    }
    const archive = zipEntries(bytes);
    const embedded = zipEntry(bytes, archive, EMBEDDED_MANIFEST);
    const expected = embeddedManifest(manifest);
    if (hash(embedded) !== manifest.payload_hashes[EMBEDDED_MANIFEST] ||
        !same(JSON.parse(embedded.toString('utf8')), expected) ||
        !same([...archive.entries.keys()].sort(), Object.keys(manifest.payload_hashes).sort()) ||
        (hasAlarmCapability(manifest) && hash(zipEntry(bytes, archive, MODULE)) !== manifest.payload_hashes[MODULE])) {
      throw error('PACKAGE_ZIP_MISMATCH');
    }
    if (config?.manager?.health?.sns_topic_arn) {
      const schema = zipEntry(bytes, archive, CONFIG_SCHEMA);
      if (hash(schema) !== manifest.payload_hashes[CONFIG_SCHEMA] ||
          hash(zipEntry(bytes, archive, CONFIG_PARSER)) !== manifest.payload_hashes[CONFIG_PARSER]) {
        throw error('PACKAGE_ZIP_MISMATCH');
      }
      if (!supportsTopicRoutingSchema(JSON.parse(schema.toString('utf8')))) throw error('PACKAGE_ROUTING_UNSUPPORTED');
    }
    return { zip_digest: zipDigest };
  } catch (cause) {
    if (cause?.code === 'PACKAGE_ROUTING_UNSUPPORTED') throw cause;
    throw error(cause?.code === 'ENOENT' ? 'PACKAGE_ZIP_UNAVAILABLE' : 'PACKAGE_ZIP_MISMATCH');
  }
}
