import * as verificationFs from 'node:fs';
import {createHash as verificationHash} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {spawnSync as rawSpawnSync,execFileSync as rawExecFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const VERIFICATION_LABEL='repair-policy';

// Contributor verification only. Opt-in capture retains existing observations
// before disposable fixture cleanup; it never changes a product input/oracle.
const verificationRoot=process.env.PGB81_EVIDENCE_DIR;let verificationSequence=0;
if(verificationRoot)assert(path.isAbsolute(verificationRoot),'Use an absolute external verification directory.');
const verificationSHA=bytes=>verificationHash('sha256').update(bytes).digest('hex');
function verificationBlob(bytes){if(!verificationRoot)return null;const hash=verificationSHA(bytes),dir=path.join(verificationRoot,'blobs');verificationFs.mkdirSync(dir,{recursive:true});const file=path.join(dir,hash);try{verificationFs.writeFileSync(file,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}return {sha256:hash,bytes:Buffer.byteLength(bytes),file};}
function verificationRecord(kind,value){if(!verificationRoot)return;assert(path.isAbsolute(verificationRoot),'Use an absolute external verification directory.');const dir=path.join(verificationRoot,VERIFICATION_LABEL);verificationFs.mkdirSync(dir,{recursive:true});verificationFs.writeFileSync(path.join(dir,String(verificationSequence++).padStart(6,'0')+'-'+kind+'.json'),JSON.stringify(value,null,2)+'\n');}
function verificationFiles(args,cwd){if(!verificationRoot)return null;const result=[];for(const flag of ['--config','--input','--context']){const i=args.indexOf(flag);if(i<0||!args[i+1])continue;const argument=args[i+1],file=path.resolve(cwd??process.cwd(),argument);try{const st=verificationFs.statSync(file);result.push({flag,path:file,kind:st.isFile()?'file':'other',content:st.isFile()?verificationBlob(verificationFs.readFileSync(file)):null});}catch(e){result.push({flag,path:file,state:e.code??'unreadable'});}}return result;}
function verificationInventory(cwd){if(!verificationRoot)return null;const dir=cwd??process.cwd();return verificationFs.readdirSync(dir,{withFileTypes:true}).map(e=>{const p=path.join(dir,e.name);return {name:e.name,kind:e.isFile()?'file':e.isDirectory()?'directory':'other',sha256:e.isFile()?verificationSHA(verificationFs.readFileSync(p)):null};}).sort((a,b)=>a.name.localeCompare(b.name));}
function spawnSync(file,args=[],options={}){if(!verificationRoot||file!==process.execPath)return rawSpawnSync(file,args,options);const before={inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)},r=rawSpawnSync(file,args,options);verificationRecord('child',{file,args,cwd:options.cwd??process.cwd(),status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout?.toString()??'',stderr:r.stderr?.toString()??'',before,after:{inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)}});return r;}
function execFileSync(file,args=[],options={}){if(!verificationRoot||file!==process.execPath)return rawExecFileSync(file,args,options);const before={inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)};try{const r=rawExecFileSync(file,args,options);verificationRecord('child',{file,args,cwd:options.cwd??process.cwd(),status:0,stdout:r?.toString()??'',stderr:'',before,after:{inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)}});return r;}catch(e){verificationRecord('child',{file,args,cwd:options.cwd??process.cwd(),status:e.status??null,signal:e.signal??null,stdout:e.stdout?.toString()??'',stderr:e.stderr?.toString()??'',before,after:{inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)}});throw e;}}
function verificationAPI(c,config,snapshot,actual){if(!verificationRoot)return;verificationRecord('api',{case_id:c.id??null,config:verificationBlob(config),snapshot:verificationBlob(snapshot),options_present:Object.hasOwn(c,'options'),options:c.options??{},actual});}

import canonicalize from 'canonicalize';
import {createHash} from 'node:crypto';
import {previewSnapshot} from '../lib/manager/decisions.mjs';
const fixtureURL=new URL('./fixtures/manager-repairs.json',import.meta.url);
const load=()=>JSON.parse(readFileSync(fixtureURL));
const allCases=f=>[...f.cases,...f.scenarios,...f.normalization.cases];
const run=c=>{const config=JSON.stringify(c.config),snapshot=JSON.stringify(c.snapshot),actual=JSON.parse(JSON.stringify(previewSnapshot(config,snapshot,c.options)));verificationAPI(c,config,snapshot,actual);return actual;};

