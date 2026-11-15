import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { extractHandoff, digestValue } from '../lib/contracts/handoff.mjs';
import { validateReceiptChain } from '../lib/contracts/receipts.mjs';

// Schema/formatter regression only; these supplied seeds are not agent transcripts.
const root = new URL('../', import.meta.url).pathname;
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
