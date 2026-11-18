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

// R3A expected identities are retained independently in the native-input packet.
import {composeOrdinarySnapshot} from '../lib/manager/snapshot.mjs';
const r3aPacket=()=>JSON.parse(readFileSync(new URL('./fixtures/manager-apply.json',import.meta.url))).recorded_repair_preview;
function r3aCompose(c){const composed=composeOrdinarySnapshot(JSON.stringify(c.config),c.inspection,c.state);assert.equal(composed.valid,true,JSON.stringify(composed.diagnostics));return composed.snapshot;}
function r3aPreview(c){return JSON.parse(JSON.stringify(previewSnapshot(JSON.stringify(c.config),JSON.stringify(r3aCompose(c)),{mode:'ordinary'})));}
test('R3A-01 actual composed reviewer failure needs no successful QA',()=>{
 const c=r3aPacket().cases.find(c=>c.id==='reviewer'),before=JSON.stringify(c),snapshot=r3aCompose(c),r=JSON.parse(JSON.stringify(previewSnapshot(JSON.stringify(c.config),JSON.stringify(snapshot),{mode:'ordinary'})));
 assert.equal(snapshot.completion_receipts.length,0);assert.equal(snapshot.repair_receipts.length,2);assert.equal(r.valid,true,JSON.stringify(r));assert.equal(r.streams[0].decision,'select',JSON.stringify(r));const p=r.streams[0].proposal;assert.equal(p.kind,'admit_repair');assert.deepEqual(p.existing_assignment,c.expected.assignment);assert.deepEqual(p.existing_pr,c.expected.pr);assert.deepEqual(p.request_refs,c.expected.request_refs);assert.deepEqual(p.roots,c.expected.request_refs);assert.equal(r.writes,0);assert.equal(r.execution_authorized,false);assert.equal(r.external_freshness,'not_evaluated');assert.equal(JSON.stringify(c),before);
});

const r3aJSON=value=>JSON.parse(JSON.stringify(value));
const r3aWrap=text=>JSON.stringify({version:1,type:'doc',content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text}]}]});
import {inspectRecordedHistory,inspectRecordedCompletion,validateReceiptChain,validateWorkerCurrent} from '../lib/contracts/receipts.mjs';
import {extractHandoffCandidate} from '../lib/contracts/handoff.mjs';
// Rewrite supplied records in dependency order and retain exact publication metadata.
// This prepares coherent synthetic inputs; expected selection is supplied by each case.
function r3aRehashPage(page,change){
 const mapping=new Map();
 const remap=value=>{
  if(Array.isArray(value))return value.map(remap);
  if(!value||typeof value!=='object')return value;
  const found=mapping.get(canonicalize(value));
  return found?structuredClone(found):Object.fromEntries(Object.entries(value).map(([key,child])=>[key,remap(child)]));
 };
 const remapRetained=rows=>rows.map(row=>{
  const {ticket_id,comment_id,record_id,digest}=row;
  return {...row,...mapping.get(canonicalize({ticket_id,comment_id,record_id,digest}))};
 });
 for(const comment of page.comments){
  const old=extractHandoffCandidate(comment.body);
  const reference={ticket_id:page.ticket_id,comment_id:comment.id,record_id:old.value.record_id,digest:old.record_digest};
  const record=remap(old.value);
  change(record,comment.id);
  const digest='sha256:'+createHash('sha256').update(canonicalize(record)).digest('hex');
  mapping.set(canonicalize(reference),{...reference,record_id:record.record_id,digest});
  comment.body=r3aWrap(JSON.stringify(record));
 }
 return {remap,remapRetained};
}
function r3aRewrite(c,change){
 const observation=c.inspection.observations,issue=observation.issues.find(i=>i.id==='1000');
 const page=observation.comment_pages.find(p=>p.ticket_id==='1000');
 const {remap,remapRetained}=r3aRehashPage(page,change);
 issue.pointer.value=remap(issue.pointer.value);
 c.state.retained_members=remap(c.state.retained_members);
 c.state.retained=remapRetained(c.state.retained);
 observation.exact_comments=page.comments.map(comment=>({ticket_id:'1000',...comment}));
 return c;
}
function r3aNewWork(c,{status='1',bug=false,id='1100',key='EX-2'}={}){const o=c.inspection.observations,source=o.issues.find(i=>i.id==='1000'),issue={...structuredClone(source),id,key,status_id:status,type_id:bug?'23':'22',pointer:{state:'absent',value:null}};o.issues.push(issue);o.comment_pages.push({site:c.config.jira.site,ticket_id:id,start_at:0,total:0,is_last:true,comments:[]});c.inspection.report.scopes[0].current_issue_ids.push(id);c.inspection.report.scopes[0].current_issue_ids.sort();const epic=o.issues[0],work=JSON.parse(JSON.parse(epic.body).content[0].content[0].text);work.workstreams[0].story_order.push(key);epic.body=r3aWrap(JSON.stringify(work));return issue;}
function r3aCheckHeld(c){const r=r3aPreview(c);assert.equal(r.valid,true,JSON.stringify(r));assert.equal(r.streams[0].selected_ticket_id,null,JSON.stringify(r));assert.equal(r.streams[0].proposal,null);assert.equal(r.writes,0);return r;}

