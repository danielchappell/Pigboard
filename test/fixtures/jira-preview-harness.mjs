// Test-process HTTPS redirection only. Production has no fixture transport option.
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import tlsTransport from 'node:tls';
import dgram from 'node:dgram';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import canonicalize from 'canonicalize';

const here=path.dirname(fileURLToPath(import.meta.url));
export const fixtureCases=JSON.parse(fs.readFileSync(path.join(here,'jira-preview-cases.json'),'utf8'));
const tls=JSON.parse(fs.readFileSync(path.join(here,'jira-preview-tls.json'),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
// Only errors from the selected check can carry a stage into the CLI.
const failureStages = new WeakMap();
const fixedPrefix='/ex/jira/00000000-0000-0000-0000-000000000001';
const jiraSourcePaths=['lib/jira/read.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json'];
const inventoryPacketPath = 'test/fixtures/jira-inventory-cases.json';
const scopedInventoryPacketPath = 'test/fixtures/jira-scoped-inventory-cases.mjs';
const inventoryModulePath = 'lib/jira/inventory.mjs';
const inventorySelectors = new Map([
 ['R1-34-H01', ['complete-domain', 'unrelated-history', 'retained-incomplete']],
 ['R1-34-H02', [
  'seed-page-missing', 'child-page-missing', 'label-page-missing', 'token-repeat',
  'token-missing', 'search-duplicate', 'fresh-membership-change', 'malformed-seed',
  'malformed-record', 'reference-missing', 'reference-digest-change', 'reference-cycle',
  'epic-limit', 'stream-limit', 'page-size', 'closure-target-limit'
 ]],
 ['R1-34-H03', [
  'two-projects', 'cross-project-prerequisite', 'renamed-alias', 'old-ownership',
  'denied-project', 'isolated-conflict', 'out-of-scope-reference'
 ]],
 ['R1-34-H04', ['guide-and-install', 'missing-retained-input', 'no-effects']]
]);

const receiptModulePath='lib/jira/receipts.mjs';
const positiveReceipts='PGB-163-H01',negativeReceipts='PGB-163-H02';
const receiptCase=caseId=>[positiveReceipts,negativeReceipts].includes(caseId);
const sha=value=>'sha256:'+digest(canonicalize(value));
const issueFields='?fields=project,issuetype,status,parent,labels,description';
const jiraFields=issueFields.split('=')[1].split(',');
const searchPath='/rest/api/3/search/jql';
const issuePath=id=>'/rest/api/3/issue/'+id;
const adf=text=>({version:1,type:'doc',content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text}]}]});
const metadataFields=['author_id','update_author_id','created','updated'];
const matchReference=(ticket_id,comment_id,record)=>({ticket_id,comment_id,record_id:record.record_id,digest:sha(record)});
const changePath=(issueId,startAt)=>issuePath(issueId)+'/changelog?startAt='+startAt+'&maxResults=4';