test('identical authenticated QA publications preserve nine full fixed reports',()=>{
 const fixtureBytes=readFileSync(fixtureURL,'utf8'),f=JSON.parse(fixtureBytes),checks=[];
 const checkpoint=id=>{const c=f.cases.find(c=>c.id===id);assert(c,id);return structuredClone(c);};
 function duplicate(envelope,ticket,oldID,newID){
  const e=structuredClone(envelope),pages=e.comment_pages.filter(p=>p.ticket_id===ticket);assert.equal(pages.length,1);
  const page=pages[0],comments=page.comments.filter(c=>c.id===oldID),retained=e.retained.filter(r=>r.ticket_id===ticket&&r.comment_id===oldID);
  assert.equal(page.start_at,0);assert.equal(page.total,page.comments.length);assert.equal(comments.length,1);assert.equal(retained.length,1);
  assert(!e.comment_pages.some(p=>p.comments.some(c=>c.id===newID)));assert(!e.retained.some(r=>r.ticket_id===ticket&&r.comment_id===newID));
  page.comments.push({...structuredClone(comments[0]),id:newID});page.total++;
  e.retained.push({...structuredClone(retained[0]),comment_id:newID});e.target={...e.target,comment_id:newID};
  const restored=structuredClone(e);restored.target=structuredClone(envelope.target);restored.comment_pages.find(p=>p.ticket_id===ticket).comments.pop();restored.comment_pages.find(p=>p.ticket_id===ticket).total--;restored.retained.pop();assert.deepEqual(restored,envelope,'duplicate preparation is exactly reversible');
  return e;
 }
 function childCopy(control,first){
  const c=structuredClone(control),sources=c.snapshot.repair_receipts.map(raw=>JSON.parse(raw)).filter(e=>e.target.ticket_id==='1001'&&e.target.comment_id==='81008');assert.equal(sources.length,1);
  assert(!c.snapshot.completion_receipts.map(raw=>JSON.parse(raw)).some(e=>e.target.ticket_id==='1001'));
  const encoded=JSON.stringify(duplicate(sources[0],'1001','81008','99008'));
  c.snapshot.completion_receipts=first?[encoded,...c.snapshot.completion_receipts]:[...c.snapshot.completion_receipts,encoded];return c;
 }
 function add(id,c,changed=false){
  c.id=id;
  if(changed){c.expected.snapshot_digest='sha256:'+createHash('sha256').update(canonicalize({configuration_digest:c.expected.configuration_digest,snapshot:c.snapshot})).digest('hex');if(Object.hasOwn(c.options??{},'expectedSnapshotDigest'))c.options.expectedSnapshotDigest=c.expected.snapshot_digest;}
  checks.push(c);
 }
 const published=checkpoint('H02-07-u2-published-b-not-admitted'),missing=checkpoint('H02-06-a3-full-qa-u2-unpublished');
 add('C1',structuredClone(published));add('C2',childCopy(published,true),true);add('C3',childCopy(published,false),true);
 add('C4',structuredClone(missing));add('C5',childCopy(missing,true),true);add('C6',childCopy(missing,false),true);
 const parent=structuredClone(published),parentIndexes=parent.snapshot.completion_receipts.flatMap((raw,index)=>{const e=JSON.parse(raw);return e.target.ticket_id==='1000'&&e.target.comment_id==='81023'?[index]:[];});assert.equal(parentIndexes.length,1);
 const index=parentIndexes[0],originalParent=JSON.parse(parent.snapshot.completion_receipts[index]);parent.snapshot.completion_receipts[index]=JSON.stringify(duplicate(originalParent,'1000','81023','99023'));
 parent.expected.streams[0].proposal.required_parent.completion.comment_id='99023';add('C7',parent,true);
 for(const [id,fixtureID]of [['C8','OC05-competing-completions-no-parent-first'],['C9','OC05-competing-completions-stack-parent-first']]){const input=f.inherited_own_preview.original.cases.find(c=>c.id===fixtureID),oracle=f.inherited_own_preview.cases.find(c=>c.id===fixtureID);assert(input&&oracle?.expected,fixtureID);add(id,{...structuredClone(input),expected:structuredClone(oracle.expected)});}
 // All nine complete expectations come from fixed control reports plus the
 // input-derived digest and prescribed exact parent alias, before any preview.
 assert.equal(checks.length,9);
 assert.equal(createHash('sha256').update(canonicalize(checks.map(({id,config,snapshot,options,expected})=>({id,config,snapshot,options:options??{},expected})))).digest('hex'),'06bc2d43227c0dc541ec15f49559f37d543391d2dcfd7b1c2c66f24eda2768e4','complete independently crosschecked QA-copy preparation');
 verificationRecord('qa-publication-fixed-expectations',checks);
 for(const c of checks){const before=JSON.stringify(c),actual=run(c);assert.deepEqual(actual,c.expected,c.id);assert.equal(JSON.stringify(c),before,c.id+' immutable input/oracle');assert.equal(actual.writes,0);assert.equal(actual.execution_authorized,false);for(const s of actual.streams)assert(s.proposal===null||s.proposal.execution_authorized===false);}
 assert.equal(readFileSync(fixtureURL,'utf8'),fixtureBytes,'original fixture bytes');
});