test('R3A-01 QA human and complete unresolved ancestry retain independent request unions',()=>{
 for(const c of r3aPacket().cases.filter(c=>c.id!=='reviewer')){const before=JSON.stringify(c),r=r3aPreview(c),p=r.streams[0].proposal;assert.equal(r.valid,true,JSON.stringify(r));assert.equal(p?.kind,'admit_repair',JSON.stringify(r));assert.deepEqual(p.existing_assignment,c.expected.assignment,c.id);assert.deepEqual(p.existing_pr,c.expected.pr,c.id);assert.deepEqual(p.request_refs,c.expected.request_refs,c.id);assert.deepEqual(p.roots,c.expected.request_refs,c.id);assert.equal(p.required_parent,null);assert.equal(p.child_completion,null);assert.deepEqual(p.required_stack_updates,[]);assert.equal(p.publication_required,false);assert.equal(r.writes,0);assert.equal(r.execution_authorized,false);assert.equal(r.external_freshness,'not_evaluated');assert.equal(JSON.stringify(c),before);}
 const cases=r3aPacket().cases;assert.deepEqual(cases.find(c=>c.id==='ancestor-union').expected.request_refs.map(r=>r.comment_id),['16601','2023']);assert.deepEqual(cases.find(c=>c.id==='human').expected.request_refs.map(r=>r.comment_id),['16604'],'coherent repaired QA consumed old2023; implementation-only union retains it');
});

function r3aOriginalPrerequisite(){
 const prerequisite=structuredClone(r3aPacket().cases[0]);
 const own=prerequisite.inspection.observations.issues.find(i=>i.id==='1000');
 const work=JSON.parse(JSON.parse(own.body).content[0].content[0].text);
 work.prerequisites=[{ticket:'EX-2',required_outcome:'ai_qa_complete'}];
 own.body=r3aWrap(JSON.stringify(work));
 const requirements='sha256:'+createHash('sha256').update(canonicalize(work)).digest('hex');
 r3aRewrite(prerequisite,r=>r.requirements_digest=requirements);
 const upstream=r3aNewWork(prerequisite);
 const originalWork=JSON.parse(JSON.parse(r3aPacket().cases[0].inspection.observations.issues[1].body).content[0].content[0].text);
 upstream.body=r3aWrap(JSON.stringify(originalWork));
 return prerequisite;
}