function nativeReceiptFixture(caseId,variant,root,{ownershipConflict=false,receiptComparison=null}={}){
 const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
 const packet=read('test/fixtures/jira-preview-cases.json'),native=packet.native_receipts;
 const oracle=structuredClone(caseId===positiveReceipts?native.positive[variant]:native.negative[variant]);
 if(!oracle)throw Error('Use a prescribed case and variant.');
 const competingEpic=ownershipConflict||receiptComparison==='ownership-conflict';
 const genericForeignPointer=receiptComparison==='generic-foreign-pointer';
 const originalPublication=receiptComparison==='reconciliation-unrelated-pointer';
 const scopedForeignPointer=originalPublication||['scoped-pointer','ownership-conflict'].includes(receiptComparison);
 if(competingEpic||genericForeignPointer){
  assert.equal(variant,'current-qa');
  Object.assign(oracle,{status:'incomplete',code:'CLOSURE_INCOMPLETE'});
 }else if(originalPublication){
  assert.equal(variant,'original-admission');
 }else if(receiptComparison){
  assert.equal(variant,'current-qa-outstanding-request');
  assert(['scoped-pointer','target-denied'].includes(receiptComparison));
  if(receiptComparison==='target-denied')Object.assign(oracle,{status:'unavailable',code:'READ_DENIED_OR_MISSING'});
 }
 const baseId=oracle.base??'S06';
 const choices=baseId.startsWith('H02-')?read('test/fixtures/manager-repairs.json').cases:
  Object.values(read('test/fixtures/manager-candidates.json').ordinary_recorded).flatMap(v=>Array.isArray(v)?v:[v]);
 const {config,snapshot}=structuredClone(choices.find(c=>c?.id===baseId));
 const envelope=JSON.parse(snapshot.completion_receipts[0]);
 const configSettings=packet.variants[0].config.jira;
 config.jira.connection={...configSettings.connection};
 config.jira.read_bounds={...configSettings.read_bounds,page_size:4,max_pages:64,max_requests:128,max_epics:4,max_streams:4,max_known_issues:16,max_comments:128,request_timeout_ms:750,scan_timeout_ms:15000};
 config.manager=structuredClone(native.manager);
 const binding={site:config.jira.site,configuration_digest:sha(config),package_revision:native.package_revision,
  installation_id:config.manager.installation_id,domain_id:config.manager.domain_id};
 const state={retained_members:snapshot.retained_members,pending_intents:[],retained_complete:true,retained:[]};
 const comments=envelope.comment_pages.flatMap(page=>page.comments.map(({format,body,...c})=>{
  const wire=JSON.parse(body);
  const record=JSON.parse(wire.content[0].content[0].text);
  return {ticket_id:page.ticket_id,comment:c,wire,record};
 }));
 const source=comments.find(row=>row.comment.id===envelope.target.comment_id);
 if(variant==='current-qa-outstanding-request'){
  const request={
   schema:'pigboard-handoff/v1',record_id:'00000000-0000-4000-8000-000000000099',operation_id:source.record.operation_id,
   ticket_id:source.ticket_id,requirements_digest:source.record.requirements_digest,assignment:source.record.assignment,
   role:'human_request',kind:'repair_request',from_stage:'Human Review',to_stage:'Rework Queued',resume_authorization:null,
   payload:{basis:envelope.target,pr:source.record.payload.pr,findings:[{id:'F1',summary:'Correct the verified wording.',
     evidence:[{label:'fixture-finding',uri:'https://evidence.example.invalid/native-receipts',digest:null}]}],qa_report:null}
  };
  comments.push({ticket_id:source.ticket_id,comment:{...source.comment,id:'2099',author_id:'human',update_author_id:'human'},wire:adf(JSON.stringify(request)),record:request});
 }
 const operation=oracle.read??'admit_ready',reconcile=!operation.startsWith('recorded-');
 let target=envelope.target,mode=null,publicationDigest=null,original=null,historyItems=[];
 if(reconcile){
  const row=operation==='queue_repair'?comments.find(c=>c.record.kind==='stack_update_request'):
   comments.find(c=>c.record.kind==='admission'&&c.comment.id===snapshot.issues.find(i=>i.id===c.ticket_id)?.pointer?.assignment.comment_id);
  const publication=matchReference(row.ticket_id,row.comment.id,row.record);
  const nativeIssue=snapshot.issues.find(i=>i.id===row.ticket_id);
  const assignment=nativeIssue.pointer.assignment;
  mode=operation==='queue_repair'?'preserved':'published';
  // This native spelling denotes the same instant as the original capture's UTC spelling.
  row.comment.created=native.raw_timestamp;row.comment.updated=native.raw_timestamp;
  state.retained=[{...publication,site:binding.site,...Object.fromEntries(metadataFields.map(k=>[k,row.comment[k]]))}];
  if(variant==='missing-prior-tuple')state.retained=[];
  if(variant==='edited-metadata')row.comment.updated='2026-11-01T13:34:57.123+01:00';
  const created_at='2026-11-01T12:34:55.123Z';
  // Wrong operation control retains a valid rework admission but claims its
  // original operation was a new-work admission under the same exact UUID.
  const claimedOp=variant==='wrong-operation'?'admit_ready':operation;
  const source_status_id=claimedOp==='queue_repair'?'5':claimedOp==='admit_rework'?'6':'1';
  const target_status_id=claimedOp==='queue_repair'?'6':'2';
  const attempt={schema_version:1,installation_id:binding.installation_id,domain_id:binding.domain_id,
   record_id:'attempt:'+publication.record_id,site:binding.site,project_id:nativeIssue.project_id,label:'stream-1',
   attempt_id:publication.record_id,ticket_id:row.ticket_id,epic_id:nativeIssue.parent_id,issue_key:nativeIssue.key,
   operation:claimedOp,source_status_id,target_status_id,configuration_digest:binding.configuration_digest,created_at,
   cause:operation==='queue_repair'?row.record.payload.roots:claimedOp==='admit_rework'?row.record.payload.requests:[]};
  const refTuple=r=>[r.ticket_id,r.comment_id,r.record_id,r.digest];
  publicationDigest=sha({comments:[[refTuple(publication),row.comment.author_id,row.comment.update_author_id,native.utc_timestamp,native.utc_timestamp]],pointer:[mode,refTuple(assignment)]});
  const transition_id=operation==='queue_repair'?'32':'31';
  const requestDigest=sha({version:1,identity:attempt,method:'POST',route:'issue_transitions',transition_id,
   body:{transition:{id:transition_id}},publication_digest:publicationDigest});
  state.attempt={...attempt,kind:'attempt',revision:2,updated_at:native.utc_timestamp,publication:[publication],outcome:'pending',evidence:null,
   extensions:{pb_capture_version:1,pb_capture_transition_id:transition_id,pb_capture_request_digest:requestDigest,
    pb_capture_publication_digest:publicationDigest,pb_capture_package_revision:binding.package_revision,
    pb_capture_invocation_id:'00000000-0000-4000-8000-000000000111',pb_capture_prepared_at:native.utc_timestamp,
    pb_capture_status:204,pb_capture_received_at:native.utc_timestamp,pb_capture_provider_request_id:'mock-request'}};
  state.pending_intents=[{project_id:attempt.project_id,label:attempt.label,ticket_id:attempt.ticket_id,attempt_id:attempt.attempt_id}];
  target=publication;
  if(variant==='wrong-assignment'){
   const prior=comments.find(c=>c.comment.id==='2019');
   const earlier=matchReference(prior.ticket_id,prior.comment.id,prior.record);
   assert.notDeepEqual(earlier,assignment);
   nativeIssue.pointer.assignment=earlier;
  }
  if(operation==='queue_repair'){
   original={configInput:JSON.stringify(config),binding:{...binding}};
   config.manager.controls.maintenance=true;binding.configuration_digest=sha(config);
  }
 }
 const limit={pages:48,requests:96,milliseconds:12000};
 const selector=reconcile?{attempt:structuredClone(state.attempt),publicationReferences:[{...target}],limits:limit}:{purpose:operation,target};
 if(variant==='wrong-uuid')selector.publicationReferences[0].record_id='00000000-0000-4000-8000-000000000099';
 if(variant==='foreign-destination')binding.site='https://foreign.example.invalid';
 if(variant==='shared-budget-exhausted')limit.pages=8;
 const commentWire=row=>({id:row.comment.id,author:{accountId:row.comment.author_id},updateAuthor:{accountId:row.comment.update_author_id},
  created:row.comment.created,updated:row.comment.updated,body:row.wire});
 const wireIssue=i=>({id:i.id,key:i.key,fields:{project:{id:i.project_id},issuetype:{id:i.type_id},status:{id:i.status_id},
  parent:i.parent_id?{id:i.parent_id}:null,labels:i.labels,description:i.body?adf(i.body):null}});
 const script=[],push=(path,body,extra={})=>script.push({path,body,status:200,...extra});
 const search=(predicate,issues)=>push(searchPath,{isLast:true,issues:issues.map(wireIssue)},
  {method:'POST',request_body:{jql:'project = "100" AND '+predicate+' ORDER BY id ASC',maxResults:4,fields:jiraFields}});
 const rows=snapshot.issues,rootIssue=rows.find(i=>i.id==='900'),scoped=rows.filter(i=>i.parent_id===rootIssue.id);
 const roots=[rootIssue],nativeIds=baseId.startsWith('H02-')?['1000','1001','1002','900','1003']:['1000','900','1100'];
 if(competingEpic){
  const competing={...rootIssue,id:'901',key:'EX-91'};
  rows.push(competing);roots.push(competing);nativeIds.push(competing.id);
 }
 if(scopedForeignPointer||genericForeignPointer){
  let parent=rootIssue;
  if(scopedForeignPointer){
   const epicWork=JSON.parse(rootIssue.body);
   epicWork.workstreams=[{label:'stream-2',story_order:['EX-1200']}];
   parent={...rootIssue,id:competingEpic?'902':'901',key:competingEpic?'EX-92':'EX-91',body:JSON.stringify(epicWork)};
   roots.push(parent);rows.push(parent);nativeIds.push(parent.id);
  }
  const unrelatedIssue={...rows.find(i=>i.id==='1100'),id:'1200',key:'EX-1200',parent_id:parent.id,
   labels:scopedForeignPointer?['stream-2']:[],body:null,pointer:{schema:'pigboard-work-pointer/v1'}};
  rows.push(unrelatedIssue);nativeIds.push(unrelatedIssue.id);
 }
 search('labels = "pigboard"',roots);
 for(const id of nativeIds){
  const native=rows.find(i=>i.id===id),path=issuePath(id),own=comments.filter(c=>c.ticket_id===id).map(commentWire);
  push(path+issueFields,wireIssue(native));
  push(path+'/properties',{keys:native.pointer?[{key:'pigboard.work-context',self:'https://foreign.example.invalid/property'}]:[]});
  if(native.pointer){
   if((scopedForeignPointer||genericForeignPointer)&&id==='1200')push(path+'/properties/pigboard.work-context',{},{status:404});
   else push(path+'/properties/pigboard.work-context',{key:'pigboard.work-context',value:native.pointer});
  }
  for(let startAt=0;startAt<Math.max(1,own.length);startAt+=4)push(path+'/comment?startAt='+startAt+'&maxResults=4&orderBy=created',
   {startAt,maxResults:4,total:own.length,comments:own.slice(startAt,startAt+4)});
  if(roots.some(root=>root.id===id))search('parent = "'+id+'"',rows.filter(i=>i.parent_id===id));
 }
 search('labels = "stream-1"',scoped);
 if(scopedForeignPointer)search('labels = "stream-2"',rows.filter(i=>i.id==='1200'));
 const independentExact={
  S06:operation==='recorded-completion'?['2001','2004','2002','2003',...(variant==='current-qa-outstanding-request'?['2099']:[])]:
   ['2001','2002','2003','2004'],
  'repair-independent-complete':variant==='wrong-operation'?['2024','2019','2020','2021','2022','2023','2025','2026','2027']:['2024','2023','2019','2020','2021','2022','2025','2026','2027'],
  'H02-03-u1-queued-r2-arrived':['81014','81005','81009','81018','81013','81001','81002','81003','81004','81015','81016','81017','81019','81006','81007','81008','81010','81011','81012']
 };
 for(const id of independentExact[baseId]){
  const row=comments.find(c=>c.comment.id===id);
  const path=issuePath(row.ticket_id)+'/comment/'+id;
  if(receiptComparison==='target-denied'&&id===target.comment_id)push(path,{},{status:403});
  else push(path,commentWire(row));
 }
 const requiredPages=script.filter(step=>step.method==='POST'||step.path.includes('orderBy=created')).length;
 const history_raw='2026-11-01T13:35:56.100+01:00',actor_id='native-actor',issue_id=target.ticket_id;
 const standard={startAt:0,maxResults:4,total:2,isLast:false,self:'https://foreign.example.invalid/current',
  nextPage:'https://foreign.example.invalid/next',values:[{id:'9501',author:{accountId:'description-editor'},created:history_raw,items:[{field:'description',fieldtype:'jira',fieldId:'description'}]}]};
 const historyPage={startAt:1,maxResults:4,total:2,isLast:true,values:[{id:'9502',author:{accountId:actor_id},created:history_raw,
  items:[{field:'summary',fieldtype:'jira',fieldId:'summary'},{field:'status',fieldtype:'jira',fieldId:'status',from:state.attempt?.source_status_id,to:state.attempt?.target_status_id}]}]};
 if(reconcile){
  if(['foreign-destination','wrong-uuid','secret-bearing-error'].includes(variant))script.length=0;
  else if(variant==='shared-budget-exhausted')limit.pages=requiredPages;
  else if(oracle.history==='empty')push(changePath(issue_id,0),{startAt:0,maxResults:4,total:0,isLast:true,values:[]});
  else if(['403','404','redirect','timeout','unsupported-changelog-shape'].includes(variant)){
   const native={code:'ERROR-CANARY '+packet.token};
   if(variant==='timeout')push(changePath(issue_id,0),standard,{header_delay_ms:1100});
   else push(changePath(issue_id,0),variant==='unsupported-changelog-shape'?{history:[]}:native,
    {status:variant==='redirect'?302:Number(variant)||200});
  }else{
   const missing=variant==='missing-page';
   push(changePath(issue_id,0),missing?{...standard,values:historyPage.values}:standard);
   push(changePath(issue_id,1),missing?{...historyPage,values:[]}:historyPage);
   historyItems=[{issue_id,history_id:'9502',item_index:1,actor_id,
    from_status_id:state.attempt.source_status_id,to_status_id:state.attempt.target_status_id,created:history_raw}];
  }
 }
 return {case:caseId,variant,config,binding,state,original,request:selector,script,oracle,target,mode,publicationDigest,historyItems,reconcile,
  resolver:variant==='secret-bearing-error'?'reject':null,
  resolverExpected:['foreign-destination','wrong-uuid'].includes(variant)?0:1,
  prerequisite_hashes:Object.fromEntries(['manager-candidates.json','manager-repairs.json'].map(f=>[f,digest(fs.readFileSync(path.join(root,'test/fixtures',f)))]))};
}

