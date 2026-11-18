import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, cp, mkdir, readdir, appendFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { extractHandoff, digestValue } from '../lib/contracts/handoff.mjs';
import { validateReceiptChain } from '../lib/contracts/receipts.mjs';
import { parseWork } from '../lib/contracts/work.mjs';
import { prepare } from '../scripts/prepare-pigboard-skills.mjs';

// Schema/formatter regression only; these supplied seeds are not agent transcripts.
const root = fileURLToPath(new URL('../', import.meta.url));
const manual = process.argv[1] === fileURLToPath(import.meta.url) && ['prepare', 'operator', 'pin'].includes(process.argv[2]);
const test = manual ? () => {} : nodeTest;
const seeds = JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json', import.meta.url), 'utf8')).chains;
const clone = name => structuredClone(seeds[name]);
const entries = e => e.comment_pages.flatMap(p => p.comments.map(c => ({ p, c, r: extractHandoff(c.body, { format: c.format }).value })));
const reference = x => ({ ticket_id: x.r.ticket_id, comment_id: x.c.id, record_id: x.r.record_id, digest: digestValue(x.r) });
const chain = e => validateReceiptChain(JSON.stringify(e));
function implementation(name = 'human') {
  const e = clone(name), x = entries(e).filter(x => x.r.kind === 'implementation').at(-1);
  e.target = reference(x);
  e.issues.find(i => i.id === x.r.ticket_id).stage_id = e.trusted.projects[0].stages['In Progress'];
  return { e, x };
}
async function temporary(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pgb-implementer-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const input = path.join(dir, 'record.yaml'), summary = path.join(dir, 'summary.txt');
  const run = (format = 'html', extra = []) => spawnSync(process.execPath,
    [path.join(root, 'scripts/prepare-handoff.mjs'), '--input', input, '--summary', summary, '--format', format, ...extra],
    { cwd: dir, encoding: 'utf8', timeout: 30000 });
  return { dir, input, summary, run };
}
function success(p) { assert.equal(p.status, 0, p.stderr); assert.equal(p.stderr, ''); return JSON.parse(p.stdout); }
function rejected(p, status, code) {
  assert.equal(p.status, status, p.stdout + p.stderr); assert.equal(p.stdout, '');
  const r = JSON.parse(p.stderr); assert.equal(r.valid, false);
  if (code) assert(r.diagnostics.some(d => d.code === code), p.stderr);
  return r;
}

test('canonical implementation targets validate actual requirements, CI, preparation and same-PR repair lineage', () => {
  for (const name of ['human', 'mixed', 'repair', 'stack']) {
    const { e, x } = implementation(name), before = JSON.stringify(e), r = chain(e);
    assert.equal(r.valid, true, name + JSON.stringify(r.diagnostics));
    assert.deepEqual(r.validated_leaf, e.target); assert.equal(r.qa_report, null);
    assert.equal(r.completion_established, false); assert.equal(r.live_freshness, 'not_evaluated');
    assert.equal(x.r.operation_id, entries(e).find(a => a.r.record_id === x.r.assignment.record_id).r.operation_id);
    assert.equal(JSON.stringify(e), before);
    if (name === 'repair') assert.equal(x.r.payload.consumed_requests.length, 1);
    if (name === 'stack') assert.equal(x.r.payload.stack_parent.incorporated_revision, x.r.payload.stack_parent.pr.source_revision);
  }
  // The envelope intentionally has no native type field: Story/Bug admission is
  // independently exercised against provider native metadata, not inferred here.
});

test('implementation receipt regressions reject stale checks, closed repair PR, edited assignment and incomplete pages', () => {
  for (const [name, change, code] of [
    ['human', e => e.evidence_receipts.find(x => x.kind === 'ci').details.status = 'failed', 'EVIDENCE'],
    ['human', e => e.evidence_receipts.find(x => x.kind === 'ci').details.status = 'pending', 'EVIDENCE'],
    ['human', e => e.evidence_receipts.find(x => x.kind === 'ci').pr.source_revision = 'f'.repeat(40), 'EVIDENCE'],
    ['repair', e => e.pr_receipts.filter(x => x.current).forEach(x => x.state = 'closed'), 'PR'],
    ['human', e => e.comment_pages[0].comments[0].updated = '2026-11-15T11:00:00Z', 'METADATA'],
    ['human', e => e.comment_pages[0].is_last = false, 'INCOMPLETE_READ'],
    ['human', e => e.issues[0].project_id = '999', 'PROJECT'],
    ['human', e => e.issues[0].pointer.assignment.comment_id = '999', 'ASSIGNMENT'],
  ]) {
    const { e } = implementation(name); change(e); const r = chain(e);
    assert.equal(r.valid, false); assert(r.diagnostics.some(d => d.code === code), JSON.stringify(r));
  }
});

test('pure formatter roundtrips complete records, nulls and hostile literal markup deterministically in both transports', async t => {
  const o = await temporary(t), { x } = implementation('stack');
  x.r.payload.plan.label = `<script>alert('literal')</script> &amp; &#x3c; </code></pre> café 🐷`;
  const raw = stringify(x.r), summary = `Ready <b>literal</b> &amp; "quoted" 'text' 🐷`;
  await writeFile(o.input, raw); await writeFile(o.summary, summary);
  for (const format of ['html', 'adf']) {
    const p = o.run(format), r = success(p), again = o.run(format);
    assert.equal(again.stdout, p.stdout); assert.equal(r.schema, 'pigboard-handoff-publication/v1');
    assert.equal(r.record_id, x.r.record_id); assert.equal(r.record_digest, digestValue(x.r));
    const extracted = extractHandoff(format === 'html' ? r.body : JSON.stringify(r.body), { format });
    assert.deepEqual(JSON.parse(JSON.stringify(extracted.value)), JSON.parse(JSON.stringify(x.r)));
    assert.equal(extracted.value.resume_authorization, null);
    if (format === 'html') {
      assert(!r.body.includes('<script>')); assert(r.body.includes('&amp;amp;'));
      assert.equal((r.body.match(/<pre>/g) ?? []).length, 1);
    } else {
      assert.equal(r.body.content[0].content[0].text, summary);
      assert.equal(r.body.content[1].content[0].text, raw);
    }
  }
  assert.equal(await readFile(o.input, 'utf8'), raw); assert.equal(await readFile(o.summary, 'utf8'), summary);
});

test('formatter retains source literal provenance and rejects malformed/schema/UTF-8 input before publication output', async t => {
  const o = await temporary(t), raw = stringify(implementation().x.r);
  await writeFile(o.summary, 'Report');
  for (const input of [raw + '\nschema: pigboard-handoff/v1\n', raw.replace('pigboard-handoff/v1', 'pigboard-handoff/v2'), Buffer.from([0xff]), raw.replace('resume_authorization: null\n', ''), raw + '\nprivate: 9007199254740993\n']) {
    await writeFile(o.input, input); rejected(o.run(), 1);
  }
  await writeFile(o.input, raw);
  for (const summary of [Buffer.from([0xff]), 'bad\0summary', '🐷'.repeat(501), Buffer.from([0xed, 0xa0, 0x80])]) {
    await writeFile(o.summary, summary); rejected(o.run(), 1, 'SUMMARY');
  }
  const p = JSON.parse(raw.startsWith('{') ? raw : JSON.stringify(implementation().x.r));
  p['FICTITIOUS-SECRET'] = true; await writeFile(o.input, JSON.stringify(p)); await writeFile(o.summary, 'Report');
  assert(!JSON.stringify(rejected(o.run(), 1)).includes('FICTITIOUS-SECRET'));
});