test('current PR observations preserve four fixed controls and distinguish admission from new publication',()=>{
 const fixtureBytes=readFileSync(fixtureURL,'utf8'),f=JSON.parse(fixtureBytes);
 const routes=[['OC01-selection','10',false],['H02-02-a2-full-qa-before-u1','11',true],['H02-06-a3-full-qa-u2-unpublished','11',true],['H02-07-u2-published-b-not-admitted','11',false]];
 const handling={code:'PR_HUMAN_HANDLING',path:'/issues/2',message:'Obtain coherent child QA for the current observed PR source and target before publishing a new stack update; retain existing repair causes and historical evidence.'};
 const referenceFields=['provider','repository','number','source_revision','target_branch'];
 // All twelve complete expectations are specified from frozen fixture reports
 // and the accepted contract before the first product evaluation.
 const checks=[];
 for(const [id,number,publicationWait]of routes){
  const input=id==='OC01-selection'?f.inherited_own_preview.original.cases.find(c=>c.id===id):f.cases.find(c=>c.id===id);
  const oracle=id==='OC01-selection'?f.inherited_own_preview.cases.find(c=>c.id===id):input;
  assert(input&&oracle?.expected,id);
  const control={...structuredClone(input),expected:structuredClone(oracle.expected)};
  checks.push({...control,id:id+'/control'});
  const identity=control.expected.streams[0].proposal.existing_pr;
  assert.equal(identity.number,number);
  for(const target of [null,'repair-current-target']){
   const c=structuredClone(control);c.id=id+(target?'/source-plus-target':'/source-only');let changed=0;
   for(const field of ['repair_receipts','completion_receipts'])for(const [index,raw]of (c.snapshot[field]??[]).entries()){
    const e=JSON.parse(raw),same=p=>p.provider===identity.provider&&p.repository===identity.repository&&p.number===number;
    if(!e.pr_receipts.some(same))continue;
    const current=e.pr_receipts.filter(p=>same(p)&&p.current);assert.equal(current.length,1,c.id+' current observation');
    const old=current[0];old.current=false;e.pr_receipts.push({...old,current:true,source_revision:'9999999999999999999999999999999999999999',...(target?{target_branch:target}:{})});
    c.snapshot[field][index]=JSON.stringify(e);changed++;
   }
   assert(changed>0,c.id);
   c.expected.snapshot_digest='sha256:'+createHash('sha256').update(canonicalize({configuration_digest:c.expected.configuration_digest,snapshot:c.snapshot})).digest('hex');
   if(Object.hasOwn(c.options??{},'expectedSnapshotDigest'))c.options.expectedSnapshotDigest=c.expected.snapshot_digest;
   const stream=c.expected.streams[0];
   if(publicationWait){
    stream.decision='wait';stream.selected_ticket_id=null;stream.selected_key=null;stream.proposal=null;
    const row=stream.repair_order.find(r=>r.ticket_id==='1001');row.state='human_hold';row.reasons=[structuredClone(handling)];
    stream.reasons=[...stream.reasons.filter(r=>r.path!=='/issues/2'),structuredClone(handling)].sort((a,b)=>a.path.localeCompare(b.path)||a.code.localeCompare(b.code));
    stream.candidates.find(c=>c.ticket_id==='1001').eligible=false;
   }else{
    stream.proposal.existing_pr.source_revision='9999999999999999999999999999999999999999';
    if(target)stream.proposal.existing_pr.target_branch=target;
    assert.deepEqual(Object.keys(stream.proposal.existing_pr),referenceFields);
   }
   checks.push(c);
  }
 }
 assert.equal(checks.length,12);
 assert.equal(createHash('sha256').update(canonicalize(checks.map(({id,config,snapshot,options,expected})=>({id,config,snapshot,options:options??{},expected})))).digest('hex'),'48be5f8ea0c02394b17774f661b3a257234f05b165e1652dae38043981acc0e1','complete prepared inputs and expectations independently crosschecked before execution');
 verificationRecord('current-pr-fixed-expectations',checks);
 for(const c of checks){const before=JSON.stringify(c),actual=run(c);assert.deepEqual(actual,c.expected,c.id);assert.equal(JSON.stringify(c),before,c.id+' immutable input/oracle');assert.equal(actual.writes,0);assert.equal(actual.execution_authorized,false);for(const stream of actual.streams)assert(stream.proposal===null||stream.proposal.execution_authorized===false);}
 assert.equal(readFileSync(fixtureURL,'utf8'),fixtureBytes,'original fixture bytes');
});

