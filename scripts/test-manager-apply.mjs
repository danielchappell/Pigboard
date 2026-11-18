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
import {bindInstallation,configureInstallation,resolveInstallation,sha256} from '../lib/aws/installation.mjs';
import {synthesizeTemplate} from '../lib/aws/template.mjs';
import {operatorActorId,transitionProof} from '../lib/state/contract.mjs';
import {runStateCommand} from './manager-state.mjs';
import {packageManager} from './package-manager.mjs';
export const packet=JSON.parse(readFileSync(new URL('../test/fixtures/manager-apply.json',import.meta.url),'utf8'));
const tls=JSON.parse(readFileSync(new URL('../test/fixtures/jira-preview-tls.json',import.meta.url),'utf8'));
const issueRoute = (ticket, suffix) => '/rest/api/3/issue/' + ticket + suffix;
const pointerSuffix = '/properties/pigboard.work-context';
const recoveryToken = 'LOCAL_RECOVERY_DUMMY';
const recoveryArn = 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:pigboard-recovery-abcdef';
const reconciliationFixture=JSON.parse(readFileSync(new URL('../test/fixtures/reconciliation.json',import.meta.url),'utf8'));

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
    assert(audit.length > 0 && audit.every(call => call.identity === 'SELECTED_OPERATOR' && /^(Get|Query|Describe|TransactGet)/.test(call.action)));
    assert(cloud.destroyed.length > disposed);
    return {args, readable: readable.stdout, json: JSON.parse(json.stdout), audit};
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

const operatorProfile='operator';
const at=(kind,records)=>records.find(record=>record.kind===kind);
const writes=audit=>audit.filter(({name})=>name==='TransactWriteCommand');
const roleSession=(account,session,role='pigboard-operator')=>({
  Account:account,UserId:'AROAEXAMPLE:'+session,Arn:'arn:aws:sts::'+account+':assumed-role/'+role+'/'+session
});

async function prepareSettlementInstallation(spec){
  const {fixtureCloud,policyPermits}=await import('./test-aws-manager.mjs');
  const {originalInstall,sender,stopped,directory}=spec;
  const cloud=fixtureCloud(originalInstall.canonical_config,{},originalInstall);
  const template=synthesizeTemplate(JSON.stringify(cloud.config),originalInstall);
  const operatorPolicy=template.Metadata.Pigboard.operator_policy;
  const runtimePolicy=template.Resources.RuntimeRole.Properties.Policies[0].PolicyDocument;
  const fixture={
    ...cloud, directory, session:reconciliationFixture.operator_sessions.init,
    configPath:join(directory,'current.json'), installationPath:join(directory,'current-installation.json'),
    operatorPolicy, runtimePolicy, policyPermits
  };
  const {sdk,makeClient}=cloud.dependencies;
  fixture.dependencies={
    ...cloud.dependencies,
    makeClient(kind,options){
      const client=kind==='SecretsManager'?{destroy(){}}:makeClient(kind,options);
      fixture.sequence?.push({event:'client',kind,identity:options.credentials.accessKeyId});
      const identity=options.credentials.accessKeyId;
      assert(['SELECTED_OPERATOR','SELECTED_DEPLOYER'].includes(identity));
      assert.equal(options.maxAttempts,1);
      return {...client,destroy(){fixture.sequence?.push({event:'disposed',kind,identity});client.destroy();},async send(command,sendOptions){
        const action=command.constructor.name;
        const entry={event:'aws',identity,kind,action};
        fixture.sequence?.push(entry);
        if(action==='GetCallerIdentityCommand'&&identity==='SELECTED_OPERATOR'){
          // Preserve the actual fixture's STS audit, replacing only the native response.
          await client.send(command,sendOptions);
          return roleSession(cloud.config.manager.aws.account_id,fixture.session,fixture.wrongActor?'pigboard-runtime':'pigboard-operator');
        }
        if(kind==='SecretsManager'){
          assert.equal(action,'GetSecretValueCommand');
          assert.equal(command.input.SecretId,recoveryArn);
          assert(sendOptions.abortSignal instanceof AbortSignal);
          entry.selector='recovery ARN';
          return {ARN:recoveryArn,SecretString:recoveryToken};
        }
        if(kind==='DynamoDBDocument'){
          const items=command.input.TransactItems;
          const enclosing=action==='TransactWriteCommand'?'TransactWriteItems':action==='TransactGetCommand'?'TransactGetItems':undefined;
          const accesses=items?items.map(item=>{
            const [operation,value]=Object.entries(item)[0];
            return {permission:operation+'Item',key:(value.Key??value.Item).PK};
          }):['GetCommand','PutCommand','UpdateCommand','DeleteCommand'].includes(action)?
            [{permission:action.replace('Command','Item'),key:(command.input.Key??command.input.Item).PK}]:
            action==='QueryCommand'?[{permission:'Query',key:command.input.ExpressionAttributeValues[':pk']}]:[];
          if(accesses.length){
            entry.keys=accesses.map(({key})=>key);
            entry.evaluated_policy=fixture.policy??'operator';
            const policy=entry.evaluated_policy==='runtime'?runtimePolicy:operatorPolicy;
            for(const {permission,key} of accesses){
              const protectedKey=key.startsWith('operator-decision#');
              if(protectedKey&&fixture.denyProtectedRead&&permission==='GetItem'||
                  !policyPermits(policy,'dynamodb:'+permission,cloud.binding.table_arn,{enclosing,leadingKeys:[key]})){
                entry.denied=true;
                throw Object.assign(Error('Fixture policy denied the operation'),{name:'AccessDeniedException'});
              }
            }
          }
          if(fixture.beforeState)await fixture.beforeState(command);
        }
        return client.send(command,sendOptions);
      }};
    },
    currentStopGeneration:async scope=>{
      fixture.sequence?.push({event:'stop-generation',scope});
      return fixture.generation?{status:'confirmed',data:structuredClone(fixture.generation)}:{status:'unavailable'};
    },
    wait:async ms=>fixture.waits.push(ms)
  };
  fixture.waits=[];
  const initialText=JSON.stringify(fixture.config);
  const initial=await bindInstallation({configText:initialText,manifest:originalInstall,stackId:fixture.stackId,operatorProfile},fixture.dependencies);
  await writeFile(fixture.configPath,initialText);
  await writeFile(fixture.installationPath,JSON.stringify(initial));
  fixture.sequence=[];
  const initBefore=fixture.provider.snapshot(), initFrom=fixture.provider.audit.length;
  const initArgs=['init','--config',fixture.configPath,'--installation',fixture.installationPath,'--operator-profile',operatorProfile,'--json'];
  const init=await runStateCommand(initArgs,{resolveInstallation:input=>resolveInstallation(input,fixture.dependencies)});
  const initAudit=fixture.sequence;
  fixture.sequence=null;
  assert.equal(init.exitCode,0,init.stdout);
  assert(!initAudit.some(call=>call.kind==='SecretsManager'));
  const initializationWrites=writes(fixture.provider.audit.slice(initFrom));
  assert.equal(initializationWrites.length,1);
  assert.equal(initializationWrites[0].input.TransactItems.length,2,'Initialization atomically writes State and original protected origin');
  fixture.origin=structuredClone([...fixture.provider.rows.values()].find(row=>row.SK==='ORIGIN'));
  assert(fixture.origin,'Fresh initialization owns the protected origin');
  fixture.initialization={...init,command:['node','scripts/manager-state.mjs',...initArgs],
    before:JSON.parse(initBefore),after:JSON.parse(fixture.provider.snapshot()),audit:initAudit};
  const initializedSnapshot=fixture.provider.snapshot(), initializedAudit=fixture.provider.audit.length;
  const rebound=await bindInstallation({configText:initialText,manifest:originalInstall,stackId:fixture.stackId,operatorProfile},fixture.dependencies);
  assert.deepEqual(rebound.original,initial.original);
  assert.equal(fixture.provider.snapshot(),initializedSnapshot);
  assert.equal(fixture.provider.audit.length,initializedAudit,'Repeat bind has no State write or scan authority');
  fixture.carryForward=async manifest=>{
    const {canonical_config:config}=manifest;
    const manifestPath=join(directory,'manifest.json'),assetPath=join(directory,'asset.json');
    await writeFile(fixture.configPath,JSON.stringify(config));
    await writeFile(manifestPath,JSON.stringify(manifest));
    await writeFile(assetPath,JSON.stringify({bucket:'fixture-only',key:'package.zip',version:'fixture-version',zip_digest:manifest.zip_digest}));
    fixture.cloud.nextCodeHash=Buffer.from(manifest.zip_digest.slice(7),'hex').toString('base64');
    const result=await configureInstallation({configPath:fixture.configPath,installationPath:fixture.installationPath,manifestPath,assetPath,
      operatorProfile,deployerProfile:'deployer'},fixture.dependencies);
    assert.equal(result.status,'configured',JSON.stringify(result));
    assert.deepEqual(result.receipt.original,initial.original);
    assert.deepEqual([...fixture.provider.rows.values()].find(row=>row.SK==='ORIGIN'),fixture.origin);
    await writeFile(fixture.installationPath,JSON.stringify(result.receipt));
    return result.receipt;
  };
  fixture.senderReceipt=await fixture.carryForward(sender);
  fixture.senderReceiptPath=join(directory,'sender-receipt.json');
  await writeFile(fixture.senderReceiptPath,JSON.stringify(fixture.senderReceipt));
  fixture.binding=fixture.senderReceipt.binding;
  fixture.stoppedManifest=stopped;
  return fixture;
}