test('formatter enforces record, UTF-8 summary and expanded wrapper bounds without truncation', async t => {
  const o = await temporary(t), raw = stringify(implementation().x.r);
  const exact = raw + '#' + 'x'.repeat(16384 - Buffer.byteLength(raw) - 2) + '\n';
  assert.equal(Buffer.byteLength(exact), 16384);
  await writeFile(o.input, exact); await writeFile(o.summary, '🐷'.repeat(500));
  success(o.run()); success(o.run('adf'));
  await writeFile(o.input, exact + 'x'); rejected(o.run(), 1, 'BYTE_LIMIT');
  // Expanding each literal ampersand exceeds wrapper bound before raw-record bound.
  await writeFile(o.input, raw + '#' + '&'.repeat(15000));
  assert(Buffer.byteLength(await readFile(o.input)) < 16384);
  rejected(o.run(), 1, 'BYTE_LIMIT'); success(o.run('adf'));
  await writeFile(o.input, raw + '\n#\0'); rejected(o.run(), 1);
});

test('formatter rejects usage and nonregular/unreadable files with sanitized diagnostics', async t => {
  const o = await temporary(t); await writeFile(o.input, stringify(implementation().x.r)); await writeFile(o.summary, 'Report');
  for (const extra of [['--input', o.input], ['--json'], ['--unknown', 'FICTITIOUS-SECRET'], ['--help']]) rejected(o.run('html', extra), 2, 'USAGE');
  rejected(o.run('unsupported'), 2, 'USAGE');
  await rm(o.input); rejected(o.run(), 2, 'INPUT');
  const p = spawnSync(process.execPath, [path.join(root, 'scripts/prepare-handoff.mjs'), '--input', o.dir, '--summary', o.summary, '--format', 'html'], { encoding: 'utf8', timeout: 30000 });
  rejected(p, 2, 'INPUT');
  const help = spawnSync(process.execPath, [path.join(root, 'scripts/prepare-handoff.mjs'), '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0); assert(help.stdout.includes('Installed:')); assert.equal(help.stderr, '');
});

test('composed source skills have discriminating frontmatter, shared contract anchors and unchanged phase binding', async () => {
  for (const name of ['implementer-entrypoint', 'implementer-job', 'implementer-jira']) {
    const skill = await readFile(path.join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert(skill.startsWith(`---\nname: ${name}\ndescription: `));
    assert(skill.includes('references/handoff.md#'));
    for (const match of skill.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const [relative, anchor] = match[1].split('#');
      const text = await readFile(path.resolve(root, 'skills', name, relative), 'utf8');
      if (anchor) assert(text.split('\n').some(line => line.startsWith('#') && line.replace(/^#+ /, '').toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-') === anchor), match[1]);
    }
  }
  const profile = await readFile(path.join(root, 'skills/implementer-entrypoint/references/cursor.md'), 'utf8');
  for (const text of ['grok-4.7-high', 'grok-4.7-medium', 'generalPurpose', '{"type":"same_machine"}', 'non-Fast', 'per-call model telemetry not']) assert(profile.includes(text), text);
});

test('pre-first-PR dependency wait requires explicit request lineage and complete no-publication history for repair', () => {
  const e = clone('stack'), all = entries(e);
  const first = ticket => all.find(x => x.r.ticket_id === ticket && x.r.kind === 'admission');
  const parent = first('1000'), child = first('1001'), request = all.find(x => x.r.ticket_id === '1000' && x.r.kind === 'repair_request');
  for (const page of e.comment_pages) {
    const keep = page.ticket_id === '1000' ? all.filter(x => x.p === page).slice(0, 5) : [child];
    page.comments = keep.map(x => x.c); page.total = page.comments.length;
  }
  const nativeParent = e.issues.find(x => x.id === '1000'), nativeChild = e.issues.find(x => x.id === '1001');
  nativeParent.pointer.assignment = reference(parent); nativeParent.stage_id = e.trusted.projects[0].stages['Rework Queued'];
  nativeParent.published_prs = nativeParent.published_prs.slice(0, 1);
  nativeChild.pointer.assignment = reference(child); nativeChild.published_prs = []; nativeChild.required_requests = [];
  e.pr_receipts = e.pr_receipts.filter(p => p.number === '10' && p.source_revision === '1'.repeat(40)).map(p => ({...p,current:true}));
  function append(record, actor, id) {
    const page = e.comment_pages.find(p => p.ticket_id === record.ticket_id);
    const c = {id,author_id:actor,update_author_id:actor,created:'2026-11-15T12:00:00Z',updated:'2026-11-15T12:00:00Z',format:'adf',body:JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:stringify(record)}]}]})};
    page.comments.push(c);page.total = page.comments.length;
    return reference({r:record,c});
  }
  const wait = {...child.r,record_id:'10000000-0000-4000-8000-000000000001',assignment:reference(child),role:'implementer',kind:'dependency_wait',from_stage:'In Progress',to_stage:'Rework Queued',payload:{pr:null,requests:[reference(request)],reason:'Known upstream repair prevents the first PR; unfinished checks are NOT_RUN in the retained report.',qa_report:null}};
  const waitRef = append(wait,'implementer','9001');e.target = waitRef;nativeChild.stage_id=e.trusted.projects[0].stages['Rework Queued'];
  let r=chain(e);assert.equal(r.valid,true,JSON.stringify(r.diagnostics));assert.equal(r.completion_established,false);assert.equal(r.qa_report,null);
  const uuid='10000000-0000-4000-8000-000000000002';
  const admission={...child.r,record_id:uuid,operation_id:uuid,from_stage:'Rework Queued',payload:{...child.r.payload,mode:'repair',previous_assignment:reference(child),requests:[waitRef],existing_pr:null}};
  const assignment=append(admission,'manager','9002');nativeChild.pointer.assignment=assignment;nativeChild.stage_id=e.trusted.projects[0].stages['In Progress'];e.target=assignment;
  assert.equal(chain(e).valid,true,JSON.stringify(chain(e).diagnostics));
  nativeChild.pr_history_complete=false;assert.equal(chain(e).valid,false);
  nativeChild.pr_history_complete=true;nativeChild.published_prs=[{provider:'github',repository:e.trusted.projects[0].repositories[0],number:'99'}];assert.equal(chain(e).valid,false);
});

// These are synthetic receipt regressions, not observed worker/publication runs.
function rewriteTarget(e, x) {
  x.c.body = JSON.stringify({ type: 'doc', version: 1, content: [{ type: 'codeBlock', attrs: { language: 'yaml' }, content: [{ type: 'text', text: stringify(x.r, { aliasDuplicateObjects: false }) }] }] });
  x.c.format = 'adf';
  e.target = reference(x); // Bind the changed bytes, avoiding incidental stale-digest failures.
}

test('READY consumes exact direct admission references while retaining transitive stack/wait evidence', () => {
  for (const name of ['human', 'repair', 'stack', 'first_pr_after_wait']) {
    const { e, x } = implementation(name);
    const admission = entries(e).find(a => a.r.record_id === x.r.assignment.record_id);
    assert.deepEqual(x.r.payload.consumed_requests, admission.r.payload.requests, name);
    assert.equal(chain(e).valid, true, name + JSON.stringify(chain(e).diagnostics));
    if (name === 'human') assert.deepEqual(x.r.payload.consumed_requests, []);
    if (!['stack', 'first_pr_after_wait'].includes(name)) continue;
    const root = reference(entries(e).find(a => a.r.kind === 'repair_request'));
    const assigned = structuredClone(admission.r.payload.requests);
    for (const consumed of [[...assigned, root], [root], [], [...assigned, assigned[0]], [{ ...assigned[0], digest: 'sha256:' + 'f'.repeat(64) }]]) {
      const changed = structuredClone(e), target = entries(changed).find(a => a.c.id === x.c.id);
      target.r.payload.consumed_requests = consumed;
      rewriteTarget(changed, target);
      const result = chain(changed);
      assert.equal(result.valid, false, name + JSON.stringify(consumed));
      const duplicate = consumed.length === 2 && consumed[0] === consumed[1];
      assert(result.diagnostics.some(d => d.code === (duplicate ? 'STRUCTURE' : 'REPAIR') && d.path.includes('consumed_requests')), JSON.stringify(result.diagnostics));
    }
  }
});

