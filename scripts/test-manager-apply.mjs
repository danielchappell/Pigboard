import https from 'node:https';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import canonicalize from 'canonicalize';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {parseConfig} from '../lib/config/parse.mjs';
import {createDynamoState} from '../lib/aws/dynamodb.mjs';
import {StateProvider,fixture as stateFixture} from '../test/helpers/state-provider.mjs';
import {runApply,handler} from '../lib/aws/manager-lambda.mjs';
import {applyOrdinary} from '../lib/manager/apply.mjs';
import {bindInstallation,resolveInstallation} from '../lib/aws/installation.mjs';
import {runStateCommand} from './manager-state.mjs';
export const packet=JSON.parse(readFileSync(new URL('../test/fixtures/manager-apply.json',import.meta.url),'utf8'));
const tls=JSON.parse(readFileSync(new URL('../test/fixtures/jira-preview-tls.json',import.meta.url),'utf8'));
const issueRoute = (ticket, suffix) => '/rest/api/3/issue/' + ticket + suffix;
const pointerSuffix = '/properties/pigboard.work-context';

export function repairFixtureConfig(historyId, {optOut = false, missingEdge = false, commentBound = false, readBounds} = {}) {
  const history = packet.recorded_repair_preview.cases.find(item => item.id === historyId);
  assert(history, 'Use a prescribed repair history.');
  const config = structuredClone(history.config);
  config.jira = {...structuredClone(packet.config.jira), site: history.config.jira.site};
  config.manager = {...structuredClone(packet.config.manager), rework_enabled: !optOut};
  if (!missingEdge) config.manager.transition_edges.push(structuredClone(packet.repair_admission.edge));
  if (commentBound) {
    config.jira.read_bounds.max_comments = packet.repair_admission.comment_bound;
    config.jira.read_bounds.page_size = packet.repair_admission.comment_bound;
  }
  Object.assign(config.jira.read_bounds, readBounds);
  return config;
}

const nativeComment = row => ({
  id: row.id, author: {accountId: row.author_id}, updateAuthor: {accountId: row.update_author_id},
  created: row.created, updated: row.updated, body: JSON.parse(row.body)
});

function reverseObjectKeys(value) {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverseObjectKeys(child)]));
  }
  return value;
}

function addMovedProjectFixture(p, moved) {
  const {config, issues} = p;
  const {retained_member: member, current, projects} = moved;
  const [selectedEpic, selectedTicket] = issues;
  config.projects.push(...projects.map(project => ({...structuredClone(config.projects[0]), ...project})));
  const makeEpic = (id, key, projectId) => {
    const epic = {...structuredClone(selectedEpic), id, key};
    epic.fields.project.id = projectId;
    const content = epic.fields.description.content[0].content[0];
    const work = JSON.parse(content.text);
    work.workstreams = [{label: member.label, story_order: [current.key]}];
    content.text = JSON.stringify(work);
    return epic;
  };
  const ticket = {...structuredClone(selectedTicket), id: member.ticket_id, key: current.key};
  Object.assign(ticket.fields, {project: {id: current.project_id}, parent: {id: current.epic_id}, labels: [member.label]});
  issues.push(makeEpic(member.epic_id, moved.prior_epic_key, member.project_id),
    makeEpic(current.epic_id, current.epic_key, current.project_id), ticket);
}

function prepareRepairFixture(p, {historyId, competingBug, shortLabelSearch, oldIssueKey, escapedPlainNote, ...options}) {
  const history = p.recorded_repair_preview.cases.find(item => item.id === historyId);
  const config = repairFixtureConfig(historyId, options);
  const {issues, comment_pages} = history.inspection.observations;
  const native = issues.map(i => ({
    id: i.id, key: i.key,
    fields: {
      project: {id: i.project_id}, issuetype: {id: i.type_id}, status: {id: i.status_id},
      parent: i.parent_id ? {id: i.parent_id} : null, labels: i.labels, description: JSON.parse(i.body)
    }
  }));
  if (competingBug) {
    const order = native.find(i => i.id === history.state.retained_members[0].epic_id).fields.description.content[0].content[0];
    const epic = JSON.parse(order.text);
    epic.workstreams[0].story_order.push(p.bug_issue.key);
    order.text = JSON.stringify(epic);
    native.push(p.bug_issue);
  }
  if (shortLabelSearch) {
    const epic = structuredClone(native.find(i => i.id === '900'));
    Object.assign(epic, {id: '901', key: 'EX-91'});
    const node = epic.fields.description.content[0].content[0];
    const work = JSON.parse(node.text);
    work.workstreams = [{label: 'stream-2', story_order: [oldIssueKey ? 'OLD-12' : 'EX-12']}];
    node.text = JSON.stringify(work);
    const issue = {
      id: '1012', key: 'EX-12', fields: {
        project: {id: '100'}, issuetype: {id: '22'}, status: {id: '2'}, parent: {id: '901'}, labels: ['stream-2'],
        description: {type: 'doc', version: 1, content: [{type: 'paragraph', content: [{type: 'text', text: 'x'.repeat(5000)}]}]}
      }
    };
    native.push(epic, issue);
    history.state.retained_members.push({project_id: '100', label: 'stream-2', ticket_id: issue.id, epic_id: epic.id, assignment: null});
  }
  const {ticket_id, ...expected} = history.expected.assignment;
  const oracle = p.repair_admission.histories[historyId];
  const admission = {
    schema: 'pigboard-handoff/v1', record_id: p.attempt_id, operation_id: p.attempt_id,
    ticket_id, requirements_digest: oracle.requirements_digest, assignment: null, role: 'manager',
    kind: 'admission', from_stage: 'Rework Queued', to_stage: 'In Progress',
    payload: {
      project_id: p.repair_admission.edge.project_id, stream: 'stream-1', mode: 'repair',
      previous_assignment: {ticket_id, ...expected}, requests: history.expected.request_refs,
      existing_pr: history.expected.pr
    },
    resume_authorization: null
  };
  const pointers = new Map(issues.filter(i => i.pointer.state === 'present').map(i => [i.id, i.pointer.value]));
  const comments = new Map(comment_pages.map(page => [page.ticket_id, page.comments.map(nativeComment)]));
  if (escapedPlainNote) comments.get(ticket_id).unshift({
    id:'990001', author:{accountId:'test-note'}, updateAuthor:{accountId:'test-note'},
    created:'2026-11-18T00:00:00Z', updated:'2026-11-18T00:00:00Z',
    body:{type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:String.fromCharCode(92).repeat(5000)}]}]}
  });
  const published = {ticket_id, comment_id: p.comment.id, record_id: p.attempt_id, digest: oracle.admission_digest};
  const mutations = [
    {method: 'POST', path: issueRoute(ticket_id, '/comment')},
    {method: 'PUT', path: issueRoute(ticket_id, pointerSuffix), body: {schema: 'pigboard-work-pointer/v1', assignment: published}},
    {method: 'POST', path: issueRoute(ticket_id, '/transitions'), body: {transition: {id: p.repair_admission.edge.transition_id}}}
  ];
  return {history, config, native, pointers, comments, admission, published, mutations, oracle, ticket_id};
}