function inventorySelection(caseId, variant) {
 if (!inventorySelectors.get(caseId)?.includes(variant)) return null;
 const guide = caseId === 'R1-34-H04' && variant === 'guide-and-install';
 return {
  case: caseId,
  variant,
  fixtureCase: guide ? 'R1-45-H01' : 'R1-45-' + caseId.split('-').at(-1),
  fixtureVariant: guide ? 'complete-domain' : variant
 };
}

async function withRequiredSetup(action) {
 try {
  return await action();
 } catch (error) {
  if (!['ENOENT', 'ERR_MODULE_NOT_FOUND'].includes(error?.code)) throw error;
  throw Object.assign(new Error('Required fixture material is missing.'), {code:'FIXTURE_SETUP_MISSING'});
 }
}

async function readInventoryFixture(selection, root) {
 const packet = await withRequiredSetup(() => fsp.readFile(path.join(root, inventoryPacketPath)));
 const matches = JSON.parse(packet).variants.filter(row =>
  row.case === selection.fixtureCase && row.variant === selection.fixtureVariant
 );
 assert.equal(matches.length, 1);
 const overlayPath = path.join(root, scopedInventoryPacketPath);
 const overlay = await withRequiredSetup(() => fsp.readFile(overlayPath));
 const { applyScopedInventoryCase } = await withRequiredSetup(() => import(pathToFileURL(overlayPath).href));
 return { authored: applyScopedInventoryCase(matches[0]), packetHash: digest(packet), overlayHash: digest(overlay) };
}

// These tuples come from the retained selector, Jira search/issue rows, the Epic
// declaration and story prerequisites, and the one assignment pointer. Native
// acquisition adds project IDs and retains repeated evidence when both stages agree.
const completeDomainProvenance = [
 // ticket, source, source ticket, project, label
 ['103', 'retained', null, '10001', 'AI-Daniel-1'],
 ['100', 'retained', '103', '10001', 'AI-Daniel-1'],
 ['100', 'seed', null, null, null],
 ['100', 'retained', '103', '10001', 'AI-Daniel-1'],
 ['101', 'child', '100', null, null],
 ['103', 'declared', '100', '10001', 'AI-Daniel-1'],
 ['101', 'child', '100', '10001', null],
 ['100', 'prerequisite', '101', null, null],
 ['104', 'prerequisite', '101', null, null],
 ['103', 'retained', null, '10001', 'AI-Daniel-1'],
 ['105', 'typed_reference', '103', null, null],
 ['104', 'prerequisite', '101', '10002', null],
 ['105', 'typed_reference', '103', '10001', null],
 ['101', 'label', null, '10001', 'AI-Daniel-1'],
 ['102', 'label', null, '10001', 'AI-Daniel-1'],
 ['103', 'label', null, '10001', 'AI-Daniel-1'],
 ['102', 'label', null, '10001', 'AI-Daniel-1']
];

function compareProvenance(provenance) {
 const fields = ['ticket_id', 'source', 'source_ticket_id', 'project_id', 'label'];
 const canonical = tuples => tuples.map(tuple => JSON.stringify(tuple)).sort();
 const actual = canonical(provenance.map(row => {
  assert(Object.keys(row).length === fields.length && fields.every(field => Object.hasOwn(row, field)),
   'Private provenance fields differ from the contract.');
  return fields.map(field => row[field]);
 }));
 const expected = canonical(completeDomainProvenance);
 assert(JSON.stringify(actual) === JSON.stringify(expected), 'Private provenance differs from the literal oracle.');
 return {
  algorithm:'sha256',
  actual_sha256:digest(JSON.stringify(actual)),
  expected_sha256:digest(JSON.stringify(expected)),
  matched:true
 };
}

function mountHistory(fixture, hasHistory) {
 const issues = fixture.unrelated_issues ?? [];
 const comments = fixture.unrelated_comments ?? [];
 assert.equal(issues.length, hasHistory ? 65 : 0);
 assert.equal(comments.length, hasHistory ? 512 : 0);
 assert.equal(new Set(issues.map(issue => issue.id)).size, issues.length);
 assert.equal(new Set(comments.map(comment => comment.id)).size, comments.length);

 const rows = issues.map(issue => ({issue, comments: []}));
 for (const [index, comment] of comments.entries()) rows[index % rows.length].comments.push(comment);
 const byName = new Map(rows.flatMap(row => [[row.issue.id, row], [row.issue.key, row]]));
 assert.equal(byName.size, 2 * issues.length);

 return {
  rows,
  issueCount: issues.length,
  commentCount: comments.length,
  route(operation) {
   const match = /^\/rest\/api\/3\/issue\/([^/?]+)(?:\/([^?]+))?(?:\?(.*))?$/.exec(operation);
   const row = match && byName.get(match[1]);
   if (!row) return null;
   const [, , resource, query] = match;
   if (resource === undefined) return {body: row.issue};
   if (resource === 'properties') return {body: {keys: []}};
   if (resource === 'comment') {
    const params = new URLSearchParams(query);
    const startAt = Number(params.get('startAt') ?? 0);
    const maxResults = Number(params.get('maxResults') ?? row.comments.length);
    return {body: {
     startAt, maxResults, total: row.comments.length,
     comments: row.comments.slice(startAt, startAt + maxResults)
    }};
   }
   const comment = row.comments.find(comment => resource === 'comment/' + comment.id);
   return {body: comment ?? null};
  }
 };
}
function oracleCheck(report,oracle,trace){assert.equal(report.status,oracle.status);if(oracle.code)assert(report.diagnostics.some(d=>d.code===oracle.code),JSON.stringify(report));else assert.deepEqual(report.diagnostics,[]);assert.equal(report.counters.requests_attempted,oracle.calls);assert.equal(trace.length,oracle.calls);if(oracle.trace)assert.deepEqual(trace,oracle.trace);if(oracle.counters)for(const [k,value]of Object.entries(oracle.counters))assert.equal(report.counters[k],value,k);if(oracle.diagnostic)assert(report.diagnostics.some(d=>Object.entries(oracle.diagnostic).every(([k,value])=>d[k]===value)));if(oracle.cleanup_resolver)assert.equal(report.cleanup.resolver,oracle.cleanup_resolver);assert.equal(report.inspection_scope,oracle.inspection_scope??'requested_issues');assert.equal(report.domain_complete,oracle.domain_complete??false);if(oracle.scopes)assert.deepEqual(report.scopes,oracle.scopes);if(Object.hasOwn(oracle,'retained_complete'))assert.equal(report.retained_complete,oracle.retained_complete);assert.equal(report.admission,'not_evaluated');assert.equal(report.receipt_proof,'not_evaluated');}