test('first PR preserves historical precreation proof, rejects fresh admission-only proof and validates actual implementation', () => {
  const { e: current, x } = implementation('first_pr_after_wait');
  const precreation = structuredClone(current), child = precreation.issues.find(i => i.id === x.r.ticket_id);
  const assignment = structuredClone(x.r.assignment);
  const page = precreation.comment_pages.find(p => p.ticket_id === x.r.ticket_id);
  page.comments = page.comments.slice(0, page.comments.findIndex(c => c.id === assignment.comment_id) + 1);
  page.total = page.comments.length;
  child.published_prs = [];
  precreation.pr_receipts = precreation.pr_receipts.filter(p => p.number !== x.r.payload.pr.number);
  precreation.target = assignment;
  const historicalBytes = JSON.stringify(precreation), historicalResult = chain(precreation);
  assert.equal(historicalResult.valid, true, JSON.stringify(historicalResult.diagnostics));
  const fresh = structuredClone(precreation);
  fresh.issues.find(i => i.id === child.id).published_prs = structuredClone(current.issues.find(i => i.id === child.id).published_prs);
  fresh.pr_receipts = structuredClone(current.pr_receipts);
  assert.equal(chain(fresh).valid, false);
  assert.equal(chain(current).valid, true, JSON.stringify(chain(current).diagnostics));
  assert.equal(JSON.stringify(precreation), historicalBytes);
  assert.deepEqual(chain(precreation), historicalResult);
  assert.deepEqual(current.issues.find(i => i.id === child.id).pointer.assignment, assignment);
  assert.deepEqual(JSON.parse(JSON.stringify(x.r.payload.consumed_requests)), [reference(entries(current).find(a => a.r.kind === 'dependency_wait'))]);
});

test('formatter shape success cannot authorize a flattened transitive-root candidate', async t => {
  const o = await temporary(t), { e, x } = implementation('stack');
  x.r.payload.consumed_requests.push(reference(entries(e).find(a => a.r.kind === 'repair_request')));
  await writeFile(o.input, stringify(x.r)); await writeFile(o.summary, 'Synthetic unpublished candidate');
  success(o.run());
  rewriteTarget(e, x);
  const result = chain(e);
  assert.equal(result.valid, false);
  assert(result.diagnostics.some(d => d.code === 'REPAIR' && d.path.endsWith('/payload/consumed_requests')));
});

test('P166-IMPLEMENTER consumes all ancestor requests once with fresh current evidence',async()=>{
 const {validateWorkerCurrent}=await import('../lib/contracts/receipts.mjs');
 const fixtures=JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json',import.meta.url))),input=fixtures.repair_loop_p166.inputs.ancestor_union_implementation;
 assert.equal(validateWorkerCurrent(JSON.stringify(input)).valid,true);
 const target=entries(input).find(x=>x.r.record_id===input.target.record_id),assignment=entries(input).find(x=>x.r.record_id===target.r.assignment.record_id);
 assert.equal(target.r.payload.consumed_requests.length,2);assert.deepEqual(target.r.payload.consumed_requests,assignment.r.payload.requests);
 for(const [name,change]of [['omit',r=>r.payload.consumed_requests.shift()],['duplicate',r=>r.payload.consumed_requests.push(structuredClone(r.payload.consumed_requests[0]))]]){
  const e=structuredClone(input),x=entries(e).find(x=>x.r.record_id===e.target.record_id),r=structuredClone(x.r);change(r);x.c.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:stringify(r)}]}]});e.target.digest=digestValue(r);
  const result=validateWorkerCurrent(JSON.stringify(e));assert.equal(result.valid,false,name);assert(result.diagnostics.some(d=>['REPAIR','STRUCTURE'].includes(d.code)),JSON.stringify(result.diagnostics));
 }
 const stale=structuredClone(input);stale.evidence_receipts.filter(e=>e.kind==='ci').forEach(e=>e.details.status='failed');assert.equal(validateWorkerCurrent(JSON.stringify(stale)).valid,false);
});

// PGB-164 prepared instruction exercises. Only the operator sees future replies.
// The deterministic driver below exercises the same local protocol and real
// commands. A separately invoked subject follows the installed skill instructions.
const fixtureData = JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json', import.meta.url)));
const assignmentSeeds = fixtureData.worker_assignment_h02.inputs;
const earlierExercise = fixtureData.repair_loop_p166.packets['P166-H01'].assistant_files;
const config = JSON.parse(earlierExercise['config.yaml']);
const serialize = value => JSON.stringify(value, null, 2);
const artifactUri = 'https://evidence.example.invalid/pgb164/query.sql';
const finding = 'The saved filter reader needs the tenant predicate.';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFile = 'saved-filters.mjs';
const queryFile = 'query.sql';
const notice = 'Simulated provider and model observations. All actions are local.';

function comment(record, id, actor, body = null) {
  return {
    id, author_id: actor, update_author_id: actor,
    created: '2026-11-18T10:00:00Z', updated: '2026-11-18T10:00:00Z',
    format: body ? 'html' : 'adf',
    body: body ?? JSON.stringify({ type: 'doc', version: 1, content: [
      { type: 'codeBlock', attrs: { language: 'yaml' }, content: [{ type: 'text', text: stringify(record, { aliasDuplicateObjects: false }) }] },
    ] }),
  };
}