test('repair fixture preserves all complete native human cases and nine distinct immutable checkpoints',()=>{
 const f=load();assert.equal(f.native_cases.length,42);assert.deepEqual(f.native_cases.map(c=>c.id),[...Array.from({length:41},(_,i)=>'R1-11-S'+String(i+1).padStart(2,'0')),'R1-11-H02']);
 for(const c of f.native_cases){assert.equal(c.execution,'human');for(const field of ['requirements','prerequisites','steps','expected','evidence'])assert(c[field].length>0,c.id+' '+field);assert.equal(typeof c.cleanup,'object');}
 assert.equal(f.cases.length,9);assert.equal(new Set(f.cases.map(c=>c.id)).size,9);
});
test('complete finite native repair matrix matches independent source preview oracles without mutations',()=>{
 for(const c of allCases(load())){const before=JSON.stringify(c),result=run(c);assert.deepEqual(result,c.expected,c.id);assert.deepEqual(run(c),result,c.id+' repeat');assert.equal(JSON.stringify(c),before);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);for(const s of result.streams){assert(s.proposal===null||s.proposal.execution_authorized===false);if(s.proposal)assert(['admit_new','admit_repair','queue_stack_update'].includes(s.proposal.kind));}}
});
test('source repair CLI preserves complete JSON and readable queue/admission/publication contracts and files',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'pgb-repair-cli-'));try{for(const c of allCases(load())){const config=path.join(dir,'config.json'),input=path.join(dir,'snapshot.json'),rawConfig=JSON.stringify(c.config),rawInput=JSON.stringify(c.snapshot);writeFileSync(config,rawConfig);writeFileSync(input,rawInput);const args=[new URL('../scripts/manager-preview.mjs',import.meta.url).pathname,'--config',config,'--input',input,...(c.options?.expectedSite?['--expected-site',c.options.expectedSite]:[]),...(c.options?.expectedSnapshotDigest?['--expected-snapshot-digest',c.options.expectedSnapshotDigest]:[])],expectedExit=c.expected.status==='complete'?0:1,json=spawnSync(process.execPath,[...args,'--json'],{cwd:dir,encoding:'utf8'});assert.equal(json.status,expectedExit,c.id+' '+json.stderr);assert.equal(json.stderr,'');assert.deepEqual(JSON.parse(json.stdout),c.expected,c.id);const human=spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8'});assert.equal(human.status,expectedExit,c.id);assert.equal(human.stderr,'');assert.match(human.stdout,/No execution authority; writes: 0/);const expectedCauses=c.expected.streams.flatMap(s=>(s.proposal?.roots??[]).map(r=>`  Cause: ticket ${r.ticket_id}; comment ${r.comment_id}; record ${r.record_id}; digest ${r.digest}.`));assert.deepEqual(human.stdout.split('\n').filter(line=>line.startsWith('  Cause:')),expectedCauses,c.id+' every ordered cause and exact cardinality');const p=c.expected.streams[0]?.proposal;if(p){assert(human.stdout.includes('Proposal '+p.kind));if(p.required_parent)assert(human.stdout.includes(p.required_parent.required_revision));assert(human.stdout.includes('publication required '+p.publication_required));}assert.equal(readFileSync(config,'utf8'),rawConfig);assert.equal(readFileSync(input,'utf8'),rawInput);assert.deepEqual(readdirSync(dir).sort(),['config.json','snapshot.json']);}}finally{rmSync(dir,{recursive:true,force:true});}
});

test('repair preview cannot access providers, processes, network or filesystem mutation APIs',()=>{
 const script=`import fs from 'node:fs';import fsp from 'node:fs/promises';import cp from 'node:child_process';import http from 'node:http';import https from 'node:https';import net from 'node:net';import {syncBuiltinESMExports} from 'node:module';const fixture=JSON.parse(fs.readFileSync(process.argv[1]));let attempts=0;const stop=()=>{attempts++;throw Error('SIDE_EFFECT_ATTEMPT')};for(const k of ['writeFileSync','appendFileSync','renameSync','unlinkSync','mkdirSync','rmSync','createWriteStream'])fs[k]=stop;for(const k of ['writeFile','appendFile','rename','unlink','mkdir','rm'])fsp[k]=stop;for(const k of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])cp[k]=stop;http.request=stop;http.get=stop;https.request=stop;https.get=stop;net.connect=stop;net.createConnection=stop;globalThis.fetch=stop;syncBuiltinESMExports();const {previewSnapshot}=await import(${JSON.stringify(new URL('../lib/manager/decisions.mjs',import.meta.url).href)});const results=[...fixture.cases,...fixture.scenarios,...fixture.normalization.cases].map(c=>previewSnapshot(JSON.stringify(c.config),JSON.stringify(c.snapshot),c.options));if(attempts!==0)throw Error('SIDE_EFFECT_ATTEMPT');console.log(JSON.stringify(results));`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script,fixtureURL.pathname],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');assert.deepEqual(JSON.parse(result.stdout),allCases(load()).map(c=>c.expected));
});