async function runtimeSources(root, inventory=false){
 const manifest=JSON.parse(await fsp.readFile(path.join(root,'config/skill-bundle.json'),'utf8'));
 return [...new Set([...manifest.validatorPayload.sources,...jiraSourcePaths,...(inventory?[inventoryModulePath,inventoryPacketPath]:[])])];
}
async function runtimeSnapshot(root, missing = [], inventory=false) {
 const entries=[];
 for(const relative of await runtimeSources(root,inventory)){
  try{assert((await fsp.lstat(path.join(root,relative))).isFile());entries.push([relative,digest(await fsp.readFile(path.join(root,relative)))]);}
  catch(error){if(!missing.includes(relative)||error.code!=='ENOENT')throw error;entries.push([relative,null]);}
 }
 async function walk(relative){for(const entry of await fsp.readdir(path.join(root,relative),{withFileTypes:true})){const file=relative+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(entry.isFile())entries.push([file,digest(await fsp.readFile(path.join(root,file)))]);else assert(entry.isSymbolicLink());}}
 await walk('node_modules');return Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b)));
}
const inputSnapshot=v=>Object.fromEntries(['config','request','script'].map(k=>[k,digest(JSON.stringify(v[k]))]));

// Real TLS traffic still runs asynchronously. Only the fixture's scripted
// resolver and response delays consume the reader's scan budget.
function createScanClock() {
 let now = 0;
 let pointerAbort = null;
 const timers = new Map();
 return {
  install(restore) {
   const replace = (target, name, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    restore.push(() => {
     if (descriptor) Object.defineProperty(target, name, descriptor);
     else delete target[name];
    });
    Object.defineProperty(target, name, {
     configurable: true, writable: true, enumerable: descriptor?.enumerable ?? false, value
    });
   };
   restore.push(() => timers.clear());
   replace(performance, 'now', () => now);
   replace(globalThis, 'setTimeout', (callback, delay, ...args) => {
    const handle = {};
    timers.set(handle, {callback, args, delay, armedAt: now, dueAt: now + delay});
    return handle;
   });
   replace(globalThis, 'clearTimeout', handle => { timers.delete(handle); });
  },
  advance(delay, pointerClient) {
   const target = now + delay;
   while (timers.size) {
    const [handle, timer] = [...timers].reduce((first, next) =>
     next[1].dueAt < first[1].dueAt ? next : first);
    if (timer.dueAt > target) break;
    timers.delete(handle);
    now = timer.dueAt;
    const socket = pointerClient?.socket;
    const livePointer = socket?.authorized && !socket.destroyed && !pointerClient.destroyed;
    timer.callback(...timer.args);
    if (livePointer && pointerClient.destroyed && socket.destroyed) {
     pointerAbort = {armed_at_ms: timer.armedAt, delay_ms: timer.delay, fired_at_ms: now};
    }
   }
   now = target;
  },
  get pointerAbort() { return pointerAbort; }
 };
}

export async function runFixture(caseId,variant,runtime,{control=false,privateProjection=false,authoredFixture=null,repeatReceipt=false,ownershipConflict=false,receiptComparison=null}={}) {
 const selection = inventorySelection(caseId, variant);
 if (caseId.startsWith('R1-34-') && !selection) throw Error('Use a prescribed case and variant.');
 const root = path.resolve(runtime);
 const selected = selection ? await readInventoryFixture(selection, root) : null;
 return executeFixture(caseId, variant, root, {
  control, privateProjection, authoredFixture, selection, selected, repeatReceipt, ownershipConflict, receiptComparison
 });
}