function prepareStop(cloud,receipt,{incomplete=false}={}){
  const {binding}=receipt, {schedule,function:lambda,asyncConfig,table,codeHash}=cloud.cloud;
  const scope={
    installation_id:binding.installation_id,domain_id:binding.domain_id,site:binding.site,
    stack_id:binding.stack_id,table_arn:binding.table_arn,table_id:table.TableId,
    installation_generation:binding.installation_generation
  };
  const bounds=reconciliationFixture.bounds;
  // This fixture producer spells out its wire commitments independently of the
  // evaluator. Drift in the canonical contract must break the positive path.
  assert.equal(schedule.Target.RetryPolicy.MaximumEventAgeInSeconds,bounds.scheduler_maximum_event_age_seconds);
  assert.equal(asyncConfig.MaximumEventAgeInSeconds,bounds.lambda_maximum_event_age_seconds);
  assert.equal(lambda.Timeout*1000,bounds.invocation_timeout_ms);
  assert.equal(receipt.manifest.canonical_config.jira.read_bounds.request_timeout_ms,bounds.request_timeout_ms);
  const resource_digest=sha256(canonicalize(['pigboard-stop-resources/v1',scope,
    {arn:schedule.Arn,group:schedule.GroupName,name:schedule.Name,expression:schedule.ScheduleExpression,
      window_mode:schedule.FlexibleTimeWindow.Mode,target_arn:schedule.Target.Arn,role_arn:schedule.Target.RoleArn,input:schedule.Target.Input},
    {arn:lambda.FunctionArn,async_arn:asyncConfig.FunctionArn,qualifier:'$LATEST',code_hash:codeHash,
      role_arn:lambda.Role,handler:lambda.Handler,runtime:lambda.Runtime},
    {configuration_digest:binding.configuration_digest,package_revision:binding.package_revision}]));
  const bounds_digest=sha256(canonicalize(['pigboard-stop-bounds/v1',resource_digest,bounds]));
  const window_ms=1000*(bounds.scheduler_maximum_event_age_seconds+bounds.lambda_maximum_event_age_seconds)+
    bounds.invocation_timeout_ms+bounds.request_timeout_ms;
  const installation=at('installation',cloud.provider.records());
  const {stop_id,operator_sessions}=reconciliationFixture;
  const stopActor=roleSession(cloud.config.manager.aws.account_id,operator_sessions.stop);
  const completed=Date.now(),elapsed=incomplete?window_ms-1:window_ms;
  const fence=installation.revision+1;
  const stop={
    pb_stop_version:1,pb_stop_id:stop_id,pb_stop_actor:operatorActorId({account_id:stopActor.Account,user_id:stopActor.UserId}),
    pb_stop_config_digest:binding.configuration_digest,pb_stop_package_revision:binding.package_revision,
    pb_stop_resource_digest:resource_digest,pb_stop_bounds_digest:bounds_digest,pb_stop_fence_revision:fence,
    pb_stop_started_at:new Date(completed-elapsed).toISOString(),pb_stop_window_ms:window_ms,
    pb_stop_completed_at:new Date(completed).toISOString(),pb_stop_elapsed_ms:elapsed
  };
  cloud.provider.seed({...installation,revision:fence,extensions:{...installation.extensions,...stop}});
  cloud.generation={...scope,producer_generation:'pigboard-stop-producer/v1',stop_id,fence_revision:fence,
    configuration_digest:binding.configuration_digest,package_revision:binding.package_revision,resource_digest,bounds_digest};
  cloud.cloud.concurrency=0;
  return {stop,scope,bounds,generation:structuredClone(cloud.generation)};
}

async function restartWithNewerAttempt(cloud,original,stopped){
  const sender=await cloud.carryForward(cloud.senderReceipt.manifest);
  const {provider}=cloud;
  const installed=at('installation',provider.records()), stream=at('stream',provider.records()), member=at('member',provider.records());
  const state=createDynamoState({binding:sender.binding,control:{configuration_digest:sender.binding.configuration_digest,
    schedule_enabled:true,writes_enabled:true,maintenance:false},client:provider});
  const newer=await state.begin({expected_installation_revision:installed.revision,expected_stream_revision:stream.revision,
    stream:{site:stream.site,project_id:stream.project_id,label:stream.label},
    attempt:{attempt_id:packet.fresh_attempt_id,ticket_id:original.ticket_id,epic_id:original.epic_id,issue_key:original.issue_key,
      operation:original.operation,source_status_id:original.source_status_id,target_status_id:original.target_status_id,
      configuration_digest:sender.binding.configuration_digest,cause:[],publication:[]},
    required_members:[{site:member.site,project_id:member.project_id,label:member.label,ticket_id:member.ticket_id,
      epic_id:member.epic_id,assignment:member.assignment,expected_revision:member.revision}],
    now:new Date().toISOString()});
  assert.equal(newer.status,'confirmed',JSON.stringify(newer));
  await cloud.carryForward(stopped);
  cloud.cloud.concurrency=0;
  // Resume the historical journey with no current completed stop authority.
  cloud.generation=null;
}