test('H02 eligibility successor preserves all nine inputs and reports except four approved leaves',()=>{
 const f=load(),amendment=f.h02_eligibility_amendment;assert.equal(amendment.plan_json_sha256,'3712b00eecc90d6f1aeca799800001ea1370b0ad40dbd085bde2d362040ab986');assert.equal(amendment.original_expected_reports.length,9);assert.equal(amendment.allowed_expected_deltas.length,4);
 const exact=[['H02-00-r1-queued',0,'1000'],['H02-03-u1-queued-r2-arrived',0,'1000'],['H02-06-a3-full-qa-u2-unpublished',1,'1001'],['H02-07-u2-published-b-not-admitted',1,'1001']];assert.deepEqual(amendment.allowed_expected_deltas.map(d=>[d.case_id,Number(d.report_pointer.split('/')[4]),d.ticket_id]),exact);let flags=0;
 for(const c of f.cases){const expected=structuredClone(c.expected),original=amendment.original_expected_reports.find(r=>r.id===c.id);assert(original);flags+=expected.streams[0].candidates.length;for(const change of amendment.allowed_expected_deltas.filter(d=>d.case_id===c.id)){const index=Number(change.report_pointer.split('/')[4]),candidate=expected.streams[0].candidates[index];assert.equal(candidate.ticket_id,change.ticket_id);assert.equal(candidate.eligible,true);assert.equal(change.old,false);assert.equal(change.new,true);candidate.eligible=false;}assert.deepEqual(expected,original.expected,c.id+' only approved eligibility delta');}
 assert.equal(flags,36);
});

test('complete native coverage and16 gated leaves preserve the original fixed reports',()=>{
 const f=load(),amendment=f.gated_eligibility_amendment;assert.equal(amendment.plan_md_sha256,'955555cd824ec7ba4b41168aa7691af443adc8269999dd3ee1306613be32b8c8');assert.equal(amendment.plan_json_sha256,'4f696009de0e471b626cf231fe9b9536785077ade4fb3dcec9d9a378183203ed');
 const groups={inherited36:f.inherited_own_preview.cases,native78:f.native_preparation.full_report_mappings,normalization13:f.normalization.cases};let leaves=0,rows=0;for(const [name,cases]of Object.entries(groups)){const old=amendment.original_proposed_reports[name],allowed=amendment.allowed_expected_deltas[name];assert.equal(cases.length,old.length);for(const c of cases){const restored=structuredClone(c.expected);restoreS41Summary(restored,c.id,f.s41_summary_amendment);restoreRemainderExpected(restored,c.id,f.s23_remainder_amendment);rows+=restored.streams.reduce((n,s)=>n+s.candidates.length,0);for(const d of allowed.filter(d=>d.id===c.id)){const parts=d.pointer.split('/').slice(1);let at=restored;for(const part of parts.slice(0,-1))at=at[part];assert.equal(at[parts.at(-1)],false);at[parts.at(-1)]=true;leaves++;}assert.deepEqual(restored,old.find(o=>o.id===c.id).expected,c.id+'16-leaf-only preservation');}}assert.equal(leaves,16);assert.equal(rows,414);
 assert.equal(f.native_full_coverage.length,42);assert.deepEqual(f.native_full_coverage.map(c=>c.native_id),f.native_cases.map(c=>c.id));assert(f.native_full_coverage.every(c=>c.human_status==='NOT_RUN'&&c.effective_full_report_routes.length));assert.equal(f.native_preparation.full_report_mappings.length,78);assert.equal(f.native_preparation.effective_execution_groups.length,75);assert.equal(f.scenarios.length,44);assert.equal(f.legacy_native_full.cases.length,24);
 const legacy=JSON.parse(readFileSync(new URL('./fixtures/manager-candidates.json',import.meta.url))).cases,lookup=route=>{const [type,id]=route.split('/');if(type==='scenarios')return f.scenarios.find(c=>c.id===id);if(type==='cases')return f.cases.find(c=>c.id===id);if(type==='legacy_candidates'){const c=legacy.find(c=>c.id===id);return {...c,expected:f.legacy_native_full.cases.find(e=>e.id===id).expected};}if(type==='inherited_own_preview.cases'){const c=f.inherited_own_preview.original.cases.find(c=>c.id===id);return {...c,expected:f.inherited_own_preview.cases.find(e=>e.id===id).expected};}assert.fail(route);};for(const mapping of f.native_preparation.full_report_mappings){const target=lookup(mapping.execution_route);assert(target,mapping.id);assert.deepEqual(target.expected,mapping.expected,mapping.id+'full mapped report');assert.equal(createHash('sha256').update(canonicalize({config:target.config,snapshot:target.snapshot,options:target.options??{}})).digest('hex'),mapping.input_identity_sha256,mapping.id+'exact effective input route');}for(const c of f.native_full_coverage)for(const route of c.effective_full_report_routes)assert(lookup(route),route);
});

test('focused authenticated unfinished child waits match two full fixed reports',()=>{
 const scenarios=load().scenarios;for(const id of ['H02-B-own-dependency-wait','S21-after-worker-wait-B-Rework-Queued']){const c=scenarios.find(c=>c.id===id);assert(c,id);const before=JSON.stringify(c),result=run(c);assert.deepEqual(result,c.expected,id);assert.equal(JSON.stringify(c),before);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);}
});