function readyFixture() {
  const input = structuredClone(assignmentSeeds['D-declared-slot-absent']);
  const old = structuredClone(assignmentSeeds['D-prepared-current-review']);
  const stack = clone('stack');
  const [subject] = input.issues;
  const parent = stack.issues[1];
  const parentPage = stack.comment_pages[1];
  const [subjectPage] = input.comment_pages;
  const work = JSON.parse(input.requirements[0].body);
  const parentWork = stack.requirements[1];
  const context = JSON.parse(earlierExercise['facts.yaml']);
  const parentHistory = clone('human');
  const oldParent = entries(parentHistory);
  const parentPr = { ...oldParent.at(-1).r.payload.pr, number: '11' };
  const parentRefs = new Map();

  // Move a complete, independent earlier QA history into the required parent.
  parentPage.comments = oldParent.map(({ r, c }) => {
    const record = { ...r, ticket_id: parent.id, assignment: r.assignment ? parentRefs.get(r.assignment.record_id) : null };
    if (r.payload.pr) record.payload.pr = parentPr;
    for (const key of ['implementation', 'review']) {
      if (r.payload[key]) record.payload[key] = parentRefs.get(r.payload[key].record_id);
    }
    const translated = comment(record, c.id, c.author_id);
    parentRefs.set(r.record_id, reference({ r: record, c: translated }));
    return translated;
  });
  parentPage.total = parentPage.comments.length;
  parent.pointer.assignment = parentRefs.values().next().value;
  parent.required_requests = [];
  input.issues.push(parent);
  input.comment_pages.push(parentPage);
  const stackParent = { ticket_id: parent.id, pr: parentPr,
    incorporated_revision: parentPr.source_revision, completion: [...parentRefs.values()].at(-1) };
  input.pr_receipts = [...old.pr_receipts, { ...parentPr, state: 'open', current: true }];
  input.evidence_receipts = [
    ...old.evidence_receipts,
    ...parentHistory.evidence_receipts.map(r => ({ ...r, pr: parentPr })),
  ];
  input.trusted.projects[0].evidence_uris = [...new Set([
    ...old.trusted.projects[0].evidence_uris,
    ...parentHistory.trusted.projects[0].evidence_uris,
    artifactUri,
  ])];

  work.prerequisites = [{ ticket: parent.key, required_outcome: 'ai_qa_complete' }];
  const digest = digestValue(work);
  input.requirements[0] = { ...input.requirements[0], body: JSON.stringify(work), digest };
  input.requirements.push({ ticket_id: parent.id, body: parentWork.body, digest: parentWork.digest, format: 'yaml' });
  subject.requirements_digest = digest;
  subject.published_prs = old.issues[0].published_prs;
  const [first, implementation] = entries(old);
  const record = { ...first.r, requirements_digest: digest };
  const firstComment = comment(record, first.c.id, 'manager');
  const firstAssignment = reference({ r: record, c: firstComment });
  const prior = { ...implementation.r, requirements_digest: digest, assignment: firstAssignment,
    payload: { ...implementation.r.payload, stack_parent: stackParent } };
  const priorComment = comment(prior, implementation.c.id, 'implementer');
  const request = {
    ...prior, record_id: '16400000-0000-4000-8000-000000000001',
    role: 'reviewer', kind: 'repair_request', from_stage: 'In Review', to_stage: 'Rework Queued',
    payload: { pr: prior.payload.pr, basis: reference({ r: prior, c: priorComment }),
      findings: [{ id: 'F1', summary: finding, evidence: [prior.payload.verification[0]] }], qa_report: null },
  };
  const requestComment = comment(request, '16401', 'reviewer');
  const direct = reference({ r: request, c: requestComment });
  const uuid = '16400000-0000-4000-8000-000000000002';
  const admission = { ...record, record_id: uuid, operation_id: uuid, from_stage: 'Rework Queued',
    payload: { ...record.payload, mode: 'repair', previous_assignment: firstAssignment,
      requests: [direct], existing_pr: prior.payload.pr },
  };
  const admissionComment = comment(admission, '16402', 'manager');
  subjectPage.comments = [firstComment, priorComment, requestComment, admissionComment];
  subjectPage.total = subjectPage.comments.length;
  subject.pointer.assignment = reference({ r: admission, c: admissionComment });
  subject.required_requests = [direct];
  for (const receipt of input.evidence_receipts) {
    if (receipt.pr.number === prior.payload.pr.number && receipt.details.requirements_digest) {
      receipt.details.requirements_digest = digest;
    }
  }
  input.target = subject.pointer.assignment;
  input.publisher.intent = 'success';
  input.action_receipt.transitions[0].to_stage_id = config.defaults.stages['In Review'];

  const declared = work.testing_strategy.cases[0].steps.find(s => s.id === 'TC-01.S3');
  const queryOperation = { ...context.operations.find(o => o.step === declared.id), contract: declared };
  context.operations = context.operations.filter(o => o.step !== declared.id);
  context.references = context.references.filter(uri => !uri.endsWith('query.sql'));
  context.prerequisite_graph[0].prerequisites = [parent.key];
  context.prerequisite_graph.push({ ticket: parent.key, prerequisites: [] });
  return { input, work, context, queryOperation, stackParent, prior, admission };
}

function currentPacket(input, context) {
  const e = structuredClone(input);
  for (const key of ['publication', 'missing_step_id', 'candidate']) delete e[key];
  e.purpose = 'worker-current';
  e.current_context_body = serialize(context);
  return e;
}
function historyPacket(input, target) {
  const e = structuredClone(input);
  for (const key of ['publication', 'missing_step_id', 'candidate', 'current_context_body',
    'publisher', 'action_receipt', 'pr_receipts', 'evidence_receipts', 'purpose']) delete e[key];
  e.schema = 'pigboard-manager-handoff-input/v1';
  e.consumer = 'manager';
  e.target = target;
  e.trusted.manager_assignments = [];
  e.trusted.projects = e.trusted.projects.map(({ evidence_uris, pipeline_actors, configured_targets, ...project }) => project);
  return e;
}
function schedulingPacket(input, context) {
  const { site, project_id, key } = input.issues.find(i => i.id === input.target.ticket_id);
  return { schema: 'pigboard-work-scheduling/v1', subject: { site, project_id, key },
    prerequisite_graph: context.prerequisite_graph, related_changes: context.related_changes };
}

async function validators(directory, scriptRoots, ledger = []) {
  let ordinal = 0;
  return async (command, args, fields, expected = true) => {
    const files = [], inputFiles = {};
    for (const [name, contents] of Object.entries(fields)) {
      const file = path.join(directory, `${++ordinal}-${name}`);
      const bytes = typeof contents === 'string' ? contents : serialize(contents);
      await writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
      inputFiles[name] = { path: file, sha256: sha256(bytes), bytes };
      files.push(file);
    }
    const commandArgs = [...args, ...files.flatMap((file, index) => ['--' + Object.keys(fields)[index], file])];
    const results = scriptRoots.map(scripts => {
      const run = spawnSync(process.execPath, [path.join(scripts, command + '.mjs'), ...commandArgs], {
        cwd: directory, env: { ...process.env, NODE_PATH: '' }, encoding: 'utf8', timeout: 30000,
      });
      assert.equal(run.status, expected ? 0 : 1, run.stdout + run.stderr);
      assert.equal(run.stderr, '');
      return JSON.parse(run.stdout);
    });
    for (const result of results) assert.deepEqual(result, results[0]);
    ledger.push({ boundary: 'actual local helper', command, executables: scriptRoots.map(scripts => path.join(scripts, command + '.mjs')),
      args: commandArgs, inputFiles, result: results[0] });
    return results[0];
  };
}

const controls = {
  H01: { route: 'ready' },
  'H02-authority': { route: 'ready', fault: 'medium-authority' },
  'H02-unsafe': { route: 'ready', fault: 'operation' },
  'H02-artifact': { route: 'ready', fault: 'retrieval' },
  'H02-assignment': { route: 'ready', fault: 'assignment' },
  'H02-publisher': { route: 'ready', fault: 'publisher' },
  'H02-pr-unknown': { route: 'first-pr', fault: 'pr' },
  'H02-append-unknown': { route: 'blocked', fault: 'append' },
  'H02-transition-unknown': { route: 'blocked', fault: 'transition' },
  'H02-missing-input': { route: 'blocked' },
  'H02-dependency-wait': { route: 'wait' },
};

function exercise(caseId) {
  assert(Object.hasOwn(controls, caseId), 'Select a fixed PGB-164 control.');
  const control = controls[caseId];
  if (control.route === 'ready') return { ...readyFixture(), ...control };
  const wait = control.route === 'wait';
  const input = structuredClone(assignmentSeeds[wait ? 'E-declared-upstream-wait-before-PR' : 'D-declared-slot-absent']);
  const candidate = JSON.parse(input.candidate.body);
  const work = JSON.parse(input.requirements.find(r => r.ticket_id === input.target.ticket_id).body);
  const context = JSON.parse(earlierExercise['facts.yaml']);
  const step = work.testing_strategy.cases[0]?.steps.find(s => s.id === 'TC-01.S3');
  const queryOperation = { ...context.operations.find(o => o.step === 'TC-01.S3'), contract: step };
  context.operations = context.operations.filter(o => o.step !== 'TC-01.S3');
  context.references = context.references.filter(uri => !uri.endsWith('query.sql'));
  if (control.route === 'first-pr') {
    input.publisher.intent = 'success';
    input.action_receipt.transitions[0].to_stage_id = config.defaults.stages['In Review'];
  }
  return { ...control, input, work, context, queryOperation, inability: candidate.payload };
}

const readyEffects = [
  'read-start', 'high-plan', 'high-review', 'medium-authority', 'medium-dispatch',
  'read-operation', 'retrieve-artifact', 'read-pre-write', 'write-pr', 'read-pr',
  'read-publisher', 'append', 'read-comment', 'read-final', 'transition', 'read-status',
];
const inabilityEffects = ['read-start', 'read-publisher', 'append', 'read-comment', 'read-final', 'transition', 'read-status'];
function expectedCalls({ route, fault }) {
  const order = ['ready', 'first-pr'].includes(route) ? readyEffects : inabilityEffects;
  const stop = { 'medium-authority': 'medium-authority', operation: 'read-operation',
    retrieval: 'retrieve-artifact', assignment: 'read-pre-write', publisher: 'read-publisher',
    pr: 'write-pr', append: 'append', transition: 'transition' }[fault];
  if (!stop) return order;
  return [...order.slice(0, order.indexOf(stop) + 1),
    ...(['pr', 'append', 'transition'].includes(fault) ? ['resolve-' + fault] : [])];
}

