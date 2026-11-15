// Source-only fixed receipt inputs. No validator, provider calls or test outcomes.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { stringify } from 'yaml';
import { digestValue } from '../../lib/contracts/handoff.mjs';

const seeds = JSON.parse(readFileSync(new URL('./handoff-chains.json', import.meta.url))).chains;
export const records = e => e.comment_pages.flatMap(p => p.comments.map(c => ({ c, r: JSON.parse(JSON.parse(c.body).content[0].content[0].text) })));
export const targetRecord = e => records(e).find(x => x.r.record_id === e.target.record_id).r;
const body = r => JSON.stringify({ type: 'doc', version: 1, content: [{ type: 'codeBlock', attrs: { language: 'yaml' }, content: [{ type: 'text', text: JSON.stringify(r) }] }] });
// Rebind exact references after a fixed input mutation, never normalize old seeds.
function seal(e) {
  for (let round = 0; round < 20; round++) {
    let changed = false;
    const rows = records(e), digests = new Map(rows.map(({ r }) => [r.record_id, digestValue(r)]));
    const walk = v => {
      if (!v || typeof v !== 'object') return;
      if (v.record_id && Object.hasOwn(v, 'digest') && digests.has(v.record_id) && v.digest !== digests.get(v.record_id)) { v.digest = digests.get(v.record_id); changed = true; }
      Object.values(v).forEach(walk);
    };
    walk(e);
    for (const { c, r } of rows) { walk(r); c.body = body(r); }
    if (!changed) return e;
  }
  throw new Error('Fixed fixture references did not converge.');
}
export function changeTarget(e, change) {
  const row = records(e).find(x => x.r.record_id === e.target.record_id);
  change(row.r); row.c.body = body(row.r); return seal(e);
}
function blocked() {
  const e = structuredClone(seeds.partial);
  e.issues[0].stage_id = e.trusted.projects[0].stages.Blocked;
  return changeTarget(e, r => {
    const p = r.payload; r.kind = 'blocked'; r.to_stage = 'Blocked';
    r.payload = { pr: p.pr, basis: p.basis, reason: 'access', detail: 'A later check lost prepared access after the confirmed defect.', human_action: 'Restore prepared access.', evidence: [], qa_report: p.qa_report, findings: p.findings };
  });
}
function waiting() {
  const e = structuredClone(seeds.partial), upstream = structuredClone(seeds.human);
  // A distinct upstream issue with a real completed predecessor and human repair.
  const remap = v => {
    if (!v || typeof v !== 'object') return;
    if (v.ticket_id === '1000') v.ticket_id = '1002';
    if (v.provider === 'github' && v.number === '10') v.number = '12';
    Object.values(v).forEach(remap);
  };
  for (const { c, r } of records(upstream)) { remap(r); c.body = body(r); }
  remap(upstream); upstream.issues[0].id = '1002'; upstream.issues[0].key = 'EX-3';
  upstream.issues[0].stage_id = upstream.trusted.projects[0].stages['Rework Queued'];
  const facts = JSON.parse(upstream.requirements[0].context_body); facts.subject_key = 'EX-3'; facts.prerequisite_graph[0].ticket = 'EX-3'; upstream.requirements[0].context_body = JSON.stringify(facts);
  const prior = targetRecord(upstream), request = structuredClone(records(seeds.stack).find(x => x.r.kind === 'repair_request').r);
  request.ticket_id = '1002'; request.assignment = prior.assignment; request.operation_id = prior.operation_id; request.payload.basis = upstream.target; request.payload.pr = prior.payload.pr;
  const comment = { ...upstream.comment_pages[0].comments.at(-1), id: '2032', author_id: 'human', update_author_id: 'human', body: body(request) };
  upstream.comment_pages[0].comments.push(comment); upstream.comment_pages[0].total++;
  const ref = { ticket_id: '1002', comment_id: comment.id, record_id: request.record_id, digest: digestValue(request) };
  const findingEvidence = structuredClone(seeds.stack.evidence_receipts.find(x => x.uri.endsWith('/stack-finding'))); findingEvidence.pr = prior.payload.pr;
  e.issues.push(...upstream.issues); e.requirements.push(...upstream.requirements); e.comment_pages.push(...upstream.comment_pages); e.pr_receipts.push(...upstream.pr_receipts); e.evidence_receipts.push(...upstream.evidence_receipts, findingEvidence);
  e.trusted.projects[0].evidence_uris.push(...upstream.trusted.projects[0].evidence_uris, findingEvidence.uri);
  // All supplied receipt lists retain uniqueness, even if a future seed shares a URI.
  e.trusted.projects[0].evidence_uris = [...new Set(e.trusted.projects[0].evidence_uris)];
  e.issues[0].stage_id = e.trusted.projects[0].stages['Rework Queued'];
  return changeTarget(e, r => { const p = r.payload; r.kind = 'dependency_wait'; r.payload = { pr: p.pr, requests: [ref], reason: 'Wait for the confirmed upstream repair; retain the earlier local defect.', qa_report: p.qa_report, findings: p.findings }; });
}
export function partialFixtures() {
  const allNotRun = structuredClone(seeds.blocked);
  allNotRun.evidence_receipts = allNotRun.evidence_receipts.filter(x => x.kind !== 'environment');
  changeTarget(allNotRun, r => { r.payload.reason = 'evidence'; r.payload.detail = 'No trusted deployment receipt before runtime dispatch.'; r.payload.human_action = 'Supply the matching deployment receipt.'; for (const s of r.payload.qa_report.steps) s.not_run_reason = 'No trusted deployment receipt; no runtime dispatch.'; });
  const cases = { 'blocked-no-environment': allNotRun, 'blocked-retained-fail': blocked(), 'wait-retained-fail': waiting(), 'old-blocked': structuredClone(seeds.blocked), 'old-wait': structuredClone(seeds.first_pr_after_wait), 'human-static': structuredClone(seeds.human) };
  // Historical pre-PR wait, selected without rewriting its original record body.
  const old = cases['old-wait'], wait = records(old).find(x => x.r.kind === 'dependency_wait');
  old.target = { ticket_id: wait.r.ticket_id, comment_id: wait.c.id, record_id: wait.r.record_id, digest: digestValue(wait.r) };
  old.issues.find(x => x.id === wait.r.ticket_id).pointer.assignment = wait.r.assignment;
  old.issues.find(x => x.id === wait.r.ticket_id).stage_id = old.trusted.projects[0].stages['Rework Queued'];
  // Remove later attempt publications; old wait remains the current leaf.
  old.comment_pages.find(x => x.ticket_id === wait.r.ticket_id).comments = old.comment_pages.find(x => x.ticket_id === wait.r.ticket_id).comments.filter(c => Number(c.id) < 9002);
  old.comment_pages.find(x => x.ticket_id === wait.r.ticket_id).total = 2;
  old.issues.find(x => x.id === wait.r.ticket_id).published_prs = [];
  for (const [name, source] of [['success-no-environment', seeds.mixed], ['blocked-fail-no-environment', cases['blocked-retained-fail']], ['wait-fail-no-environment', cases['wait-retained-fail']]]) { cases[name] = structuredClone(source); cases[name].evidence_receipts = cases[name].evidence_receipts.filter(x => x.kind !== 'environment'); }
  for (const name of ['blocked', 'wait']) {
    const e = structuredClone(cases[name + '-retained-fail']);
    changeTarget(e, r => { r.payload.qa_report.steps[0].result = 'PASS'; r.payload.qa_report.steps[0].finding_ids = []; });
    e.evidence_receipts = e.evidence_receipts.filter(x => x.kind !== 'environment');
    cases[name + '-pass-no-environment'] = e;
  }
  for (const [name, mutate] of [
    ['missing-finding-evidence', r => r.payload.findings[0].evidence = []],
    ['duplicate-finding-id', r => r.payload.findings.push({ ...structuredClone(r.payload.findings[0]), summary: 'Another confirmed defect.' })],
    ['unknown-finding-id', r => r.payload.qa_report.steps[0].finding_ids = ['unknown']],
    ['blank-finding', r => r.payload.findings[0].summary = ' '],
    ['blank-finding-id', r => r.payload.findings[0].id = ' '],
    ['malformed-finding', r => r.payload.findings[0].extra = 'undeclared'],
    ['non-qa-findings', r => { r.role = 'reviewer'; r.from_stage = 'In Review'; r.payload.qa_report = null; }],
    ['missing-result-evidence', r => r.payload.qa_report.steps[0].evidence = []],
    ['altered-human-list', r => r.payload.qa_report.human_pending = []],
    ['missing-findings', r => delete r.payload.findings],
  ]) cases[name] = changeTarget(blocked(), mutate);
  return { ...cases, ...transitiveFixtures() };
}

