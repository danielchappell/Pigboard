import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import canonicalize from 'canonicalize';
import { parseContract, checkValue } from '../contracts/work.mjs';

export const LIMITS = Object.freeze({ metadata: 262144, evidence: 8388608, total: 67108864, slots: 1000 });
const schema = JSON.parse(readFileSync(new URL('../../contracts/evaluation-v1.schema.json', import.meta.url)));
const ajv = new Ajv2020({ strict: true, allErrors: false, ownProperties: true });
ajv.addSchema(schema);
const validators = Object.fromEntries(['campaign', 'packet'].map(name =>
  [name, ajv.compile({ $ref: `${schema.$id}#/$defs/${name}` })]));
const messages = {
  USAGE: 'Use prepare CAMPAIGN NEW_DIRECTORY, record DIRECTORY PACKET, or compare DIRECTORY. See --help.',
  INPUT: 'Supply readable, bounded UTF-8 JSON in a regular file.',
  SHAPE: 'Use the complete versioned evaluation contract with unique IDs and no undeclared fields.',
  IDENTITY: 'Match the frozen campaign, case, repetition, arm and all source/profile/grading identities.',
  EVIDENCE: 'Supply matching hashes for bounded regular evidence files under the packet directory; no links or traversal.',
  DUPLICATE: 'This destination, slot or run ID already exists. Preserve it; use a new campaign for a new experiment.',
  INTEGRITY: 'Stored campaign, packet or evidence does not match its retained identity. Preserve the store and investigate.',
  BUSY: 'Another record operation holds the store lock. After an interruption, verify it has ended before removing .record-lock.',
  LIMIT: 'Retained metadata exceeds 256 KiB. Reduce unnecessary inline duplication; preserve required evidence in referenced files.',
};
export function fail(code) { throw Object.assign(new Error(messages[code]), { code }); }
export const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const digestValue = value => digest(canonicalize(value));
export function parse(bytes, kind) {
  try {
    // JSON is the interchange format. The shared parser additionally rejects
    // duplicate keys, invalid Unicode, unsafe numbers and excessive nesting.
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const value = parseContract(bytes, { bytes: LIMITS.metadata, depth: 20, list: 1000 });
    validate(value, kind);
    return value;
  } catch (error) { if (error.code) throw error; fail('SHAPE'); }
}
function unique(values) { if (new Set(values).size !== values.length) fail('SHAPE'); }
function sameSet(actual, expected) {
  unique(actual);
  if (actual.length !== expected.length || actual.some(id => !expected.includes(id))) fail('IDENTITY');
}
export function validate(value, kind) {
  try { checkValue(value, { depth: 20, list: 1000 }); } catch { fail('SHAPE'); }
  if (!validators[kind]?.(value)) fail('SHAPE');
  if (kind === 'campaign') {
    if (value.baseline.digest === value.candidate.digest) fail('IDENTITY');
    unique(value.cases.map(c => c.id.toLowerCase()));
    let slots = 0;
    for (const c of value.cases) {
      if (c.min_successes > c.repetitions) fail('SHAPE');
      unique(c.assertions.map(a => a.id)); unique(c.dimensions);
      slots += c.repetitions * 2;
    }
    if (slots > LIMITS.slots) fail('SHAPE');
  } else {
    unique(value.evidence.map(e => e.id.toLowerCase())); unique(value.evidence.map(e => e.path.toLowerCase()));
    unique(value.graders.map(g => g.id));
    for (const e of value.evidence) {
      if (e.path.startsWith('/') || e.path.split('/').some(part => !part || part === '.' || part === '..')) fail('EVIDENCE');
    }
    const known = new Set(value.evidence.map(e => e.id));
    const refs = [value.author_verification.evidence, ...value.assertions.map(a => a.evidence),
      ...value.quality.map(q => q.evidence), ...value.graders.map(g => [g.report]),
      ...(value.host ? [[value.host.receipt]] : [])];
    for (const list of refs) { unique(list); if (list.some(id => !known.has(id))) fail('EVIDENCE'); }
    for (const a of value.assertions) if (a.result !== 'INCOMPLETE' && !a.evidence.length) fail('EVIDENCE');
    if (['PASS', 'FAIL'].includes(value.author_verification.result) && !value.author_verification.evidence.length) fail('EVIDENCE');
    for (const q of value.quality) {
      if (!q.applicable && q.score !== null) fail('SHAPE');
      if ((!q.applicable || q.score !== null) && !q.evidence.length) fail('EVIDENCE');
    }
  }
  return value;
}
export function bindPacket(campaign, packet) {
  validate(packet, 'packet');
  const c = campaign.cases.find(c => c.id === packet.case);
  if (!c || packet.repetition > c.repetitions || packet.campaign !== digestValue(campaign)) fail('IDENTITY');
  const expected = { suite: campaign[packet.arm].digest, profile: campaign.profile.digest,
    environment: campaign.environment.digest, fixture: c.fixture, task: c.task, grader: c.grader, rubric: c.rubric };
  if (digestValue(packet.binding) !== digestValue(expected)) fail('IDENTITY');
  sameSet(packet.assertions.map(a => a.id), c.assertions.map(a => a.id));
  sameSet(packet.quality.map(q => q.id), c.dimensions);
  return c;
}
export const slot = packet => `${packet.case}--${packet.repetition}--${packet.arm}`;