function simulator(fixture, output, audit) {
  const { fault, input, route } = fixture;
  const observed = structuredClone(input);
  delete observed.candidate;
  delete observed.missing_step_id;
  delete observed.publication;
  const issue = observed.issues.find(i => i.id === input.target.ticket_id);
  const page = observed.comment_pages.find(p => p.ticket_id === issue.id);
  const stages = config.defaults.stages;
  const order = expectedCalls(fixture);
  let calculatedHash, sourceRevision, prepared, rawPublication, retained, index = 0;

  const digestOf = async name => sha256(await readFile(path.join(output, name)));
  async function reply(action, args) {
    switch (action) {
      case 'read-start':
        assert.equal(args.key, issue.key);
        return { ...observed, start_observations: fixture.context, type_id: config.defaults.types.story, environment: notice,
          checkout: { repository: fixture.work.technical_acceptance_criteria.repository.url, branch: 'codex/fixture', base: 'main' },
          profile: { parent: 'grok-4.7-high', review: 'grok-4.7-high', execute: 'grok-4.7-medium', task_type: 'generalPurpose', machine: 'same_machine' },
          inability: ['blocked', 'wait'].includes(route) ? fixture.inability : null,
          native_pointer: issue.pointer, prior_actions: [], can_dispatch_high: true, allowed_repository: observed.trusted.projects[0].repositories[0] };
      case 'high-plan':
        assert.equal(args.model, 'grok-4.7-high');
        assert.equal(args.assignment, issue.pointer.assignment.record_id);
        assert(!(await readdir(output)).includes(queryFile), 'The query must still be future.');
        return { accepted: true, actor: 'plan-author' };
      case 'high-review':
        assert.equal(args.model, 'grok-4.7-high');
        assert.equal(args.type, 'generalPurpose');
        assert.equal(args.machine, 'same_machine');
        calculatedHash = await digestOf('plan.md');
        assert.equal(args.plan_sha256, calculatedHash);
        return { model: args.model, actor: 'independent-reviewer', simulated: true,
          plan_sha256: calculatedHash, outcome: 'CLEAN', coverage: '4/4 plus second sweep' };
      case 'medium-authority':
        assert.equal(args.plan_sha256, calculatedHash);
        return { can_edit: fault !== 'medium-authority', same_checkout: true };
      case 'medium-dispatch':
        assert.equal(args.model, 'grok-4.7-medium');
        assert.equal(args.type, 'generalPurpose');
        assert.equal(args.machine, 'same_machine');
        assert.equal(args.plan_sha256, await digestOf('plan.md'));
        return { accepted: true, actor: 'implementer', simulated: true };
      case 'read-operation':
        assert.equal(args.step, fixture.queryOperation.step);
        sourceRevision = (await digestOf(sourceFile)).slice(0, 40);
        assert.notEqual(sourceRevision, fixture.prior?.payload.pr.source_revision);
        return { ...fixture.queryOperation, read_only: fault !== 'operation', source_revision: sourceRevision };
      case 'retrieve-artifact':
        assert.equal(args.step, fixture.queryOperation.step);
        if (fault === 'retrieval') return { available: false, audience: 'fixture-reviewer' };
        const query = await readFile(path.join(output, queryFile), 'utf8');
        assert.match(query, /^SELECT id, name, tenant_id FROM saved_filters WHERE tenant_id = \$1 AND id = \$2;\n$/u);
        prepared = { uri: artifactUri, label: 'query.sql', digest: 'sha256:' + sha256(query) };
        return { available: true, audience: 'fixture-reviewer', artifact: prepared };
      case 'read-pre-write':
        if (fault === 'assignment') issue.pointer.assignment = { ...issue.pointer.assignment, comment_id: '9999' };
        return { ...observed, can_write_pr: true, approved_source: sourceRevision };
      case 'write-pr':
        if (route === 'ready') assert.equal(args.number, fixture.prior.payload.pr.number);
        else assert.equal(args.number, null);
        assert.equal(args.source_revision, sourceRevision);
        assert.equal(args.target_branch, fixture.prior?.payload.pr.target_branch ?? 'main');
        assert.equal(args.operation_id, issue.pointer.assignment.record_id);
        assert.equal(args.preparation_digest, prepared.digest);
        if (fault === 'pr') return { outcome: 'unknown', original_request: args };
        observed.pr_receipts.find(p => p.number === args.number && p.current).current = false;
        observed.pr_receipts.push({ ...fixture.prior.payload.pr, source_revision: sourceRevision, state: 'open', current: true });
        return { outcome: 'updated', number: args.number, source_revision: sourceRevision };
      case 'read-pr': {
        assert.equal(args.source_revision, sourceRevision);
        const { current, state, ...pr } = observed.pr_receipts.find(p => p.number === fixture.prior.payload.pr.number && p.current);
        const common = { available: true, actor_id: 'observer', pr };
        const requirements_digest = issue.requirements_digest;
        const evidence = [
          { kind: 'plan', name: 'plan.md', details: { requirements_digest, author_id: 'plan-author' } },
          { kind: 'plan_review', name: 'review.json', details: { requirements_digest, reviewer_id: 'independent-reviewer', outcome: 'CLEAN' } },
          { kind: 'ci', name: 'ci.json', details: { status: 'passed' } },
          { kind: 'artifact', name: 'verification.json', details: {} },
        ];
        const ci = [{ name: 'fixture-unit', status: 'passed', source_revision: sourceRevision }];
        const refs = {};
        for (const { kind, name, details } of evidence) {
          const observed_digest = 'sha256:' + (kind === 'ci' ? sha256(serialize(ci)) : await digestOf(name));
          const uri = 'https://evidence.example.invalid/pgb164/' + name;
          refs[kind] = { label: name, uri, digest: observed_digest };
          observed.evidence_receipts.push({ ...common, kind, uri, observed_digest, details });
          observed.trusted.projects[0].evidence_uris.push(uri);
        }
        const slot = fixture.work.testing_strategy.preparation[0];
        observed.evidence_receipts.push({ ...common, kind: 'preparation', uri: prepared.uri,
          observed_digest: prepared.digest, details: { requirements_digest, preparation_id: slot.id, consumers: slot.used_by } });
        return { pr, pr_receipts: observed.pr_receipts, required_ci: ci, refs };
      }
      case 'read-publisher':
      case 'read-final':
        assert.equal(args.intent, observed.publisher.intent);
        return { ...observed, actual_actor: fault === 'publisher' ? null : 'implementer' };
      case 'append': {
        assert.equal(args.issue, issue.id);
        const parsed = extractHandoff(args.body, { format: 'html' }).value;
        assert.equal(parsed.record_id, args.record_id);
        assert.equal(digestValue(parsed), args.digest);
        assert.equal(parsed.assignment.digest, issue.pointer.assignment.digest);
        assert.equal(parsed.operation_id, args.operation_id);
        rawPublication = args;
        if (fault === 'append') return { outcome: 'unknown', original_request: rawPublication };
        const native = comment(null, '16499', 'implementer', rawPublication.body);
        page.comments.push(native);
        page.total++;
        retained = reference({ r: parsed, c: native });
        return { outcome: 'appended', comment_id: native.id };
      }
      case 'read-comment':
        assert.equal(args.comment_id, retained.comment_id);
        return { reference: retained, pages: observed.comment_pages };
      case 'transition':
        assert.equal(args.comment_id, retained.comment_id);
        assert.equal(args.from_stage_id, issue.stage_id);
        assert.equal(args.to_stage_id, observed.action_receipt.transitions[0].to_stage_id);
        if (fault === 'transition') return { outcome: 'unknown', original_request: args };
        issue.stage_id = args.to_stage_id;
        return { outcome: 'transitioned' };
      case 'read-status':
        return { status: Object.keys(stages).find(name => stages[name] === issue.stage_id) };
      case 'resolve-pr':
        assert.equal(args.operation_id, issue.pointer.assignment.record_id);
        return { outcome: 'unknown', resolving_read: 'PR' };
      case 'resolve-append':
        assert.equal(args.record_id, rawPublication.record_id);
        return { outcome: 'unknown', resolving_read: 'comment' };
      case 'resolve-transition':
        assert.equal(args.comment_id, retained.comment_id);
        return { outcome: 'unknown', resolving_read: 'native status' };
    }
    throw new Error('Unknown mock operation.');
  }
  return async ({ action, ...args }) => {
    const ordinal = index + 1;
    try {
      assert.equal(action, order[index], 'Unexpected action at the current boundary.');
      const result = await reply(action, args);
      index++;
      await audit({ ordinal, action, args, result: structuredClone(result), observation: notice });
      return structuredClone(result);
    } catch (error) {
      await audit({ ordinal, action, args, result: { rejected: true, reason: error.message }, observation: notice });
      throw error;
    }
  };
}

