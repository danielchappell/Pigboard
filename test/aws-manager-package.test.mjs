import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hostConfig,deriveHostControls,sha256} from '../lib/aws/installation.mjs';
import {synthesizeTemplate} from '../lib/aws/template.mjs';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/aws-manager.json',import.meta.url)));
test('disabled package synthesizes scoped read-only runtime and retained bounded host',()=>{
 const {config}=fixture(),text=JSON.stringify(config),{digest}=hostConfig(text),manifest={schema:'pigboard-manager-package/v1',source_revision:'a'.repeat(40),configuration_digest:digest,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,installation_generation:'fixture-generation',zip_digest:sha256('zip')};
 const t=synthesizeTemplate(text,manifest),r=t.Resources;assert.equal(r.Schedule.Properties.State,'DISABLED');assert.equal(r.Function.Properties.ReservedConcurrentExecutions.Ref,'QuiescenceConcurrency');assert.equal(t.Parameters.QuiescenceConcurrency.Default,1);assert.equal(r.Function.Properties.Runtime,'nodejs24.x');assert.equal(r.AsyncInvocation.Properties.MaximumRetryAttempts,0);assert.equal(r.Schedule.Properties.Target.RetryPolicy.MaximumRetryAttempts,0);assert.equal(r.StateTable.DeletionPolicy,'Retain');assert.equal(r.StateTable.UpdateReplacePolicy,'Retain');assert.equal(r.LogGroup.Properties.RetentionInDays,14);
 const runtime=r.RuntimeRole.Properties.Policies[0].PolicyDocument.Statement;assert(!JSON.stringify(runtime).includes('dynamodb:Scan'));assert(!JSON.stringify(runtime).includes('dynamodb:PutItem'));assert(!JSON.stringify(runtime).includes('dynamodb:UpdateItem'));assert(!JSON.stringify(t).includes('DeleteItem'));assert(!JSON.stringify(t).includes('ConditionCheckItem'));assert(!Object.values(r).some(v=>['AWS::Lambda::Url','AWS::ApiGateway::RestApi'].includes(v.Type)));
 const op=t.Metadata.Pigboard.operator_policy.Statement;const writes=op.find(v=>v.Action.includes?.('dynamodb:PutItem'));assert.deepEqual(writes.Condition,{'ForAnyValue:StringEquals':{'dynamodb:EnclosingOperation':['TransactWriteItems']}});assert(writes.Resource.endsWith('/pigboard-fixture-state'));assert(op.some(v=>v.Action.includes?.('dynamodb:Scan')));assert(!JSON.stringify(op).includes('ExecuteChangeSet'));
 const projected=deriveHostControls(text,{package_revision:manifest.source_revision});assert.equal(projected.mode,'preview');assert.deepEqual(projected.control,{configuration_digest:digest,schedule_enabled:false,writes_enabled:false,maintenance:false});
});

test('copied pinned package imports and rejects extra event fields under selected Node runtime',async()=>{
 const {snapshotPackage}=await import('../scripts/test-aws-manager.mjs');const {execFileSync}=await import('node:child_process');const {pathToFileURL}=await import('node:url');const built=snapshotPackage();try{
 const node24=process.env.PGB_NODE24??process.execPath;if(process.env.PGB_NODE24)assert.match(execFileSync(node24,['--version'],{encoding:'utf8'}),/^v24\./);
 const url=pathToFileURL(built.payload+'/lib/aws/manager-lambda.mjs').href,code=`const {handler}=await import(${JSON.stringify(url)});console.log(JSON.stringify(await handler({operation:'preview',override:true},{})));`;
 const lines=execFileSync(node24,['--input-type=module','-e',code],{encoding:'utf8'}).trim().split('\n'),out=JSON.parse(lines.at(-1));assert(lines.every(line=>!line.includes('dummy-scoped-token')));assert.equal(out.code,'PREVIEW_EVENT_REQUIRED');assert.equal(out.writes,0);assert(built.manifest.payload_hashes['contracts/epic-v1.schema.json']);assert(built.manifest.payload_hashes['runtime/aws/package-lock.json']);
 }finally{built.cleanup();}
});

test('disabled package IAM allows concrete intended transactions and denies unrelated or runtime mutations',()=>{
 const {config}=fixture(),text=JSON.stringify(config),manifest={schema:'pigboard-manager-package/v1',source_revision:'a'.repeat(40),configuration_digest:hostConfig(text).digest,installation_id:'fixture',domain_id:'fixture-domain',installation_generation:'generation',zip_digest:sha256('zip')},template=synthesizeTemplate(text,manifest),runtime=template.Resources.RuntimeRole.Properties.Policies[0].PolicyDocument,operator=template.Metadata.Pigboard.operator_policy;
 const permits=(policy,action,resource,enclosing)=>policy.Statement.some(s=>[s.Action].flat().includes(action)&&[s.Resource].flat().some(r=>typeof r==='string'&&r===resource)&&(!s.Condition||s.Condition['ForAnyValue:StringEquals']?.['dynamodb:EnclosingOperation']?.includes(enclosing)));
 const table='arn:aws:dynamodb:eu-west-1:123456789012:table/pigboard-fixture-state',other=table+'-unrelated';
 for(const action of ['dynamodb:GetItem','dynamodb:Query','dynamodb:DescribeTable','dynamodb:Scan']){assert(permits(operator,action,table));assert(!permits(operator,action,other));}
 for(const action of ['dynamodb:PutItem','dynamodb:UpdateItem']){assert(permits(operator,action,table,'TransactWriteItems'));assert(!permits(operator,action,table));assert(!permits(operator,action,other,'TransactWriteItems'));assert(!permits(runtime,action,table,'TransactWriteItems'));}
 for(const action of ['dynamodb:GetItem','dynamodb:Query','dynamodb:DescribeTable']){assert(permits(runtime,action,table));assert(!permits(runtime,action,other));}assert(!permits(runtime,'dynamodb:Scan',table));assert(!permits(runtime,'secretsmanager:GetSecretValue',config.jira.connection.secret_reference+'other'));assert(permits(runtime,'secretsmanager:GetSecretValue',config.jira.connection.secret_reference));assert(!permits(runtime,'lambda:InvokeFunction','anything'));assert(!permits(operator,'cloudformation:ExecuteChangeSet','anything'));
});