async function executeFixture(caseId, variant, root, {control=false,privateProjection=false,authoredFixture=null,selection,selected,repeatReceipt=false,ownershipConflict=false,receiptComparison=null}={}) {
 const lateResolverCase = caseId === 'R1-33-H02' && variant === 'resolver-late';
 const recordStage = (error, stage) => {
  if (lateResolverCase && error instanceof Error) failureStages.set(error, stage);
  return error;
 };
 const verify = (stage, check) => {
  if (!lateResolverCase) return check();
  try { return check(); }
  catch (error) { throw recordStage(error, stage); }
 };
 const receipt=receiptCase(caseId),guarded=!!selection||receipt;
 const inventory = guarded || caseId.startsWith('R1-45-');
 const packetPath = selection ? path.join(root, inventoryPacketPath) : path.join(here,'jira-inventory-cases.json');
 const authored = selected?.authored ?? authoredFixture ??
  (receipt?nativeReceiptFixture(caseId,variant,root,{ownershipConflict,receiptComparison}):(inventory ? JSON.parse(fs.readFileSync(packetPath,'utf8')) : fixtureCases).variants.find(v => v.case === caseId && v.variant === variant));
 if (authoredFixture) assert(authoredFixture.case === caseId && authoredFixture.variant === variant);
 if (!authored) throw Error('Use a prescribed case and variant.');
 const v=structuredClone(authored),trace=[],serverTrace=[],seedPages=[];let disposable=null;
 const receiptCalls=v.script.length;
 if(repeatReceipt){
  assert.equal(variant,'original-admission');
  v.script=[...v.script,...v.script];
 }
 if(control){assert(v.control);if(v.control.bound)v.config.jira.read_bounds[v.control.bound]=v.control.value;if(v.control.immediate){delete v.resolver_delay_ms;for(const step of v.script){delete step.header_delay_ms;delete step.body_delay_ms;}}v.oracle=v.control.oracle;if(v.control.script)v.script=v.control.script;}
 for(const entry of fixtureCases.variants)for(const [i,step]of entry.script.entries())if(Object.hasOwn(step,'wire_prefix')){if(entry.variant==='total-byte-limit'){assert.equal(i,0);assert.equal(step.wire_prefix,' '.repeat(256));}else{assert.equal(entry.case,'R1-42-H02');assert(['exact-wire-stop','exact-two-issue-control'].includes(entry.variant));assert.equal(i,3);assert.equal(step.wire_prefix,' '.repeat(600));}}
 if(privateProjection){assert(v.private_projection);if(v.private_projection.omit_wire_prefix)delete v.script[0].wire_prefix;v.config.jira.read_bounds.max_total_response_bytes=v.private_projection.bound;v.oracle=v.private_projection.oracle;}
 const before={cases:digest(fs.readFileSync(path.join(here,'jira-preview-cases.json'))),tls:digest(fs.readFileSync(path.join(here,'jira-preview-tls.json'))),...(inventory&&!receipt?{inventory:selected?.packetHash??digest(fs.readFileSync(packetPath))}:{}),...(receipt?{receipt_dependencies:v.prerequisite_hashes}:{})};
 if (selection) before.scoped_inventory = selected.overlayHash;
 const inputBefore=inputSnapshot(v);let moduleRoot=root,missing=[];
 if(variant==='damaged-copy'){
  const original=await runtimeSnapshot(root),sources=await runtimeSources(root);
  disposable=await fsp.mkdtemp(path.join(os.tmpdir(),'pigboard-jira-damaged-'));
  for(const relative of sources){const target=path.join(disposable,relative);await fsp.mkdir(path.dirname(target),{recursive:true});await fsp.cp(path.join(root,relative),target);}
  await fsp.cp(path.join(root,'node_modules'),path.join(disposable,'node_modules'),{recursive:true});assert.deepEqual(await runtimeSnapshot(disposable),original);
  await fsp.rm(path.join(disposable,'lib/config/projects.mjs'));moduleRoot=disposable;missing=['lib/config/projects.mjs'];
 }
 const snapshot = () => runtimeSnapshot(moduleRoot, missing, inventory&&!receipt);
 const runtimeBefore = selection ? await withRequiredSetup(snapshot) : await snapshot();
 let inspect;
 if (!guarded) try{if(inventory)({inspectJiraInventory:inspect}=await import(pathToFileURL(path.join(moduleRoot,inventoryModulePath)).href));else({inspectJiraIssues:inspect}=await import(pathToFileURL(path.join(moduleRoot,'lib/jira/read.mjs')).href));}
 catch{
  const runtimeAfter=await runtimeSnapshot(moduleRoot,missing,inventory),inputAfter=inputSnapshot(v);assert.deepEqual(runtimeAfter,runtimeBefore);assert.deepEqual(inputAfter,inputBefore);
  if(disposable)await fsp.rm(disposable,{recursive:true,force:true});
  const report={status:'setup_failed',inspection_scope:'requested_issues',diagnostics:[{code:'SETUP_MISSING',message:'Prepare the complete copied validator; no source fallback or dependency repair was attempted.'}],counters:{requests_attempted:0},domain_complete:false,admission:'not_evaluated',receipt_proof:'not_evaluated'};oracleCheck(report,v.oracle,trace);
  return {report,trace,server_trace:[],fixture_hashes:before,input_hashes:{before:inputBefore,after:inputAfter},runtime_hashes:{before:runtimeBefore,after:runtimeAfter},effects:0,resolver_calls:0,cleanup_complete:true,oracle_matched:true};
 }
 if(disposable){await fsp.rm(disposable,{recursive:true,force:true});throw Error('Damaged copy unexpectedly imported.');}
 const history = selection ? mountHistory(v, variant === 'unrelated-history') : null;
 const snapshotServer = () => digest(JSON.stringify({script:v.script, history:history.rows}));
 const serverBefore = history ? snapshotServer() : null;
 const scanClock = caseId === 'R1-33-H03' && variant === 'scan-time-limit' ? createScanClock() : null;
 const pointerPath = scanClock ? v.oracle.trace[1].path : null;
 let pointerClient, scanTimerError;
 let historyAccesses = 0;
 const sockets=new Set(),timers=new Set();let scriptIndex=0,serverError=null,redirectRequests=0;
 const redirect=https.createServer({key:tls.key,cert:tls.cert},(req,res)=>{redirectRequests++;res.end('{}');});
 await new Promise(resolve=>redirect.listen(0,'127.0.0.1',resolve));
 const server=https.createServer({key:v.tls==='future-certificate'?tls.future.key:tls.key,cert:v.tls==='future-certificate'?tls.future.cert:tls.cert},async(req,res)=>{
  let requestBody='';for await(const chunk of req)requestBody+=chunk.toString('utf8');
  serverTrace.push({method:req.method,path:req.url});
  const historical = history?.route(req.url);
  if (historical) {
   historyAccesses++;
   serverError = 'Unexpected unrelated history read.';
   const allowed = req.method === 'GET' && req.headers.authorization === 'Bearer ' + fixtureCases.token;
   res.writeHead(allowed ? (historical.body === null ? 404 : 200) : 500, {'content-type':'application/json'});
   res.end(JSON.stringify(allowed ? historical.body : {}));
   return;
  }
  const step=v.script[scriptIndex++];
  if(!step||step.path!==req.url||req.method!==(step.method??'GET')||(step.request_body&&requestBody!==JSON.stringify(step.request_body))||req.headers.authorization!=='Bearer '+fixtureCases.token){serverError='Unexpected fixture operation.';res.writeHead(500);res.end('{}');return;}
  if (v.oracle.seed_pages && req.method === 'POST' && req.url === '/rest/api/3/search/jql') {
   const submitted = JSON.parse(requestBody);
   if (submitted.jql === 'project = "10001" AND labels = "pigboard" ORDER BY id ASC') {
    seedPages.push({
     request_max_results: submitted.maxResults, request_token: submitted.nextPageToken ?? null,
     response_status: step.status, issue_ids: step.body.issues?.map(row => row.id) ?? [],
     is_last: step.body.isLast ?? null, next_token: step.body.nextPageToken ?? null
    });
   }
  }
  const later = (fn, delay, client) => {
   if (scanClock && delay) {
    try { scanClock.advance(delay, client); }
    catch (error) { scanTimerError ??= error; }
    if (!client?.destroyed) fn();
   } else if (delay) {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, delay);
    timers.add(timer);
   } else fn();
  };
  later(()=>{if(res.destroyed)return;res.writeHead(step.status,{'content-type':'application/json',...(step.encoding?{'content-encoding':step.encoding}:{}),...(step.status===302?{location:`https://localhost:${redirect.address().port}/leak`}:{})});if(step.body_delay_ms)res.flushHeaders();later(()=>{if(!res.destroyed)res.end((step.wire_prefix??'')+JSON.stringify(step.body));},step.body_delay_ms);},step.header_delay_ms,req.url === pointerPath ? pointerClient : undefined);
 });server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));if(v.tls==='connection-reset-control')socket.destroy();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const originalRequest=https.request,restore=[];let effects=0,resolverCalls=0,resolverTimer=null,lateResolve=null,lateAck=null,lateSignal=null,lateDelivered=0,lateSettled=0,lateEvidence=null,mutations=0,getterCalls=0,tlsObservation=null;
 let fixtureConnectPort = null;
 const callerRequest=structuredClone(v.request);
 const callerRequestBefore = selection ? digest(JSON.stringify(callerRequest)) : null;
 const deny=()=>{effects++;throw Error('Disallowed fixture effect.');};
 const replace = (api, name, replacement) => {
  const original = api[name];
  restore.push(() => { api[name] = original; });
  api[name] = replacement;
 };
 const isFixtureConnect = options => fixtureConnectPort !== null &&
  options?.host === '127.0.0.1' && Number(options.port) === fixtureConnectPort && !options.path;
 const redirectRequest=(url,options,callback)=>{
  let operation;
  try {
   assert.equal(url.origin,'https://api.atlassian.com');assert(url.pathname.startsWith(fixedPrefix+'/rest/api/3/issue/')||(inventory&&url.pathname===fixedPrefix+'/rest/api/3/search/jql'));assert.equal(options.method,v.script[trace.length]?.method??'GET');assert.equal(options.agent,false);assert.equal(options.rejectUnauthorized,true);assert.equal(options.headers['Accept-Encoding'],'identity');assert.equal(options.headers.Authorization,'Bearer '+fixtureCases.token);
   operation=url.pathname.slice(fixedPrefix.length)+url.search;
   // Known extra history is addressable only on loopback. The server counts
   // any access before processing the script and the literal oracle fails it.
   if (!history?.route(operation)) assert.equal(operation,v.script[trace.length]?.path??(guarded?null:operation));
  } catch (error) {
   if (guarded) effects++;
   throw error;
  }
  trace.push({method:options.method,path:operation});
  const local=new URL('https://localhost:'+server.address().port+operation);
  const tlsOptions = guarded ? {
   method: options.method, agent: false, rejectUnauthorized: true, headers: options.headers
  } : options;
  let client;
  // Node's one-use HTTPS agent opens its TLS and TCP sockets synchronously.
  // Only that audited request can reach the loopback fixture through these APIs.
  fixtureConnectPort = guarded ? server.address().port : null;
  try {
   client=originalRequest(local,{...tlsOptions,hostname:'127.0.0.1',servername:v.tls==='wrong-host'?'wrong.example.invalid':'localhost',...(v.tls==='untrusted-ca'?{}:{ca:v.tls==='future-certificate'?tls.future.ca:tls.ca})},callback);
  } finally {
   fixtureConnectPort = null;
  }
  if (operation === pointerPath) pointerClient = client;
  if(v.case==='R1-42-H04'){
   assert.equal(tlsObservation,null);
   tlsObservation={socket_observed:false,request_error_observed:false,secure_connect_observed:false,authorized:null,authorization_error_present:null};
   client.on('socket',socket=>{tlsObservation.socket_observed=true;socket.on('secureConnect',()=>{tlsObservation.secure_connect_observed=true;});});
   client.on('error',()=>{tlsObservation.request_error_observed=true;const socket=client.socket;if(socket){tlsObservation.authorized=typeof socket.authorized==='boolean'?socket.authorized:null;tlsObservation.authorization_error_present=typeof socket.authorizationError==='string'&&socket.authorizationError.length>0;}});
  }
  return client;
 };
 let acquired;
 async function acknowledgeLate(check) {
  let snapshot, requestsBefore;
  if (check) {
   if (lateResolverCase) verify('resolver_entry', () => {
    assert(lateSignal && typeof lateResolve === 'function' && lateAck,
     'Expected the late resolver to register its signal, delivery and acknowledgement.');
   });
   verify('resolver_at_return', () => {
    snapshot = JSON.stringify({report: acquired.report, observations: acquired.observations});
    requestsBefore = trace.length;
    assert(lateSignal.aborted);
    assert.equal(lateDelivered, 0);
    assert.equal(lateSettled, 0);
    assert.equal(requestsBefore, 0);
   });
  }
  try {
   if (lateDelivered === 0) {
    lateDelivered++;
    lateResolve(fixtureCases.token);
   }
   await lateAck;
   await new Promise(resolve => setImmediate(resolve));
  } catch (error) {
   if (check) recordStage(error, 'resolver_settlement');
   throw error;
  }
  if (check) verify('resolver_after_settlement', () => {
   assert.equal(JSON.stringify({report: acquired.report, observations: acquired.observations}), snapshot);
   lateEvidence = {
    delivered: lateDelivered, settled: lateSettled, signal_aborted: lateSignal.aborted,
    requests_before: requestsBefore, requests_after: trace.length
   };
   assert.deepEqual(lateEvidence, {
    delivered: 1, settled: 1, signal_aborted: true, requests_before: 0, requests_after: 0
   });
   assert.equal(acquired.report.cleanup.resolver, 'cancel_unconfirmed');
  });
 }
 try{
  const fileMutations = ['writeFile','appendFile','mkdir','rm','rmdir','unlink','rename','copyFile','cp','symlink','link','chmod','chown','truncate','write','writev','createWriteStream'];
  if (guarded) fileMutations.push('fchmod','fchown','ftruncate','futimes','lchmod','lchown','lutimes','mkdtemp','utimes');
  for (const api of [fs, fsp]) for (const name of fileMutations) {
   for (const key of [name, name + 'Sync']) if (typeof api[key] === 'function') replace(api, key, deny);
  }
  for (const name of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork']) replace(cp, name, deny);
  replace(http, 'request', deny);
  replace(http, 'get', deny);
  replace(globalThis, 'fetch', deny);
  // Transport is available during fixture collection only, after the import passes the guard.
  replace(https, 'request', selection ? deny : redirectRequest);
  if (selection) {
   replace(https, 'get', deny);
   replace(net, 'connect', deny);
   replace(net, 'createConnection', deny);
   const originalSocketConnect = net.Socket.prototype.connect;
   replace(net.Socket.prototype, 'connect', function (options, ...args) {
    if (!(this instanceof tlsTransport.TLSSocket) || !isFixtureConnect(options)) deny();
    return originalSocketConnect.call(this, options, ...args);
   });
   const originalTlsConnect = tlsTransport.connect;
   replace(tlsTransport, 'connect', function (options, ...args) {
    if (!isFixtureConnect(options)) deny();
    return originalTlsConnect.call(this, options, ...args);
   });
   replace(dgram, 'createSocket', deny);
   for (const name of ['connect', 'send', 'sendto']) replace(dgram.Socket.prototype, name, deny);
   const { O_WRONLY, O_RDWR, O_CREAT, O_TRUNC, O_APPEND } = fs.constants;
   const writeFlags = O_WRONLY | O_RDWR | O_CREAT | O_TRUNC | O_APPEND;
   const checkOpenFlags = flags => {
    if (flags == null || typeof flags === 'function') return;
    if (typeof flags === 'number' ? (flags & writeFlags) !== 0 : !['r', 'rs', 'sr'].includes(flags)) deny();
   };
   for (const name of ['open', 'openSync']) {
    const original = fs[name];
    replace(fs, name, function (file, flags, ...args) {
     checkOpenFlags(flags);
     return original.call(this, file, flags, ...args);
    });
   }
   const originalOpen = fsp.open;
   replace(fsp, 'open', async function (file, flags, ...args) {
    checkOpenFlags(flags);
    const handle = await originalOpen.call(this, file, flags, ...args);
    for (const name of ['appendFile','chmod','chown','createWriteStream','truncate','utimes','write','writeFile','writev']) handle[name] = deny;
    return handle;
   });
  }
  syncBuiltinESMExports();
  if (receipt) {
   const moduleUrl=pathToFileURL(path.join(moduleRoot,receiptModulePath)).href;
   const {bindJiraReceipts}=await withRequiredSetup(()=>import(moduleUrl));
   let ports;
   inspect=(configInput,selector,{resolveSecret})=>{
    ports??=bindJiraReceipts({configInput,resolveSecret,binding:v.binding,state:v.state,original:v.original});
    return v.reconcile?ports.readReconciliationFacts(selector):ports.readRecordedReceipt(selector);
   };
   https.request=redirectRequest;
   syncBuiltinESMExports();
  } else if (selection) {
   const moduleUrl = pathToFileURL(path.join(moduleRoot, inventoryModulePath)).href;
   ({ inspectJiraInventory: inspect } = await withRequiredSetup(() => import(moduleUrl)));
   assert.equal(effects, 0, 'Unexpected fixture effects.');
   assert.equal(typeof inspect, 'function');
   https.request = redirectRequest;
   syncBuiltinESMExports();
  }
  if (scanClock) scanClock.install(restore);
  const invoke=()=>inspect(JSON.stringify(v.config),callerRequest,{resolveSecret(reference,signal){resolverCalls++;assert.equal(reference,v.config.jira.connection.secret_reference);if(v.resolver==='mutate-values'||v.resolver==='replace-accessors')return Promise.resolve().then(()=>{mutations++;if(v.resolver==='mutate-values'){callerRequest.issue_ids[0]='1001';callerRequest.comment_targets[0].ticket_id='1001';callerRequest.comment_targets[0].comment_id='2002';}else for(const name of ['issue_ids','comment_targets'])Object.defineProperty(callerRequest,name,{get(){getterCalls++;throw Error('ERROR-CANARY');}});return fixtureCases.token;});if(v.resolver==='reject')throw Error('ERROR-CANARY '+fixtureCases.token);if(v.resolver==='abort')return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('ERROR-CANARY')),{once:true}));if(v.resolver==='late'){lateSignal=signal;const deferred=new Promise(resolve=>{lateResolve=resolve;});lateAck=deferred.then(()=>{lateSettled++;});return deferred;}
   if (scanClock) scanClock.advance(v.resolver_delay_ms ?? 0);
   else if(v.resolver_delay_ms)return new Promise(resolve=>{resolverTimer=setTimeout(()=>resolve(fixtureCases.token),v.resolver_delay_ms);});
   return fixtureCases.token;
  }});
  acquired=await invoke();
  if(repeatReceipt){
   assert.equal(acquired.status,'complete');
   const original=JSON.stringify(acquired.data);
   const prior=acquired.data;
   prior.publication.status='incomplete';prior.publication.code='TEST_ANNOTATION';
   prior.publication_observations.pointer.assignment.comment_id='9001';
   prior.publication_observations.comments[0].reference.record_id='00000000-0000-4000-8000-000000000099';
   prior.receipt_input.trusted.manager_assignments[0].assignment.digest='sha256:'+'9'.repeat(64);
   prior.proof.target.comment_id='9001';
   acquired=await invoke();
   assert.equal(acquired.status,'complete');
   assert.equal(JSON.stringify(acquired.data),original);
  }
  if(v.resolver==='late')await acknowledgeLate(true);
 }finally{
  try{if(lateResolve&&lateDelivered===0)await acknowledgeLate(false);}finally{
  for (const undo of restore.reverse()) undo();
  syncBuiltinESMExports();
  clearTimeout(resolverTimer);for(const timer of timers)clearTimeout(timer);const closing=[...sockets].map(socket=>new Promise(resolve=>socket.once('close',resolve)));for(const socket of sockets)socket.destroy();await Promise.all([...closing,new Promise(resolve=>server.close(resolve)),new Promise(resolve=>redirect.close(resolve))]);
  }
 }
 verify('fixture_verification', () => {
  assert.equal(effects, 0, 'Unexpected fixture effects.');
  assert.equal(sockets.size, 0);
 });
 if (scanClock) {
  if (scanTimerError) throw scanTimerError;
  assert.deepEqual(scanClock.pointerAbort, v.oracle.pointer_abort,
   'The reader timer must destroy the pending pointer TLS request before its response.');
  assert.deepEqual(serverTrace, v.oracle.trace);
  assert.equal(resolverCalls, 1);
  assert.deepEqual(acquired.report.cleanup, v.oracle.cleanup);
  for (const [name, value] of Object.entries(v.oracle.time_limits)) {
   assert.equal(acquired.report.limits[name], value, name);
  }
 }
 if(receipt){
  const report=JSON.parse(JSON.stringify(acquired));
  assert.equal(effects,0);assert.equal(serverError,null);assert.equal(redirectRequests,0);
  assert.deepEqual(trace,v.script.map(step=>({method:step.method??'GET',path:step.path})),JSON.stringify(report));
  assert.deepEqual(serverTrace,trace);assert.equal(resolverCalls,v.resolverExpected*(repeatReceipt?2:1));
  const currentTrace=repeatReceipt?trace.slice(receiptCalls):trace;
  for(const canary of [fixtureCases.token,'ERROR-CANARY',v.config.jira.connection.secret_reference,'pigboard-handoff/v1'])
   assert(!JSON.stringify(report).includes(canary));
  assert.equal(report.writes,0);assert.equal(report.execution_authorized,false);
  assert(!Object.hasOwn(report,'data'));
  if(report.counters){
   assert.equal(report.counters.requests_attempted,currentTrace.length);
   assert.equal(report.counters.requests_completed+report.counters.requests_failed,currentTrace.length);
   assert.equal(report.cleanup.resolver,'settled');
   assert(report.counters.elapsed_ms<=report.limits.scan_timeout_ms+100);
   assert(report.counters.response_bytes<=report.limits.max_total_response_bytes);
   assert(report.counters.observation_bytes<=report.limits.max_total_response_bytes);
   assert.equal(report.counters.search_pages+report.counters.comment_pages+(report.counters.changelog_pages??0),currentTrace.filter(t=>t.method==='POST'||t.path.includes('startAt=')).length);
  }
  const {history,publication,receipt_input,publication_observations,proof}=acquired.data??{};
  if(v.oracle.status==='complete'){
   assert(receipt_input,'Complete native proof requires its exact envelope.');
   assert(proof,'Complete native proof requires its recorded evaluation.');
   if(v.reconcile){
    assert.equal(acquired.data.complete,true);
    assert.equal(history?.status,'complete');
    assert.equal(publication?.status,'complete');
    assert(publication_observations?.comments?.length,'Complete publication requires native observations.');
    assert(publication_observations.pointer,'Complete publication requires the observed pointer.');
   }
  }
  let observed=null;
  if(ownershipConflict||receiptComparison==='ownership-conflict'){
   assert.equal(receipt_input,null);
   assert.equal(proof,null);
   observed={target:v.target,proof_evaluated:false,closure_reason:report.diagnostics.find(d=>d.code==='OWNERSHIP_CONFLICT')?.code??null};
  }
  if(receiptComparison==='generic-foreign-pointer'){
   assert.equal(receipt_input,null);
   assert.equal(proof,null);
   assert(!report.diagnostics.some(d=>['OWNERSHIP_CONFLICT','MEMBERSHIP_MISMATCH'].includes(d.code)));
   observed={target:v.target,proof_evaluated:false,closure_reason:null};
  }
  if(['scoped-pointer','ownership-conflict','generic-foreign-pointer','reconciliation-unrelated-pointer'].includes(receiptComparison)){
   const scope=receiptComparison==='generic-foreign-pointer'?null:{project_id:'100',label:'stream-2'};
   assert(report.diagnostics.some(d=>d.code==='POINTER_UNKNOWN'&&d.operation==='pointer'&&d.issue_id==='1200'&&
    canonicalize(d.scope)===canonicalize(scope)));
  }
  if(receiptComparison==='target-denied'){
   assert.equal(receipt_input,null);
   assert.equal(proof,null);
   assert(report.diagnostics.some(d=>d.code==='READ_DENIED_OR_MISSING'&&d.operation==='comment'&&d.issue_id===v.target.ticket_id));
   observed={target:v.target,proof_evaluated:false};
  }
  if(v.oracle.history_status)assert.equal(history.status,v.oracle.history_status);
  if(history?.status==='complete'||variant==='missing-page')assert.deepEqual(history.items,v.historyItems);
  if(variant==='missing-page'||variant==='shared-budget-exhausted')assert.notEqual(history.status,'complete');
  if(receipt_input){
   assert.deepEqual(receipt_input.target,v.target);assert.equal(receipt_input.consumer,'manager');
   const assessed=proof.validation??proof;
   assert.equal(assessed.valid,true);assert.equal(assessed.execution_authorized,false);
   assert.equal(assessed.purpose,v.reconcile?'recorded-history':'recorded-completion');
   assert.equal(canonicalize(assessed.target),canonicalize(v.target));
   observed={target:receipt_input.target,proof_purpose:(proof.validation??proof).purpose,publication,history,native_times:null,capture_digest:null};
   if(v.reconcile){
    const native=receipt_input.comment_pages.filter(p=>p.ticket_id===v.target.ticket_id).flatMap(p=>p.comments).find(c=>c.id===v.target.comment_id);
    const times=metadataFields.map(k=>native[k]),canon=publication_observations.comments[0],tuple=r=>[r.ticket_id,r.comment_id,r.record_id,r.digest];
    assert.equal(times[2],fixtureCases.native_receipts.raw_timestamp);assert.equal(times[3],times[2]);
    assert.deepEqual([canon.created,canon.updated],Array(2).fill(fixtureCases.native_receipts.utc_timestamp));
    assert.deepEqual([canon.author_id,canon.update_author_id],times.slice(0,2));
    assert.equal(publication_observations.pointer.mode,v.mode);
    assert.deepEqual(publication_observations.pointer.assignment,v.state.retained_members.find(m=>m.ticket_id===v.target.ticket_id).assignment);
    const capture=sha({comments:[[tuple(canon.reference),canon.author_id,canon.update_author_id,canon.created,canon.updated]],
     pointer:[v.mode,tuple(publication_observations.pointer.assignment)]});
    assert.equal(capture,v.publicationDigest);
    assert.equal(capture,v.state.attempt.extensions.pb_capture_publication_digest);
    observed={...observed,native_times:times,publication_observations,capture_digest:capture};
    if(receiptComparison==='reconciliation-unrelated-pointer'){
     assert.equal(report.diagnostics.length,1);
     assert.equal(trace.length,28);
     assert.equal(v.state.attempt.cause.length,0);
     observed={...observed,proof_evaluated:true};
    }
   }else{
    assert.equal(proof.validation.recorded_completion_established,true);
    assert.equal(receipt_input.issues.find(i=>i.id===v.target.ticket_id).pr_history_complete,true);
   }
  }else if(variant==='current-qa-outstanding-request'&&receiptComparison!=='target-denied'){
   const assessed=proof?.validation??proof;
   assert(assessed,'The exact recorded evaluator must return a proof result.');
   assert.equal(assessed.valid,false);
   assert.equal(assessed.purpose,'recorded-completion');
   assert.equal(canonicalize(assessed.target),canonicalize(v.target));
   assert(assessed.diagnostics.some(d=>d.code==='REPAIR'));
   assert(trace.some(t=>t.path.endsWith('/comment/2099')));
   observed={target:v.target,proof_evaluated:true,proof_purpose:assessed.purpose,proof_valid:false,proof_codes:assessed.diagnostics.map(d=>d.code)};
  }
  const runtimeAfter=await snapshot(),inputAfter=inputSnapshot(v);
  assert.deepEqual(runtimeAfter,runtimeBefore);assert.deepEqual(inputAfter,inputBefore);
  // The bounded comparison emits only the same public diagnostics and selected proof facts.
  const diagnosticEvidence=JSON.stringify({report,observed,trace,effects,resolver_calls:resolverCalls,cleanup_complete:sockets.size===0});
  assert.equal(report.status,v.oracle.status,diagnosticEvidence);
  assert.equal(report.code,v.oracle.code,diagnosticEvidence);
  if(ownershipConflict||receiptComparison==='ownership-conflict')
   assert(report.diagnostics.some(d=>d.code==='OWNERSHIP_CONFLICT'&&d.message.includes('competing Epic')),diagnosticEvidence);
  return {report,trace,server_trace:serverTrace,fixture_hashes:before,input_hashes:{before:inputBefore,after:inputAfter},
   runtime_hashes:{before:runtimeBefore,after:runtimeAfter},observed,history:history??null,publication:publication??null,
   effects,resolver_calls:resolverCalls,cleanup_complete:sockets.size===0,oracle_matched:true,evidence_execution:'simulated-local-tls'};
 }
 const report = acquired.report;
 let privateComparison = null;
 verify('report_oracle', () => {
  oracleCheck(report, v.oracle, trace);
  if (v.oracle.issue_rows) assert.deepEqual(report.issues, v.oracle.issue_rows);
  if (v.oracle.issue_ids) assert.deepEqual(acquired.observations.issues.map(row => row.id).sort(), v.oracle.issue_ids);
  if (v.oracle.pointers) for (const [id, pointer] of Object.entries(v.oracle.pointers))
   assert.deepEqual(acquired.observations.issues.find(row => row.id === id)?.pointer, pointer);
  if (v.oracle.reference_count !== undefined)
   assert.equal(acquired.observations.references.length, v.oracle.reference_count);
  if (v.oracle.raw_bodies) for (const [id, body] of Object.entries(v.oracle.raw_bodies))
   assert.equal(acquired.observations.issues.find(row => row.id === id)?.body, body);
  if (v.oracle.acquisition) assert.deepEqual(acquired.observations, v.oracle.acquisition);
 });
 if (v.oracle.acquisition) privateComparison = {
  algorithm: 'sha256', actual_sha256: digest(JSON.stringify(acquired.observations)),
  expected_sha256: digest(JSON.stringify(v.oracle.acquisition)), matched: true
 };
 verify('fixture_verification', () => {
  assert.equal(effects, 0);
  assert.equal(redirectRequests, 0);
  assert.equal(serverError, null);
  assert.equal(report.counters.requests_completed + report.counters.requests_failed, report.counters.requests_attempted);
  assert.equal(JSON.stringify(acquired), JSON.stringify({report}));
  for (const canary of [fixtureCases.token, 'ERROR-CANARY', v.config.jira.connection.secret_reference])
   assert(!JSON.stringify(acquired).includes(canary));
 });
 const casesAfter = digest(fs.readFileSync(path.join(here, 'jira-preview-cases.json')));
 verify('fixture_verification', () => assert.equal(casesAfter, before.cases));
 const tlsAfter = digest(fs.readFileSync(path.join(here, 'jira-preview-tls.json')));
 verify('fixture_verification', () => assert.equal(tlsAfter, before.tls));
 if(inventory&&!receipt)assert.equal(digest(fs.readFileSync(packetPath)),before.inventory);
 if (selection) assert.equal(digest(fs.readFileSync(path.join(root, scopedInventoryPacketPath))), before.scoped_inventory);
 const inputAfter = inputSnapshot(v), runtimeAfter = await runtimeSnapshot(moduleRoot, missing, inventory);
 verify('fixture_verification', () => {
  assert.deepEqual(inputAfter, inputBefore);
  assert.deepEqual(runtimeAfter, runtimeBefore);
 });
 const inventoryEvidence = {};
 if (selection) {
  const callerRequestAfter = digest(JSON.stringify(callerRequest));
  const serverAfter = snapshotServer();
  assert.equal(callerRequestAfter, callerRequestBefore);
  assert.equal(serverAfter, serverBefore);
  assert.equal(historyAccesses, 0);
  assert.deepEqual(serverTrace, v.oracle.trace);
  if (v.oracle.diagnostic_reach) {
   const key = ({ code, scope }) => JSON.stringify([code, scope?.project_id ?? null, scope?.label ?? null]);
   const normalize = entries => entries.map(({ code, scope }) => ({ code, scope }))
    .sort((a, b) => key(a).localeCompare(key(b)));
   assert.deepEqual(normalize(report.diagnostics), normalize(v.oracle.diagnostic_reach),
    'Diagnostic code and scope differ from the literal oracle.');
  }
  if (v.oracle.seed_pages) {
   assert.deepEqual(seedPages, v.oracle.seed_pages);
   inventoryEvidence.seed_pages = seedPages;
  }
  if (variant === 'missing-retained-input') {
   assert.equal(resolverCalls, 0);
   assert.deepEqual(serverTrace, []);
  }
  const completeOracle = selection.fixtureCase === 'R1-45-H01' &&
   ['complete-domain', 'unrelated-history'].includes(selection.fixtureVariant);
  inventoryEvidence.caller_request_hashes = {before: callerRequestBefore, after: callerRequestAfter};
  inventoryEvidence.server_audit = {
   unrelated_issue_count:history.issueCount, unrelated_comment_count:history.commentCount,
   unrelated_access_count:historyAccesses, before_sha256:serverBefore, after_sha256:serverAfter
  };
  inventoryEvidence.provenance_comparison = completeOracle ? compareProvenance(acquired.observations.provenance) : null;
 }
 return {report,trace,server_trace:serverTrace,...inventoryEvidence,fixture_hashes:before,input_hashes:{before:inputBefore,after:inputAfter},runtime_hashes:{before:runtimeBefore,after:runtimeAfter},private_comparison:privateComparison,tls_observation:tlsObservation,...(lateEvidence?{late_resolver:lateEvidence}:{}),effects,resolver_calls:resolverCalls,mutations,getter_calls:getterCalls,cleanup_complete:sockets.size===0,oracle_matched:true};
}