test('R3A-02 original Ready prerequisite precedes authenticated repair in source and copy',()=>{
 const c=r3aOriginalPrerequisite();
 const snapshot=r3aJSON(r3aCompose(c));
 const report=r3aJSON(previewSnapshot(JSON.stringify(c.config),JSON.stringify(snapshot),{mode:'ordinary'}));
 assert.equal(report.streams[0].selected_ticket_id,'1100',JSON.stringify(report));
 assert.equal(report.streams[0].proposal.kind,'admit_new');

 const outer=snapshot.issues.find(i=>i.id==='1100');
 const previous=c.inspection.observations.issues.find(i=>i.id==='1000').pointer.value.assignment;
 const originalPage=c.inspection.observations.comment_pages.find(p=>p.ticket_id==='1000');
 const requestComment=originalPage.comments.find(comment=>comment.id===c.expected.request_refs[0].comment_id);
 const requestCandidate=extractHandoffCandidate(requestComment.body);
 const request={
  ...c.expected.request_refs[0],
  digest:requestCandidate.record_digest,
 };
 assert.equal(outer.pointer,null);
 assert.deepEqual(snapshot.retained_members,c.state.retained_members);
 assert.equal(snapshot.completion_receipts.length,0);
 const envelopes=snapshot.repair_receipts.map(JSON.parse);
 assert.deepEqual(envelopes.map(e=>e.target),[previous,request]);
 for(const envelope of envelopes){
  assert.equal(envelope.issues.filter(i=>i.id==='1100').length,1);
  const ready=envelope.issues.find(i=>i.id==='1100');
  assert.equal(ready.pointer,null);
  assert.deepEqual(ready.required_requests,[]);
  assert.deepEqual(ready.published_prs,[]);
  assert.equal(ready.pr_history_complete,true);
  assert.deepEqual(envelope.trusted.manager_assignments,[{ticket_id:'1000',assignment:previous}]);
  assert.deepEqual(envelope.issues.find(i=>i.id==='1000').required_requests,[request]);
  assert.deepEqual(envelope.requirements.filter(r=>r.ticket_id==='1100').map(r=>r.body),[outer.body]);
  const history=inspectRecordedHistory(JSON.stringify(envelope));
  assert.equal(history.valid,true,JSON.stringify(history.diagnostics));
  assert(history.records.every(record=>record.ticket_id==='1000'));
 }

 const dir=mkdtempSync(path.join(tmpdir(),'pgb82-ready-'));
 try{
  const copied=r3aPreparedCopy(dir),source=new URL('../',import.meta.url).pathname;
  const config=path.join(dir,'config.json'),input=path.join(dir,'snapshot.json');
  writeFileSync(config,JSON.stringify(c.config));
  writeFileSync(input,JSON.stringify(snapshot));
  const outputs=[];
  for(const root of [source,copied]){
   const result=spawnSync(process.execPath,[path.join(root,'scripts/manager-preview.mjs'),'--mode','ordinary','--config',config,'--input',input,'--json'],{
    cwd:dir,encoding:'utf8',env:{...process.env,NODE_PATH:''},
   });
   assert.equal(result.status,0,result.stdout+result.stderr);
   assert.equal(result.stderr,'');
   const observed=JSON.parse(result.stdout);
   assert.equal(observed.streams[0].selected_ticket_id,'1100');
   assert.equal(observed.streams[0].proposal.kind,'admit_new');
   assert.equal(observed.writes,0);
   assert.equal(observed.execution_authorized,false);
   assert.equal(observed.external_freshness,'not_evaluated');
   outputs.push(observed);
  }
  assert.deepEqual(outputs,[report,report]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

function r3aRewriteEnvelopeWork(envelope,ticket,prerequisites){
 const row=envelope.requirements.find(r=>r.ticket_id===ticket);
 const work=JSON.parse(row.format==='adf'?JSON.parse(row.body).content[0].content[0].text:row.body);
 work.prerequisites=prerequisites.map(key=>({ticket:key,required_outcome:'ai_qa_complete'}));
 const body=JSON.stringify(work);
 row.body=row.format==='adf'?r3aWrap(body):body;
 row.digest='sha256:'+createHash('sha256').update(canonicalize(work)).digest('hex');
 const issue=envelope.issues.find(i=>i.id===ticket);
 issue.requirements_digest=row.digest;
 const page=envelope.comment_pages.find(p=>p.ticket_id===ticket);
 if(!page.comments.length)return;
 const {remap,remapRetained}=r3aRehashPage(page,record=>{record.requirements_digest=row.digest;});
 for(const field of ['target','trusted','issues','request_resolutions'])envelope[field]=remap(envelope[field]);
 envelope.retained=remapRetained(envelope.retained);
}

test('R3A-02 read-only prerequisites reject false authority and mismatched native observations',()=>{
 const c=r3aOriginalPrerequisite();
 const snapshot=r3aJSON(r3aCompose(c));
 const envelope=JSON.parse(snapshot.repair_receipts[0]);
 const readyIndex=envelope.issues.findIndex(i=>i.id==='1100');
 const bodyIndex=envelope.requirements.findIndex(r=>r.ticket_id==='1100');
 const pageIndex=envelope.comment_pages.findIndex(p=>p.ticket_id==='1100');
 const rootPageIndex=envelope.comment_pages.findIndex(p=>p.ticket_id==='1000');
 assert(readyIndex>=0&&bodyIndex>=0&&pageIndex>=0&&rootPageIndex>=0);
 const readyPath='/issues/'+readyIndex,bodyPath='/requirements/'+bodyIndex,pagePath='/comment_pages/'+pageIndex;
 const readyRef={...envelope.target,ticket_id:'1100'};
 const inspectHistory=e=>inspectRecordedHistory(JSON.stringify(e));
 const inspectCompletion=e=>inspectRecordedCompletion(JSON.stringify(e));
 const inspectPreview=s=>previewSnapshot(JSON.stringify(c.config),JSON.stringify(s),{mode:'ordinary'});
 const assertHeld=(s,name)=>{
  const report=inspectPreview(s);
  assert.equal(report.valid,true,name+JSON.stringify(report));
  assert.equal(report.streams[0].selected_ticket_id,null,name);
  assert.equal(report.streams[0].proposal,null,name);
  assert(report.streams[0].reasons.some(r=>r.code==='REPAIR_PROOF_INVALID'&&r.path==='/repair_receipts/0'),name+JSON.stringify(report));
  assert.equal(report.writes,0,name);
  assert.equal(report.execution_authorized,false,name);
 };
 const assertInvalid=(result,code,path,name)=>{
  assert.equal(result.valid,false,name);
  assert.deepEqual(result.diagnostics.map(d=>({code:d.code,path:d.path})),[{code,path}],name);
  assert.equal(result.recorded_completion_established,false,name);
  if(Object.hasOwn(result,'records')){
   assert.deepEqual(result.records,[],name);
   assert.deepEqual(result.bindings,[],name);
  }else assert.equal(result.validated_leaf,null,name);
 };

 assert.equal(inspectHistory(envelope).valid,true);
 const positive=structuredClone(snapshot);
 const nullMember={...positive.retained_members[0],ticket_id:'1100',assignment:null};
 positive.retained_members.push(nullMember);
 assert.equal(inspectPreview(positive).streams[0].selected_ticket_id,'1100');
 for(const [name,mutate] of [
  ['outer pointer is unknown',(s,issue)=>{issue.pointer={state:'unknown',value:null};}],
  ['outer body bytes differ',(s,issue)=>{issue.body+=' ';}],
  ['outer retained assignment differs',s=>{s.retained_members.at(-1).assignment=readyRef;}],
 ]){
  const altered=structuredClone(positive);
  mutate(altered,altered.issues.find(i=>i.id==='1100'));
  assertHeld(altered,name);
 }

 const ordinary=structuredClone(envelope);
 const comment=structuredClone(ordinary.comment_pages[rootPageIndex].comments[0]);
 comment.body=JSON.stringify({version:1,type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'I checked the current ticket.'}]}]});
 ordinary.comment_pages[pageIndex].comments.push(comment);
 ordinary.comment_pages[pageIndex].total=1;
 const history=inspectHistory(ordinary);
 assert.equal(history.valid,true,JSON.stringify(history.diagnostics));
 assert(history.records.every(record=>record.ticket_id==='1000'));
 const ordinarySnapshot=structuredClone(snapshot);
 ordinarySnapshot.repair_receipts[0]=JSON.stringify(ordinary);
 assert.equal(inspectPreview(ordinarySnapshot).streams[0].selected_ticket_id,'1100');

 const editor=(e,index,edit)=>{
  const original=e.comment_pages[rootPageIndex].comments[index];
  const record=r3aJSON(extractHandoffCandidate(original.body).value);
  edit(record);
  original.body=r3aWrap(JSON.stringify(record));
 };
 for(const [name,code,path,mutate] of [
  ['missing Ready requirements','REQUIREMENTS',readyPath+'/requirements_digest',e=>{e.requirements.splice(bodyIndex,1);}],
  ['mismatched Ready digest','REQUIREMENTS',bodyPath+'/digest',e=>{e.requirements[bodyIndex].digest='sha256:'+'0'.repeat(64);}],
  ['manager assignment','ASSIGNMENT','/trusted/manager_assignments/1/assignment',e=>{
   e.trusted.manager_assignments.push({ticket_id:'1100',assignment:readyRef});
  }],
  ['typed publication','ASSIGNMENT',pagePath+'/comments/0/body',e=>{
   const publication=structuredClone(e.comment_pages[rootPageIndex].comments[0]);
   const record=r3aJSON(extractHandoffCandidate(publication.body).value);
   record.ticket_id='1100';
   record.record_id='11000000-0000-4000-8000-000000000005';
   record.operation_id=record.record_id;
   record.requirements_digest=e.issues[readyIndex].requirements_digest;
   publication.body=r3aWrap(JSON.stringify(record));
   e.comment_pages[pageIndex].comments.push(publication);
   e.comment_pages[pageIndex].total=1;
  }],
  ['retained publication','ASSIGNMENT','/retained/'+envelope.retained.length,e=>{
   const {author_id,update_author_id,created,updated}=e.comment_pages[rootPageIndex].comments[0];
   e.retained.push({...readyRef,site:e.trusted.site,author_id,update_author_id,created,updated});
  }],
  ['incomplete discovery','INCOMPLETE_READ','/comment_pages',e=>{e.comment_pages.splice(pageIndex,1);}],
  ['incomplete PR history','ASSIGNMENT',readyPath+'/pr_history_complete',e=>{e.issues[readyIndex].pr_history_complete=false;}],
  ['published PR','ASSIGNMENT',readyPath+'/published_prs',e=>{
   e.issues[readyIndex].published_prs=structuredClone(e.issues.find(i=>i.id==='1000').published_prs);
  }],
  ['required request','ASSIGNMENT',readyPath+'/required_requests',e=>{e.issues[readyIndex].required_requests.push(e.target);}],
  ['non-Ready status','ASSIGNMENT',readyPath+'/stage_id',e=>{e.issues[readyIndex].stage_id='2';}],
  ['record target','REFERENCE','/target',e=>{e.target=readyRef;}],
  ['typed reference','REFERENCE','/comment_pages/'+rootPageIndex+'/comments/1/body/assignment',e=>{
   editor(e,1,record=>{record.assignment=readyRef;});
  }],
  ['resolution request','REFERENCE','/request_resolutions/0/request',e=>{
   e.request_resolutions.push({request:readyRef,completion:e.target});
  }],
  ['resolution completion','REFERENCE','/request_resolutions/0/completion',e=>{
   e.request_resolutions.push({request:e.target,completion:readyRef});
  }],
 ]){
  const altered=structuredClone(envelope);
  mutate(altered);
  assertInvalid(inspectHistory(altered),code,path,name);
  const alteredSnapshot=structuredClone(snapshot);
  alteredSnapshot.repair_receipts[0]=JSON.stringify(altered);
  assertHeld(alteredSnapshot,name);
 }

 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/handoff-chains.json',import.meta.url)));
 const p01=structuredClone(fixtures.recorded.rows.find(r=>r.id==='P01').input);
 assert.equal(p01.issues[0].stage_id,p01.trusted.projects[0].stages['Human Review']);
 assert.deepEqual([p01.target.ticket_id,p01.target.comment_id,p01.target.record_id],[
  '1000','2008','00000000-0000-4000-8000-000000000008',
 ]);
 const assertAccepted=e=>{
  const completion=inspectCompletion(e);
  assert.equal(completion.validation.valid,true,JSON.stringify(completion.validation.diagnostics));
  assert.equal(completion.validation.recorded_completion_established,true);
  assert.deepEqual(r3aJSON(completion.validation.validated_leaf),e.target);
  const history=inspectHistory(e);
  assert.equal(history.valid,true,JSON.stringify(history.diagnostics));
  assert(history.records.some(record=>record.reference.record_id===e.target.record_id&&record.completed));
 };
 assertAccepted(p01);
 const complete=structuredClone(p01);
 for(const [id,key] of [['1100','EX-2'],['1101','EX-3']]){
  const body={...p01.requirements[0],ticket_id:id};
  complete.requirements.push(body);
  complete.issues.push({
   ...p01.issues[0],id,key,stage_id:'1',pointer:null,required_requests:[],published_prs:[],
  });
  complete.comment_pages.push({site:p01.trusted.site,ticket_id:id,start_at:0,total:0,is_last:true,comments:[]});
 }
 r3aRewriteEnvelopeWork(complete,'1000',['EX-2','EX-3']);
 assertAccepted(complete);

 const missing=structuredClone(complete);
 missing.issues.pop();
 missing.requirements.pop();
 missing.comment_pages.pop();
 const cycle=structuredClone(complete);
 r3aRewriteEnvelopeWork(cycle,'1100',['EX-1']);
 const unattached=structuredClone(complete);
 r3aRewriteEnvelopeWork(unattached,'1000',[]);
 const unrelated=structuredClone(unattached);
 const unrelatedSnapshot=r3aCompose(r3aBound(2));
 const unrelatedEnvelope=unrelatedSnapshot.repair_receipts.map(JSON.parse).find(e=>e.target.ticket_id==='1001');
 r3aRewriteEnvelopeWork(unrelatedEnvelope,'1001',['EX-2']);
 unrelatedEnvelope.issues[0].key='EX-4';
 unrelatedEnvelope.issues.push(...unrelated.issues.slice(1,2));
 unrelatedEnvelope.requirements.push(...unrelated.requirements.slice(1,2));
 unrelatedEnvelope.comment_pages.push(...unrelated.comment_pages.slice(1,2));
 const independent=inspectHistory(unrelatedEnvelope);
 assert.equal(independent.valid,true,JSON.stringify(independent.diagnostics));
 unrelated.issues.push(unrelatedEnvelope.issues[0]);
 unrelated.requirements.push(unrelatedEnvelope.requirements[0]);
 unrelated.comment_pages.push(unrelatedEnvelope.comment_pages[0]);
 unrelated.trusted.manager_assignments.push(...unrelatedEnvelope.trusted.manager_assignments);
 unrelated.retained.push(...unrelatedEnvelope.retained);
 // Only 1100 is attached to the extra assignment. Remove 1101 to isolate that case.
 unrelated.issues.splice(2,1);
 unrelated.requirements.splice(2,1);
 unrelated.comment_pages.splice(2,1);

 for(const [name,input,code,path] of [
  ['missing sibling',missing,'MISSING_REFERENCE','/requirements/0/body'],
  ['reachable cycle',cycle,'PREREQUISITE_CYCLE','/requirements/0/body'],
  ['unattached Ready siblings',unattached,'ASSIGNMENT','/issues/1/pointer'],
  ['Ready sibling reached only from unrelated assignment',unrelated,'ASSIGNMENT','/issues/1/pointer'],
 ]){
  assertInvalid(inspectHistory(input),code,path,name+' (history)');
  const completion=inspectCompletion(input);
  assertInvalid(completion.validation,code,path,name+' (completion)');
  assert.deepEqual(completion.bindings,[],name);
 }

 const strict=structuredClone(fixtures.chains.mixed);
 const worker=structuredClone(fixtures.rework_queue_p165.proof_cases.find(r=>r.id==='P165-PROOF-qa-partial').input);
 for(const [name,input,validate] of [['strict',strict,validateReceiptChain],['worker',worker,validateWorkerCurrent]]){
  const ok=validate(JSON.stringify(input));
  assert.equal(ok.valid,true,name+JSON.stringify(ok.diagnostics));
  input.issues[0].pointer=null;
  const invalid=validate(JSON.stringify(input));
  assert.equal(invalid.valid,false,name);
  assert.deepEqual(invalid.diagnostics.map(d=>({code:d.code,path:d.path})),[{code:'STRUCTURE',path:'/issues/0/pointer'}],name);
 }
});