async function settlementFixture({cloud,evidenceCase,evidenceIO,attemptId,native}){
  const {provider,stoppedManifest}=cloud;
  const {id,code,fault}=evidenceCase.settlement;
  const stopped=await cloud.carryForward(stoppedManifest);
  const stop=prepareStop(cloud,stopped,{incomplete:id==='in_flight_invocation'});
  const original=at('attempt',provider.records());
  const stream=at('stream',provider.records()),installation=at('installation',provider.records());
  const {operator_sessions:sessions}=reconciliationFixture;
  const requestPath=join(cloud.directory,'request.json');
  const scope=['--original-installation',cloud.senderReceiptPath];
  const flags=['--config',cloud.configPath,'--installation',cloud.installationPath,'--operator-profile',operatorProfile];
  const inspect=['inspect',...flags,'--kind','attempt','--record-id','attempt:'+attemptId];
  const reconcileArgs=['reconcile',...flags,'--request',requestPath,...scope];
  const request={schema:'pigboard-reconciliation-request/v1',attempt_id:attemptId,
    expected_installation_revision:installation.revision,expected_stream_revision:stream.revision,
    expected_attempt_revision:id==='stale_revision'?original.revision-1:original.revision,
    disposition:evidenceCase.sendCase.saved_status===409?'confirmed_not_applied':'confirmed_applied'};
  await writeFile(requestPath,JSON.stringify(request));
  const commands=[];
  async function invoke(args,{productionStop=false,allowExternalChange=false}={}){
    const before=provider.snapshot(), nativeBefore=native(), start=provider.audit.length;
    const closedRequest=args[0]==='reconcile'?JSON.parse(readFileSync(requestPath,'utf8')):undefined;
    const requestStart=evidenceIO.requests.length;
    const sequence=[];
    cloud.sequence=evidenceIO.sequence=sequence;
    evidenceIO.active=true;
    const dependencies={...cloud.dependencies};
    if(productionStop)delete dependencies.currentStopGeneration;
    let answer;
    try{
      answer=await runStateCommand(args,{resolveInstallation:input=>resolveInstallation(input,dependencies)});
    }finally{
      evidenceIO.active=false;
      cloud.sequence=evidenceIO.sequence=null;
    }
    const after=provider.snapshot(), nativeAfter=native(), audit=provider.audit.slice(start);
    const stateWrites=writes(audit);
    assert.deepEqual(nativeAfter,nativeBefore,'Operator paths preserve original issues, comments, pointer and history');
    assert(evidenceIO.requests.slice(requestStart).every(call=>call.method==='GET'||call.path==='/rest/api/3/search/jql'));
    assert.equal(sequence.filter(e=>e.event==='client').length,sequence.filter(e=>e.event==='disposed').length);
    assert(sequence.some(e=>e.action==='GetCallerIdentityCommand'),'Operator dispatch verifies a fresh principal');
    const entry={...answer,command:['node','scripts/manager-state.mjs',...args],
      ...(closedRequest?{closed_request:closedRequest}:{}),state_before:JSON.parse(before),state_after:JSON.parse(after),jira_before:nativeBefore,jira_after:nativeAfter,
      ordered_audit:sequence,state_writes:stateWrites};
    if(args[0]==='inspect'){
      assert.equal(stateWrites.length,0);
      if(!allowExternalChange)assert.equal(before,after,'Inspection is read-only');
      if(!args.includes('--jira-evidence')){
        assert(!sequence.some(e=>e.kind==='SecretsManager'||e.event==='jira'||e.event==='stop-generation'));
      }
    }
    if(args.includes('--json'))assert.deepEqual(JSON.parse(answer.stdout),answer.outcome);
    commands.push(entry);
    return entry;
  }
  const assertPending=answer=>{
    assert.equal(answer.exitCode,0,answer.stdout);
    assert.deepEqual(answer.outcome.data.records,[original]);
    assert.equal(at('stream',provider.records()).pending_attempt_id,attemptId);
    assert.deepEqual(transitionProof(at('attempt',provider.records())),transitionProof(original));
  };
  const assertNoWrite=answer=>{
    assert.equal(answer.state_writes.length,0);
    assert.deepEqual(answer.state_before,answer.state_after);
  };
  const assertNoJira=answer=>assert(!answer.ordered_audit.some(entry=>entry.event==='jira'||entry.kind==='SecretsManager'));
  const verifyTerminal=answer=>{
    assert.equal(answer.exitCode,0,answer.stdout);
    const stored=at('attempt',provider.records());
    assert.deepEqual(answer.outcome.data.records,[stored]);
    assert.equal(answer.outcome.data.operator_decision_provenance.status,'verified');
    assert.deepEqual(answer.outcome.data.operator_decision,decision);
    assertNoJira(answer);
  };
  let decision,policyAudit;
  cloud.session=sessions.submit;
  if(id==='runtime_terminal'){
    assert.equal(original.outcome,'applied');
    const ordinary=await invoke([...inspect,'--json']);
    assert.equal(ordinary.exitCode,0,ordinary.stdout);
    assert.deepEqual(ordinary.outcome.data.records,[original]);
    assert.equal(ordinary.outcome.data.operator_decision,undefined);
    assert.equal(ordinary.outcome.data.operator_decision_provenance.status,'absent');
    const refused=await invoke([...reconcileArgs,'--json']);
    assert.equal(refused.outcome.code,'OPERATOR_PROVENANCE_ABSENT',refused.stdout);
    assertNoWrite(refused);
    assertNoJira(refused);
  }else if(code){
    if(id==='enabled_runtime')cloud.cloud.schedule.State='ENABLED';
    if(id==='wrong_actor')cloud.wrongActor=true;
    if(id==='prior_stop')cloud.generation={...cloud.generation,stop_id:packet.fresh_attempt_id};
    if(id==='wrong_stop_scope')cloud.generation={...cloud.generation,table_id:'00000000-0000-4000-8000-000000000000'};
    if(id==='missing_stop')cloud.generation=null;
    if(id==='production_stop')assert(cloud.generation,'A local fixture observation exists but is not supplied by production');
    const held=await invoke([...reconcileArgs,'--json'],{productionStop:id==='production_stop'});
    assert.equal(held.outcome.code,code,held.stdout);
    assert(held.outcome.diagnostics.length>0,held.stdout);
    assertNoWrite(held);
    if(id==='absent_history'){
      assert(held.ordered_audit.some(e=>e.event==='jira'&&e.path.includes('/changelog?')&&e.status===403));
      assert.equal(transitionProof(original).http_status,evidenceCase.sendCase.saved_status);
    }
    if(id==='wrong_actor'){
      assert.deepEqual(held.ordered_audit.filter(e=>e.event==='aws').map(e=>e.action),['GetCallerIdentityCommand']);
      assert.equal(held.outcome.data,null);
    }
    cloud.wrongActor=false;
    cloud.session=sessions.restart;
    const read=await invoke([...inspect,...(id==='enabled_runtime'?['--recovery']:[]),'--json']);
    assertPending(read);
    assertNoWrite(read);
    assertNoJira(read);
  }else{
    const preflight=await invoke([...inspect,'--jira-evidence',...scope]);
    assert.equal(preflight.outcome.code,'OK',preflight.stdout);
    assert.equal(preflight.outcome.data.original_capture.http_status,evidenceCase.sendCase.saved_status);
    assert.equal(preflight.outcome.data.native_history.status,evidenceCase.history.length?'complete':'complete_empty');
    const faultHook=cloud.beforeState;
    if(fault)cloud.beforeState=async command=>{
      if(command.constructor.name==='TransactWriteCommand'){
        if(fault==='condition'){
          const change=command.input.TransactItems.find(item=>item.Update?.Key.SK.startsWith('S#')).Update;
          const revised={...stream,revision:stream.revision+1};
          provider.seed(revised);
          assert.equal(revised.record_id,change.Key.SK.slice(2));
        }else provider.fault=fault;
      }
      await faultHook?.(command);
    };
    const submitted=await invoke(fault?reconcileArgs:[...reconcileArgs,'--json']);
    cloud.beforeState=faultHook;
    assert.equal(submitted.state_writes.length,1);
    const tx=submitted.state_writes[0].input.TransactItems;
    assert.equal(tx.length,4,JSON.stringify(tx));
    assert.equal(tx.filter(item=>item.Update).length,3);
    const put=tx.find(item=>item.Put)?.Put;
    assert.equal(put?.ConditionExpression,'attribute_not_exists(PK)');
    assert.deepEqual([put.Item.PK,put.Item.SK],['operator-decision#'+stopped.binding.installation_id,'A#'+attemptId]);
    if(fault==='before'||fault==='condition'){
      assert.notEqual(submitted.exitCode,0,submitted.stdout);
      if(fault==='condition')assert.equal(at('stream',provider.records()).revision,stream.revision+1);
      else assert.deepEqual(submitted.state_after,submitted.state_before);
      assert(![...provider.rows.values()].some(row=>row.SK==='A#'+attemptId));
      assertPending(await invoke([...inspect,'--json']));
    }else{
      assert.equal(submitted.exitCode,0,submitted.stdout);
      assert.equal(submitted.outcome.code,fault==='after'?'ALREADY_SETTLED':'OPERATOR_SETTLED',submitted.stdout);
      decision=submitted.outcome.data.operator_decision;
      const final=at('attempt',provider.records());
      assert.equal(final.outcome,evidenceCase.sendCase.saved_status===409?'not_applied':'applied');
      assert.equal(final.revision,original.revision+1);
      assert.deepEqual(transitionProof(final),transitionProof(original));
      assert.deepEqual(final.publication,original.publication);
      assert.equal(at('stream',provider.records()).pending_attempt_id,null);
      const originalActor=roleSession(cloud.config.manager.aws.account_id,sessions.submit);
      assert.deepEqual(decision.actor,{account_id:originalActor.Account,user_id:originalActor.UserId,arn:originalActor.Arn});
      assert.deepEqual({...decision,PK:put.Item.PK,SK:put.Item.SK},put.Item);
      const before=new Map(submitted.state_before),after=new Map(submitted.state_after);
      const changed=[...after].filter(([key,row])=>!before.has(key)||canonicalize(before.get(key))!==canonicalize(row)).map(([,row])=>row);
      assert.deepEqual(changed.map(row=>row.kind??row.schema).sort(),['attempt','installation','pigboard-operator-decision/v1','stream']);
      assert.equal(decision.request_digest,transitionProof(original).request_digest);
      assert.equal(decision.publication_digest,original.extensions.pb_capture_publication_digest);
      assert.equal(decision.operator_request_digest,sha256(canonicalize({schema:'pigboard-operator-request-digest/v1',
        installation_id:stopped.binding.installation_id,installation_generation:stopped.binding.installation_generation,request})));
      verifyTerminal(await invoke(inspect));
      verifyTerminal(await invoke([...inspect,'--json']));
      if(fault==='after'){
        for(const session of [sessions.submit,sessions.readback]){
          cloud.session=session;
          const repeated=await invoke([...reconcileArgs,'--json']);
          assert.equal(repeated.outcome.code,'ALREADY_SETTLED',repeated.stdout);
          assert.deepEqual(repeated.outcome.data.operator_decision,decision);
          assertNoWrite(repeated);
          assertNoJira(repeated);
        }
        await writeFile(requestPath,JSON.stringify({...request,disposition:'confirmed_not_applied'}));
        const different=await invoke([...reconcileArgs,'--json']);
        assert.equal(different.outcome.code,'ALREADY_SETTLED_CONFLICT',different.stdout);
        assertNoWrite(different);
        assertNoJira(different);
      }
      if(id==='coherent_readback'){
        const pending=new Map(submitted.state_before),settled=new Map(submitted.state_after);
        for(const json of [false,true]){
          provider.rows=new Map(structuredClone(pending));
          cloud.beforeState=async command=>{
            if(command.constructor.name==='GetCommand'&&command.input.Key.SK==='A#'+attemptId){
              assert.equal(at('attempt',provider.records()).revision,original.revision);
              provider.rows=new Map(structuredClone(settled));
              cloud.beforeState=null;
            }
          };
          verifyTerminal(await invoke([...inspect,...(json?['--json']:[])],{allowExternalChange:true}));
          assert.equal(cloud.beforeState,null);
        }
        provider.rows=new Map(structuredClone(pending));
        cloud.denyProtectedRead=true;
        const unavailable=await invoke([...inspect,'--json']);
        assertPending(unavailable);
        assert.equal(unavailable.outcome.data.operator_decision,undefined);
        assert.equal(unavailable.outcome.data.operator_decision_provenance.status,'unavailable');
      }else if(id==='applied'){
        await restartWithNewerAttempt(cloud,final,stoppedManifest);
        cloud.session=sessions.restart;
        verifyTerminal(await invoke(inspect));
        verifyTerminal(await invoke([...inspect,'--json']));
        assert.equal(at('stream',provider.records()).pending_attempt_id,packet.fresh_attempt_id);
        assert(at('attempt',provider.records()).attempt_id===attemptId);
        cloud.policy='runtime';
        const denied=await invoke([...inspect,'--json']);
        assert.equal(denied.exitCode,0,denied.stdout);
        assert.deepEqual(denied.outcome.data.records,[final]);
        assert.equal(denied.outcome.data.operator_decision,undefined);
        assert.equal(denied.outcome.data.operator_decision_provenance.status,'unavailable');
        assert(denied.ordered_audit.some(entry=>entry.denied&&entry.keys.includes(put.Item.PK)));
        const {policyPermits,operatorPolicy,runtimePolicy}=cloud;
        const permits=(policy,permission,enclosing)=>policyPermits(policy,'dynamodb:'+permission,stopped.binding.table_arn,
          {enclosing,leadingKeys:[put.Item.PK]});
        assert(permits(operatorPolicy,'PutItem','TransactWriteItems'));
        assert(!permits(operatorPolicy,'PutItem'));
        assert(!permits(runtimePolicy,'PutItem','TransactWriteItems'));
        assert(!permits(runtimePolicy,'GetItem'));
        const {sdk,makeClient}=cloud.dependencies;
        policyAudit=[];
        cloud.sequence=policyAudit;
        const client=makeClient('DynamoDBDocument',{region:stopped.binding.region,maxAttempts:1,
          credentials:{accessKeyId:'SELECTED_OPERATOR',secretAccessKey:'dummy'}});
        try{
          const started=provider.audit.length, snapshot=provider.snapshot();
          await assert.rejects(client.send(new sdk.TransactWriteCommand({TransactItems:tx})),{name:'AccessDeniedException'});
          cloud.policy=null;
          await assert.rejects(client.send(new sdk.PutCommand({TableName:stopped.binding.table_name,Item:put.Item})),{name:'AccessDeniedException'});
          assert.equal(provider.audit.length,started);
          assert.equal(provider.snapshot(),snapshot);
        }finally{client.destroy();cloud.policy=null;cloud.sequence=null;}
      }
    }
  }
  const report={id,request,original_capture:transitionProof(original),installation:cloud.initialization,
    stopped_binding:stopped.binding,stop,commands,simulated_waits_ms:cloud.waits,...(policyAudit?{policy_audit:policyAudit}:{})};
  for(const marker of [recoveryToken,'LOCAL_APPLY_DUMMY',packet.sender_evidence.private_reply_marker,packet.sender_evidence.private_header_marker])
    assert(!JSON.stringify(report).includes(marker),'Operator evidence must omit provider-private values');
  return report;
}