// Dedicated local fixture command. Importing runFixture never starts a read.
let isMain=false;
if(process.argv[1]){
 try{isMain=fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url));}
 catch{/* An imported harness need not have a resolvable host entry. */}
}
if(isMain){
 let json=false,selected=null,failedRole=null;
 const runs=[],runRoles=[];
 try{
  const args=process.argv.slice(2),values={};
  for(let i=0;i<args.length;i++){
   if(args[i]==='--json'){json=true;continue;}
   if(!['--case','--variant','--runtime'].includes(args[i])||values[args[i]]||!args[i+1])throw Error('Invalid fixture selection.');
   values[args[i]]=args[++i];
  }
  if(Object.keys(values).length!==3)throw Error('Invalid fixture selection.');
  const caseId = values['--case'], variant = values['--variant'], root = path.resolve(values['--runtime']);
  const selection = inventorySelection(caseId, variant);
  let prepared, authored;
  if (caseId.startsWith('R1-34-')) {
   if (!selection) throw Error('Invalid fixture selection.');
   selected = selection;
   failedRole = 'main';
   prepared = await readInventoryFixture(selection, root);
   authored = prepared.authored;
  } else if(receiptCase(caseId)){
   authored=nativeReceiptFixture(caseId,variant,root);
   selected=authored;
  } else {
   const packet = caseId.startsWith('R1-45-') ?
    JSON.parse(fs.readFileSync(path.join(here,'jira-inventory-cases.json'),'utf8')) : fixtureCases;
   authored = packet.variants.find(row => row.case === caseId && row.variant === variant);
   if (!authored) throw Error('Invalid fixture selection.');
   selected = authored;
  }
  for(const [role,options]of [['main',{}],...(authored.control?[['control',{control:true}]]:[]),...(authored.private_projection?[['private_projection',{privateProjection:true}]]:[])]){
   failedRole=role;
   const run = await executeFixture(caseId, variant, root, {...options, authoredFixture:selection ? null : authored, selection, selected:prepared});
   runs.push(run);runRoles.push(role);failedRole=null;
  }
  if(json)console.log(JSON.stringify({case:selected.case,variant:selected.variant,runs}));
  else{console.log(selected.case+' / '+selected.variant+': literal oracle matched. Human acceptance remains a separate review.');for(const run of runs)console.log(JSON.stringify(run.report,null,2));}
 }catch(error){
  const selectionFailed = !selected;
  const selectedInventory = selected?.case.startsWith('R1-34-');
  const setupFailed = !selectionFailed && (selected.case.startsWith('R1-34-') ?
   error?.code === 'FIXTURE_SETUP_MISSING' : ['ENOENT','ERR_MODULE_NOT_FOUND'].includes(error?.code));
  const status=selectionFailed?'selection_failed':setupFailed?'setup_failed':'fixture_failed';
  const diagnostic=selectionFailed
   ?{code:'FIXTURE_SELECTION_INVALID',message:'Use --case CASE --variant NAME --runtime ROOT [--json] with a prescribed case and variant; no fixture run was started.'}
   :setupFailed
    ?{code:'SETUP_MISSING',message:'A required runtime file or module is unavailable. Prepare the complete explicit runtime; no fallback or repair was attempted. Completed runs are retained.'}
    :{code:'FIXTURE_RUN_FAILED',message:'The fixture run did not verify. Retain completed runs and inspect the prescribed check; do not treat this as missing setup or a passing observation.'};
  const stage = status === 'fixture_failed' ? failureStages.get(error) : undefined;
  const failedRun = failedRole ? {
   role: failedRole, observations: 'unavailable', cleanup: 'not_reported', ...(stage ? {stage} : {})
  } : null;
  console.log(JSON.stringify({status,inspection_scope:selectedInventory?'configured_inventory':'requested_issues',diagnostics:[diagnostic],case:selected?.case??null,variant:selected?.variant??null,runs,run_roles:runRoles,failed_run:failedRun,domain_complete:false,admission:'not_evaluated',receipt_proof:'not_evaluated'}));
  process.exitCode=2;
 }
}
