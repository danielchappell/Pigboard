import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseConfig, CONFIG_LIMITS } from '../lib/config/parse.mjs';
import { resolveProjects, resolveProject, streamKey, inspectStreams } from '../lib/config/projects.mjs';
import { validateReceiptChain } from '../lib/contracts/receipts.mjs';
const base=JSON.parse(readFileSync(new URL('./fixtures/project-configs.json',import.meta.url))).two_project;
const fresh=()=>structuredClone(base),check=value=>parseConfig(JSON.stringify(value));
test('explicit whole-section inheritance resolves complete independent maps without mutation',()=>{
 const input=fresh(),before=JSON.stringify(input),scope=resolveProjects(input);assert.equal(JSON.stringify(input),before);
 assert.deepEqual(scope.projects.map(p=>p.id),['10001','10002']);assert.equal(scope.projects[0].stages.QA,'14');assert.equal(scope.projects[1].stages.QA,'34');
 assert.deepEqual(Object.keys(scope.projects[0]),['id','key','board_ids','stages','accepted_later_stage_ids','types','actors','repositories','worker_prefixes','opt_in_label','preparation_stage_ids','cancelled_stage_ids']);
 assert.equal(check(input).valid,true);scope.projects[0].actors.manager.push('changed');assert.deepEqual(input.defaults.actors.manager,['operator-demo']);
 const fifty=fresh();fifty.projects=Array.from({length:50},(_,i)=>({...structuredClone(base.projects[i%2]),id:String(20000+i)}));const raw=JSON.stringify(fifty);assert.ok(Buffer.byteLength(raw)<CONFIG_LIMITS.bytes);assert.equal(parseConfig(raw).resolved_scope.projects.length,50);
});
test('exact native lookup and collision-free full-label tuples preserve identity',()=>{
 const scope=resolveProjects(base);assert.equal(resolveProject(scope,{site:scope.site,project_id:'10001'}).key,'APP');
 for(const identity of [{site:'https://wrong.example.invalid',project_id:'10001'},{site:scope.site,project_id:'APP'},{site:scope.site,project_id:'101'}])assert.throws(()=>resolveProject(scope,identity));
 const keys=new Set();for(const id of ['10001','10002'])for(const label of ['AI-Daniel-0','AI-Daniel-01','AI-Daniel-1','AI-雪|:😀-11']){const key=streamKey(scope.site,id,label);assert.deepEqual(JSON.parse(key),[scope.site,id,label]);keys.add(key);}assert.equal(keys.size,8);
 assert.equal(inspectStreams(scope,'AI-Daniel-01')[0].mapped,true);assert.ok(inspectStreams(scope,'OTHER-1').every(p=>p.key===null&&!p.mapped));
 const changed=fresh();changed.projects[0].key='RENAMED';changed.projects[0].board_ids=['999'];assert.equal(inspectStreams(resolveProjects(changed),'AI-Daniel-1')[0].key,inspectStreams(scope,'AI-Daniel-1')[0].key);
});
test('paired invalid scope and mapping cases leave passing controls intact',()=>{
 const cases=[
  ['DUPLICATE_PROJECT',v=>v.projects.push(structuredClone(v.projects[0]))],
  ['MISSING_MAPPING',v=>delete v.defaults.actors],
  ['AMBIGUOUS_MAPPING',v=>v.projects[0].mappings.stages=v.defaults.stages],
  ['AMBIGUOUS_MAPPING',v=>v.defaults.stages.QA=v.defaults.stages.Blocked],
  ['AMBIGUOUS_MAPPING',v=>v.defaults.types.story=v.defaults.types.bug],
  ['AMBIGUOUS_MAPPING',v=>v.defaults.accepted_later_stage_ids.push(v.defaults.stages.QA)],
  ['AMBIGUOUS_MAPPING',v=>v.defaults.worker_prefixes.push(v.defaults.worker_prefixes[0])],
  ['AMBIGUOUS_MAPPING',v=>v.defaults.repositories.push(v.defaults.repositories[0])],
  ['STRUCTURE',v=>v.schema='pigboard-config/v2'],
  ['FORMAT',v=>v.defaults.worker_prefixes=['no-tail']],
 ];for(const[code,mutate]of cases){const v=fresh();mutate(v);const result=check(v);assert.equal(result.valid,false,code);assert.equal(result.diagnostics[0].code,code);assert.equal(result.configuration_digest,null);assert.equal(check(base).valid,true);}
});
test('destinations require exact HTTPS syntax and optional trusted site binding',()=>{
 for(const site of ['https://jira.example.invalid/','http://jira.example.invalid','https://jira.example.invalid/path','https://@jira.example.invalid','https://user@jira.example.invalid','https://u:p@jira.example.invalid','https://jira.example.invalid/raw space','https://jira.example.invalid/%zz','https://JIRA.example.invalid']){const v=fresh();v.jira.site=site;assert.equal(check(v).valid,false,site);}
 for(const repo of ['http://git.example.invalid/x','https://@git.example.invalid/x','https://u@git.example.invalid/x','https://u:p@git.example.invalid/x','https://git.example.invalid/raw space','https://git.example.invalid/%zz']){const v=fresh();v.defaults.repositories=[repo];assert.equal(check(v).valid,false,repo);}
 const v=fresh();v.jira.site='https://jira.example.invalid:8443';v.defaults.repositories=['https://enterprise.example.invalid:8443/team/a%20b'];assert.equal(check(v).valid,true);
 assert.equal(parseConfig(JSON.stringify(v),{expectedSite:v.jira.site}).destination_authority,'matched_expected_site');const mismatch=parseConfig(JSON.stringify(v),{expectedSite:base.jira.site});assert.equal(mismatch.valid,false);assert.equal(mismatch.destination_authority,'mismatch');assert.equal(mismatch.diagnostics[0].path,'/jira/site');
});
test('all diagnostics stop at actual declared schema positions and never echo secret keys/values',()=>{
 for(const where of ['', '/jira','/defaults/actors','/projects/0/mappings'])for(const key of ['token-secret-123','constructor','valueOf','jira','projects','a/b~secret']){const v=fresh();let target=v;for(const part of where.split('/').slice(1))target=target[part];if(Object.hasOwn(target,key))continue;Object.defineProperty(target,key,{value:'SENSITIVE-123',enumerable:true,configurable:true});const result=check(v),raw=JSON.stringify(result);assert.equal(result.valid,false);assert.ok(!raw.includes('SENSITIVE-123'));assert.ok(!raw.includes('token-secret-123'));assert.equal(result.diagnostics[0].path,where);}
 let invoked=false;const v=fresh();Object.defineProperty(v.defaults,'token',{get(){invoked=true;return 'SENSITIVE-123';},enumerable:true});assert.throws(()=>resolveProjects(v),e=>!JSON.stringify(e.diagnostic).includes('token'));assert.equal(invoked,false);
 for(const value of [undefined,NaN,9007199254740992,Object.create({toJSON(){throw Error('secret')}})])assert.throws(()=>resolveProjects(value));
 const bad=fresh();bad.defaults.repositories=[{valueOf(){throw Error('SENSITIVE');}}];assert.throws(()=>resolveProjects(bad),e=>!e.message.includes('SENSITIVE'));
});
test('bounded parser rejects unsafe YAML/JSON and preserves canonical digest',()=>{
 const good=JSON.stringify(base);assert.equal(parseConfig(good).configuration_digest,parseConfig('# comment\n'+JSON.stringify(base,null,2)).configuration_digest);
 for(const raw of ['a: 1\na: 2','a: &x 1\nb: *x','a: !secret value','---\na: 1\n---\nb: 2','? [a,b]\n: c','a: "\\ud800"',new Uint8Array([0xc3,0x28]),'a: 9007199254740992','a: '+JSON.stringify(Array(1001).fill('x')),'a: '+JSON.stringify(Array.from({length:17}).reduce(v=>[v],'x'))])assert.equal(parseConfig(raw).valid,false);
 const at=good+' '.repeat(CONFIG_LIMITS.bytes-Buffer.byteLength(good));assert.equal(parseConfig(at).valid,true);assert.equal(parseConfig(at+' ').diagnostics[0].code,'LIMIT');
 const many=fresh();many.projects=Array.from({length:1000},(_,i)=>({...structuredClone(base.projects[0]),id:String(i)}));assert.equal(check(many).valid,true);many.projects.push({...base.projects[0],id:'1000'});assert.equal(check(many).valid,false);
 const lists=fresh();lists.projects[0].board_ids=Array.from({length:100},(_,i)=>String(i));assert.equal(check(lists).valid,true);lists.projects[0].board_ids.push('100');assert.equal(check(lists).valid,false);
});
test('resolved authority fields compose with complete independent receipt fixture',()=>{
 const envelope=JSON.parse(readFileSync(new URL('./fixtures/handoff-chains.json',import.meta.url))).chains.stack;
 const config=fresh(),native=envelope.trusted.projects[0];config.jira.site=envelope.trusted.site;config.projects=[{id:native.id,key:null,board_ids:[],inherit:[],mappings:{stages:native.stages,accepted_later_stage_ids:native.accepted_later_stage_ids,actors:native.actors,repositories:native.repositories,types:base.defaults.types,worker_prefixes:['AI-Daniel-'],opt_in_label:'pigboard'}}];
 const p=resolveProjects(config).projects[0];envelope.trusted.site=resolveProjects(config).site;envelope.trusted.projects[0]={...native,id:p.id,stages:p.stages,accepted_later_stage_ids:p.accepted_later_stage_ids,actors:p.actors,repositories:p.repositories};
 assert.equal(validateReceiptChain(JSON.stringify(envelope)).valid,true);
});