async function inspectTransitionFixture({cloud,evidenceCase,evidenceIO,attemptId}) {
  const directory = await mkdtemp(join(tmpdir(), 'pigboard-jira-evidence-'));
  const {provider}=cloud;
  const {fixtureCloud}=await import('./test-aws-manager.mjs');
  const bind = authority => bindInstallation({
    configText:JSON.stringify(authority.config),manifest:authority.manifest,stackId:authority.stackId,operatorProfile:'operator'
  },authority.dependencies);
  try {
    const original=structuredClone(await bind(cloud));
    let current=cloud,receipt=original;
    if(evidenceCase.current){
      const manifest=evidenceCase.current;
      current=fixtureCloud(manifest.canonical_config,{},manifest);
      const {cloud:resources,binding}=current;
      const {controls}=current.config.manager;
      assert.equal(binding.table_arn,cloud.binding.table_arn);
      assert.equal(binding.installation_generation,cloud.binding.installation_generation);
      Object.assign(resources.function.Environment.Variables,{PB_MODE:controls.mode,PB_WRITES_ENABLED:String(controls.writes_enabled)});
      resources.schedule.Target.Input=JSON.stringify({operation:controls.mode});
      receipt=await bind(current);
      const row=provider.records().find(record=>record.kind==='installation');
      provider.seed({...row,revision:row.revision+1,configuration_digest:binding.configuration_digest,
        package_revision:binding.package_revision,writes_enabled:false,schedule_enabled:false});
    }
    if(evidenceCase.retainedAssignmentMismatch){
      const member=provider.records().find(record=>record.kind==='member'&&record.ticket_id==='1001');
      provider.seed({...member,revision:member.revision+1,assignment:null});
    }
    const configPath=join(directory,'config.json'),installationPath=join(directory,'installation.json');
    const originalPath=join(directory,'sender-receipt.json');
    const config=structuredClone(current.config);
    if(evidenceCase.alias)config.manager.aws.recovery_jira_secret_arn=config.jira.connection.secret_reference;
    if(evidenceCase.badOriginal)original.manifest.source_revision='0'.repeat(40);
    await writeFile(configPath,JSON.stringify(config));
    await writeFile(installationPath,JSON.stringify(receipt));
    if(evidenceCase.current&&!evidenceCase.omitOriginal)await writeFile(originalPath,JSON.stringify(original));
    const args=['inspect','--config',configPath,'--installation',installationPath,'--operator-profile','operator',
      '--kind','attempt','--record-id','attempt:'+attemptId];
    const scope=[...(evidenceCase.current&&!evidenceCase.omitOriginal?['--original-installation',originalPath]:[])];
    const attempts=provider.records().filter(record=>record.kind==='attempt');
    assert.equal(attempts.find(record=>record.attempt_id===attemptId)?.outcome,'pending');
    const audit=[],clients=[];
    const dependencies={...current.dependencies,makeClient(kind,options){
      assert.equal(options.credentials.accessKeyId,'SELECTED_OPERATOR');
      assert.equal(options.region,config.manager.aws.region);
      assert.equal(options.maxAttempts,1);
      // Every provider client is confined to this fixture. No default SDK client
      // may perform a lookup, and no mock accepts a sender secret selector.
      const client=kind==='SecretsManager'?{destroy(){}}:current.dependencies.makeClient(kind,options);
      const lifecycle={kind,closed:false};
      clients.push(lifecycle);
      return {...client,destroy(){client.destroy();lifecycle.closed=true;},async send(command,sendOptions){
        const action=command.constructor.name;
        const entry={kind,role:'selected operator',action};
        audit.push(entry);
        if(action==='GetCallerIdentityCommand'){
          const {account_id:account}=config.manager.aws;
          return {Account:account,Arn:`arn:aws:sts::${account}:assumed-role/${evidenceCase.wrongRole?'wrong-role':'pigboard-operator'}/fixture`,
            ...(evidenceCase.missingUserId?{}:{UserId:'AROAEXAMPLE:fixture'})};
        }
        if(kind==='SecretsManager'){
          assert.equal(action,'GetSecretValueCommand');
          assert(command.input.SecretId===recoveryArn,'Only the exact recovery secret may be looked up');
          assert(sendOptions.abortSignal instanceof AbortSignal);
          entry.selector='recovery ARN';
          if(evidenceCase.secretDenied)throw Object.assign(new Error('dummy secret denied'),{name:'AccessDeniedException',$metadata:{httpStatusCode:400}});
          return {ARN:evidenceCase.secretWrongArn?config.jira.connection.secret_reference:recoveryArn,SecretString:recoveryToken};
        }
        assert(/^(Get|Query|Describe|TransactGet)/.test(action),'Inspection cannot write State or mutate AWS');
        if(kind==='DynamoDBDocument'&&action!=='DescribeTableCommand'){
          if(evidenceCase.inventoryFailed&&action==='QueryCommand')throw new Error('simulated inventory read unavailable');
          const namedRead=action==='TransactGetCommand'&&command.input.TransactItems.some(({Get})=>Get.Key.SK.startsWith('A#'));
          if(namedRead)entry.named_snapshot=true;
          const closing=namedRead&&evidenceIO.requests.length>evidenceIO.requestStart;
          if(closing&&evidenceCase.fenceFailed)throw new Error('simulated closing read unavailable');
          const response=await provider.send(command,sendOptions);
          if(closing&&evidenceCase.fenceDrift){
            entry.fixture_external_revision_change=true;
            response.Responses.find(row=>row.Item?.kind==='stream').Item.revision++;
          }
          return response;
        }
        return client.send(command,sendOptions);
      }};
    }};
    const resolve=input=>resolveInstallation(input,dependencies);
    const invoke=async optionArgs=>{
      const before=provider.snapshot(),stateStart=provider.audit.length,auditStart=audit.length,clientStart=clients.length;
      evidenceIO.requestStart=evidenceIO.requests.length;
      evidenceIO.active=true;
      let output;
      try{output=await runStateCommand(optionArgs,{resolveInstallation:resolve});}
      finally{evidenceIO.active=false;}
      const after=provider.snapshot();
      assert.equal(after,before);
      const state=provider.audit.slice(stateStart).map(({name,abortSignal})=>({name,abortSignal}));
      assert(!state.some(call=>call.name==='TransactWriteCommand'));
      const http=evidenceIO.requests.slice(evidenceIO.requestStart),aws=audit.slice(auditStart);
      const secrets=aws.filter(call=>call.kind==='SecretsManager');
      assert(secrets.length<=1&&secrets.every(call=>call.selector==='recovery ARN'));
      assert(!http.length||secrets.length===1);
      assert(clients.slice(clientStart).every(client=>client.closed),'Every owned client was released');
      return {...output,command:['node','scripts/manager-state.mjs',...optionArgs],before:JSON.parse(before),after:JSON.parse(after),aws,state,http};
    };
    const normal=evidenceCase.omission?await invoke([...args,'--json']):null;
    const evidenceArgs=[...args,'--jira-evidence',...scope];
    const readable=await invoke(evidenceArgs),json=await invoke([...evidenceArgs,'--json']);
    assert.deepEqual(JSON.parse(json.stdout),json.outcome);
    assert.deepEqual(readable.outcome,json.outcome);
    assert.equal(readable.exitCode,json.exitCode);
    assert.deepEqual(readable.http,json.http);
    const {outcome}=json;
    const evidence={readable,json,normal,current:{binding:receipt.binding,zip_digest:receipt.manifest.zip_digest},
      original:{binding:original.binding,zip_digest:original.manifest.zip_digest}};
    for(const marker of [recoveryToken,'LOCAL_APPLY_DUMMY',packet.sender_evidence.private_reply_marker,packet.sender_evidence.private_header_marker])
      assert(!JSON.stringify(evidence).includes(marker),'Inspection evidence must redact provider-private material');
    assert.equal(outcome.schema,'pigboard-transition-inspection/v1');
    return evidence;
  }finally{await rm(directory,{recursive:true,force:true});}
}

