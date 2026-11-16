import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDynamoState } from '../../lib/aws/dynamodb.mjs';
import { recordId } from '../../lib/state/contract.mjs';

export const fixture = JSON.parse(readFileSync(new URL('../fixtures/manager-state.json', import.meta.url)));
const clone = value => structuredClone(value);
const itemKey = k => JSON.stringify([k.PK, k.SK]);
/** Disposable finite Dynamo model, never an alternate shipped state adapter.
 * Evaluates the production adapter's serialized condition/update expressions and
 * commits a transaction only after every condition succeeds. */
export class StateProvider {
  constructor(binding = fixture.binding) { this.binding = clone(binding); this.rows = new Map(); this.audit = []; this.fault = null; this.pageSize = 100; this.before = null; }
  snapshot() { return JSON.stringify([...this.rows].sort(([a], [b]) => a.localeCompare(b))); }
  records() { return [...this.rows.values()].map(({ PK, SK, ...record }) => clone(record)); }
  seed(record) { this.rows.set(itemKey({ PK: 'installation#' + record.installation_id, SK: ({ installation: 'I#', stream: 'S#', attempt: 'A#', member: 'M#' })[record.kind] + record.record_id }), { PK: 'installation#' + record.installation_id, SK: ({ installation: 'I#', stream: 'S#', attempt: 'A#', member: 'M#' })[record.kind] + record.record_id, ...clone(record) }); }
  enable() { const row = this.records().find(r => r.kind === 'installation'); this.seed({ ...row, schedule_enabled: true, writes_enabled: true }); }
  disable() { const row = this.records().find(r => r.kind === 'installation'); this.seed({ ...row, schedule_enabled: false, writes_enabled: false }); }
  async send(command, options) {
    const name = command.constructor.name, input = clone(command.input);
    this.audit.push({ name, input, abortSignal: !!options?.abortSignal });
    if (this.before) { const fn = this.before; this.before = null; await fn(name, input); }
    if (name === 'DescribeTableCommand') return { Table: { TableArn: this.binding.table_arn, TableStatus: 'ACTIVE' } };
    if (name === 'GetCommand') { assert.equal(input.ConsistentRead, true); return { Item: clone(this.rows.get(itemKey(input.Key))) }; }
    if (name === 'TransactGetCommand') return { Responses: input.TransactItems.map(({ Get }) => ({ Item: clone(this.rows.get(itemKey(Get.Key))) })) };
    if (name === 'ScanCommand') { assert.equal(input.ConsistentRead, true); return { Items: [...this.rows.values()].slice(0, input.Limit).map(clone) }; }
    if (name === 'QueryCommand') {
      assert.equal(input.ConsistentRead, true);
      const values = input.ExpressionAttributeValues;
      const rows = [...this.rows.values()].filter(row => row.PK === values[':pk'] && row.SK.startsWith(values[':prefix']) && (!input.ExclusiveStartKey || row.SK > input.ExclusiveStartKey.SK)).sort((a, b) => a.SK.localeCompare(b.SK));
      const page = rows.slice(0, Math.min(input.Limit, this.pageSize));
      return { Items: clone(page), ...(rows.length > page.length ? { LastEvaluatedKey: { PK: page.at(-1).PK, SK: page.at(-1).SK } } : {}) };
    }
    if (name !== 'TransactWriteCommand') throw Error('Unsupported finite fixture command');
    assert(input.TransactItems.length <= 100);
    const targets = input.TransactItems.map(action => { const a = Object.values(action)[0]; return itemKey(a.Key ?? a.Item); });
    assert.equal(new Set(targets).size, targets.length, 'one operation per unique transaction item');
    const matches = action => {
      const a = Object.values(action)[0], row = this.rows.get(itemKey(a.Key ?? a.Item));
      if (a.ConditionExpression === 'attribute_not_exists(PK)') return !row;
      return a.ConditionExpression.split(' AND ').every(part => {
        const [left, operator, right] = part.split(' '); assert.equal(operator, '=');
        const field = a.ExpressionAttributeNames?.[left] ?? left;
        return row && JSON.stringify(row[field]) === JSON.stringify(a.ExpressionAttributeValues[right]);
      });
    };
    const reasons = input.TransactItems.map(action => ({ Code: matches(action) ? 'None' : 'ConditionalCheckFailed' }));
    if (reasons.some(r => r.Code !== 'None')) throw Object.assign(new Error('conditional'), { name: 'TransactionCanceledException', CancellationReasons: reasons });
    const fault = this.fault; this.fault = null;
    if (fault === 'before') throw Object.assign(new Error('dummy transport fault'), { name: 'TimeoutError' });
    const next = new Map([...this.rows].map(([k, v]) => [k, clone(v)]));
    for (const action of input.TransactItems) {
      if (action.Put) next.set(itemKey(action.Put.Item), clone(action.Put.Item));
      if (action.Update) {
        const a = action.Update, row = next.get(itemKey(a.Key));
        for (const assignment of a.UpdateExpression.slice(4).split(', ')) { const [left, right] = assignment.split(' = '); row[a.ExpressionAttributeNames[left]] = clone(a.ExpressionAttributeValues[right]); }
      }
    }
    this.rows = next;
    if (fault === 'after') throw Object.assign(new Error('dummy lost response'), { name: 'TimeoutError' });
    return {};
  }
}
export async function prepared({ enabled = true } = {}) {
  const provider = new StateProvider();
  const disabled = createDynamoState({ binding: fixture.binding, control: fixture.control, client: provider });
  assert.equal((await disabled.initialize({ fresh_installation: fixture.fresh, now: fixture.now })).status, 'confirmed');
  if (enabled) provider.enable();
  const state = enabled ? createDynamoState({ binding: fixture.binding, control: { ...fixture.control, schedule_enabled: true, writes_enabled: true }, client: provider }) : disabled;
  return { provider, state, disabled };
}
export const beginInput = (overrides = {}) => ({ expected_installation_revision: 0, stream: clone(fixture.streamA), expected_stream_revision: null, attempt: clone(fixture.attemptA), required_members: [clone(fixture.memberA)], now: fixture.now, ...overrides });
export const finalizeInput = (overrides = {}) => ({ expected_installation_revision: 1, stream: clone(fixture.streamA), expected_stream_revision: 0, attempt_id: fixture.attemptA.attempt_id, expected_attempt_revision: 0, outcome: 'applied', evidence: clone(fixture.evidence), now: fixture.now, ...overrides });
export const allLimits = { streams: 1000, members: 1000, pending_attempts: 1000, pages: 100, requests: 2000, milliseconds: 30000 };
export function row(provider, kind, value) { return provider.records().find(r => r.kind === kind && r.record_id === recordId(kind, value)); }