function senderCommitment(attempt, observation, assignment, wire) {
  const refTuple = ref => [ref.ticket_id, ref.comment_id, ref.record_id, ref.digest];
  const hash = value => 'sha256:' + crypto.createHash('sha256').update(canonicalize(value)).digest('hex');
  const utc = packet.sender_evidence.canonical_timestamp;
  assert.equal(new Date(observation.created).toISOString(), utc);
  assert.equal(new Date(observation.updated).toISOString(), utc);
  const publication_digest = hash({
    comments: [[refTuple(observation.reference), observation.author_id, observation.update_author_id, utc, utc]],
    pointer: ['published', refTuple(assignment)]
  });
  const fields = ['schema_version', 'installation_id', 'domain_id', 'record_id', 'site', 'project_id', 'label',
    'attempt_id', 'ticket_id', 'epic_id', 'issue_key', 'operation', 'source_status_id', 'target_status_id',
    'configuration_digest', 'created_at', 'cause'];
  const identity = Object.fromEntries(fields.map(field => [field, attempt[field]]));
  const request_digest = hash({
    version: 1, identity, method: wire.method, route: 'issue_transitions',
    transition_id: wire.body.transition.id, body: wire.body, publication_digest
  });
  return {request_digest, publication_digest};
}

function nativeObservation(comment, reference) {
  const {id, author, updateAuthor, created, updated} = comment;
  assert.equal(id, reference.comment_id);
  return {reference, author_id: author.accountId, update_author_id: updateAuthor.accountId, created, updated};
}

async function seedLegacySenderAttempt(state, provider, p, binding, comment, pointers, comments) {
  const reference = p.oracle.mutations[1].body.assignment;
  const scope = {site: binding.site, project_id: '100', label: 'stream-1'};
  const member = {...scope, ticket_id: reference.ticket_id, epic_id: '900', assignment: reference, expected_revision: null};
  const attempt = {
    attempt_id: p.attempt_id, ticket_id: member.ticket_id, epic_id: member.epic_id, issue_key: p.issues[1].key,
    operation: 'admit_ready', source_status_id: '1', target_status_id: '2',
    configuration_digest: binding.configuration_digest, cause: [], publication: []
  };
  const memberResult = await state.retainMembers({expected_installation_revision: 0, members: [member], now: p.time});
  assert.equal(memberResult.status, 'confirmed');
  const begun = await state.begin({
    expected_installation_revision: memberResult.data.installation_revision, stream: scope, expected_stream_revision: null,
    attempt, required_members: [{...member, expected_revision: 0}], now: p.time
  });
  assert.equal(begun.status, 'confirmed', JSON.stringify(begun));
  const reserved = await state.retainPublication({
    expected_installation_revision: begun.data.installation_revision, expected_stream_revision: begun.data.stream_revision,
    expected_attempt_revision: begun.data.attempt_revision, attempt_id: p.attempt_id, reference, now: p.time
  });
  assert.equal(reserved.status, 'confirmed');
  const {request_digest, publication_digest} = senderCommitment(reserved.data.attempt, nativeObservation(comment, reference), reference, p.oracle.mutations[2]);
  // Literal old v1 capture with an observed 204 and no companion.
  provider.seed({...reserved.data.attempt, revision: reserved.data.attempt.revision + 2, extensions: {
    pb_capture_version: 1, pb_capture_transition_id: '31', pb_capture_request_digest: request_digest,
    pb_capture_publication_digest: publication_digest, pb_capture_package_revision: binding.package_revision,
    pb_capture_invocation_id: p.producer_invocation_id, pb_capture_prepared_at: p.time, pb_capture_status: 204,
    pb_capture_received_at: p.time, pb_capture_provider_request_id: p.sender_evidence.provider_request_id
  }});
  provider.seed({...reserved.data.installation, revision: reserved.data.installation.revision + 2});
  pointers.set(reference.ticket_id, p.oracle.mutations[1].body);
  comments.set(reference.ticket_id, [comment]);
}