/** Disposable providers only. No live URL, credential or transport option. */
export async function runApplyFixture({fault=null,global=false,repeat=false,hold=null,host=false,enabled=true,twoStreams=false,bug=false,variant=null,health=true,empty=false,logFailure=false,timeout=false,setupFailure=false,repairCase=null,runtime=null,sendCase=null,inspectSend=false,evidenceCase=null}={}){
 const p=structuredClone(packet),repair=repairCase?prepareRepairFixture(p,repairCase):null;
 const config=evidenceCase?structuredClone(evidenceCase.sender.canonical_config):repair?.config??p.config;
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
 if(evidenceCase?.settlement){
   cloud=await prepareSettlementInstallation(evidenceCase);
 }else if (inspectSend || evidenceCase) {
   const {fixtureCloud} = await import('./test-aws-manager.mjs');
   const base = fixtureCloud(config);
   cloud = fixtureCloud(config, {}, evidenceCase?.sender ?? {...base.manifest, sender: true});
   Object.assign(cloud.cloud.function.Environment.Variables, {PB_MODE: 'apply', PB_WRITES_ENABLED: 'true'});
   cloud.cloud.schedule.Target.Input = JSON.stringify({operation: 'apply'});
   if (evidenceCase) cloud.cloud.schedule.State = 'ENABLED';
 }
 const binding=cloud?.binding??{...stateFixture.binding,site:config.jira.site,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,configuration_digest:parsed.configuration_digest};
 if(runtime)Object.assign(binding,{package_revision:runtime.manifest.source_revision,installation_generation:runtime.manifest.installation_generation});
 const adapter=runtime?.createDynamoState??createDynamoState;
 const provider=cloud?.provider??new StateProvider(binding),disabled=adapter({binding,control:{...control,schedule_enabled:false,writes_enabled:false},client:provider});
 if(!evidenceCase?.settlement){
   assert.equal((await disabled.initialize({fresh_installation:{...stateFixture.fresh,installation_id:binding.installation_id,domain_id:binding.domain_id,site:binding.site,configuration_digest:binding.configuration_digest,installation_generation:binding.installation_generation,observed_at:p.time},now:p.time})).status,'confirmed');
   if(enabled)provider.enable();
 }
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
 const sender = sendCase ? {before: snapshot(), at_send: [], transition_starts: 0, comment_observations: []} : null;
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
     const actualNow = performance.now;
     const unexpired = performance.now();
     const expired = unexpired + config.manager.invocation_timeout_seconds * 1000;
     const clock = {unexpired, expired, readings: [], restored: false};
     sender.deadline_clock = clock;
     Object.defineProperty(performance, 'now', {configurable: true, value: () => {
       // Let the manager's stage check pass once before expiring in the writer's preflight check.
       const time = sendCase.expireAfterPrepare === 'writer' && clock.readings.length === 0 ? unexpired : expired;
       clock.readings.push(time);
       return time;
     }});
     restoreClock = () => {
       if (original) Object.defineProperty(performance, 'now', original);
       else delete performance.now;
       clock.restored = performance.now === actualNow;
     };
   }
   return result;
 }
 const state=Object.fromEntries(Object.keys(real).map(name=>[name,async input=>{const call={name,input:structuredClone(input)};stateCalls.push(call);events.push('state:'+name);const boundary={retainMembers:stateCalls.filter(c=>c.name==='retainMembers').length===1?'member':'assignment',begin:'intent',finalize:'finalize'}[name];const proofInjection=p.oracle.proof_boundary_injections?.[fault];if(!injected&&proofInjection?.state_call===name){provider.fault=proofInjection.fault;injected=true;}else if(!injected&&!proofInjection&&fault?.startsWith(boundary+':')){provider.fault=fault.endsWith(':after')?'after':'before';injected=true;}const result=sender&&['prepareTransitionCapture','recordTransitionResponse','finalize'].includes(name)?await observeSendState(name,input):await real[name](input);call.result=structuredClone(result);return result;} ]));
 let serverError=null,workerCalls=0,uuidIndex=0,currentComment=p.comment,currentMutationOracle=p.oracle.mutations;const sockets=new Set();
 const evidenceIO={active:false,requests:[]};
 const server=https.createServer({key:tls.key,cert:tls.cert},async(req,res)=>{try{
  let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):null;const path=req.url;
  if(evidenceIO.active){
   const call={method:req.method,path,...(body?.maxResults?{page_size:body.maxResults}:{}),credential:'operator recovery'};
   evidenceIO.requests.push(call);
   if(evidenceIO.sequence){call.event='jira';evidenceIO.sequence.push(call);}
   assert(req.headers.authorization === 'Bearer '+recoveryToken,'Inspection must use the separate recovery credential');
   assert(req.method==='GET'||req.method==='POST'&&path==='/rest/api/3/search/jql','Inspection cannot mutate Jira');
  }else{
   trace.push({method:req.method,path,body});
   assert(req.headers.authorization==='Bearer LOCAL_APPLY_DUMMY','The sender must use its own fixture credential');
  }
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
   if(evidenceIO.active&&suffix.startsWith('/changelog?')){
    const query=new URLSearchParams(suffix.split('?')[1]);
    const startAt=Number(query.get('startAt')),maxResults=Number(query.get('maxResults'));
    const values=evidenceCase.history;
    if(evidenceCase.denyHistory||evidenceCase.partialHistory&&startAt>0){status=403;value={};}
    else if(evidenceCase.partialHistory)value={startAt,maxResults:1,total:2,isLast:false,values:values.slice(0,1)};
    else value={startAt,maxResults,total:values.length,isLast:true,values};
   }
   else if(suffix.startsWith('?fields='))value=issue;
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
      if(mutation&&evidenceCase?.settlement)assert.equal(sender.transition_starts,1,'The exact original transition is sent once');
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
  if (!evidenceIO.active && sender && (status === 201 && boundary === 'comment' || req.method === 'GET' && path === issueRoute('1001', '/comment/' + p.comment.id))) {
    sender.comment_observations.push({method: req.method, ...nativeObservation(value, p.oracle.mutations[1].body.assignment)});
  }
  if(repair||moved)Object.assign(trace.at(-1),{acquisition:scan,status,response:structuredClone(value)});
  if(evidenceIO.active)evidenceIO.requests.at(-1).status=status;
  if(shouldFault){injected=true;if(repair)trace.at(-1).response_lost=true;req.socket.destroy();return;}
  res.writeHead(status,{'content-type':'application/json','x-arequestid':'fixture-request-1'});res.end(value===null?'':JSON.stringify(value));
 }catch(error){serverError=error;res.writeHead(500);res.end('{}');}});
 server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const original=https.request,uuid=crypto.randomUUID;
 https.request=(url,options,callback)=>{
  if(url.origin!=='https://api.atlassian.com')workerCalls++;
  assert.equal(url.origin,'https://api.atlassian.com');
  assert(url.pathname.startsWith('/ex/jira/00000000-0000-0000-0000-000000000001/rest/api/3/'));
  assert.equal(options.rejectUnauthorized,true);assert.equal(options.agent,false);assert.equal(options.headers['Accept-Encoding'],'identity');
  const local = new URL('https://localhost:'+server.address().port+url.pathname.replace('/ex/jira/00000000-0000-0000-0000-000000000001','')+url.search);
  const request = original(local,{...options,hostname:'127.0.0.1',servername:'localhost',ca:tls.ca},callback);
  if (sender && options.method === 'POST' && local.pathname.endsWith('/transitions')) sender.transition_starts++;
  return request;
 };
 crypto.randomUUID=()=>[p.attempt_id,p.fresh_attempt_id][uuidIndex++];syncBuiltinESMExports();
 let result,second,first;const stdout=process.stdout.write,info=console.info;if(host==='handler'){process.stdout.write=function(chunk,...args){if(typeof chunk!=='string'||!chunk.startsWith('{"summary":'))return stdout.call(this,chunk,...args);if(logFailure)throw Error('DUMMY_SECRET_LOG');healthLogs.push(JSON.parse(chunk));return true;};console.info=()=>{if(logFailure)throw Error('DUMMY_SECRET_LOG');};}try{
  const configText=JSON.stringify(config);
  const manifest=evidenceCase?.sender??{schema:'pigboard-manager-package/v1',runtime:'nodejs24.x',canonical_config:config,sender:true,source_revision:binding.package_revision,configuration_digest:binding.configuration_digest,installation_id:binding.installation_id,domain_id:binding.domain_id,installation_generation:binding.installation_generation};
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
    if(evidenceCase){
      if(evidenceCase.corruptMetadata){
        const row=[...provider.rows.values()].find(record=>record.SK==='N#'+p.attempt_id);
        assert(row);
        row.comments[0].created='2026-11-16T12:00:00.000Z';
      }
      if(evidenceCase.changedAssignment){
        const pointer=structuredClone(p.oracle.fresh_mutations[1].body);
        const comment={...p.fresh_comment,id:'799'};
        pointer.assignment.comment_id=comment.id;
        comments.get('1001').push(comment);
        pointers.set('1001',pointer);
      }
      if(evidenceCase.settlement){
        crypto.randomUUID=uuid;syncBuiltinESMExports();
        const native=()=>structuredClone({issues,comments:Object.fromEntries(comments),pointers:Object.fromEntries(pointers),history:evidenceCase.history});
        sender.settlement=await settlementFixture({cloud,evidenceCase,evidenceIO,attemptId:p.attempt_id,native});
      }else sender.evidence_inspection=await inspectTransitionFixture({cloud,evidenceCase,evidenceIO,attemptId:p.attempt_id});
    }else assert.deepEqual(snapshot(), sender.after, 'inspection only reads the original attempt');
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
  assert.equal(sender.transition_starts, testCase.sends);
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
    assert.equal(result.writes, 3);
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

const evidenceHistory=(id,created)=>({id,created,author:{accountId:'manager'},
  items:[{field:'status',fieldtype:'jira',fieldId:'status',from:'1',to:'2'}]});
const earlierEdge=evidenceHistory('901','2026-11-17T11:00:00.000Z');
const laterEdge=evidenceHistory('902','2026-11-17T12:01:00.000Z');

function assertEvidenceObservation(evidence,spec){
  const {json,readable,normal}=evidence,{outcome}=json;
  assert.deepEqual([outcome.status,outcome.code,json.exitCode],spec.expected,JSON.stringify(outcome));
  assert(readable.stdout.includes(outcome.code));
  if(spec.expected[2]===2){
    assert.equal(outcome.data,null);
    assert.deepEqual(json.aws.map(call=>call.action),spec.wrongRole||spec.missingUserId?['GetCallerIdentityCommand']:[]);
    assert.equal(json.state.length,0);
    assert.equal(json.http.length,0);
    return;
  }
  const data=outcome.data,rows=senderState(json.before.map(([,row])=>row));
  assert.equal(json.aws.filter(call=>call.named_snapshot).length,2,'Initial and closing named State observations');
  assert.equal(data.attempt_id,rows.attempt.attempt_id);
  assert.equal(data.pending_attempt_id,rows.stream.pending_attempt_id);
  assert.deepEqual(data.revisions,{installation:rows.installation.revision,stream:rows.stream.revision,attempt:rows.attempt.revision});
  assert.equal(data.original_capture.http_status,rows.attempt.extensions.pb_capture_status);
  assert.equal(data.original_capture.request_digest,rows.attempt.extensions.pb_capture_request_digest);
  assert.equal(data.original_capture.publication_digest,rows.attempt.extensions.pb_capture_publication_digest);
  assert(readable.stdout.includes(data.attempt_id));
  const readableRow=label=>JSON.parse(readable.stdout.split('\n').find(line=>line.startsWith(label+' ')).slice(label.length+1));
  assert.deepEqual(readableRow('Named State snapshot'),{attempt_id:data.attempt_id,pending_attempt_id:data.pending_attempt_id,
    state_outcome:data.state_outcome,revisions:data.revisions});
  assert.deepEqual(readableRow('Original capture'),data.original_capture);
  if(normal){
    assert.equal(normal.exitCode,0,normal.stdout);
    assert.equal(normal.outcome.data.records[0].attempt_id,data.attempt_id);
    assert.equal(normal.http.length,0);
    assert(!normal.aws.some(call=>call.kind==='SecretsManager'));
  }
  if(spec.noJira){
    assert.equal(json.http.length,0);
    assert.equal(json.aws.filter(call=>call.kind==='SecretsManager').length,spec.secretDenied||spec.secretWrongArn?1:0);
    assert.equal(data.native_history.status,'not_consulted');
    assert.equal(data.state_fence.status,'confirmed');
    if(spec.retainedAssignmentMismatch){
      assert.equal(data.assignment.status,'retained_mismatch');
      assert.equal(data.assignment.source,'retained');
      assert.equal(data.recorded_proof.status,'not_consulted');
    }
    return;
  }
  assert(json.http.some(call=>call.path.startsWith('/rest/api/3/issue/1001/changelog?')));
  if(spec.current){
    assert.notEqual(evidence.current.binding.configuration_digest,evidence.original.binding.configuration_digest);
    assert.equal(data.original_authority.source,'original_receipt');
    assert.equal(data.applied_controls.writes_enabled,false);
    assert(json.http.some(call=>call.page_size===7),'Use the current read bounds');
  }else{
    assert.equal(data.original_authority.source,'current_receipt');
    assert.equal(data.applied_controls.writes_enabled,true);
  }
  assert.equal(data.desired_controls.writes_enabled,!spec.current);
  assert.equal(data.controls_match,true);
  assert(readable.stdout.includes(spec.current?'DISABLED':'ENABLED'));
  if(spec.changedAssignment){
    assert.equal(data.assignment.status,'mismatch');
    assert.equal(data.assignment.source,'native');
    assert.equal(data.publication.status,'not_established');
    assert.equal(data.recorded_proof.status,'not_established');
  }else{
    assert.equal(data.assignment.status,'matched');
    assert.equal(data.publication.status,'confirmed');
    assert.equal(data.recorded_proof.status,'confirmed');
  }
  assert.equal(data.original_capture.interpretation,({204:'success_reply',409:'rejection_reply'})[spec.sendCase.wire_status]??null);
  if(spec.fenceFailed||spec.fenceDrift){
    assert.equal(data.state_fence.status,spec.fenceDrift?'stale':'unknown');
    assert.equal(data.jira_observations,'provisional');
  }else assert.equal(data.state_fence.status,'confirmed');
  const history=spec.denyHistory?[]:spec.partialHistory?spec.history.slice(0,1):spec.history;
  assert.equal(data.native_history.observed_count,history.length);
  assert.equal(data.native_history.truncated,false);
  if(spec.denyHistory||spec.partialHistory){
    assert.equal(data.native_history.status,spec.partialHistory?'incomplete':'unavailable');
    assert.equal(data.native_history.code,'HISTORY_UNAVAILABLE');
    assert(outcome.diagnostics.some(diagnostic=>diagnostic.code==='HISTORY_UNAVAILABLE'));
  }else assert.equal(data.native_history.status,history.length?'complete':'complete_empty');
  assert.deepEqual(data.native_history.items,history.map(row=>({issue_id:'1001',history_id:row.id,item_index:0,
    actor_id:row.author.accountId,from_status_id:'1',to_status_id:'2',created:row.created})));
  const readableItems=readable.stdout.split('\n').filter(line=>line.startsWith('Native history item '));
  assert.deepEqual(readableItems.map(line=>JSON.parse(line.slice('Native history item '.length))),data.native_history.items);
}

export async function runInspectionGroup(group){
  assert(['INSPECT-H01','INSPECT-H02'].includes(group));
  const {snapshotPackage}=await import('./test-aws-manager.mjs');
  const senderConfig=structuredClone(packet.config);
  senderConfig.manager.aws.recovery_jira_secret_arn=recoveryArn;
  const disabled=structuredClone(senderConfig);
  Object.assign(disabled.manager.controls,{schedule_enabled:false,writes_enabled:false});
  disabled.jira.read_bounds.page_size=7;
  disabled.jira.connection.secret_reference='arn:aws:secretsmanager:eu-west-1:123456789012:secret:pigboard-current-abcdef';
  const source=snapshotPackage({config:disabled});
  try{
    const build=async(name,config)=>{
      const configPath=join(source.temp,name+'.json');
      await writeFile(configPath,JSON.stringify(config));
      return packageManager({configPath,output:join(source.temp,name),source:source.source,revision:source.snapshot_revision,
        generation:source.manifest.installation_generation}).manifest;
    };
    const sender=await build('sender',senderConfig),omitted=structuredClone(senderConfig);
    delete omitted.manager.aws.recovery_jira_secret_arn;
    const omission=await build('omit-recovery',omitted);
    let otherScope;
    if(group==='INSPECT-H02'){
      const changedScope=structuredClone(disabled);
      changedScope.jira.connection.cloud_id='00000000-0000-0000-0000-000000000002';
      otherScope=await build('different-jira-cloud',changedScope);
    }
    const [accepted,rejected,unsupported]=packet.sender_evidence.groups['SEND-H01'];
    const legacy=packet.sender_evidence.groups['SEND-H02'].find(item=>item.legacy);
    const prepared=packet.sender_evidence.groups['SEND-H02'].find(item=>item.id==='prepare-uncertain');
    const pendingAccepted={...accepted,fault:'finalize:before'};
    const complete=['complete','OK',0],partial=code=>['partial',code,1],unavailable=code=>['unavailable',code,2];
    const cases=group==='INSPECT-H01'?[
      {name:'saved 204 and stopped before finalization',sendCase:pendingAccepted,history:[laterEdge],expected:complete},
      {name:'saved 409 under the original sender receipt',current:source.manifest,history:[earlierEdge,laterEdge],expected:complete},
      {name:'complete history with no status events',expected:complete},
      {name:'ordinary State and opt-in on a package without recovery configured',sender:omission,omission:true,noJira:true,expected:partial('RECOVERY_SECRET_MISSING')}
    ]:[
      {name:'wrong role',wrongRole:true,expected:unavailable('OPERATOR_UNAUTHORIZED')},
      {name:'missing operator UserId',missingUserId:true,expected:unavailable('OPERATOR_UNAUTHORIZED')},
      {name:'absent recovery config',sender:omission,noJira:true,expected:partial('RECOVERY_SECRET_MISSING')},
      {name:'aliased recovery config',alias:true,expected:['invalid','RECOVERY_SECRET_INVALID',2]},
      {name:'denied recovery secret',secretDenied:true,noJira:true,expected:partial('RECOVERY_SECRET_DENIED')},
      {name:'response identifies the sender secret',secretWrongArn:true,noJira:true,expected:partial('RECOVERY_SECRET_IDENTITY_MISMATCH')},
      {name:'denied native history with verified publication',denyHistory:true,expected:partial('HISTORY_UNAVAILABLE')},
      {name:'partially obtained native history',partialHistory:true,history:[earlierEdge,laterEdge],expected:partial('HISTORY_UNAVAILABLE')},
      {name:'changed native assignment with verified history',changedAssignment:true,history:[laterEdge],expected:partial('ASSIGNMENT_MISMATCH')},
      {name:'retained assignment mismatch refuses acquisition',retainedAssignmentMismatch:true,noJira:true,expected:partial('ASSIGNMENT_MISMATCH')},
      {name:'old attempt lacking original metadata',sendCase:legacy,noJira:true,expected:partial('ORIGINAL_METADATA_MISSING')},
      {name:'original native metadata no longer reproduces commitments',corruptMetadata:true,noJira:true,expected:partial('ORIGINAL_METADATA_MISMATCH')},
      {name:'retained inventory unavailable',inventoryFailed:true,noJira:true,expected:partial('RETAINED_INVENTORY_INCOMPLETE')},
      {name:'historical receipt absent',current:source.manifest,omitOriginal:true,noJira:true,expected:partial('ORIGINAL_AUTHORITY_MISSING')},
      {name:'historical receipt incorrect',current:source.manifest,badOriginal:true,noJira:true,expected:partial('ORIGINAL_AUTHORITY_MISSING')},
      {name:'current Jira cloud differs from original authority',current:otherScope,noJira:true,expected:partial('ORIGINAL_AUTHORITY_MISSING')},
      {name:'closing State read unavailable',fenceFailed:true,history:[laterEdge],expected:partial('STATE_FENCE_UNAVAILABLE')},
      {name:'State revision drift supersedes denied history',fenceDrift:true,denyHistory:true,expected:partial('STATE_CHANGED')},
      {name:'prepared-only State supersedes denied history',sendCase:prepared,denyHistory:true,expected:partial('ORIGINAL_RESPONSE_UNRECORDED')},
      {name:'unsupported saved HTTP response',sendCase:unsupported,expected:partial('ORIGINAL_RESPONSE_UNSUPPORTED')}
    ];
    const runs=[];
    for(const variant of cases){
      const spec={sender,sendCase:rejected,history:[],...variant};
      const observed=await runApplyFixture({host:'handler',sendCase:spec.sendCase,evidenceCase:spec});
      assert.equal(observed.worker_calls,0);
      assert.equal(observed.sender.transition_starts,spec.sendCase.sends);
      const inspection=observed.sender.evidence_inspection;
      assertEvidenceObservation(inspection,spec);
      runs.push({name:spec.name,sender_requests:observed.trace.map(({method,path})=>({method,path})),
        sender_reply:observed.sender.provider_reply??null,sender_pending:senderState(observed.sender.after).stream.pending_attempt_id,
        worker_calls:observed.worker_calls,inspection});
    }
    return {package_source:{checkout_revision:source.source_parent,snapshot_revision:source.snapshot_revision,tree:source.snapshot_tree},runs};
  }finally{source.cleanup();}
}

export async function runReconciliationGroup(group,{regressions=[]}={}){
  assert(['R1-15-H01','R1-15-H02'].includes(group));
  const {snapshotPackage}=await import('./test-aws-manager.mjs');
  const senderConfig=structuredClone(packet.config);
  senderConfig.manager.aws.recovery_jira_secret_arn=recoveryArn;
  const initialConfig=structuredClone(senderConfig);
  Object.assign(initialConfig.manager.controls,{schedule_enabled:false,writes_enabled:false});
  const stoppedConfig=structuredClone(initialConfig);
  stoppedConfig.manager.controls.maintenance=true;
  const source=snapshotPackage({config:initialConfig});
  try{
    const build=async(name,config)=>{
      const configPath=join(source.temp,name+'.json');
      await writeFile(configPath,JSON.stringify(config));
      return packageManager({configPath,output:join(source.temp,name),source:source.source,revision:source.snapshot_revision,
        generation:source.manifest.installation_generation}).manifest;
    };
    const sender=await build('sender',senderConfig),stopped=await build('stopped',stoppedConfig);
    const [applied,rejected]=packet.sender_evidence.groups['SEND-H01'];
    const incomplete=packet.sender_evidence.groups['SEND-H02'].find(item=>item.id==='incomplete-response');
    const pendingApplied={...applied,fault:'finalize:before'};
    const positive=[
      {id:'applied',sendCase:pendingApplied},
      {id:'not_applied',sendCase:rejected,history:[]},
      {id:'lost_acknowledgement',sendCase:pendingApplied,fault:'after'},
      {id:'runtime_terminal',sendCase:applied}
    ];
    const developer=[
      {id:'write_before_commit',fault:'before'},{id:'conditional_race',fault:'condition'},{id:'coherent_readback'},
      {id:'prior_stop',code:'DRAIN_INCOMPLETE'},{id:'wrong_stop_scope',code:'DRAIN_INCOMPLETE'},
      {id:'missing_stop',code:'DRAIN_INCOMPLETE'},{id:'production_stop',code:'DRAIN_INCOMPLETE'}
    ];
    const prescribed=group==='R1-15-H01'?positive:reconciliationFixture.h02_variants;
    const variants=regressions.length?regressions.map(id=>{
      const selected=developer.find(testcase=>testcase.id===id);
      assert(selected,'Select a supported developer regression.');
      return selected;
    }):prescribed;
    const runs=[];
    for(const variant of variants){
      const directory=await mkdtemp(join(source.temp,'attempt-'));
      try{
        const sendCase=variant.sendCase??(variant.id==='unknown_response'?incomplete:pendingApplied);
        const spec={originalInstall:source.manifest,sender,stopped,directory,sendCase,history:variant.history??[laterEdge],
          denyHistory:variant.id==='absent_history',changedAssignment:variant.id==='changed_pointer',settlement:variant};
        const observed=await runApplyFixture({host:'handler',sendCase,evidenceCase:spec});
        assert.equal(observed.worker_calls,0);
        assert.equal(observed.sender.transition_starts,1);
        assert.deepEqual(observed.mutations.map(({method,path})=>({method,path})),packet.oracle.mutations.map(({method,path})=>({method,path})));
        assert.equal(observed.sender.provider_reply.http_status,sendCase.wire_status);
        assert.equal(observed.sender.settlement.original_capture.http_status,sendCase.saved_status);
        runs.push({...observed.sender.settlement,worker_calls:observed.worker_calls,sender_reply:observed.sender.provider_reply,
          sender_requests:observed.trace.map(({method,path})=>({method,path})),sender_mutations:observed.mutations});
      }finally{await rm(directory,{recursive:true,force:true});}
    }
    return {developer_observation:'confirmed_local_cli_fixture',human_acceptance:'pending',installed_acceptance:'pending',
      package_source:{checkout_revision:source.source_parent,snapshot_revision:source.snapshot_revision,tree:source.snapshot_tree,dirty:source.source_dirty.length!==0},
      limitations:['Disposable loopback Jira and simulated AWS providers. No cloud calls, credentials or live IAM verification.',
        'A test-only lifecycle producer supplies the completed stop record and generation. The installed command has no PGB-86 producer.'],
      cleanup:'Disposable fixtures and builds removed. This transcript retains the observed State and provider audit.',runs};
  }finally{source.cleanup();}
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
