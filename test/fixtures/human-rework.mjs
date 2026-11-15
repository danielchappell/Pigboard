/** Fixed synthetic data exporter only: no provider, skill executor or action trace. */
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { digestValue, extractHandoff } from '../../lib/contracts/handoff.mjs';

const seeds = JSON.parse(readFileSync(new URL('./handoff-chains.json', import.meta.url))).chains;
const clone = value => JSON.parse(JSON.stringify(value));
const entries = e => e.comment_pages.flatMap(p => p.comments.map(c => ({ c, r: clone(extractHandoff(c.body, { format:c.format }).value) })));
export const CASE_IDS = Object.freeze(['H01', 'H02-discussion', 'H02-scope', 'H02-closed', 'H02-source', 'H02-missing', 'H02-queued', 'H02-append-unknown', 'H02-transition-unknown', 'H02-drift-after-publish', 'H02-authorization', 'H02-readback']);
const notice = 'SYNTHETIC LOCAL FIXTURE. Mock HTTPS observations, never live artifacts or proof of human acceptance.';
const reference = (record, commentId) => ({ ticket_id:record.ticket_id, comment_id:commentId, record_id:record.record_id, digest:digestValue(record) });
const adf = r => JSON.stringify({ type:'doc', version:1, content:[{ type:'codeBlock', attrs:{language:'yaml'}, content:[{type:'text',text:stringify(r)}] }] });
const hash = text => 'sha256:' + createHash('sha256').update(text).digest('hex');