async function preparedCopy(directory) {
  assert(process.env.PIGBOARD_PREPARED_HELPER_ROOT, 'Point PIGBOARD_PREPARED_HELPER_ROOT to prepared physical helper dependencies.');
  const source = path.join(directory, 'source');
  const app = path.join(directory, 'app');
  const cache = path.join(directory, 'cache');
  const bundle = JSON.parse(await readFile(path.join(root, 'config/skill-bundle.json')));
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
  await mkdir(source);
  await mkdir(app);
  git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.name', 'PGB-164 Fixture');
  git(source, 'config', 'user.email', 'fixture@example.invalid');
  for (const name of bundle.skills) {
    const skill = path.join('skills', name);
    await cp(path.join(root, skill), path.join(source, skill), {
      recursive: true, filter: name => !name.split(path.sep).includes('node_modules'),
    });
  }
  for (const relative of bundle.validatorPayload.sources) {
    const target = path.join(source, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(root, relative), target);
  }
  git(source, 'add', '.');
  git(source, 'commit', '-m', 'Disposable PGB-164 actual source packaging snapshot');
  const copied = await prepare({ source, app, cache, ref: git(source, 'rev-parse', 'HEAD') }, async dir => {
    const component = path.basename(dir) === 'work-validator' ? 'root' : path.basename(path.dirname(dir));
    const dependencies = component === 'root' ? root : path.join(process.env.PIGBOARD_PREPARED_HELPER_ROOT, component);
    assert.deepEqual(await readFile(path.join(dir, 'package-lock.json')), await readFile(path.join(dependencies, 'package-lock.json')));
    await cp(path.join(dependencies, 'node_modules'), path.join(dir, 'node_modules'), { recursive: true, dereference: true });
  });
  const pinFiles = Object.fromEntries(Object.entries(JSON.parse(await readFile(copied.manifest)).sourceFiles).filter(([name]) =>
    name.startsWith('work-validator/') || name.startsWith('implementer-entrypoint/') ||
    name.startsWith('implementer-job/') || name.startsWith('implementer-jira/')));
  for (const name of [
    'implementer-entrypoint/SKILL.md', 'implementer-entrypoint/references/handoff.md',
    'implementer-entrypoint/references/cursor.md', 'implementer-job/SKILL.md', 'implementer-jira/SKILL.md',
    ...bundle.validatorPayload.sources.map(file => 'work-validator/' + file),
  ]) assert(Object.hasOwn(pinFiles, name), name + ' is installed and manifested');
  for (const [name, digest] of Object.entries(pinFiles)) {
    const relative = name.startsWith('work-validator/') ? name.slice('work-validator/'.length) : path.join('skills', name);
    const bytes = await readFile(path.join(copied.skills, name));
    assert.deepEqual(bytes, await readFile(path.join(root, relative)), name);
    assert.equal(sha256(bytes), digest, name);
  }
  return { skills: copied.skills, manifest: copied.manifest, prepared_snapshot: copied.commit, product_revision: git(root, 'rev-parse', 'HEAD'),
    manifest_sha256: sha256(await readFile(copied.manifest)), files: pinFiles };
}

async function checkEarly(verify, fixture) {
  const { input, context, stackParent } = fixture;
  const work = input.requirements[0].body;
  const report = await verify('validate-work', ['--mode', 'scheduling', '--format', 'yaml', '--json'],
    { input: work, config, scheduling: schedulingPacket(input, context) });
  assert.equal(report.execution_authorized, false);
  assert.equal(digestValue(parseWork(work)), input.issues[0].requirements_digest);
  const history = await verify('validate-handoff', ['--mode', 'recorded-history', '--json'],
    { input: historyPacket(input, input.target) });
  const admission = history.records.find(r => r.kind === 'admission' && r.reference.digest === input.target.digest);
  assert.deepEqual(admission.reference, input.target);
  assert.deepEqual(admission.roots, input.issues[0].required_requests);
  assert.equal(history.external_freshness, 'not_evaluated');
  if (stackParent) {
    const parent = await verify('validate-handoff', ['--mode', 'recorded-history', '--json'],
      { input: historyPacket(input, stackParent.completion) });
    assert(parent.records.some(r => r.completed && r.reference.digest === stackParent.completion.digest));
  }
  const unavailable = await verify('validate-work', ['--mode', 'start', '--format', 'yaml', '--json'], { input: work, context }, false);
  assert(unavailable.diagnostics.some(d => d.code === 'CONTEXT_OPERATION'));
}

function withoutMetadata(fixture, observation) {
  const keys = ['schema', 'consumer', 'target', 'trusted', 'issues', 'requirements', 'comment_pages',
    'pr_receipts', 'evidence_receipts', 'retained', 'request_resolutions', 'purpose',
    'current_context_body', 'publisher', 'action_receipt'];
  return Object.fromEntries(keys.map(key => [key, observation[key] ?? fixture.input[key]]));
}