const s41Id='S41-published-U1-intent-and-drift';
const s41Inserted=[{code:'PARENT_REPAIR_PENDING',path:'/issues/2',message:'Obtain the recorded immediate parent’s current coherent repaired QA before continuing.'},{code:'PARENT_REPAIR_PENDING',path:'/issues/3',message:'Obtain the recorded immediate parent’s current coherent repaired QA before continuing.'}];
function restoreS41Summary(report,id,amendment){if(id!==s41Id)return;assert.equal(amendment.case_id,id);assert.deepEqual(report.streams[0].reasons.slice(1,3),s41Inserted);report.streams[0].reasons.splice(1,2);}
function s41ContrastCases(f){return ['S41-published-U1-intent-and-drift','H02-03-u1-queued-r2-arrived','H02-paused','H02-five-Human-Review-cap','H02-unrelated-authentic-active-D','S17-unresolved-intent','S28-scoped-fix-worker-blocker'].map(id=>{const c=[...f.cases,...f.scenarios].find(c=>c.id===id);assert(c,id);return c;});}
function assertS41Readable(text,c){assert.match(text,/No execution authority; writes: 0/);if(c.id===s41Id){assert(text.includes(': hold;'));for(const r of [...s41Inserted,{code:'CHANGED_INPUT',path:''},{code:'PENDING_INTENT',path:'/pending_intents'}])assert(text.includes(r.code+' '+r.path+':'),r.code);for(const key of ['EX-2','EX-3'])assert(text.includes('Repair '+key+': parent_completion.'));}}

test('S41 summary amendment preserves exact reports and one active hash',()=>{
 const f=load(),a=f.s41_summary_amendment;assert.equal(a.plan_sha256,'7baf814c32187232d6f6240f74abf85fae030d555d06486e9e101e8903bca4d9');assert.equal(a.original_fixture_sha256,'d396dc0a1116fdcd241a56b7b076d361e8f3a977338c3de37b9211730c859e04');assert.equal(a.case_id,s41Id);assert.deepEqual(a.active_expected_pointers,['/scenarios/13/expected','/native_preparation/full_report_mappings/26/expected']);assert.deepEqual(a.insertion,{container:'/streams/0/reasons',insert_before_original_index:1,objects:s41Inserted});
 const hash=r=>'sha256:'+createHash('sha256').update(canonicalize(r)).digest('hex'),old='sha256:2a8b9211e899bff2319c03935e3034f6986161d3ccb1e93eeaec33af2d9a5f11',next='sha256:d3881c8ab37485db7de22d63f846c5dbd1463aee8b4a03551ae17762fb8badba';assert.equal(hash(a.original_expected),old);
 const expected=structuredClone(a.original_expected);expected.streams[0].reasons.splice(1,0,...structuredClone(s41Inserted));let addedLeaves=0;
 for(const c of [f.scenarios[13],f.native_preparation.full_report_mappings[26]]){assert.equal(c.id,s41Id);assert.deepEqual(c.expected,expected);assert.equal(hash(c.expected),next);const restored=structuredClone(c.expected);restoreS41Summary(restored,c.id,a);assert.deepEqual(restored,a.original_expected);assert.equal(hash(restored),old);addedLeaves+=6;}assert.equal(addedLeaves,12);
 const delta=a.active_oracle_hash_delta;assert.equal(delta.pointer,'/native_preparation/effective_execution_groups/25/oracle_hashes/0');assert.equal(delta.representative_id,s41Id);assert.equal(delta.old,old);assert.equal(delta.new,next);const group=structuredClone(f.native_preparation.effective_execution_groups[25]);assert.deepEqual(group.oracle_hashes,[next]);group.oracle_hashes[0]=old;assert.deepEqual(group,{input_hash:'sha256:e189069ddc37efe5d749d73b8b1d9ab16613c3428b8d29f0207427b4e39fd077',representative_id:s41Id,all_case_ids:[s41Id],oracle_hashes:[old],route:'scenarios/'+s41Id,original_route:'scenarios/'+s41Id});
});
test('focused S41 and six fixed contrasts source API and CLI',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'pgb-s41-source-'));try{for(const c of s41ContrastCases(load())){const before=JSON.stringify(c),result=run(c);assert.deepEqual(result,c.expected,c.id);const config=path.join(dir,'config.json'),input=path.join(dir,'snapshot.json'),rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot);writeFileSync(config,rawConfig);writeFileSync(input,rawSnapshot);const args=[new URL('../scripts/manager-preview.mjs',import.meta.url).pathname,'--config',config,'--input',input,...(c.options?.expectedSite?['--expected-site',c.options.expectedSite]:[]),...(c.options?.expectedSnapshotDigest?['--expected-snapshot-digest',c.options.expectedSnapshotDigest]:[])],exit=c.expected.status==='complete'?0:1;
 for(const json of [true,false]){const p=spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(p.status,exit,c.id);assert.equal(p.stderr,'');if(json)assert.deepEqual(JSON.parse(p.stdout),c.expected,c.id);else assertS41Readable(p.stdout,c);}assert.equal(readFileSync(config,'utf8'),rawConfig);assert.equal(readFileSync(input,'utf8'),rawSnapshot);assert.deepEqual(readdirSync(dir).sort(),['config.json','snapshot.json']);assert.equal(JSON.stringify(c),before);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);}}finally{rmSync(dir,{recursive:true,force:true});}
});