export function packet(caseId = 'H01') {
  if (!CASE_IDS.includes(caseId)) throw Error('Unknown fixed case ID.');
  const preflight = clone(seeds.human), project = preflight.trusted.projects[0], issue = preflight.issues[0];
  const qa = entries(preflight).find(x => x.r.kind === 'qa').r;
  // Use the existing checked repair seed's human producer envelope, not a schema fork.
  const template = entries(seeds.repair).find(x => x.r.kind === 'repair_request' && x.r.role === 'human_request').r;
  const rawEvidence = preflight.evidence_receipts.map(observation => ({ notice, uri:observation.uri, status:200, body:JSON.stringify({ notice, actor_id:observation.actor_id, pr:observation.pr, kind:observation.kind, details:observation.details }), observation:clone(observation) }));
  const details = [
    ['F01', 'Searching the exact saved-filter name returns no matching filter.', 'Searching the exact saved-filter name must return that filter under AC-01.', 'Saved filter: Quarterly revenue. Query: Quarterly revenue. Observed results: [].'],
    ['F02', 'The no-match message does not explain what the reader can do next.', 'The no-match wording must be understandable to a new report user under HQA-01.', 'Query: Unknown filter. Visible message: Null result. No guidance is shown.']
  ];
  const findings = details.map(([id, summary, expected, observed]) => {
    const uri = `https://evidence.example.invalid/human-rework-${id}`;
    const body = JSON.stringify({ notice, requirement:id === 'F01' ? 'AC-01' : 'HQA-01', pr:qa.payload.pr, expected, observed });
    const evidence = { label:`Human observation ${id}`, uri, digest:hash(body) };
    const observation = { uri, observed_digest:evidence.digest, available:true, actor_id:'human', pr:clone(qa.payload.pr), kind:'artifact', details:{} };
    project.evidence_uris.push(uri);preflight.evidence_receipts.push(observation);
    rawEvidence.push({ notice, uri, status:200, body, observation:clone(observation) });
    return { id, summary, expected, observed, evidence:[evidence] };
  });
  const record = { ...template, record_id:'79000000-0000-4000-8000-000000000001', operation_id:qa.operation_id, ticket_id:qa.ticket_id, requirements_digest:qa.requirements_digest, assignment:clone(qa.assignment), role:'human_request', kind:'repair_request', from_stage:'Human Review', to_stage:'Rework Queued', payload:{ basis:clone(preflight.target), pr:clone(qa.payload.pr), findings:findings.map(({id,summary,evidence})=>({id,summary,evidence})), qa_report:null }, resume_authorization:null };
  const sampleComment = { id:'9001', author_id:'human', update_author_id:'human', created:'2026-11-15T12:00:00Z', updated:'2026-11-15T12:00:00Z', format:'adf', body:adf(record) };
  const published = clone(preflight);
  published.comment_pages[0].comments.push(sampleComment);published.comment_pages[0].total++;
  published.target = reference(record, sampleComment.id);
  const queued = clone(published);queued.issues[0].stage_id = project.stages['Rework Queued'];
  const base = parse(readFileSync(new URL('../../config/pigboss.example.yaml', import.meta.url), 'utf8'));
  base.defaults = { ...base.defaults, stages:clone(project.stages), accepted_later_stage_ids:clone(project.accepted_later_stage_ids), actors:clone(project.actors), repositories:clone(project.repositories), worker_prefixes:['stream-'], types:{epic:'21',story:'22',bug:'23'} };
  base.projects = [{ id:issue.project_id, key:'EX', board_ids:[], inherit:Object.keys(base.defaults), mappings:{} }];
  const native = value => ({ id:value.id, key:value.key, site:value.site, fields:{project:{id:value.project_id},issuetype:{id:'22',name:'Story'},status:{id:value.stage_id},labels:['pigboard',value.stream],description:preflight.requirements[0].body}, properties:{'pigboard.work-context':clone(value.pointer)} });
  const b = { id:'1001', key:'EX-2', site:issue.site, project_id:issue.project_id, stage_id:'2', stream:issue.stream, pointer:{schema:'pigboard-work-pointer/v1',assignment:{ticket_id:'1001',comment_id:'2101',record_id:'79000000-0000-4000-8000-000000000002',digest:'sha256:'+'b'.repeat(64)}} };
  let request = `For EX-1, record findings F01 and F02 below and queue EX-1 for rework on its existing PR. I explicitly authorize both publication and queueing.\n${findings.map(f=>`${f.id}: ${f.summary}\nExpected: ${f.expected}\nObserved: ${f.observed}\nEvidence: ${f.evidence[0].uri}`).join('\n')}`;
  let outcome = { requestOutcome:'QUEUED', deliveryOutcome:'COMPLETED', append:1, transition:1, reason:'Verified request and direct queue transition; both findings, pointer and B preserved.' };
  if (caseId === 'H02-discussion') { request = 'For EX-1, should we change the empty-state wording? I am asking for discussion only.';outcome={requestOutcome:'DISCUSSION',deliveryOutcome:'NOT_ATTEMPTED',append:0,transition:0,reason:'No request to record and queue.'}; }
  if (caseId === 'H02-authorization') { request = `For EX-1, these are my observations.\n${findings.map(f=>`${f.id}: ${f.summary} Expected: ${f.expected} Evidence: ${f.evidence[0].uri}`).join('\n')}`;outcome={requestOutcome:'NEEDS_INPUT',deliveryOutcome:'NOT_ATTEMPTED',append:0,transition:0,reason:'Explicit permission to record and queue is missing; retain draft.'}; }
  if (caseId === 'H02-scope') { request = 'For EX-1, add a cross-tenant saved-filter sharing feature (F03). I authorize recording this new behavior and queueing EX-1.';outcome={requestOutcome:'INELIGIBLE',deliveryOutcome:'NOT_ATTEMPTED',append:0,transition:0,reason:'Cross-tenant sharing is outside approved requirements; retain for grooming.'}; }
  if (caseId === 'H02-closed') { preflight.pr_receipts[0].state='closed';outcome={requestOutcome:'INELIGIBLE',deliveryOutcome:'NOT_ATTEMPTED',append:0,transition:0,reason:'The PR is closed.'}; }
  if (caseId === 'H02-source') { preflight.pr_receipts[0].source_revision='f'.repeat(40);outcome={requestOutcome:'INELIGIBLE',deliveryOutcome:'NOT_ATTEMPTED',append:0,transition:0,reason:'Current source differs from completed QA.'}; }
  if (caseId === 'H02-missing') { preflight.comment_pages[0].comments=preflight.comment_pages[0].comments.filter(c=>c.id!==preflight.target.comment_id);preflight.comment_pages[0].total--;outcome={requestOutcome:'INELIGIBLE',deliveryOutcome:'NOT_ATTEMPTED',append:0,transition:0,reason:'Exact QA basis is absent from complete supplied pages.'}; }
  if (caseId === 'H02-queued') { Object.assign(preflight,clone(queued));outcome={requestOutcome:'ALREADY_QUEUED',deliveryOutcome:'NOT_ATTEMPTED',append:0,transition:0,reason:'Inspect existing request, preserving both findings; no new append or transition.'}; }
  if (caseId === 'H02-append-unknown') outcome={requestOutcome:'REQUEST_PREPARED',deliveryOutcome:'UNCERTAIN',append:1,transition:0,reason:'Append response lost; publication unknown. Preserve bytes, no retry.'};
  if (caseId === 'H02-transition-unknown') outcome={requestOutcome:'REQUEST_PREPARED',deliveryOutcome:'UNCERTAIN',append:1,transition:1,reason:'Publication verified, transition response lost; queueing unconfirmed. No retry.'};
  if (caseId === 'H02-drift-after-publish') outcome={requestOutcome:'REQUEST_PREPARED',deliveryOutcome:'UNAVAILABLE',append:1,transition:0,reason:'Source changed after verified publication; preserve request without transition.'};
  if (caseId === 'H02-readback') outcome={requestOutcome:'REQUEST_PREPARED',deliveryOutcome:'UNAVAILABLE',append:1,transition:0,reason:'Exact readback actor is wrong; no transition/replacement.'};
  const nativeA = native(preflight.issues[0]);
  const rawPR = p => ({ notice, provider:p.provider,repository:p.repository,number:p.number,state:p.state,source:{revision:p.source_revision},target:{branch:p.target_branch} });
  const transitions = { notice, issue_id:'1000', actor_id:'human', from_status_id:'5', transitions:[{id:'61',to:{id:'6',name:'Rework Queued'},from:{id:'5',name:'Human Review'}}] };
  const observationCard = { notice, native_a:nativeA, comments:clone(preflight.comment_pages), pr:preflight.pr_receipts.map(rawPR), evidence:rawEvidence, capabilities:{actor_id:'human',append_new_comment:true,read_exact_comment:true,transition:true}, transitions };
  const finalRead = clone(observationCard);
  // Static example page: tester rebinds only the actual generated record/body/digest.
  finalRead.comments=clone(published.comment_pages);
  if(caseId==='H02-drift-after-publish') finalRead.pr[0].source.revision='f'.repeat(40);
  const cards = {
    'preflight.json':observationCard,
    'before-append.json':clone(observationCard),
    'append.json':caseId==='H02-append-unknown'?{notice,delivery:'response_lost',comment_id:null,publication:'unknown'}:{notice,id:'9001'},
    // Tester substitutes only the assistant's actual candidate body/UUID/digest.
    'readback.json':{notice,id:'9001',author_id:caseId==='H02-readback'?'stranger':'human',update_author_id:caseId==='H02-readback'?'stranger':'human',created:'2026-11-15T12:00:00Z',updated:'2026-11-15T12:00:00Z',format:'html',body:'BIND_ACTUAL_ASSISTANT_PUBLICATION_BODY'},
    'after-publish.json':finalRead,
    'transition.json':caseId==='H02-transition-unknown'?{notice,delivery:'response_lost',status:'unknown'}:{notice,accepted:true},
    'native-after-transition.json':{notice,native_a:native({...issue,stage_id:'6'})}
  };
  return { notice, caseId, config:base, preflight, published, queued, record, findings, request, summary:'Human requests rework: F01 exact-name search; F02 understandable no-match wording. Expected and observed behavior are retained in the linked evidence.', cards, nativeB:{notice,...b}, sentinels:{notice,pointer:clone(issue.pointer),native_b:clone(b)}, oracle:{notice,caseId,status:'NOT RUN',expected:outcome,invariants:['No B writes','A pointer unchanged','No implementer/admission action','All supplied and prior findings preserved'],humanAcceptance:'PENDING; R1-09-H01/H02 remain human-owned.'} };
}