test('R3A-02 prerequisites repair priority and finite availability controls',()=>{
 const base=()=>structuredClone(r3aPacket().cases[0]);
 const priority=base();r3aNewWork(priority,{bug:true});assert.equal(r3aPreview(priority).streams[0].selected_ticket_id,'1000');
 for(const [status,code]of [['2','OCCUPIED'],['7','BLOCKED']]){const c=base();r3aNewWork(c,{status});assert(r3aCheckHeld(c).streams[0].reasons.some(r=>r.code===code));}
 const paused=base();paused.inspection.observations.issues[0].status_id='1';assert(r3aCheckHeld(paused).streams[0].reasons.some(r=>r.code==='EPIC_PAUSED'));
 for(const count of [4,5]){const c=base();for(let n=0;n<count;n++)r3aNewWork(c,{status:'5',id:String(1100+n),key:'EX-'+String(2+n),bug:n===0});const r=r3aPreview(c);assert.equal(r.streams[0].human_review_ids.length,count);assert.equal(r.streams[0].selected_ticket_id,count===4?'1000':null);if(count===5)assert(r.streams[0].reasons.some(r=>r.code==='HUMAN_REVIEW_CAP'));}
});

test('R3A-02 missing conflicting wrong lineage or PR and unsupported obligations hold',()=>{
 const base=()=>structuredClone(r3aPacket().cases[0]);
 const missing=base(),missingPage=missing.inspection.observations.comment_pages.find(p=>p.ticket_id==='1000');missingPage.comments=missingPage.comments.filter(c=>c.id!=='2006');missingPage.total=missingPage.comments.length;missing.inspection.observations.exact_comments=missing.inspection.observations.exact_comments.filter(c=>!(c.ticket_id==='1000'&&c.id==='2006'));r3aCheckHeld(missing);
 const conflict=base();conflict.inspection.observations.comment_pages[1].comments.at(-1).author_id='unconfigured';conflict.inspection.observations.exact_comments.at(-1).author_id='unconfigured';r3aCheckHeld(conflict);
 for(const mutate of [r=>{if(r.kind==='repair_request')r.assignment.ticket_id='999';},r=>{if(r.kind==='repair_request')r.payload.pr.number='99';},r=>{if(r.kind==='repair_request')r.resume_authorization={};},r=>{if(r.kind==='repair_request')r.payload.pr=null;},r=>{if(r.kind==='repair_request')r.kind='stack_update_request';},r=>{if(r.kind==='repair_request')r.kind='dependency_wait';}]){const c=r3aRewrite(base(),mutate);r3aCheckHeld(c);}
 const c=base(),snapshot=r3aCompose(c),raw=JSON.parse(snapshot.repair_receipts.at(-1));raw.comment_pages.find(p=>p.ticket_id==='1000').comments.at(-1).author_id='other';snapshot.repair_receipts.push(JSON.stringify(raw));const held=previewSnapshot(JSON.stringify(c.config),JSON.stringify(snapshot),{mode:'ordinary'});assert.equal(held.streams[0].selected_ticket_id,null);assert(held.streams[0].reasons.some(r=>r.code==='REPAIR_PROOF_INVALID'));
});