async function publishExercise(fixture, request, verify, candidate, packet) {
  const { fault, route } = fixture;
  const ready = route === 'ready';
  const raw = stringify(candidate, { aliasDuplicateObjects: false });
  await verify('validate-handoff', ['--mode', 'record', '--format', 'yaml', '--json'], { input: raw });
  const mode = ready ? 'worker-current' : 'worker-assignment';
  if (!ready) {
    packet.publication = 'unpublished';
    packet.missing_step_id = route === 'blocked' ? fixture.input.missing_step_id : null;
    packet.candidate = { format: 'yaml', body: raw };
    const original = await verify('validate-handoff', ['--mode', mode, '--json'], { input: packet });
    assert.equal(original.execution_authorized, false);
  }
  const formatted = await verify('prepare-handoff', ['--format', 'html'], { input: raw, summary: 'PGB-164 synthetic fixture' });
  const append = await request({ action: 'append', issue: candidate.ticket_id, operation_id: candidate.operation_id,
    record_id: formatted.record_id, digest: formatted.record_digest, body: formatted.body });
  if (fault === 'append') {
    assert.equal(append.original_request.body, formatted.body);
    assert.equal((await request({ action: 'resolve-append', record_id: formatted.record_id })).outcome, 'unknown');
    return { outcome: 'unknown', original: append.original_request };
  }
  const { reference: leaf, pages } = await request({ action: 'read-comment', comment_id: append.comment_id });
  assert.equal(leaf.digest, formatted.record_digest);
  assert.equal(leaf.record_id, formatted.record_id);
  const actual = pages.flatMap(page => page.comments).find(c => c.id === leaf.comment_id);
  assert.equal(actual.body, formatted.body);
  assert.deepEqual(JSON.parse(JSON.stringify(extractHandoff(actual.body, { format: actual.format }).value)), candidate);
  packet.target = leaf;
  packet.comment_pages = pages;
  if (!ready) packet.publication = 'readback';
  const readback = await verify('validate-handoff', ['--mode', mode, '--json'], { input: packet });
  assert.equal(readback.valid, true);
  const fresh = await request({ action: 'read-final', intent: packet.publisher.intent });
  assert.equal(fresh.actual_actor, 'implementer');
  assert.deepEqual(fresh.issues.find(i => i.id === candidate.ticket_id).pointer.assignment, candidate.assignment);
  assert.deepEqual(fresh.pr_receipts, packet.pr_receipts);
  assert.deepEqual(fresh.comment_pages, packet.comment_pages);
  assert.deepEqual(fresh.requirements, packet.requirements);
  assert.deepEqual(fresh.evidence_receipts, packet.evidence_receipts);
  assert.deepEqual(fresh.action_receipt, packet.action_receipt);
  const moved = await request({ action: 'transition', comment_id: leaf.comment_id,
    from_stage_id: config.defaults.stages[candidate.from_stage], to_stage_id: config.defaults.stages[candidate.to_stage] });
  if (fault === 'transition') {
    assert.equal(moved.original_request.comment_id, leaf.comment_id);
    assert.equal((await request({ action: 'resolve-transition', comment_id: leaf.comment_id })).outcome, 'unknown');
    return { outcome: 'unknown', original: moved.original_request, leaf };
  }
  const final = await request({ action: 'read-status' });
  assert.equal(final.status, candidate.to_stage);
  return { outcome: 'completed', leaf, status: final.status };
}

async function driveReady(fixture, request, verify, output, initial) {
  const { fault, route, prior } = fixture;
  const input = withoutMetadata(fixture, initial);
  const context = structuredClone(initial.start_observations);
  const work = input.requirements[0].body;
  await checkEarly(verify, { ...fixture, input, context });
  assert.equal(initial.can_dispatch_high, true);
  assert.equal(initial.allowed_repository, initial.checkout.repository);
  assert.deepEqual(input.action_receipt.transitions, [{ from_stage_id: '2', to_stage_id: '3' }]);
  const high = await request({ action: 'high-plan', model: 'grok-4.7-high', assignment: input.target.record_id });
  assert.equal(high.accepted, true);
  const plan = 'Add tenant-scoped saved-filter lookup, verify the two bound parameters, prepare PREP-QUERY and keep the admitted PR.';
  await writeFile(path.join(output, 'plan.md'), plan);
  const plan_sha256 = sha256(plan);
  const review = await request({ action: 'high-review', model: 'grok-4.7-high', type: 'generalPurpose', machine: 'same_machine', plan_sha256 });
  assert.equal(review.outcome, 'CLEAN');
  assert.notEqual(review.actor, high.actor);
  assert.equal(review.plan_sha256, plan_sha256);
  await writeFile(path.join(output, 'review.json'), serialize(review));
  const edit = await request({ action: 'medium-authority', plan_sha256 });
  if (!edit.can_edit) return { outcome: 'local', reason: 'edit authority unavailable' };
  const medium = await request({ action: 'medium-dispatch', model: 'grok-4.7-medium', type: 'generalPurpose', machine: 'same_machine', plan_sha256 });
  assert.equal(medium.accepted, true);

  const source = "export const query = 'SELECT id, name, tenant_id FROM saved_filters WHERE tenant_id = $1 AND id = $2;';\n";
  await writeFile(path.join(output, sourceFile), source, { flag: 'wx' });
  const operation = await request({ action: 'read-operation', step: 'TC-01.S3' });
  if (!operation.read_only) return { outcome: 'local', reason: 'unsafe operation' };
  const checked = execFileSync(process.execPath, ['--input-type=module', '-e', "import { query } from './saved-filters.mjs'; process.stdout.write(query + '\\n');"], { cwd: output });
  await writeFile(path.join(output, queryFile), checked, { flag: 'wx' });
  const artifact = await request({ action: 'retrieve-artifact', step: operation.step });
  if (!artifact.available) return { outcome: 'local', reason: 'missing final artifact' };
  assert.equal(artifact.artifact.digest, 'sha256:' + sha256(checked));
  assert.equal(operation.parameter_count, 2);
  assert.equal(operation.max_duration_seconds, 20);
  const { source_revision, ...operationFacts } = operation;
  context.operations.push(operationFacts);
  context.references.push(artifact.artifact.uri);
  const native = await request({ action: 'read-pre-write' });
  const predecessor = withoutMetadata(fixture, native);
  if (JSON.stringify(native.issues[0].pointer.assignment) !== JSON.stringify(input.target)) {
    return { outcome: 'local', reason: 'changed assignment' };
  }
  assert.equal(native.can_write_pr, true);
  assert.equal(native.approved_source, source_revision);
  await verify('validate-work', ['--mode', 'start', '--format', 'yaml', '--json'], { input: work, context });
  await verify('validate-handoff', ['--mode', 'worker-current', '--json'], { input: currentPacket(predecessor, context) });
  const pr = await request({ action: 'write-pr', number: prior?.payload.pr.number ?? null,
    target_branch: prior?.payload.pr.target_branch ?? 'main', source_revision,
    operation_id: input.target.record_id, preparation_digest: artifact.artifact.digest });
  if (route === 'first-pr') {
    assert.equal(pr.original_request.source_revision, source_revision);
    assert.equal((await request({ action: 'resolve-pr', operation_id: input.target.record_id })).outcome, 'unknown');
    return { outcome: 'unknown', original: pr.original_request };
  }
  const tested = { source_revision, command: 'Import query from saved-filters.mjs', digest: artifact.artifact.digest, result: 'PASS' };
  await writeFile(path.join(output, 'verification.json'), serialize(tested));
  const read = await request({ action: 'read-pr', source_revision });
  assert.equal(read.pr.source_revision, source_revision);
  assert(read.required_ci.every(ci => ci.source_revision === source_revision && ci.status === 'passed'));
  assert.equal(read.pr_receipts.filter(p => p.current && p.number === read.pr.number).length, 1);
  assert(predecessor.pr_receipts.some(p => p.current && p.source_revision === prior.payload.pr.source_revision));
  const publisher = await request({ action: 'read-publisher', intent: 'success' });
  if (!publisher.actual_actor) return { outcome: 'local', reason: 'publisher identity unknown' };
  const current = withoutMetadata(fixture, publisher);
  await verify('validate-work', ['--mode', 'start', '--format', 'yaml', '--json'], { input: work, context });
  const candidate = JSON.parse(JSON.stringify({
    ...prior, record_id: '16400000-0000-4000-8000-000000000003',
    assignment: input.target, operation_id: input.target.record_id,
    payload: { pr: read.pr, stack_parent: fixture.stackParent, consumed_requests: fixture.admission.payload.requests,
      plan: read.refs.plan, plan_review: read.refs.plan_review, ci: read.refs.ci, verification: [read.refs.artifact],
      prepared_inputs: [{ id: fixture.work.testing_strategy.preparation[0].id, artifacts: [artifact.artifact] }] },
  }));
  return publishExercise(fixture, request, verify, candidate, currentPacket(current, context));
}