async function inspectSenderAttempt(cloud, attemptId) {
  const directory = await mkdtemp(join(tmpdir(), 'pigboard-sender-inspection-'));
  try {
    const configPath = join(directory, 'config.json'), installationPath = join(directory, 'installation.json');
    const configText = JSON.stringify(cloud.config);
    const receipt = await bindInstallation({
      configText, manifest: cloud.manifest, stackId: cloud.stackId, operatorProfile: 'operator'
    }, cloud.dependencies);
    await writeFile(configPath, configText);
    await writeFile(installationPath, JSON.stringify(receipt));
    const args = ['inspect', '--config', configPath, '--installation', installationPath, '--operator-profile', 'operator',
      '--kind', 'attempt', '--record-id', 'attempt:' + attemptId];
    const resolve = input => resolveInstallation(input, cloud.dependencies);
    const start = cloud.audit.length, disposed = cloud.destroyed.length;
    const readable = await runStateCommand(args, {resolveInstallation: resolve});
    const json = await runStateCommand([...args, '--json'], {resolveInstallation: resolve});
    assert.equal(readable.exitCode, 0, readable.stdout);
    assert.equal(json.exitCode, 0, json.stdout);
    const audit = cloud.audit.slice(start).map(({identity,action}) => ({identity,action}));
    assert(audit.length > 0 && audit.every(call => call.identity === 'SELECTED_OPERATOR' && /^(Get|Query|Describe)/.test(call.action)));
    assert(cloud.destroyed.length > disposed);
    return {args, readable: readable.stdout, json: JSON.parse(json.stdout), audit};
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

/** Disposable providers only. No live URL, credential or transport option. */
export async function runApplyFixture({fault=null,global=false,repeat=false,hold=null,host=false,enabled=true,twoStreams=false,bug=false,variant=null,health=true,empty=false,logFailure=false,timeout=false,setupFailure=false,repairCase=null,runtime=null,sendCase=null,inspectSend=false}={}){
 const p=structuredClone(packet),repair=repairCase?prepareRepairFixture(p,repairCase):null,config=repair?.config??p.config;
 const regression=variant===null?null:p.regressions[variant],moved=regression?.moved_project;
 if(variant!==null)assert(regression,'Use a prescribed apply variant.');if(regression?.issues)p.issues=regression.issues;if(twoStreams)p.issues=p.dispatch_issues;if(empty)p.issues=[];if(bug)p.issues[1]=p.bug_issue;if(global||hold==='global-only transition')config.manager.transition_edges[0].global=true;
 if(moved)addMovedProjectFixture(p,moved);
 if(hold==='paused Epic')p.issues[0].fields.status.id='1';
 if(hold==='unauthorized scope')p.issues[1].fields.project.id='999';
 if(['queued repair','five Human Review'].includes(hold)){const count=hold==='queued repair'?1:5;for(let n=0;n<count;n++){const issue=structuredClone(p.issues[1]);issue.id=String(1100+n);issue.key='EX-'+String(100+n);issue.fields.status.id=hold==='queued repair'?'6':'5';p.issues.push(issue);}}
 if(!enabled){config.manager.controls.schedule_enabled=false;config.manager.controls.writes_enabled=false;}
 const parsed=parseConfig(JSON.stringify(config));assert.equal(parsed.valid,true);
 if(runtime){assert(repair);assert.deepEqual(JSON.parse(runtime.configText),config);assert.equal(runtime.manifest.configuration_digest,parsed.configuration_digest);}
 const control={configuration_digest:parsed.configuration_digest,schedule_enabled:enabled,writes_enabled:enabled,maintenance:false};
 let cloud;
 if (inspectSend) {
   const {fixtureCloud} = await import('./test-aws-manager.mjs');
   const base = fixtureCloud(config);
   cloud = fixtureCloud(config, {}, {...base.manifest, sender: true});
   Object.assign(cloud.cloud.function.Environment.Variables, {PB_MODE: 'apply', PB_WRITES_ENABLED: 'true'});
   cloud.cloud.schedule.Target.Input = JSON.stringify({operation: 'apply'});
 }
 const binding=cloud?.binding??{...stateFixture.binding,site:config.jira.site,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,configuration_digest:parsed.configuration_digest};
 if(runtime)Object.assign(binding,{package_revision:runtime.manifest.source_revision,installation_generation:runtime.manifest.installation_generation});
 const adapter=runtime?.createDynamoState??createDynamoState;
 const provider=cloud?.provider??new StateProvider(binding),disabled=adapter({binding,control:{...control,schedule_enabled:false,writes_enabled:false},client:provider});
 assert.equal((await disabled.initialize({fresh_installation:{...stateFixture.fresh,installation_id:binding.installation_id,domain_id:binding.domain_id,site:binding.site,configuration_digest:binding.configuration_digest,installation_generation:binding.installation_generation,observed_at:p.time},now:p.time})).status,'confirmed');if(enabled)provider.enable();
 if(health){const row=provider.records().find(r=>r.kind==='installation');provider.seed({...row,extensions:{...row.extensions,health_generation:'apply-fixture-epoch',health_enabled_at:p.time}});}
 const healthLogs=[],timingLogs=[];
 const real=adapter({binding,control,client:provider});
 if(repair||moved){
   const retained=repair?.history.state.retained_members??[moved.retained_member];
   const members=retained.map(m=>({site:binding.site,...m,expected_revision:null}));
   const seeded=await real.retainMembers({expected_installation_revision:0,members,now:p.time});
   assert.equal(seeded.status,'confirmed');
 }
 const initialRecords=repair?provider.records():null;
 const stateCalls=[],trace=[],mutations=[],events=[],issues=repair?.native??p.issues;
 const comments=repair?.comments??new Map(),pointers=repair?.pointers??new Map();let injected=false,scan=0;
 if (sendCase) {
   p.comment.created = p.sender_evidence.timestamp;
   p.comment.updated = p.sender_evidence.timestamp;
   if (sendCase.legacy) await seedLegacySenderAttempt(real, provider, p, binding, p.comment, pointers, comments);
 }
 const auditStart=provider.audit.length;
 const snapshot = () => structuredClone([...provider.rows.values()]);
 const writeAudit = (start = auditStart) => provider.audit.slice(start).filter(call => call.name === 'TransactWriteCommand');
 const sender = sendCase ? {before: snapshot(), at_send: [], comment_observations: []} : null;
 let restoreClock;
 async function observeSendState(name, input) {
   const before = snapshot(), audit = provider.audit.length;
   const injection = sendCase.fault?.split(':');
   const boundary = {prepareTransitionCapture:'prepare', recordTransitionResponse:'response', finalize:'finalize'}[name];
   if (injection?.[0] === boundary) {
     injected = true;
     if (injection[1] === 'rejected') input = {...input, expected_installation_revision: input.expected_installation_revision - 1};
     else provider.fault = injection[1];
   }
   const result = await real[name](input);
   sender[boundary] = {before, after: snapshot(), transactions: writeAudit(audit), status: result.status, code: result.code};
   if (boundary === 'prepare' && sendCase.expireAfterPrepare && result.status === 'confirmed') {
     assertAtomicSenderPrepare(sender.prepare);
     const original = Object.getOwnPropertyDescriptor(performance, 'now');
     const actualNow = performance.now.bind(performance);
     const expired = actualNow() + config.manager.invocation_timeout_seconds * 1000;
     Object.defineProperty(performance, 'now', {configurable: true, value: () => expired});
     restoreClock = () => {
       if (original) Object.defineProperty(performance, 'now', original);
       else delete performance.now;
     };
   }
   return result;
 }
 const state=Object.fromEntries(Object.keys(real).map(name=>[name,async input=>{const call={name,input:structuredClone(input)};stateCalls.push(call);events.push('state:'+name);const boundary={retainMembers:stateCalls.filter(c=>c.name==='retainMembers').length===1?'member':'assignment',begin:'intent',finalize:'finalize'}[name];const proofInjection=p.oracle.proof_boundary_injections?.[fault];if(!injected&&proofInjection?.state_call===name){provider.fault=proofInjection.fault;injected=true;}else if(!injected&&!proofInjection&&fault?.startsWith(boundary+':')){provider.fault=fault.endsWith(':after')?'after':'before';injected=true;}const result=sender&&['prepareTransitionCapture','recordTransitionResponse','finalize'].includes(name)?await observeSendState(name,input):await real[name](input);call.result=structuredClone(result);return result;} ]));
 let serverError=null,workerCalls=0,uuidIndex=0,currentComment=p.comment,currentMutationOracle=p.oracle.mutations;const sockets=new Set();
 const server=https.createServer({key:tls.key,cert:tls.cert},async(req,res)=>{try{
  let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null;const path=req.url;trace.push({method:req.method,path,body});assert.equal(req.headers.authorization,'Bearer LOCAL_APPLY_DUMMY');
  const mutation=req.method!=='GET'&&!path.includes('/search/');let boundary=path.endsWith('/comment')?'comment':path.endsWith('/transitions')?'transition':mutation?'pointer':null;
  if(repair&&req.method==='GET'&&path===issueRoute(repair.ticket_id,pointerSuffix)&&mutations.length===2&&scan===1)boundary='pointer-readback';
  const shouldFault=!injected&&fault?.startsWith(boundary+':');if(shouldFault&&fault.endsWith(':before')){injected=true;req.socket.destroy();return;}
  let value={},status=200;
  if(path==='/rest/api/3/search/jql'){
   if(body.jql.includes('labels = "pigboard"')){
    scan++;
    if(repair&&scan===2&&fault==='new-request:recheck'){
      const rows=comments.get(repair.ticket_id),request=structuredClone(rows.find(row=>row.id==='2007'));
      const extra=p.repair_admission.new_request;
      Object.assign(request,{id:extra.comment_id,created:extra.time,updated:extra.time});
      const node=request.body.content[0].content[0];
      assert(node.text.includes(extra.previous_record_id));
      node.text=node.text.replace(extra.previous_record_id,extra.record_id).replace('id: F1','id: F3').replace('id: F2','id: F4');
      rows.push(request);
      injected=true;
    }
   }
   if(hold==='incomplete shared discovery'){res.writeHead(403);res.end('{}');return;}
   if(!injected&&fault?.startsWith('source-check:')&&scan===2){injected=true;if(fault.endsWith(':before')){req.socket.destroy();return;}res.writeHead(403);res.end('{}');return;}
   const parentId=body.jql.match(/parent = "([0-9]+)"/)?.[1];const matches=body.jql.includes('labels = "pigboard"')?issues.filter(i=>i.fields.labels.includes('pigboard')):parentId?issues.filter(i=>i.fields.parent?.id===parentId):issues.filter(i=>i.fields.labels.includes(body.jql.match(/labels = "([^"]+)"/)?.[1]));
   const projectId=body.jql.match(/project = "([0-9]+)"/)?.[1];
   const labelRows=repairCase?.shortLabelSearch&&body.jql.includes('labels = "stream-2"')
    ?matches.map(issue=>issue.id==='1012'?{...issue,fields:{...issue.fields,description:null}}:issue)
    :matches;
   value={issues:moved?labelRows.filter(issue=>issue.fields.project.id===projectId):labelRows,isLast:true};
  }else{
   const m=path.match(/^\/rest\/api\/3\/issue\/([^/?]+)(.*)$/);assert(m);const issue=issues.find(i=>i.id===m[1]||i.key===m[1]||(repairCase?.oldIssueKey&&m[1]==='OLD-12'&&i.id==='1012'));assert(issue);const suffix=m[2],id=issue.id;
   if(mutation){
    events.push('jira:'+req.method+':'+path);
    const reservation=stateCalls.findLast(c=>c.name==='begin');
    assert.equal(reservation?.result?.status,'confirmed','Jira effects require confirmed original begin');
    if(repair){
      const expected=repair.mutations[mutations.length];
      assert.deepEqual({method:req.method,path},{method:expected?.method,path:expected?.path});
      if(suffix==='/comment'){
        const expectedBody=structuredClone(p.comment.body);
        const node=expectedBody.content[0].content[0];
        const sent=body?.body?.content[0].content[0].text;
        assert.deepEqual(JSON.parse(sent),repair.admission);
        node.text=sent;
        assert.deepEqual(body,{body:expectedBody});
        currentComment={...p.comment,body:expectedBody};
      }else assert.deepEqual(body,expected.body);
    }else{
      if(suffix==='/comment'){const record=JSON.parse(body.body.content[0].content[0].text);if(record.record_id===p.fresh_attempt_id){currentComment=p.fresh_comment;currentMutationOracle=p.oracle.fresh_mutations;}}
      assert.deepEqual({method:req.method,path,body},currentMutationOracle[mutations.length]);
    }
    mutations.push({method:req.method,path,body});
   }
   if(suffix.startsWith('?fields='))value=issue;
   else if(suffix==='/properties')value={keys:pointers.has(id)?[{key:'pigboard.work-context',self:config.jira.site+issueRoute(id,pointerSuffix)}]:[]};
   else if(suffix.startsWith('/comment?')){
    if(repairCase?.denyUnrelatedComments&&id==='1012'){
     value={errorMessages:['x'.repeat(1800)]};
     status=403;
    }else if(regression?.deny_comments?.some(d=>d.ticket_id===id&&d.acquisitions.includes(scan))){trace.at(-1).status=403;res.writeHead(403,{'content-type':'application/json'});res.end('{}');return;}
    else{
     const list=comments.get(id)??[],query=new URLSearchParams(suffix.split('?')[1]),startAt=Number(query.get('startAt'));
     const requested=Number(query.get('maxResults'));
     const maxResults=repairCase?.listedPageSize&&id===repair.ticket_id?Math.min(requested,repairCase.listedPageSize):requested;
     value={startAt,maxResults,total:list.length,comments:list.slice(startAt,startAt+maxResults)};
    }
   }
   else if(suffix==='/comment'&&req.method==='POST'){comments.set(id,[...(comments.get(id)??[]),currentComment]);value=currentComment;status=201;}
   else if(suffix.startsWith('/comment/')){
    const commentId=suffix.slice('/comment/'.length);
    value=(comments.get(id)??[]).find(row=>row.id===commentId);
    assert(value,'Exact comment must exist in the disposable Jira');
    if(repair&&scan===2&&fault==='wrong-own-reference:recheck'&&commentId===repair.oracle.new_exact_id){
      value={...value,updated:p.repair_admission.new_request.time};injected=true;
    }
    if(repairCase?.reorderExactBody&&scan===2&&commentId===repair.oracle.new_exact_id){
      value={...value,body:reverseObjectKeys(value.body)};
    }
   }
   else if(suffix==='/properties/pigboard.work-context'&&req.method==='PUT'){pointers.set(id,body);status=201;value=null;}
   else if(suffix==='/properties/pigboard.work-context')value={key:'pigboard.work-context',value:pointers.get(id)};
   else if(suffix==='/transitions'){
    if (sender) {
      const wire = {method: req.method, path, body};
      sender.at_send.push({wire, state: snapshot(), prepare_transaction: writeAudit().at(-1),
        pointer: structuredClone(pointers.get(id)), comment_observations: structuredClone(sender.comment_observations),
        jira_status: issue.fields.status.id});
      const {provider_request_id, private_reply_marker, private_header_marker} = p.sender_evidence;
      status = sendCase.wire_status;
      const headers = {'x-arequestid': provider_request_id, 'x-fixture-private': private_header_marker};
      const incomplete = sendCase.fault === 'transition:incomplete';
      const responseBody = incomplete || sendCase.error_body ? private_reply_marker : '';
      sender.provider_reply = {http_status: status, complete: !incomplete, body_bytes: Buffer.byteLength(responseBody)};
      if (incomplete) {
        injected = true;
        res.writeHead(status, {...headers, 'content-length': 500});
        res.write(responseBody, () => req.socket.destroy());
        return;
      }
      if (status === 204) issue.fields.status.id = '2';
      res.writeHead(status, headers);
      res.end(responseBody);
      return;
    }
    issue.fields.status.id='2';status=204;value=null;
   }
   else throw Error('Unexpected fixed fixture route');
  }
  if (sender && (status === 201 && boundary === 'comment' || req.method === 'GET' && path === issueRoute('1001', '/comment/' + p.comment.id))) {
    sender.comment_observations.push({method: req.method, ...nativeObservation(value, p.oracle.mutations[1].body.assignment)});
  }
  if(repair||moved)Object.assign(trace.at(-1),{acquisition:scan,status,response:structuredClone(value)});
  if(shouldFault){injected=true;if(repair)trace.at(-1).response_lost=true;req.socket.destroy();return;}
  res.writeHead(status,{'content-type':'application/json','x-arequestid':'fixture-request-1'});res.end(value===null?'':JSON.stringify(value));
 }catch(error){serverError=error;res.writeHead(500);res.end('{}');}});
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const original=https.request,uuid=crypto.randomUUID;
 https.request=(url,options,callback)=>{if(url.origin!=='https://api.atlassian.com')workerCalls++;assert.equal(url.origin,'https://api.atlassian.com');assert(url.pathname.startsWith('/ex/jira/00000000-0000-0000-0000-000000000001/rest/api/3/'));assert.equal(options.rejectUnauthorized,true);assert.equal(options.agent,false);assert.equal(options.headers['Accept-Encoding'],'identity');return original(new URL('https://localhost:'+server.address().port+url.pathname.replace('/ex/jira/00000000-0000-0000-0000-000000000001','')+url.search),{...options,hostname:'127.0.0.1',servername:'localhost',ca:tls.ca},callback);};
 crypto.randomUUID=()=>[p.attempt_id,p.fresh_attempt_id][uuidIndex++];syncBuiltinESMExports();
 let result,second,first;const stdout=process.stdout.write,info=console.info;if(host==='handler'){process.stdout.write=function(chunk,...args){if(typeof chunk!=='string'||!chunk.startsWith('{"summary":'))return stdout.call(this,chunk,...args);if(logFailure)throw Error('DUMMY_SECRET_LOG');healthLogs.push(JSON.parse(chunk));return true;};console.info=()=>{if(logFailure)throw Error('DUMMY_SECRET_LOG');};}try{
  const configText=JSON.stringify(config);
  const manifest={schema:'pigboard-manager-package/v1',runtime:'nodejs24.x',canonical_config:config,sender:true,source_revision:binding.package_revision,configuration_digest:binding.configuration_digest,installation_id:binding.installation_id,domain_id:binding.domain_id,installation_generation:binding.installation_generation};
  const environment={PB_STACK_ID:binding.stack_id,PB_TABLE_NAME:binding.table_name,PB_TABLE_ARN:binding.table_arn,PB_INSTALLATION_ID:binding.installation_id,PB_DOMAIN_ID:binding.domain_id,PB_INSTALLATION_GENERATION:binding.installation_generation,PB_PACKAGE_REVISION:binding.package_revision,PB_CONFIGURATION_DIGEST:binding.configuration_digest,PB_MODE:'apply',PB_WRITES_ENABLED:String(enabled)};
  const hostInvoke=runtime?.runApply??(host==='handler'?((event,dependencies)=>handler(event,{awsRequestId:p.producer_invocation_id},dependencies)):runApply);
  const invoke=()=>host||runtime?hostInvoke({operation:'apply'},{
    ...(runtime?{}:{configText,manifest}),environment,
    createState: supplied=>{
      if(runtime){assert.deepEqual(supplied.binding,binding);assert.deepEqual(supplied.control,control);}
      return {...state,close(){}};
    },
    secretFactory:()=>({resolveSecret:()=>{if(setupFailure)throw Error('DUMMY_SECRET_PROVIDER_BODY');return 'LOCAL_APPLY_DUMMY';},dispose(){}}),
    producer_invocation_id:p.producer_invocation_id,...(timeout?{monotonic:()=>-1000000000}:{}),now:()=>p.time,
    healthLog:r=>{if(logFailure)throw Error('DUMMY_SECRET_LOG');healthLogs.push(r);},log:r=>{if(logFailure)throw Error('DUMMY_SECRET_LOG');timingLogs.push(r);}
  }):applyOrdinary(configText,{binding,control,state,resolveSecret:()=> 'LOCAL_APPLY_DUMMY',producer_invocation_id:p.producer_invocation_id,deadline:performance.now()+600000});
  try {
    result=await invoke();
  } finally {
    restoreClock?.();
  }
  if(repair)first={records:provider.records(),trace_length:trace.length,state_call_count:stateCalls.length,provider_call_count:provider.audit.length-auditStart};
  if (sender) {
    sender.after = snapshot();
    sender.jira_status_after = issues.find(issue => issue.id === '1001').fields.status.id;
    sender.first_transactions = writeAudit();
    if (inspectSend) sender.inspection = await inspectSenderAttempt(cloud, p.attempt_id);
    assert.deepEqual(snapshot(), sender.after, 'inspection only reads the original attempt');
  }
  if(repeat)second=await invoke();
  if (sender) {
    sender.after_repeat = snapshot();
    sender.transactions_after_repeat = writeAudit();
  }
 }finally{process.stdout.write=stdout;console.info=info;https.request=original;crypto.randomUUID=uuid;syncBuiltinESMExports();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));}
 if(serverError)throw serverError;
 assert(!JSON.stringify(result).includes('LOCAL_APPLY_DUMMY'));
 const repairEvidence=repair?{
  input:{history_id:repairCase.historyId,configuration_digest:parsed.configuration_digest,configuration:config,competing_bug:repairCase.competingBug===true},
  first,initial_records:initialRecords,provider_calls:provider.audit.slice(auditStart),
  jira_final:{issues,comments:Object.fromEntries(comments),pointers:Object.fromEntries(pointers)},
  execution:{manager:runtime?'prepared_package':'source',jira:'simulated_tls_provider',aws:'simulated_dynamo_provider'}
 }:{};
 return {result,second,health_logs:healthLogs,timing_logs:timingLogs,records:provider.records(),state_calls:stateCalls,trace,mutations,events,injected,human_status:'NOT_RUN',worker_calls:workerCalls,...(sender?{sender}:{}),...repairEvidence};
}

function assertRepairJourney(evidence, testCase, expected) {
  const {result, first, trace, state_calls: calls, mutations, records} = evidence;
  const {status, code, stage, writes, fault} = testCase;
  const {ticket_id, history, published, admission, oracle} = expected;
  const originalAssignment = history.expected.assignment;
  assert.equal(result.status, status, JSON.stringify(result));
  assert.equal(result.code, code, testCase.id);
  assert.equal(result.apply.stage, stage, testCase.id);
  assert.equal(result.writes, writes);
  assert.equal(mutations.length, writes);
  assert.equal(evidence.worker_calls, 0);
  assert.equal(evidence.injected, Boolean(fault));
  const originalMember = evidence.initial_records.find(row => row.kind === 'member');
  assert.deepEqual(originalMember.assignment, originalAssignment);
  assert.deepEqual(trace.find(row => row.acquisition === 1 && row.path === issueRoute(ticket_id, pointerSuffix))?.response?.value,
    {schema: 'pigboard-work-pointer/v1', assignment: originalAssignment});
  if (testCase.competingBug) {
    const {id, fields} = packet.bug_issue;
    const candidate = trace.find(row => row.path.startsWith(issueRoute(id, '?fields=')))?.response;
    assert.equal(candidate?.fields.status.id, fields.status.id, 'Competing Bug is sorted and available in the same source scan.');
    assert.equal(candidate.fields.issuetype.id, fields.issuetype.id);
    assert.deepEqual(candidate.fields.labels, fields.labels);
    assert.equal(evidence.jira_final.issues.find(issue => issue.id === id).fields.status.id, fields.status.id);
    assert(!mutations.some(row => row.path.startsWith(issueRoute(id, '/'))));
  }
  if (!writes) {
    assert.deepEqual(calls.map(call => call.name), ['readInventory']);
    assert.deepEqual(records, evidence.initial_records);
    assert(!evidence.provider_calls.some(call => call.name === 'TransactWriteCommand'));
    assert(Object.values(result.apply.effects).every(effect => effect === 'not_attempted'));
    assert.equal(result.apply.attempt_id, null);
    const message = result.diagnostics.find(diagnostic => diagnostic.code === code)?.message;
    if (testCase.optOut) {
      assert.equal(result.apply.scope, null);
      assert.match(message, /review.*reason.*held streams/i);
      assert.doesNotMatch(message, /original attempt/i);
    } else {
      assert.equal(result.apply.ticket_id, ticket_id);
      assert.match(message, /selected ticket.*before starting an attempt/i);
    }
    if (testCase.commentBound) {
      const listed = trace.filter(row => row.path.includes('/comment?')).flatMap(row => row.response.comments);
      assert.equal(listed.length, packet.repair_admission.comment_bound);
      assert.equal(trace.filter(row => row.acquisition === 2).length, 0);
    }
    return;
  }

  assert.equal(result.apply.ticket_id, ticket_id);
  assert.equal(result.apply.attempt_id, published.record_id);
  assert.deepEqual(result.apply.scope, {site: history.config.jira.site, project_id: admission.payload.project_id, label: admission.payload.stream});
  const begin = calls.filter(call => call.name === 'begin');
  assert.equal(begin.length, 1);
  assert.equal(begin[0].result.status, 'confirmed');
  assert.deepEqual(begin[0].input.attempt, {
    attempt_id: published.record_id, ticket_id, epic_id: originalMember.epic_id, issue_key: 'EX-1',
    operation: 'admit_rework', source_status_id: '6', target_status_id: '2',
    configuration_digest: evidence.input.configuration_digest, cause: admission.payload.requests, publication: []
  });
  assert.deepEqual(begin[0].input.required_members.find(member => member.ticket_id === ticket_id)?.assignment, originalAssignment);
  const attempts = records.filter(row => row.kind === 'attempt');
  assert.equal(attempts.length, 1);
  const attempt = attempts[0];
  assert.equal(attempt.outcome, testCase.attempt_outcome??'applied');
  assert.equal(attempt.attempt_id, published.record_id);
  assert.deepEqual(attempt.cause, admission.payload.requests);
  const firstAttempt = first.records.find(row => row.kind === 'attempt');
  assert.deepEqual(attempt, firstAttempt);
  const stream = first.records.find(row => row.kind === 'stream');
  assert.equal(stream.pending_attempt_id, attempt.outcome === 'pending' ? published.record_id : null);

  const effectOrder = packet.oracle.effect_order.map(item => item.replace('/1001/', '/' + ticket_id + '/'));
  assert.deepEqual(evidence.events.slice(0, first.state_call_count + writes), effectOrder.slice(0, first.state_call_count + writes));
  const append = trace.findIndex(row => row.method === 'POST' && row.path === issueRoute(ticket_id, '/comment'));
  const originalComments = history.inspection.observations.comment_pages
    .find(page => page.ticket_id === ticket_id).comments;
  const finalComments = evidence.jira_final.comments[ticket_id];
  assert.deepEqual(finalComments.slice(0, originalComments.length), originalComments.map(nativeComment));
  assert.equal(finalComments.length, originalComments.length + (testCase.id === 'new-request' ? 2 : 1));
  const publishedComment = finalComments[originalComments.length];
  assert.equal(publishedComment.id, published.comment_id);
  assert.deepEqual(trace[append].response, publishedComment);
  assert.equal(Boolean(trace[append].response_lost), testCase.id === 'admission-append');
  assert.equal(publishedComment.author.accountId, 'manager');
  assert.equal(publishedComment.updateAuthor.accountId, 'manager');
  assert.equal(publishedComment.created, publishedComment.updated);
  assert.equal(result.apply.effects.intent, 'confirmed');
  if (writes >= 2) {
    const readback = trace[append + 1];
    assert.equal(readback.path, issueRoute(ticket_id, '/comment/' + published.comment_id));
    assert.equal(readback.method, 'GET');
    assert.deepEqual(readback.response, publishedComment);
    assert.deepEqual(attempt.publication, [published]);
    assert.equal(result.apply.effects.comment, 'confirmed');
    const pointerReadback = trace[append + 3];
    assert.equal(pointerReadback.path, issueRoute(ticket_id, pointerSuffix));
    assert.equal(pointerReadback.method, 'GET');
    assert.deepEqual(pointerReadback.response?.value, expected.mutations[1].body);
    assert.equal(Boolean(pointerReadback.response_lost), testCase.id === 'pointer-readback');
    assert.equal(result.apply.effects.pointer, testCase.id === 'pointer-readback' ? 'unconfirmed' : 'confirmed');
  } else {
    assert.equal(result.apply.effects.comment, 'unconfirmed');
    assert.deepEqual(attempt.publication, []);
  }

  if (['complete', 'recheck', 'transition', 'finalize'].includes(stage)) {
    const target = issueRoute(ticket_id, '/comment/' + oracle.new_exact_id);
    const firstRead = trace.slice(0, first.trace_length);
    const recheck = firstRead.filter(row => row.acquisition === 2);
    assert(!firstRead.some(row => row.acquisition === 1 && row.path === target), 'The cause becomes an exact target only after this admission.');
    const read = recheck.filter(row => row.path === target);
    assert.equal(read.length, 1);
    const before = originalComments.find(row => row.id === oracle.new_exact_id);
    if (testCase.id === 'wrong-own-reference') {
      assert.deepEqual(read[0].response, {...nativeComment(before), updated: packet.repair_admission.new_request.time});
    } else {
      const enumerated = nativeComment(before);
      assert.deepEqual(read[0].response, enumerated);
      if (testCase.reorderExactBody) {
        assert.notEqual(JSON.stringify(read[0].response.body), JSON.stringify(enumerated.body));
        assert.notDeepEqual(Object.keys(read[0].response.body.content[0]), Object.keys(enumerated.body.content[0]));
      }
    }
    const ownExact = recheck.filter(row => row.path === issueRoute(ticket_id, '/comment/' + published.comment_id));
    assert.equal(ownExact.length, 1);
    assert.deepEqual(ownExact[0].response, publishedComment);
    if (testCase.id === 'new-request') {
      const added = recheck.filter(row => row.path.startsWith(issueRoute(ticket_id, '/comment?')))
        .flatMap(row => row.response.comments).find(row => row.id === packet.repair_admission.new_request.comment_id);
      assert(added, 'Fresh enumeration contains the new request.');
      assert(added.body.content[0].content[0].text.includes(packet.repair_admission.new_request.record_id));
    }
  }

  const transition = trace.find(row => row.method === 'POST' && row.path === issueRoute(ticket_id, '/transitions'));
  const nativeTicket = evidence.jira_final.issues.find(row => row.id === ticket_id);
  assert.equal(nativeTicket.fields.status.id, writes === 3 ? '2' : '6');
  const retainedAssignment = records.find(row => row.kind === 'member' && row.ticket_id === ticket_id).assignment;
  assert.deepEqual(retainedAssignment, ['comment', 'pointer'].includes(stage) ? originalAssignment : published);
  if (writes === 3) {
    assert.equal(transition?.status, 204);
    const prepared = calls.find(call => call.name === 'prepareTransitionCapture');
    assert.equal(prepared.result.status, 'confirmed');
    assert.equal(prepared.input.attempt_id, published.record_id);
    assert.equal(prepared.input.transition_id, packet.repair_admission.edge.transition_id);
    assert.deepEqual(prepared.input.publication_observations.pointer, {mode: 'published', assignment: published});
  } else {
    assert.equal(transition, undefined);
    assert.equal(result.apply.effects.transition, 'not_attempted');
    assert.equal(result.apply.effects.finalization, 'not_attempted');
  }
  if (stage === 'complete' || stage === 'finalize') {
    const response = calls.find(call => call.name === 'recordTransitionResponse');
    assert.equal(response.result.status, 'confirmed');
    assert.equal(response.input.attempt_id, published.record_id);
    assert.equal(response.input.provider_request_id, 'fixture-request-1');
    assert.equal(response.input.http_status, 204);
    const finalize = calls.find(call => call.name === 'finalize');
    assert.equal(finalize.input.attempt_id, published.record_id);
    assert.deepEqual(finalize.input.evidence, {references: [published], disposition: 'confirmed_applied', actor_id: 'manager'});
    assert.equal(result.apply.effects.transition, 'confirmed');
    assert.equal(result.apply.effects.finalization, stage === 'complete' ? 'confirmed' : 'unconfirmed');
    assert.equal(finalize.result.status === 'confirmed', stage === 'complete');
  } else {
    assert(!calls.some(call => call.name === 'finalize'));
    if (stage === 'transition') {
      assert.equal(transition.response_lost, true);
      assert.equal(result.apply.effects.transition, 'unconfirmed');
      assert.equal(result.apply.effects.finalization, 'not_attempted');
      assert(!calls.some(call => call.name === 'recordTransitionResponse'));
    }
  }
  if (testCase.repeat) {
    assert.equal(evidence.second.status, 'held');
    assert.equal(evidence.second.writes, 0);
    assert.equal(evidence.second.apply.attempt_id, null);
    assert.deepEqual(calls.slice(first.state_call_count).map(call => call.name), ['readInventory']);
    assert(!evidence.provider_calls.slice(first.provider_call_count).some(call => call.name === 'TransactWriteCommand'));
    assert(trace.slice(first.trace_length).some(row => row.acquisition > trace[first.trace_length-1].acquisition));
    assert.deepEqual(records, first.records);
  }
  if (status === 'held') {
    const message = result.diagnostics.find(diagnostic => diagnostic.code === code)?.message;
    if (stage === 'transition' || stage === 'finalize') {
      assert(message.includes(published.record_id));
      assert.match(message, stage === 'transition' ? /reply could not be confirmed.*pending.*inspect.*State/i
        : /did not confirm.*finalized.*read-only State inspection/i);
    } else {
      assert.match(message, /inspect.*original attempt.*recorded effects.*state/i);
    }
  }
}

export async function runRepairGroup(group, {caseId, runtime} = {}) {
  const prescribed = packet.repair_admission.groups[group];
  assert(Array.isArray(prescribed), 'Use --group R3B-H01, R3B-H02 or R3B-H03.');
  const cases = caseId === undefined ? prescribed : prescribed.filter(item => item.id === caseId);
  assert(cases.length, 'Use a case listed in the selected group.');
  assert(!runtime || (group === 'R3B-H01' && caseId === 'reviewer'), 'The prepared package smoke uses the reviewer case.');
  const runs = [];
  for (const testCase of cases) {
    const evidence = await runApplyFixture({repairCase: testCase, fault: testCase.fault, repeat: testCase.repeat, runtime});
    assertRepairJourney(evidence, testCase, prepareRepairFixture(structuredClone(packet), testCase));
    runs.push({name: testCase.id, expectation: testCase, ...evidence});
  }
  const input_sha256 = crypto.createHash('sha256').update(readFileSync(new URL('../test/fixtures/manager-apply.json', import.meta.url))).digest('hex');
  return {group, runs, input_sha256, human_status: 'NOT_RUN'};
}

function senderState(rows) {
  return {
    installation: rows.find(row => row.kind === 'installation'),
    stream: rows.find(row => row.kind === 'stream'),
    attempt: rows.find(row => row.kind === 'attempt'),
    companion: rows.find(row => row.SK.startsWith('N#'))
  };
}

function assertAtomicSenderPrepare(prepare) {
  const before = senderState(prepare.before), after = senderState(prepare.after);
  assert.equal(before.companion, undefined);
  assert.equal(before.attempt.extensions.pb_capture_request_digest, undefined);
  assert.deepEqual(after.stream, before.stream);
  assert.equal(after.installation.revision, before.installation.revision + 1);
  assert.equal(after.attempt.revision, before.attempt.revision + 1);
  assert.equal(prepare.transactions.length, 1);
  const actions = prepare.transactions[0].input.TransactItems;
  assert.equal(actions.length, 4);
  for (const row of [before.installation, before.stream, before.attempt]) {
    const condition = actions.flatMap(action => Object.values(action)).find(action => action.Key?.SK === row.SK);
    assert.deepEqual(condition.Key, {PK: row.PK, SK: row.SK});
    assert.match(condition.ConditionExpression, /#revision = :revision/);
    assert.equal(condition.ExpressionAttributeValues[':revision'], row.revision);
  }
  const condition = actions.find(action => action.ConditionCheck).ConditionCheck;
  assert.match(condition.ConditionExpression, /pending_attempt_id = :pending/);
  assert.equal(condition.ExpressionAttributeValues[':pending'], before.attempt.attempt_id);
  const put = actions.find(action => action.Put).Put;
  assert.equal(put.ConditionExpression, 'attribute_not_exists(PK)');
  assert.deepEqual(put.Item, after.companion);
}

export function assertSenderJourney(evidence, testCase) {
  const {sender, result, second, mutations, health_logs} = evidence;
  const {before, at_send: sends, after, prepare, response, finalize, inspection} = sender;
  const rows = senderState(after);
  const {attempt, stream, companion} = rows;
  assert.equal(evidence.worker_calls, 0);
  assert.equal(sends.length, testCase.sends);
  assert.equal(mutations.filter(row => row.path === packet.oracle.mutations[2].path).length, testCase.sends);
  assert.equal(second.writes, 0);
  assert.deepEqual(sender.after_repeat, after);
  assert.deepEqual(sender.transactions_after_repeat, sender.first_transactions);
  assert.equal(attempt.attempt_id, packet.attempt_id);
  assert.equal(attempt.outcome, testCase.outcome);
  const status = attempt.extensions.pb_capture_status ?? null;
  assert.equal(status, testCase.saved_status);
  const applied = attempt.outcome === 'applied';
  assert.equal(stream.pending_attempt_id, applied ? null : packet.attempt_id);
  assert.equal(result.status, applied && !testCase.fault ? 'applied' : 'held');
  if (testCase.result_code) assert.equal(result.code, testCase.result_code, JSON.stringify(result.diagnostics));
  if (!testCase.legacy) assert.equal(result.apply.attempt_id, packet.attempt_id);
  if (testCase.legacy) {
    assert.deepEqual(after, before);
    assert.equal(companion, undefined);
    assert.equal(sender.first_transactions.length, 0);
  } else if (!prepare?.after.some(row => row.SK.startsWith('N#'))) {
    assert.equal(companion, undefined);
    assert.deepEqual(prepare.after, prepare.before);
    assert.equal(prepare.status, testCase.fault === 'prepare:rejected' ? 'conflict' : 'uncertain');
  } else {
    assertAtomicSenderPrepare(prepare);
    assert.deepEqual(companion, senderState(prepare.after).companion);
    assert.equal(prepare.status, sends.length || testCase.expireAfterPrepare ? 'confirmed' : 'uncertain');
  }

  if (sends.length) {
    const {provider_reply: reply} = sender;
    assert.equal(reply.http_status, testCase.wire_status);
    assert.equal(reply.complete, testCase.fault !== 'transition:incomplete');
    assert.equal(reply.body_bytes > 0, !reply.complete || testCase.error_body === true);
  }
  for (const send of sends) {
    assert.deepEqual(send.wire, packet.oracle.mutations[2]);
    assert.equal(send.jira_status, '1');
    assert.deepEqual(send.state, prepare.after);
    assert.deepEqual(send.prepare_transaction, prepare.transactions[0]);
    const assignment = packet.oracle.mutations[1].body.assignment;
    assert.deepEqual(send.pointer, {schema: 'pigboard-work-pointer/v1', assignment});
    const original = {
      reference: assignment, author_id: packet.comment.author.accountId, update_author_id: packet.comment.updateAuthor.accountId,
      created: packet.sender_evidence.timestamp, updated: packet.sender_evidence.timestamp
    };
    assert.deepEqual(send.comment_observations.map(row => row.method), ['POST', 'GET', 'GET']);
    for (const {method, ...observed} of send.comment_observations) assert.deepEqual(observed, original);
    const atSend = senderState(send.state);
    assert.deepEqual(atSend.attempt.publication, [assignment]);
    assert.equal(atSend.stream.pending_attempt_id, attempt.attempt_id);
    assert.equal(atSend.attempt.extensions.pb_capture_status, null);
    const commitment = senderCommitment(atSend.attempt, original, assignment, send.wire);
    assert.deepEqual(atSend.companion, {
      PK: atSend.attempt.PK, SK: 'N#' + attempt.attempt_id, schema: 'pigboard-native-publication/v1',
      installation_id: atSend.attempt.installation_id, site: atSend.attempt.site, attempt_id: attempt.attempt_id,
      ...commitment, comments: [original]
    });
    assert.equal(atSend.attempt.extensions.pb_capture_publication_digest, commitment.publication_digest);
    assert.equal(atSend.attempt.extensions.pb_capture_request_digest, commitment.request_digest);
    assert.equal(attempt.extensions.pb_capture_request_digest, commitment.request_digest);
    assert.equal(sender.jira_status_after, testCase.wire_status === 204 ? '2' : '1');
  }

  if (status !== null && !testCase.legacy) {
    assert.equal(attempt.extensions.pb_capture_provider_request_id, packet.sender_evidence.provider_request_id);
    assert.match(attempt.extensions.pb_capture_received_at, /^\d{4}-\d{2}-\d{2}T.*Z$/);
    assert.equal(response.transactions.length, 1);
    assert.equal(response.transactions[0].input.TransactItems.length, 3);
  }
  if (testCase.fault === 'transition:incomplete') {
    assert.equal(response, undefined);
    assert.deepEqual(after, prepare.after);
    assert.equal(result.apply.effects.transition, 'unconfirmed');
    assert.equal(result.apply.stage, 'transition');
    const message = result.diagnostics[0].message;
    assert(message.includes(attempt.attempt_id));
    assert.match(message, /reply could not be confirmed.*pending.*inspect.*State/i);
  }
  if (testCase.fault?.startsWith('response:')) {
    assert.equal(response.status, 'uncertain');
    assert.equal(response.transactions.length, 1);
    if (testCase.fault === 'response:before') assert.deepEqual(response.after, response.before);
    assert.match(result.diagnostics[0].message, /read-only State inspection/i);
    assert(result.diagnostics[0].message.includes(attempt.attempt_id));
    assert.equal(result.apply.effects.transition, testCase.wire_status === 204 ? 'confirmed' : 'unconfirmed');
  }
  if (testCase.fault?.startsWith('finalize:')) {
    assert.equal(response.status, 'confirmed');
    assert.equal(finalize.status, 'uncertain');
    assert.equal(finalize.transactions.length, 1);
    assert.equal(result.apply.effects.transition, 'confirmed');
    assert.equal(result.apply.effects.finalization, 'unconfirmed');
    assert.equal(senderState(finalize.before).stream.pending_attempt_id, attempt.attempt_id);
    assert.deepEqual(finalize.before, response.after);
    assert.match(result.diagnostics[0].message, /read-only State inspection/i);
    assert(result.diagnostics[0].message.includes(attempt.attempt_id));
  }
  if (!applied && !testCase.legacy && !testCase.fault?.startsWith('finalize:')) {
    assert.equal(result.apply.effects.finalization, 'not_attempted');
    assert.equal(finalize, undefined);
  }
  if (testCase.result_code === 'TRANSITION_REJECTED' || testCase.result_code === 'TRANSITION_RESPONSE_UNSUPPORTED') {
    assert.equal(result.apply.stage, 'retain_response');
    assert.equal(result.apply.effects.transition, 'unconfirmed');
    assert(result.diagnostics.some(diagnostic => diagnostic.message.includes(attempt.attempt_id) && /pending/i.test(diagnostic.message)));
    assert(result.summary.reason_codes.includes(testCase.result_code));
    assert(health_logs.some(log => log.summary.reason_codes.includes(testCase.result_code)));
  }
  if (inspection) {
    const {PK, SK, ...record} = attempt;
    assert.deepEqual(inspection.json.data.records, [record]);
    if (status !== null) assert(inspection.readable.includes('Original HTTP response: ' + status));
    if (!applied) assert(inspection.readable.includes('Pending hold: ' + attempt.attempt_id));
  }
  const retained = JSON.stringify(evidence);
  for (const marker of [packet.sender_evidence.private_reply_marker, packet.sender_evidence.private_header_marker, 'LOCAL_APPLY_DUMMY']) {
    assert(!retained.includes(marker), 'Do not retain private provider material');
  }
}

export async function runSenderGroup(group, {caseId} = {}) {
  const cases = packet.sender_evidence.groups[group]?.filter(testCase => caseId === undefined || testCase.id === caseId);
  assert(cases?.length, 'Use SEND-H01 or SEND-H02 and an optional listed case.');
  const runs = [];
  for (const testCase of cases) {
    const evidence = await runApplyFixture({sendCase: testCase, repeat: true, host: 'handler', inspectSend: true});
    assertSenderJourney(evidence, testCase);
    const {sender, result, second, worker_calls} = evidence;
    const outcome = ({status, code, writes, apply, diagnostics}) => ({status, code, writes, apply, diagnostics});
    const {before, at_send, after, provider_reply, prepare, response, finalize, inspection, first_transactions} = sender;
    const phase = value => value && {before: value.before, after: value.after, status: value.status, code: value.code,
      transaction_count: value.transactions.length};
    runs.push({
      name: testCase.id, worker_calls, result: outcome(result), repeat: outcome(second), transition_posts: at_send.length,
      before, at_send, after, provider_reply, prepare: phase(prepare), response: phase(response),
      finalize: phase(finalize), transactions: first_transactions, inspection, state_unchanged_after_repeat: true
    });
  }
  return {group, runs, input_sha256: crypto.createHash('sha256').update(readFileSync(new URL('../test/fixtures/manager-apply.json', import.meta.url))).digest('hex'),
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: fileURLToPath(new URL('..', import.meta.url)), encoding:'utf8'}).trim(),
    command: ['node', 'scripts/test-manager-apply.mjs', '--group', group, ...(caseId ? ['--case', caseId] : [])],
    human_status: 'NOT_RUN'};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 if(process.argv.length>2){
  const [groupOption, group, caseOption, caseId, ...extra] = process.argv.slice(2);
  assert(groupOption==='--group' && (caseOption===undefined || caseOption==='--case' && caseId) && !extra.length);
  const run = packet.sender_evidence.groups[group] ? runSenderGroup : runRepairGroup;
  console.log(JSON.stringify(await run(group,{caseId})));
 }else{
 const groups=['R1-17-H01 ordinary admission and no replay','R1-17-H02 uncertain intent','R1-17-H03 global-only transition'];
 const runs=[];for(const [name,options] of [[groups[0],{repeat:true}],[groups[1],{fault:'intent:after',repeat:true}],[groups[2],{global:true}]]){const evidence=await runApplyFixture(options);assert.equal(evidence.result.status,name===groups[0]?'applied':'held');assert.equal(evidence.worker_calls,0);runs.push({name,...evidence});}
 console.log(JSON.stringify({groups:runs,human_status:'NOT_RUN'}));
 }
}