test('optional preparation/cancelled mappings preserve old configs, explicit inheritance and all disjoint sets',async()=>{
 const old=check(base);assert.equal(old.valid,true);for(const p of old.resolved_scope.projects){assert.deepEqual(p.preparation_stage_ids,[]);assert.deepEqual(p.cancelled_stage_ids,[]);assert.equal(resolveProject(old.resolved_scope,{site:old.resolved_scope.site,project_id:p.id}).id,p.id);}
 const v=fresh();v.defaults.preparation_stage_ids=['90'];v.defaults.cancelled_stage_ids=['91'];assert.deepEqual(check(v).resolved_scope.projects[0].preparation_stage_ids,[]);
 v.projects[0].inherit.push('preparation_stage_ids');v.projects[0].mappings.cancelled_stage_ids=['92'];assert.deepEqual(check(v).resolved_scope.projects[0].preparation_stage_ids,['90']);assert.deepEqual(check(v).resolved_scope.projects[0].cancelled_stage_ids,['92']);
 for(const change of [c=>c.projects[0].mappings.preparation_stage_ids=[],c=>delete c.defaults.preparation_stage_ids,c=>c.projects[0].mappings.cancelled_stage_ids=['90'],c=>c.projects[0].mappings.cancelled_stage_ids=[c.defaults.stages.QA],c=>c.projects[0].mappings.cancelled_stage_ids=[c.defaults.accepted_later_stage_ids[0]],c=>c.defaults.preparation_stage_ids=['90','90']]){const c=structuredClone(v);change(c);assert.equal(check(c).valid,false);}
 const {diffConfig}=await import('../lib/config/diff.mjs');const diff=diffConfig(base,v);assert.ok(diff.mappings_changed.length);assert.ok(diff.checks_required.length);assert.deepEqual(diff.state_actions,[]);
});