async function driveInability(fixture, request, verify, initial) {
  const input = withoutMetadata(fixture, initial);
  const { route } = fixture;
  const intent = route === 'blocked' ? 'blocked' : 'dependency_wait';
  const publisher = await request({ action: 'read-publisher', intent });
  assert.equal(publisher.actual_actor, 'implementer');
  const native = withoutMetadata(fixture, publisher);
  await verify('validate-handoff', ['--mode', 'worker-assignment', '--json'], {
    input: { ...native, publication: 'none', candidate: null, missing_step_id: null },
  });
  const admission = entries(input).find(x => x.r.record_id === input.target.record_id).r;
  const candidate = JSON.parse(JSON.stringify({
    ...admission, record_id: '16400000-0000-4000-8000-000000000004',
    assignment: input.target, role: 'implementer', kind: intent, from_stage: 'In Progress',
    to_stage: route === 'blocked' ? 'Blocked' : 'Rework Queued', payload: initial.inability,
  }));
  return publishExercise(fixture, request, verify, candidate, native);
}

test('P164 H01 and H02 exercise observed action boundaries with real validators', async t => {
  const { dir } = await temporary(t);
  const scripts = [path.join(root, 'scripts')];
  const copy = process.env.PIGBOARD_PREPARED_HELPER_ROOT ? await preparedCopy(dir) : null;
  if (copy) scripts.push(path.join(copy.skills, 'work-validator/scripts'));
  else t.diagnostic('Source validation only. Set PIGBOARD_PREPARED_HELPER_ROOT for the physical prepared-copy comparison.');
  const results = {};
  for (const caseId of Object.keys(controls)) {
    await t.test(caseId, async () => {
      const run = path.join(dir, caseId);
      const fixture = await prepareExercise(run, caseId);
      const output = path.join(run, 'output');
      assert.deepEqual(await readdir(output), []);
      const journal = [];
      const request = simulator(fixture, output, event => journal.push(event));
      const verify = await validators(output, scripts, journal);
      const initial = await request({ action: 'read-start', key: fixture.input.issues.find(i => i.id === fixture.input.target.ticket_id).key });
      const result = ['ready', 'first-pr'].includes(fixture.route)
        ? await driveReady(fixture, request, verify, output, initial)
        : await driveInability(fixture, request, verify, initial);
      const actions = journal.filter(entry => entry.action);
      assert.deepEqual(actions.map(entry => entry.action), expectedCalls(fixture));
      const hold = { 'medium-authority': 'edit authority unavailable', operation: 'unsafe operation',
        retrieval: 'missing final artifact', assignment: 'changed assignment', publisher: 'publisher identity unknown' }[fixture.fault];
      if (hold) assert.deepEqual(result, { outcome: 'local', reason: hold });
      else if (fixture.fault) {
        assert.equal(result.outcome, 'unknown');
        assert.deepEqual(result.original, actions.at(-2).args);
      } else {
        assert.equal(result.outcome, 'completed');
        assert.equal(result.status, { ready: 'In Review', blocked: 'Blocked', wait: 'Rework Queued' }[fixture.route]);
      }
      assert.equal((await readdir(output)).includes(queryFile), ['ready', 'first-pr'].includes(fixture.route)
        && !['medium-authority', 'operation'].includes(fixture.fault));
      const generated = {};
      for (const name of ['plan.md', 'review.json', sourceFile, queryFile, 'verification.json']) {
        if ((await readdir(output)).includes(name)) generated[name] = await readFile(path.join(output, name), 'utf8');
      }
      results[caseId] = { result, journal, generated };
    });
  }
  if (process.env.PIGBOARD_P164_EVIDENCE) {
    const evidence = process.env.PIGBOARD_P164_EVIDENCE;
    await writeFile(evidence, serialize({ evidence: notice, copy, results,
      subject_execution: 'NOT_RUN', designated_human: 'NOT_RUN', live_provider: 'NOT_RUN' }), { flag: 'wx', mode: 0o600 });
  }
});

async function prepareExercise(directory, caseId) {
  const fixture = exercise(caseId);
  const { input } = fixture;
  const key = input.issues.find(i => i.id === input.target.ticket_id).key;
  await mkdir(directory, { mode: 0o700 });
  for (const dir of ['assistant', 'operator', 'output']) await mkdir(path.join(directory, dir), { mode: 0o700 });
  for (const [name, contents] of Object.entries({
    'assistant/invocation.md': `Use the pinned implementer-entrypoint skill for ${key}. ${notice}\n`
      + 'Read config.yaml and local-tools.md. Your only provider/model access is the operator’s local mock adapter. '
      + 'Use the prepared runtime from the same immutable copy. Start with an empty output directory. '
      + 'Preserve actual inputs, commands, results, verified effects and unfinished work there.\n',
    'assistant/config.yaml': serialize(config),
    'assistant/local-tools.md': mockToolGuide(key),
    'assistant/repository-instructions.md': earlierExercise['repository-instructions.md'],
    'operator/fixture.json': serialize(fixture),
    'operator/expectations.json': serialize({ caseId, order: expectedCalls(fixture),
      subject_execution: 'NOT_RUN', human_acceptance: 'NOT_RUN', live_provider: 'NOT_RUN' }),
  })) await writeFile(path.join(directory, name), contents, { mode: 0o600, flag: 'wx' });
  return fixture;
}

function mockToolGuide(key) {
  return `# Simulated tools for ${key}

Send one JSON object per line to the separate operator. Call only the operations
needed at the current boundary. Keep the replies as mock observations. Provider
account/ID and HTTPS strings are fixture data. Do not contact those services.

| Action | Additional input fields |
| --- | --- |
| read-start | key |
| high-plan | model, assignment (record UUID) |
| high-review | model, type, machine, plan_sha256 (hex) |
| medium-authority | plan_sha256 |
| medium-dispatch | model, type, machine, plan_sha256 |
| read-operation, retrieve-artifact | step |
| read-pre-write | none |
| write-pr | number or null, source_revision, target_branch, operation_id, preparation_digest |
| read-pr | source_revision |
| read-publisher, read-final | intent |
| append | issue, operation_id, record_id, digest, body (actual formatter HTML) |
| read-comment | comment_id |
| transition | comment_id, from_stage_id, to_stage_id |
| read-status | none |
| resolve-pr | operation_id |
| resolve-append | record_id |
| resolve-transition | comment_id |

Task type is generalPurpose, machine is same_machine. For the fixture repository,
Medium writes saved-filters.mjs in output, exporting the tenant-scoped saved-filter
query. Generate query.sql by executing that code only after checking the prescribed
operation. The reader needs id, name and tenant_id, tenant in parameter $1 and id
in $2. No database is contacted. Keep plan.md for review, the actual review reply
in review.json and the observed local verification in verification.json. Use the
mock evidence and source revision supplied after their respective reads. Use the
native packet fields defined in the installed validator docs, excluding adapter
metadata. Report exact source/current assignment and provenance separately from
the historical receipt. Write any candidate before requesting append. Preserve it
and the original request for an uncertain effect.
`;
}

if (manual) {
  const [command, location, caseId] = process.argv.slice(2);
  assert(path.isAbsolute(location), 'Use an absolute disposable run directory.');
  if (command === 'pin') {
    await mkdir(location, { mode: 0o700 });
    const receipt = await preparedCopy(location);
    await writeFile(path.join(location, 'receipt.json'), serialize(receipt), { mode: 0o600, flag: 'wx' });
    process.stdout.write(serialize(receipt) + '\n');
  } else if (command === 'prepare') {
    await prepareExercise(location, caseId);
    process.stdout.write(serialize({ location, caseId, observation: notice, status: 'PREPARED' }) + '\n');
  } else {
    const operator = path.join(location, 'operator');
    const output = path.join(location, 'output');
    const audit = path.join(operator, 'audit.jsonl');
    await writeFile(audit, '', { mode: 0o600, flag: 'wx' });
    const fixture = JSON.parse(await readFile(path.join(operator, 'fixture.json')));
    const respond = simulator(fixture, output, event => appendFile(audit, JSON.stringify(event) + '\n'));
    const requests = createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of requests) {
      try { process.stdout.write(JSON.stringify(await respond(JSON.parse(line))) + '\n'); }
      catch (error) { process.stdout.write(JSON.stringify({ rejected: true, reason: error.message }) + '\n'); }
    }
  }
}