// Rebind only the target issue. A wait's distinct upstream lineage stays intact.
function rebindWork(e, work) {
  const ticket = e.target.ticket_id, requirement = e.requirements.find(x => x.ticket_id === ticket);
  const old = requirement.digest, digest = digestValue(work);
  const context = JSON.parse(requirement.context_body);
  context.operations = work.testing_strategy.cases.flatMap(c => c.steps.map(step => {
    const fact = context.operations.find(x => x.step === step.id) ?? context.operations.find(x => x.contract.skill === step.skill);
    return { ...structuredClone(fact), step: step.id, contract: structuredClone(step) };
  }));
  requirement.context_body = JSON.stringify(context);
  requirement.body = JSON.stringify(work); requirement.digest = digest;
  e.issues.find(x => x.id === ticket).requirements_digest = digest;
  for (const { c, r } of records(e)) if (r.ticket_id === ticket) { r.requirements_digest = digest; c.body = body(r); }
  for (const evidence of e.evidence_receipts) if (evidence.details.requirements_digest === old && evidence.pr.number === targetRecord(e).payload.pr.number) evidence.details.requirements_digest = digest;
  return seal(e);
}
export function transitiveFixtures() {
  const inputs = {};
  for (const kind of ['repair', 'blocked', 'wait']) {
    function chain(shape = 'three') {
      const e = kind === 'repair' ? structuredClone(seeds.partial) : kind === 'blocked' ? blocked() : waiting();
      const work = JSON.parse(e.requirements.find(x => x.ticket_id === e.target.ticket_id).body), t = work.testing_strategy, original = t.cases[0], [api, child, database, ui] = original.steps;
      const dependency = step => ({ step, required_outcome: 'PASS' });
      const makeCase = (id, steps, depends_on) => ({ ...structuredClone(original), id, steps, depends_on });
      t.cases = [makeCase('TC-01', [api, child], []), makeCase('TC-02', [database], [dependency(api.id)]), makeCase('TC-03', [ui], [dependency(database.id)])];
      if (shape === 'four' || shape === 'join') {
        const last = structuredClone(ui); last.id = 'TC-04.S1';
        t.cases.push(makeCase('TC-04', [last], [dependency(ui.id)])); t.dispatch_order.push(last.id);
        changeTarget(e, r => { const row = structuredClone(r.payload.qa_report.steps.at(-1)); row.id = last.id; r.payload.qa_report.steps.push(row); });
      }
      if (shape === 'join') {
        // B carries F1 plus a genuine second finding. C carries F1 independently;
        // D joins B/C so F1 arrives twice but is retained only once.
        t.cases[2].depends_on = [dependency(api.id)];
        t.cases[3].depends_on = [dependency(database.id), dependency(ui.id)];
        changeTarget(e, r => {
          const finding = structuredClone(r.payload.findings[0]); finding.id = 'F2'; finding.summary = 'A distinct database mismatch.';
          const evidence = structuredClone(r.payload.qa_report.steps[2].evidence[0] ?? r.payload.qa_report.steps[0].evidence[0]);
          // This approved, exact-revision artifact is already supplied by the seed.
          evidence.uri = e.evidence_receipts.find(x => x.uri.includes('TC-01.S3-0')).uri; evidence.label = 'Distinct database observation';
          finding.evidence = [evidence]; r.payload.findings.push(finding);
          const row = r.payload.qa_report.steps[2]; row.result = 'FAIL'; row.finding_ids = ['F1', 'F2']; row.evidence = [structuredClone(evidence)]; row.not_run_reason = null;
          r.payload.qa_report.steps[4].finding_ids = ['F1', 'F2'];
        });
      }
      if (shape === 'independent') {
        t.cases[1].depends_on = [];
        changeTarget(e, r => { for (const row of r.payload.qa_report.steps.slice(1)) { row.finding_ids = []; row.not_run_reason = 'Prepared access unavailable independently of the earlier defect.'; } });
      }
      if (shape === 'ownership' || shape === 'binding') {
        t.cases = [original];
        changeTarget(e, r => { for (const row of r.payload.qa_report.steps.slice(1)) { row.finding_ids = []; row.not_run_reason = 'Independent evidence blocker; no declared prerequisite.'; } });
        if (shape === 'ownership') { database.bindings = []; database.inputs.record_id = 'fixture-1'; database.database.parameters[1] = 'fixture-1'; database.database.parameter_bindings = []; }
      }
      if (shape === 'empty') {
        changeTarget(e, r => { delete r.payload.findings; for (const row of r.payload.qa_report.steps) { row.result = 'NOT_RUN'; row.evidence = []; row.finding_ids = []; row.not_run_reason = 'Deployment unavailable; no runtime dispatch.'; } });
        e.evidence_receipts = e.evidence_receipts.filter(x => x.kind !== 'environment');
      }
      if (shape === 'pass') changeTarget(e, r => { const rows = r.payload.qa_report.steps; rows[0].result = 'PASS'; for (const row of rows.slice(1)) { row.finding_ids = []; row.not_run_reason = 'Independent prepared access blocker.'; } });
      return rebindWork(e, work);
    }
    const add = (name, e) => { inputs['transitive-' + kind + '-' + name] = e; };
    add('three', chain());
    for (const [name, index] of [['missing-middle', 2], ['missing-last', 3]]) add(name, changeTarget(chain(), r => r.payload.qa_report.steps[index].finding_ids = []));
    add('unknown-last', changeTarget(chain(), r => r.payload.qa_report.steps[3].finding_ids = ['unknown']));
    add('four', chain('four'));
    add('four-missing-last', changeTarget(chain('four'), r => r.payload.qa_report.steps[4].finding_ids = []));
    add('join', chain('join'));
    for (const id of ['F1', 'F2']) add('join-missing-' + id, changeTarget(chain('join'), r => r.payload.qa_report.steps[4].finding_ids = r.payload.qa_report.steps[4].finding_ids.filter(x => x !== id)));
    for (const shape of ['independent', 'ownership', 'binding', 'pass', 'empty']) add(shape, chain(shape));
    if (kind === 'repair') add('empty-array', changeTarget(chain('empty'), r => r.payload.findings = []));
  }
  return inputs;
}

export async function preparePartialFixtures(directory) {
  // An existing directory is rejected, so preparation cannot overwrite evidence.
  await mkdir(directory);
  const hashes = {};
  for (const [name, envelope] of Object.entries(partialFixtures())) {
    for (const [suffix, text] of [['json', JSON.stringify(envelope, null, 2) + '\n'], ['yaml', stringify(targetRecord(envelope))]]) {
      const file = name + '.' + suffix; await writeFile(path.join(directory, file), text, { flag: 'wx' }); hashes[file] = createHash('sha256').update(text).digest('hex');
    }
  }
  await writeFile(path.join(directory, 'sha256.json'), JSON.stringify(hashes, null, 2) + '\n', { flag: 'wx' });
  return hashes;
}