const remainderIds=['S23-five-Human-Review-queue-only','S24-child-stage-2','S24-child-stage-3','S24-child-stage-4','S24-child-stage-7','S06-second-configured-accepted-stage'];
function remainderAt(object,pointer){const parts=pointer.split('/').slice(1);let at=object;for(const key of parts.slice(0,-1))at=at[key];return {at,key:parts.at(-1)};}
function restoreRemainderExpected(report,id,amendment){const change=amendment.transformations.find(c=>c.id===id);if(!change)return;for(const op of [...change.expected_changes].reverse()){const {at,key}=remainderAt(report,op.path);if(op.op==='insert'){assert.deepEqual(at[key],op.value);at.splice(Number(key),1);}else if(op.op==='remove')at.splice(Number(key),0,structuredClone(op.old));else{assert.deepEqual(at[key],op.value);at[key]=structuredClone(op.old);}}assert.deepEqual(report,change.original_expected);}
function remainderFixedExpected(change){const report=structuredClone(change.original_expected),s=report.streams[0],pending={code:'PARENT_REPAIR_PENDING',path:'/issues/3',message:'Obtain the recorded immediate parent’s current coherent repaired QA before continuing.'};if(change.id===remainderIds[0])s.reasons.splice(0,0,{code:'HUMAN_REVIEW_CAP',path:'',message:'One return would exceed five Human Review tickets.'});else if(remainderIds.slice(1,4).includes(change.id)){assert.deepEqual(s.repair_order[1],{ticket_id:'1001',key:'EX-2',state:'active',reasons:[]});s.repair_order[1]={ticket_id:'1002',key:'EX-3',state:'parent_completion',reasons:[pending]};s.reasons.splice(2,0,pending);}else if(change.id===remainderIds[4]){assert.deepEqual(s.repair_order[1],{ticket_id:'1001',key:'EX-2',state:'human_hold',reasons:[]});s.repair_order.splice(1,1);}else{assert.equal(change.id,remainderIds[5]);assert.equal(report.snapshot_digest,'sha256:e14dd62ade29c6ca46ba044a8b3f3608d3930eb84691c86a4511ac6555df0233');report.snapshot_digest='sha256:4d3eedeecdefbd26e1e2f636dcf973527fcab769459188e3c8f1b7f9faf29470';}return report;}
test('aggregate six literal amendments preserve the complete original fixture',()=>{
 const f=load(),a=f.s23_remainder_amendment,hash=x=>createHash('sha256').update(canonicalize(x)).digest('hex');assert.equal(a.plan_sha256,'fdf2dd3397f17aed6816760660b202517f3109acaa199aa4da82ea98817e8f03');assert.equal(a.literal_sha256,'86b435b4431abcef7c57853de804d9d14e5d9e7b4503bac2c11b176173a32649');assert.equal(a.original_fixture_sha256,'0401193dd617a683b90d64b2cadc7a5953f2f516568ccbf71cf04114fe4f3160');assert.equal(a.original_canonical_sha256,'0f3427ad7244fd2d4c8aac39f49da6a6a3b86fcc97340556edd1c79f457cee1f');assert.deepEqual(a.transformations.map(c=>c.id),remainderIds);
 const restored=structuredClone(f);delete restored.s23_remainder_amendment;let copies=0,hashes=0;const newHashes=['11c3f4e57d7ef6388dac4d7a465243c74e48b09198b52aef1415cc91f71371bd','0b555456d12dab947efd0e9ee72286bcaf4a9aaa9649d3aff814e5eabaf76d58','ee1a43377922c49e2a26e21ecab2d11fbdaace89ceca9d6616711a49609a6896','ae31c0fe0d55e0b584c33476bb23982c98bcae91bf2e42912fd81a64ab2dc5fa','0996d8809fd55bfb36feffd565a1f16c35d83fb05abaaf5015150c10a1a3b0c9','324bb6525b85e74408de298bf9cee2af2c7b0769dd2c2a37435c3c6c0ca448fe'];
 for(const [index,c]of a.transformations.entries()){assert.deepEqual(c.proposed_expected,remainderFixedExpected(c));assert.equal('sha256:'+hash(c.proposed_expected),c.new_oracle_hash);assert.equal(c.new_oracle_hash,'sha256:'+newHashes[index]);for(const pointer of c.active_expected_pointers){const {at,key}=remainderAt(restored,pointer);assert.deepEqual(at[key],c.proposed_expected);restoreRemainderExpected(at[key],c.id,a);copies++;}const {at,key}=remainderAt(restored,c.oracle_hash_pointer);assert.equal(at[key],c.new_oracle_hash);at[key]=c.old_oracle_hash;hashes++;
 if(c.input_change){const input=f.scenarios.find(x=>x.id===c.id),raw=input.snapshot.completion_receipts[0],change=c.input_change;assert.equal(c.id,'S06-second-configured-accepted-stage');assert(!Object.hasOwn(input,'options'));assert.equal(raw,change.new);assert.equal(change.old.split('"accepted_later_stage_ids":["8","11"]').length,2);assert.equal(change.old.replace('"accepted_later_stage_ids":["8","11"]','"accepted_later_stage_ids":["11","8"]'),raw);const prior=JSON.parse(change.old),next=JSON.parse(raw);next.trusted.projects[0].accepted_later_stage_ids=['8','11'];assert.deepEqual(next,prior);assert.equal(input.expected.streams[0].selected_ticket_id,'1100');assert.equal(input.expected.streams[0].proposal.kind,'admit_new');assert.equal(hash({config:input.config,snapshot:input.snapshot,options:input.options??{}}),'1817860350455c8bbce5e30a5c79849ec44049439040e636696046ee5c284acc');const present=Object.fromEntries(['config','snapshot','options'].filter(k=>Object.hasOwn(input,k)).map(k=>[k,input[k]]));assert.equal('sha256:'+hash(present),'sha256:9a3e4129dcc29284eff6414386ee8bdc13f2365516d6ad7e7894c59b3764e08b');assert.equal(input.expected.snapshot_digest,'sha256:'+hash({configuration_digest:'sha256:'+hash(input.config),snapshot:input.snapshot}));restored.scenarios.find(x=>x.id===c.id).snapshot.completion_receipts[0]=change.old;for(const pointer of c.input_hash_pointers){const {at,key}=remainderAt(restored,pointer),mapping=pointer.endsWith('input_identity_sha256');assert.equal(at[key],mapping?change.new_input_hash.slice(7):change.new_group_input_hash);at[key]=mapping?change.old_input_hash.slice(7):change.old_group_input_hash;}}
 }assert.equal(copies,12);assert.equal(hashes,6);assert.equal(hash(restored),a.original_canonical_sha256);
});
test('eight affected source cases preserve full fixed API and CLI reports',()=>{
 const f=load(),ids=[...remainderIds,'H02-order-permutation','H02-06-a3-full-qa-u2-unpublished'],dir=mkdtempSync(path.join(tmpdir(),'pgb146-affected-'));try{for(const id of ids){const c=[...f.cases,...f.scenarios].find(c=>c.id===id);assert(c,id);const before=JSON.stringify(c),result=run(c);assert.deepEqual(result,c.expected,id);const config=path.join(dir,'config.json'),input=path.join(dir,'snapshot.json'),rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot);writeFileSync(config,rawConfig);writeFileSync(input,rawSnapshot);const args=[new URL('../scripts/manager-preview.mjs',import.meta.url).pathname,'--config',config,'--input',input,...(c.options?.expectedSite?['--expected-site',c.options.expectedSite]:[]),...(c.options?.expectedSnapshotDigest?['--expected-snapshot-digest',c.options.expectedSnapshotDigest]:[])],exit=c.expected.status==='complete'?0:1;
 for(const json of [true,false]){const p=spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:dir,encoding:'utf8',timeout:30000});assert.equal(p.status,exit,id);assert.equal(p.stderr,'');if(json)assert.deepEqual(JSON.parse(p.stdout),c.expected,id);else{assert.match(p.stdout,/No execution authority; writes: 0/);for(const s of c.expected.streams){if(s.proposal){assert(p.stdout.includes('Proposal '+s.proposal.kind));if(s.proposal.required_parent)assert(p.stdout.includes(s.proposal.required_parent.required_revision));assert(p.stdout.includes('publication required '+s.proposal.publication_required));}for(const row of s.repair_order)assert(p.stdout.includes('Repair '+row.key+': '+row.state+'.'));for(const reason of s.reasons)assert(p.stdout.includes(reason.code+' '+reason.path+': '+reason.message));}}}
 assert.equal(readFileSync(config,'utf8'),rawConfig);assert.equal(readFileSync(input,'utf8'),rawSnapshot);assert.deepEqual(readdirSync(dir).sort(),['config.json','snapshot.json']);assert.equal(JSON.stringify(c),before);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);}}finally{rmSync(dir,{recursive:true,force:true});}
});