function r3aBound(count,extraAdmission=false){
 const base=r3aPacket().cases[0],c=structuredClone(base),o=c.inspection.observations,epic=o.issues[0],order=[];o.issues=[epic];o.comment_pages=[o.comment_pages[0]];o.exact_comments=[];c.state.retained=[];c.state.retained_members=[];const scope=c.inspection.report.scopes[0];scope.old_issue_ids=[];scope.current_issue_ids=[];
 for(let n=0;n<count+(extraAdmission?1:0);n++){
  const id=String(1000+n),key='EX-'+String(n+1),part=structuredClone(base),oldIssue=part.inspection.observations.issues[1],mapping=new Map(),comments=[];
  const map=value=>{if(Array.isArray(value))return value.map(map);if(value&&typeof value==='object'){const known=mapping.get(canonicalize(value));if(known)return known;return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='ticket_id'&&v==='1000'?id:map(v)]));}return value;};
  for(const original of part.inspection.observations.comment_pages[1].comments){if(extraAdmission&&n===count&&original.id!=='2005')continue;const source=extractHandoffCandidate(original.body),old={ticket_id:'1000',comment_id:original.id,record_id:source.value.record_id,digest:source.record_digest},record=map(source.value);record.record_id=String(n+1).padStart(8,'0')+'-0000-4000-8000-'+original.id.padStart(12,'0');record.operation_id=record.kind==='admission'?record.record_id:record.assignment.record_id;const next={ticket_id:id,comment_id:original.id,record_id:record.record_id,digest:'sha256:'+createHash('sha256').update(canonicalize(record)).digest('hex')};mapping.set(canonicalize(old),next);comments.push({...original,body:r3aWrap(JSON.stringify(record))});}
  const issue={...oldIssue,id,key,pointer:map(oldIssue.pointer)};o.issues.push(issue);o.comment_pages.push({site:c.config.jira.site,ticket_id:id,start_at:0,total:comments.length,is_last:true,comments});o.exact_comments.push(...comments.map(comment=>({ticket_id:id,...comment})));c.state.retained_members.push({...base.state.retained_members[0],ticket_id:id,assignment:issue.pointer.value.assignment});c.state.retained.push(...base.state.retained.filter(r=>comments.some(comment=>comment.id===r.comment_id)).map(r=>({...r,...mapping.get(canonicalize(Object.fromEntries(['ticket_id','comment_id','record_id','digest'].map(k=>[k,r[k]]))))})));order.push(key);scope.old_issue_ids.push(id);scope.current_issue_ids.push(id);
 }
 const work=JSON.parse(JSON.parse(epic.body).content[0].content[0].text);work.workstreams[0].story_order=order;epic.body=r3aWrap(JSON.stringify(work));scope.old_issue_ids.sort();scope.current_issue_ids.sort();return c;
}
function r3aPreparedCopy(dir){
 const root=new URL('../',import.meta.url).pathname,bundle=JSON.parse(readFileSync(new URL('../config/skill-bundle.json',import.meta.url))),skills=path.join(dir,'skills');verificationFs.mkdirSync(skills,{recursive:true});
 for(const skill of bundle.skills)verificationFs.cpSync(path.join(root,'skills',skill),path.join(skills,skill),{recursive:true});
 const validator=path.join(skills,bundle.validatorPayload.directory);for(const relative of bundle.validatorPayload.sources){const target=path.join(validator,relative);verificationFs.mkdirSync(path.dirname(target),{recursive:true});verificationFs.copyFileSync(path.join(root,relative),target);assert.equal(verificationSHA(readFileSync(target)),verificationSHA(readFileSync(path.join(root,relative))),relative);}
 verificationFs.cpSync(path.join(root,'node_modules'),path.join(validator,'node_modules'),{recursive:true});return validator;
}
test('R3A-04 exact combined envelope bound preserves complete proof and rejects one over in source and copy',()=>{
 const exact=r3aBound(50),over=r3aBound(50,true),dir=mkdtempSync(path.join(tmpdir(),'pgb82-bound-'));try{const copied=r3aPreparedCopy(dir),source=new URL('../',import.meta.url).pathname;
 const omitted=structuredClone(over),disabled=structuredClone(over);
 delete omitted.config.manager.rework_enabled;
 disabled.config.manager.rework_enabled=false;
 const results=[];for(const [name,c]of [['exact',exact],['over',over],['omitted',omitted],['disabled',disabled]]){const input=path.join(dir,name+'.json');writeFileSync(input,JSON.stringify(c));const script=`import fs from 'node:fs';import{composeOrdinarySnapshot}from './lib/manager/snapshot.mjs';import{previewSnapshot}from './lib/manager/decisions.mjs';const c=JSON.parse(fs.readFileSync(process.argv[1]));const composed=composeOrdinarySnapshot(JSON.stringify(c.config),c.inspection,c.state);console.log(JSON.stringify({composed,preview:composed.valid?previewSnapshot(JSON.stringify(c.config),JSON.stringify(composed.snapshot),{mode:'ordinary'}):null}));`;const reports=[];
 for(const root of [source,copied]){const p=spawnSync(process.execPath,['--input-type=module','-e',script,input],{cwd:root,encoding:'utf8',env:{...process.env,NODE_PATH:''},maxBuffer:32*1024*1024});assert.equal(p.status,0,p.stderr);reports.push(JSON.parse(p.stdout));}assert.deepEqual(reports[1],reports[0],name);results.push(reports[0]);}
 const bounded=results[0];assert.equal(bounded.composed.valid,true,JSON.stringify(bounded.composed.diagnostics));assert.equal(bounded.composed.snapshot.repair_receipts.length,100);assert.equal(bounded.composed.snapshot.issues.filter(i=>i.required_requests.length===1).length,50);assert.equal(bounded.preview.valid,true);assert.equal(bounded.preview.streams[0].proposal.kind,'admit_repair');assert.equal(bounded.preview.writes,0);assert.equal(bounded.preview.execution_authorized,false);assert.equal(bounded.preview.external_freshness,'not_evaluated');assert.equal(results[1].composed.valid,false);assert.deepEqual(results[1].composed.diagnostics.map(({code,path})=>({code,path})),[{code:'LIMIT',path:'/repair_receipts'}]);assert.equal(results[1].composed.snapshot,null);
 for(const {composed,preview} of results.slice(2)){
  assert.equal(composed.valid,true,JSON.stringify(composed.diagnostics));
  const {completion_receipts,repair_receipts,issues}=composed.snapshot;
  const assignments=issues.filter(i=>i.pointer?.assignment).map(i=>i.pointer.assignment);
  assert.equal(assignments.length,51);
  assert.equal(completion_receipts.length,0);
  assert.deepEqual(repair_receipts.map(r=>JSON.parse(r).target),assignments);
  assert.equal(preview.valid,true);
  assert.equal(preview.streams[0].selected_ticket_id,null);
  assert.equal(preview.streams[0].proposal,null);
 }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('R3A-01 actual source copied human and JSON CLI preserve exact proposals',()=>{
 const dir = mkdtempSync(path.join(tmpdir(),'pgb82-cli-'));
 try {
  const copied = r3aPreparedCopy(dir);
  const source = new URL('../',import.meta.url).pathname;
  for (const c of r3aPacket().cases) {
   const snapshot = r3aCompose(c);
   const config = path.join(dir,c.id+'-config.json');
   const input = path.join(dir,c.id+'-snapshot.json');
   writeFileSync(config,JSON.stringify(c.config));
   writeFileSync(input,JSON.stringify(snapshot));
   const expected = r3aPreview(c);
   const {assignment, pr, request_refs: requestRefs} = c.expected;
   const outputs = [];
   for (const root of [source,copied]) {
    const args = [path.join(root,'scripts/manager-preview.mjs'),'--mode','ordinary','--config',config,'--input',input];
    const options = {cwd:dir,encoding:'utf8',env:{...process.env,NODE_PATH:''}};
    const json = spawnSync(process.execPath,[...args,'--json'],options);
    assert.equal(json.status,0,json.stdout+json.stderr);
    assert.equal(json.stderr,'');
    const report = JSON.parse(json.stdout);
    assert.deepEqual(report,expected);
    const proposal = report.streams[0].proposal;
    assert.equal(proposal.kind,'admit_repair',c.id);
    assert.deepEqual(proposal.existing_assignment,assignment,c.id);
    assert.deepEqual(proposal.existing_pr,pr,c.id);
    assert.deepEqual(proposal.request_refs,requestRefs,c.id);
    assert.deepEqual(proposal.roots,requestRefs,c.id);

    const human = spawnSync(process.execPath,args,options);
    assert.equal(human.status,0,human.stdout+human.stderr);
    assert.equal(human.stderr,'');
    assert.match(human.stdout,/No execution authority; writes: 0/);
    assert.match(human.stdout,/Proposal admit_repair/);
    assert.doesNotMatch(human.stdout,/Required repair work holds for human handling/);
    const lines = human.stdout.split('\n');
    assert.deepEqual(lines.filter(line=>line.startsWith('  Existing assignment:')),[
     `  Existing assignment: ticket ${assignment.ticket_id}; comment ${assignment.comment_id}; record ${assignment.record_id}; digest ${assignment.digest}.`,
    ],c.id);
    assert.deepEqual(lines.filter(line=>line.startsWith('  Recorded PR:')),[
     `  Recorded PR: provider ${pr.provider}; repository ${pr.repository}; number ${pr.number}; source revision ${pr.source_revision}; target branch ${pr.target_branch}.`,
    ],c.id);
    assert.deepEqual(lines.filter(line=>line.startsWith('  Cause:')),requestRefs.map(ref=>
     `  Cause: ticket ${ref.ticket_id}; comment ${ref.comment_id}; record ${ref.record_id}; digest ${ref.digest}.`
    ),c.id);
    outputs.push([json.stdout,human.stdout]);
   }
   assert.deepEqual(outputs[1],outputs[0],c.id);
   assert.equal(readFileSync(config,'utf8'),JSON.stringify(c.config));
   assert.equal(readFileSync(input,'utf8'),JSON.stringify(snapshot));
  }
 } finally {
  rmSync(dir,{recursive:true,force:true});
 }
});