export async function prepare(runDir, caseId) {
  const data = packet(caseId);
  // A fresh directory prevents an old response or oracle leaking into another run.
  await mkdir(runDir, {mode:0o700});
  await mkdir(path.join(runDir,'assistant'),{mode:0o700});
  await mkdir(path.join(runDir,'tester-cards'),{mode:0o700});
  const source = fileURLToPath(new URL('../../',import.meta.url));
  const revision = execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
  const meta = {notice,caseId,source_revision:revision,exporter_sha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),status:'NOT RUN'};
  const files = {
    'request.txt':data.request+'\n', 'work.yaml':data.preflight.requirements[0].body,
    'facts.yaml':data.preflight.requirements[0].context_body,'config.yaml':stringify(data.config),
    'preflight-chain.json':JSON.stringify(data.preflight,null,2),
    'record.yaml':stringify(data.record),'summary.txt':data.summary+'\n',
    'published-chain.json':JSON.stringify(data.published,null,2),
    'oracle.json':JSON.stringify(data.oracle,null,2),'metadata.json':JSON.stringify(meta,null,2),
    'audit-sentinels.json':JSON.stringify(data.sentinels,null,2),
    'assistant/request.txt':data.request+'\n','assistant/work.yaml':data.preflight.requirements[0].body,
    'assistant/facts.yaml':data.preflight.requirements[0].context_body,'assistant/config.yaml':stringify(data.config),
    'assistant/preflight-chain.json':JSON.stringify(data.preflight,null,2),
    'assistant/native-b.json':JSON.stringify(data.nativeB,null,2),
    'assistant/preflight-observations.json':JSON.stringify(data.cards['preflight.json'],null,2)
  };
  for (const [name,card] of Object.entries(data.cards)) files['tester-cards/'+name]=JSON.stringify(card,null,2);
  for (const [name,text] of Object.entries(files)) await writeFile(path.join(runDir,name),text,{mode:0o600,flag:'wx'});
  return meta;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 5 || process.argv[2] !== 'prepare' || !path.isAbsolute(process.argv[3])) {
    process.stderr.write('Usage: node test/fixtures/human-rework.mjs prepare ABSOLUTE_NEW_RUN_DIR CASE_ID\n');process.exitCode=2;
  } else {
    try { console.log(JSON.stringify(await prepare(process.argv[3],process.argv[4]))); }
    catch { process.stderr.write('Preparation failed: use a fresh writable directory and a listed fixed case. No provider action was attempted.\n');process.exitCode=2; }
  }
}
