import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFile, mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir, cp, realpath, lstat, readlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { prepare } from '../scripts/prepare-pigboard-skills.mjs';
import { applyScopedInventoryCase } from './fixtures/jira-scoped-inventory-cases.mjs';
const bundle = JSON.parse(await readFile(new URL('../config/skill-bundle.json', import.meta.url)));
const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
async function fixture(t) {
 const root = await mkdtemp(path.join(os.tmpdir(), 'pigboard-test-'));
 t.after(() => rm(root, { recursive: true, force: true }));
 const source=path.join(root,'source'), app=path.join(root,'app'), cache=path.join(root,'cache');
 await mkdir(source); await mkdir(app); git(source,'init','-b','main');
 git(source,'config','user.name','Fixture'); git(source,'config','user.email','fixture@example.invalid');
 for(const name of bundle.skills){await mkdir(path.join(source,'skills',name),{recursive:true});await writeFile(path.join(source,'skills',name,'SKILL.md'),name);}
 for(const d of bundle.dependencyDirectories) await mkdir(path.join(source,'skills',d),{recursive:true});
  for (const relative of bundle.validatorPayload.sources) {
    const target = path.join(source, relative); await mkdir(path.dirname(target), { recursive:true });
    await cp(new URL('../' + relative, import.meta.url), target);
  }
 git(source,'add','.');git(source,'commit','-m','initial');
 return {source,app,cache,ref:'main'};
}
const installed=[];
const install=async dir=>{installed.push(dir);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'installed'),'yes');};
test('fetch and refresh preserve prior release and application; prepare dependencies', async t=>{
 const o=await fixture(t); const a=await prepare(o,install);
 assert.equal(await readFile(path.join(a.skills,'qa-api/SKILL.md'),'utf8'),'qa-api');
 assert.equal((await readdir(o.app)).length,0);
 await writeFile(path.join(o.source,'skills/qa-api/SKILL.md'),'updated');git(o.source,'add','.');git(o.source,'commit','-m','update');
 const b=await prepare(o,install);assert.notEqual(a.commit,b.commit);
 assert.equal(await readFile(path.join(a.skills,'qa-api/SKILL.md'),'utf8'),'qa-api');
 assert.equal(await readFile(path.join(b.skills,'qa-api/SKILL.md'),'utf8'),'updated');
 assert.equal(await readFile(path.join(b.skills,'qa-bruno/scripts/installed'),'utf8'),'yes');
 assert.ok(JSON.parse(await readFile(b.manifest)).sourceFiles['qa-api/SKILL.md']);
});
test('invalid ref and dependency failure publish nothing',async t=>{
 const o=await fixture(t);await assert.rejects(prepare({...o,ref:'missing'},install));
 await assert.rejects(prepare(o,async()=>{throw new Error('dependency failure');}));
 assert.deepEqual(await readdir(o.cache),[]);
});
test('missing helper and symlink cannot publish a release',async t=>{
 const o=await fixture(t);await rm(path.join(o.source,'skills/pr-review'),{recursive:true});git(o.source,'add','.');git(o.source,'commit','-m','missing');
 await assert.rejects(prepare(o,install));
 await mkdir(path.join(o.source,'skills/pr-review'));await writeFile(path.join(o.source,'skills/pr-review/SKILL.md'),'review');
 await symlink('/etc/passwd',path.join(o.source,'skills/qa-ui/leak'));git(o.source,'add','.');git(o.source,'commit','-m','link');
 await assert.rejects(prepare(o,install),/symlink/);assert.deepEqual(await readdir(o.cache),[]);
});
test('reject app paths, other git worktrees and symlink aliases',async t=>{
 const o=await fixture(t);
 await assert.rejects(prepare({...o,cache:path.parse(o.app).root},install),/separate/);
 await assert.rejects(prepare({...o,cache:path.join(o.app,'cache')},install),/separate/);
 await assert.rejects(prepare({...o,cache:path.join(o.source,'cache')},install),/Git checkout/);
 const alias=path.join(path.dirname(o.app),'alias');await symlink(o.app,alias);
 await assert.rejects(prepare({...o,cache:path.join(alias,'cache')},install),/separate/);
});
test('concurrent installs publish separate stable receipts',async t=>{
 const o=await fixture(t);const [a,b]=await Promise.all([prepare(o,install),prepare(o,install)]);
 assert.equal(a.commit,b.commit);assert.notEqual(a.release,b.release);
 assert.equal((await readdir(o.cache)).length,2);
});
test('reject a symlink at the skills root before reading external data',async t=>{
 const o=await fixture(t); const external=path.join(path.dirname(o.source),'external');
 const {rename}=await import('node:fs/promises');
 await rename(path.join(o.source,'skills'),external);
 await symlink(external,path.join(o.source,'skills'));
 git(o.source,'add','-A');git(o.source,'commit','-m','root symlink');
 await assert.rejects(prepare(o,install),/symlink/);
 assert.deepEqual(await readdir(o.cache),[]);
});
test('validator payload completeness, regular files and ancestor symlinks are required',async t=>{
 const o=await fixture(t);
 for(const relative of ['contracts/epic-v1.schema.json','scripts/validate-work.mjs','package-lock.json']) {
  const file=path.join(o.source,relative), content=await readFile(file);await rm(file);git(o.source,'add','-A');git(o.source,'commit','-m','missing payload');
  await assert.rejects(prepare(o,install));assert.deepEqual(await readdir(o.cache),[]);
  await writeFile(file,content);git(o.source,'add','-A');git(o.source,'commit','-m','restore payload');
 }
 const {rename}=await import('node:fs/promises');const external=path.join(path.dirname(o.source),'contracts');await rename(path.join(o.source,'contracts'),external);await symlink(external,path.join(o.source,'contracts'));git(o.source,'add','-A');git(o.source,'commit','-m','linked payload ancestor');await assert.rejects(prepare(o,install),/symlink/);
});
test('payload sources are hashed and prepared as one fixed dependency directory',async t=>{
 const o=await fixture(t), a=await prepare(o,install), manifest=JSON.parse(await readFile(a.manifest));
 for(const relative of bundle.validatorPayload.sources) {assert(manifest.sourceFiles['work-validator/'+relative]);assert.deepEqual(await readFile(path.join(a.skills,'work-validator',relative)),await readFile(path.join(o.source,relative)));}
 assert.equal(await readFile(path.join(a.skills,'work-validator/installed'),'utf8'),'yes');
 assert(!manifest.sourceFiles['work-validator/node_modules/yaml/package.json']);
});

test('real copied configuration runtime works independently with prepared dependencies and honest damaged-copy recovery',async t=>{
 const {spawnSync}=await import('node:child_process');const {lstat}=await import('node:fs/promises');
 const o=await fixture(t),root=path.dirname(o.source),dependencyRoot=new URL('../node_modules/',import.meta.url);
 // Only this validator closure is real; unrelated helper installations retain the mock.
 const a=await prepare(o,async dir=>{if(path.basename(dir)==='work-validator')await cp(dependencyRoot,path.join(dir,'node_modules'),{recursive:true,dereference:true});else await install(dir);});
 const runtime=path.join(a.skills,'work-validator'),entry=path.join(runtime,'scripts/check-config.mjs'),cwd=path.join(root,'unrelated');await mkdir(cwd);
 for(const name of ['ajv','ajv-formats','canonicalize','yaml']){const file=path.join(runtime,'node_modules',name,'package.json');assert.equal((await lstat(file)).isSymbolicLink(),false);assert.deepEqual(await readFile(file),await readFile(new URL(name+'/package.json',dependencyRoot)));}
 const guard=path.join(root,'guard.mjs');await writeFile(guard,`import fs from 'node:fs';import fsp from 'node:fs/promises';import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';let attempts=0;const deny=()=>{attempts++;throw Error('effect')};for(const api of [fs,fsp])for(const key of ['writeFile','appendFile','mkdir','rm','rmdir','unlink','rename','copyFile','cp','symlink','link','chmod','chown','truncate','write','writev','createWriteStream'])for(const name of [key,key+'Sync'])if(typeof api[name]==='function')api[name]=deny;const open=fsp.open;fsp.open=async(...args)=>{if(args[1]!==fs.constants.O_NONBLOCK)deny();const h=await open(...args);for(const k of ['write','writeFile','appendFile','writev','truncate','chmod','chown'])h[k]=deny;return h;};for(const api of [http,https])for(const k of ['request','get'])api[k]=deny;for(const api of [net,tls])for(const k of ['connect','createConnection','createServer'])if(api[k])api[k]=deny;for(const k of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])cp[k]=deny;globalThis.fetch=deny;syncBuiltinESMExports();process.on('exit',()=>process.stderr.write('AUDIT attempts='+attempts+'\\n'));`);
 const env={...process.env};delete env.NODE_PATH;const run=(script,args)=>spawnSync(process.execPath,['--import',guard,script,...args],{cwd,env,encoding:'utf8',timeout:10000});
 const example=await readFile(path.join(runtime,'config/pigboss.example.yaml'),'utf8'),config=JSON.parse(example.slice(example.indexOf('{'))),input=path.join(root,'input.json'),previous=path.join(root,'previous.json');await writeFile(previous,JSON.stringify(config));
 const legacy=structuredClone(config);delete legacy.jira.connection;delete legacy.jira.read_bounds;
 const changed=structuredClone(config);changed.jira.connection.secret_reference='COPIED-REFERENCE-CANARY';const invalid=structuredClone(config);invalid.jira.connection.api_origin='ERROR-CANARY';
 for(const [v,code,status]of [[legacy,0,'missing_settings'],[config,0,'complete'],[changed,0,'complete'],[invalid,1,null]]){await writeFile(input,JSON.stringify(v));const before=await readFile(input),old=await readFile(previous),args=['--input',input,'--previous',previous,'--json'];const copied=run(entry,args),source=run(new URL('../scripts/check-config.mjs',import.meta.url).pathname,args);assert.equal(copied.status,code,copied.stderr);assert.deepEqual(JSON.parse(copied.stdout),JSON.parse(source.stdout));assert.equal(JSON.parse(copied.stdout).live_configuration?.status??null,status);assert.match(copied.stderr,/AUDIT attempts=0/);for(const canary of ['COPIED-REFERENCE-CANARY','ERROR-CANARY',config.jira.connection.cloud_id,config.jira.connection.secret_reference])assert(!copied.stdout.includes(canary));assert.deepEqual(await readFile(input),before);assert.deepEqual(await readFile(previous),old);}
 for(const args of [['--help'],['--help','--json']]){const p=run(entry,args);assert.equal(p.status,0);assert.match(p.stdout,/no secrets are resolved/);}
 const damaged=path.join(root,'damaged');await cp(runtime,damaged,{recursive:true});await rm(path.join(damaged,'lib/config/projects.mjs'));const result=run(path.join(damaged,'scripts/check-config.mjs'),['--input',input,'--json']);assert.equal(result.status,2);assert.equal(JSON.parse(result.stdout).diagnostics[0].code,'SETUP');assert.match(result.stderr,/AUDIT attempts=0/);assert.equal(run(entry,['--help']).status,0);assert.equal((await lstat(path.join(runtime,'lib/config/projects.mjs'))).isFile(),true);
});

async function prepareCopiedJiraFixture(t) {
 const o = await fixture(t), root = path.dirname(o.source);
 const dependencyRoot = new URL('../node_modules/', import.meta.url);
 const a = await prepare(o, async dir => {
  if (path.basename(dir) === 'work-validator')
   await cp(dependencyRoot, path.join(dir, 'node_modules'), {recursive: true, dereference: true});
  else await install(dir);
 });
 const runtime = path.join(a.skills, 'work-validator'), cwd = path.join(root, 'unrelated-jira');
 await mkdir(cwd);
 const env = {...process.env};
 delete env.NODE_PATH;
 const run = (runtimeRoot, v, json = true) => spawnSync(process.execPath, [
  path.join(runtimeRoot, 'test/fixtures/jira-preview-harness.mjs'),
  '--case', v.case, '--variant', v.variant, '--runtime', runtimeRoot, ...(json ? ['--json'] : [])
 ], {cwd, env, encoding: 'utf8', timeout: 10000});
 return {root, source: o.source, runtime, run};
}

const jiraPreviewPacket = 'test/fixtures/jira-preview-cases.json';
const isLateResolverCase = v => v.case === 'R1-33-H02' && v.variant === 'resolver-late';

test('real copied named-issue inspection uses its complete payload and TLS packet from unrelated cwd',async t=>{
 const {root, runtime, run} = await prepareCopiedJiraFixture(t);
 const cases=JSON.parse(await readFile(path.join(runtime,jiraPreviewPacket)));
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 for(const relative of ['lib/jira/read.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json','lib/config/projects.mjs','node_modules/yaml/package.json','node_modules/ajv/package.json'])assert.equal(hash(await readFile(path.join(runtime,relative))),hash(await readFile(new URL('../'+relative,import.meta.url))));
 // Every named variant includes its literal paired controls and L06 private projection.
 for (const v of cases.variants) {
  const copied = run(runtime, v);
  assert.equal(copied.status, 0, v.variant + ' ' + copied.stdout + ' ' + copied.stderr);
  const packet = JSON.parse(copied.stdout);
  assert.equal(packet.case, v.case);
  assert.equal(packet.variant, v.variant);
  assert(packet.runs.every(r => r.oracle_matched && r.effects === 0));
  if (isLateResolverCase(v)) {
   assert.equal(packet.runs.length, 1);
   const [verified] = packet.runs;
   const {scan_timeout_ms, request_timeout_ms} = v.config.jira.read_bounds;
   assert.equal(verified.report.status, 'incomplete');
   assert(verified.report.diagnostics.some(d => d.code === 'LIMIT_REACHED' && d.bound === 'scan_timeout_ms'));
   assert.equal(verified.report.counters.elapsed_ms, scan_timeout_ms);
   assert.equal(verified.report.limits.scan_timeout_ms, scan_timeout_ms);
   assert.equal(verified.report.limits.request_timeout_ms, request_timeout_ms);
   assert.equal(verified.report.cleanup.resolver, 'cancel_unconfirmed');
   assert.equal(verified.report.counters.requests_attempted, 0);
   assert.equal(verified.resolver_calls, 1);
   assert.deepEqual(verified.trace, []);
   assert.deepEqual(verified.server_trace, []);
   assert.deepEqual(verified.late_resolver, {
    delivered: 1, settled: 1, signal_aborted: true, requests_before: 0, requests_after: 0
   });
   assert.equal(verified.cleanup_complete, true);
  }
 }
 const guide=cases.variants.find(v=>v.variant==='guide-and-install'),human=run(runtime,guide,false),json=run(runtime,guide);assert.equal(human.status,0);const humanReport=JSON.parse(human.stdout.slice(human.stdout.indexOf('\n')+1)),jsonReport=JSON.parse(json.stdout).runs[0].report;const durationFields=['elapsed_ms','peak_request_elapsed_ms'];for(const report of [humanReport,jsonReport])for(const field of durationFields){assert(Number.isFinite(report.counters[field]),field+' must be finite');assert(report.counters[field]>=0,field+' must be nonnegative');}const humanComparison=structuredClone(humanReport),jsonComparison=structuredClone(jsonReport);for(const field of durationFields){humanComparison.counters[field]=0;jsonComparison.counters[field]=0;}assert.deepEqual(humanComparison,jsonComparison);assert.match(human.stdout,/Human acceptance remains a separate review/);
 const damaged=path.join(root,'damaged-jira');await cp(runtime,damaged,{recursive:true});await rm(path.join(damaged,'lib/jira/read.mjs'));const failed=run(damaged,guide);assert.equal(failed.status,2);assert.equal(JSON.parse(failed.stdout).diagnostics[0].code,'SETUP_MISSING');assert.equal(JSON.parse(failed.stdout).inspection_scope,'requested_issues');assert.equal(await readFile(path.join(runtime,'lib/jira/read.mjs'),'utf8'),await readFile(new URL('../lib/jira/read.mjs',import.meta.url),'utf8'));
});

test('copied fixture CLI identifies missing late resolver entry', async t => {
 const {root, source, runtime, run} = await prepareCopiedJiraFixture(t);
 const mutated = path.join(root, 'mutated-late-resolver');
 await cp(runtime, mutated, {recursive: true});

 const originalFiles = [
  path.join(runtime, jiraPreviewPacket),
  path.join(source, jiraPreviewPacket),
  new URL('./fixtures/jira-preview-cases.json', import.meta.url)
 ];
 const raw = await readFile(originalFiles[0]);
 const original = JSON.parse(raw);
 const originalCase = original.variants.find(isLateResolverCase);
 assert.deepEqual(originalCase.request.issue_ids, ['1000']);
 const expected = structuredClone(original);
 expected.variants.find(isLateResolverCase).request.issue_ids = [];
 const mutatedFile = path.join(mutated, jiraPreviewPacket);
 await writeFile(mutatedFile, JSON.stringify(expected, null, 2) + '\n');
 const changed = JSON.parse(await readFile(mutatedFile));
 assert.deepEqual(changed, expected);

 const result = run(mutated, originalCase);
 assert.equal(result.status, 2);
 assert.equal(result.stderr, '');
 for (const forbidden of [
  original.token, originalCase.config.jira.connection.secret_reference, 'ERROR-CANARY',
  '"body":', '"request":', '"stack":', '"actual":', '"expected":', 'AssertionError',
  '-----BEGIN CERTIFICATE-----', '-----BEGIN PRIVATE KEY-----', 'https://', root
 ]) assert(!result.stdout.includes(forbidden), 'The failure output contains private fixture details.');
 assert.deepEqual(JSON.parse(result.stdout), {
  status: 'fixture_failed',
  inspection_scope: 'requested_issues',
  diagnostics: [{
   code: 'FIXTURE_RUN_FAILED',
   message: 'The fixture run did not verify. Retain completed runs and inspect the prescribed check; do not treat this as missing setup or a passing observation.'
  }],
  case: 'R1-33-H02',
  variant: 'resolver-late',
  runs: [],
  run_roles: [],
  failed_run: {role: 'main', observations: 'unavailable', cleanup: 'not_reported', stage: 'resolver_entry'},
  domain_complete: false,
  admission: 'not_evaluated',
  receipt_proof: 'not_evaluated'
 });
 for (const file of originalFiles) assert.deepEqual(await readFile(file), raw);
});

test('copied fixture CLI retains completed runs when a private oracle fails',async t=>{
 const {spawnSync}=await import('node:child_process');const {createHash}=await import('node:crypto');
 const o=await fixture(t),root=path.dirname(o.source),dependencyRoot=new URL('../node_modules/',import.meta.url);
 const a=await prepare(o,async dir=>{if(path.basename(dir)==='work-validator')await cp(dependencyRoot,path.join(dir,'node_modules'),{recursive:true,dereference:true});else await install(dir);});
 const runtime=path.join(a.skills,'work-validator'),mutated=path.join(root,'mutated-jira'),cwd=path.join(root,'unrelated-private');await mkdir(cwd);await cp(runtime,mutated,{recursive:true});
 const originalFile=path.join(runtime,'test/fixtures/jira-preview-cases.json'),mutatedFile=path.join(mutated,'test/fixtures/jira-preview-cases.json'),raw=await readFile(originalFile,'utf8');
 const hash=value=>createHash('sha256').update(value).digest('hex'),originalHash=hash(raw);
 const original=JSON.parse(raw),variant=original.variants.find(v=>v.case==='R1-33-H03'&&v.variant==='total-byte-limit');assert(variant);assert.equal(variant.private_projection.oracle.calls,3);
 const marker='"private_projection": {';assert.equal(raw.indexOf(marker),raw.lastIndexOf(marker));const markerIndex=raw.indexOf(marker);assert(markerIndex>=0);
 const suffix=raw.slice(markerIndex),changedSuffix=suffix.replace('"calls": 3','"calls": 4');assert.notEqual(changedSuffix,suffix);
 const changed=raw.slice(0,markerIndex)+changedSuffix;assert.equal(changed.length,raw.length);assert.equal([...changed].filter((v,i)=>v!==raw[i]).length,1);
 const parsed=JSON.parse(changed),changedVariant=parsed.variants.find(v=>v.case==='R1-33-H03'&&v.variant==='total-byte-limit');assert.equal(changedVariant.private_projection.oracle.calls,4);
 const expected=structuredClone(original);expected.variants.find(v=>v.case==='R1-33-H03'&&v.variant==='total-byte-limit').private_projection.oracle.calls=4;assert.deepEqual(parsed,expected);
 await writeFile(mutatedFile,changed);assert.equal(hash(await readFile(mutatedFile)),hash(changed));assert.equal(hash(await readFile(originalFile)),originalHash);assert.equal(hash(await readFile(new URL('./fixtures/jira-preview-cases.json',import.meta.url))),originalHash);
 const env={...process.env};delete env.NODE_PATH;
 const command=[path.join(mutated,'test/fixtures/jira-preview-harness.mjs'),'--case','R1-33-H03','--variant','total-byte-limit','--runtime',mutated,'--json'];
 const p=spawnSync(process.execPath,command,{cwd,env,encoding:'utf8',timeout:10000});assert.equal(p.status,2);assert.equal(p.stderr,'');
 const result=JSON.parse(p.stdout);assert.deepEqual(Object.keys(result).sort(),['status','inspection_scope','diagnostics','case','variant','runs','run_roles','failed_run','domain_complete','admission','receipt_proof'].sort());
 assert.equal(result.status,'fixture_failed');assert.equal(result.inspection_scope,'requested_issues');assert.deepEqual(result.diagnostics,[{code:'FIXTURE_RUN_FAILED',message:'The fixture run did not verify. Retain completed runs and inspect the prescribed check; do not treat this as missing setup or a passing observation.'}]);
 assert.equal(result.case,'R1-33-H03');assert.equal(result.variant,'total-byte-limit');assert.deepEqual(result.run_roles,['main','control']);assert.equal(result.runs.length,2);
 assert.deepEqual(result.failed_run,{role:'private_projection',observations:'unavailable',cleanup:'not_reported'});assert.equal(result.domain_complete,false);assert.equal(result.admission,'not_evaluated');assert.equal(result.receipt_proof,'not_evaluated');
 for(const run of result.runs){assert.equal(run.oracle_matched,true);assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);assert.equal(run.report.inspection_scope,'requested_issues');assert.equal(run.report.domain_complete,false);assert.equal(run.report.admission,'not_evaluated');assert.equal(run.report.receipt_proof,'not_evaluated');assert.equal(Object.hasOwn(run,'observations'),false);}
 const [main,control]=result.runs;assert.equal(main.report.status,'incomplete');assert(main.report.diagnostics.some(d=>d.code==='LIMIT_REACHED'));assert.deepEqual([main.report.counters.requests_attempted,main.report.counters.requests_completed,main.report.counters.requests_failed,main.report.counters.response_bytes,main.report.counters.observation_bytes],[3,2,1,754,635]);
 assert.equal(control.report.status,'complete');assert.deepEqual(control.report.diagnostics,[]);assert.deepEqual([control.report.counters.requests_attempted,control.report.counters.requests_completed,control.report.counters.requests_failed,control.report.counters.response_bytes,control.report.counters.observation_bytes],[3,3,0,754,745]);
 for(const canary of [original.token,variant.config.jira.connection.secret_reference,'ERROR-CANARY','"body":','"stack":','"actual":','"expected":'])assert(!p.stdout.includes(canary));
 assert.equal(hash(await readFile(originalFile)),originalHash);assert.equal(hash(await readFile(new URL('./fixtures/jira-preview-cases.json',import.meta.url))),originalHash);
});

test('PGB-172 copied candidate',async t=>{
 const {spawnSync}=await import('node:child_process'),{createHash}=await import('node:crypto');
 const o=await fixture(t),root=path.dirname(o.source),dependencyRoot=new URL('../node_modules/',import.meta.url);
 const a=await prepare(o,async dir=>{if(path.basename(dir)==='work-validator')await cp(dependencyRoot,path.join(dir,'node_modules'),{recursive:true,dereference:true});else await install(dir);});
 const runtime=path.join(a.skills,'work-validator'),cwd=path.join(root,'unrelated');await mkdir(cwd);
 const hash=x=>createHash('sha256').update(x).digest('hex'),manifest=JSON.parse(await readFile(a.manifest,'utf8')),bindings={};
 for(const relative of bundle.validatorPayload.sources){
  const source=await readFile(new URL('../'+relative,import.meta.url)),copied=await readFile(path.join(runtime,relative));assert.deepEqual(copied,source,relative+' exact copied bytes');
  assert.equal(manifest.sourceFiles['work-validator/'+relative],hash(source));bindings[relative]=hash(source);
 }
 const dependencyBindings={};
 const walk=async(dir,prefix='')=>{for(const entry of await readdir(dir,{withFileTypes:true})){const relative=path.join(prefix,entry.name),file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file,relative);else{const expected=await readFile(new URL('../node_modules/'+relative,import.meta.url));assert.deepEqual(await readFile(file),expected,relative+' physical dependency');dependencyBindings[relative]=hash(expected);}}};
 await walk(path.join(runtime,'node_modules'));
 const guard=path.join(root,'candidate-guard.mjs');await writeFile(guard,`import fs from 'node:fs';import fsp from 'node:fs/promises';import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';let attempts=0;const deny=()=>{attempts++;throw Error('effect')};for(const api of [fs,fsp])for(const key of ['writeFile','appendFile','mkdir','rm','rmdir','unlink','rename','copyFile','cp','symlink','link','chmod','chown','truncate','write','writev','createWriteStream'])for(const name of [key,key+'Sync'])if(typeof api[name]==='function')api[name]=deny;const open=fsp.open;fsp.open=async(...args)=>{if(args[1]!==fs.constants.O_NONBLOCK)deny();const h=await open(...args);for(const k of ['write','writeFile','appendFile','writev','truncate','chmod','chown'])h[k]=deny;return h;};for(const api of [http,https])for(const k of ['request','get'])api[k]=deny;for(const api of [net,tls])for(const k of ['connect','createConnection','createServer'])if(api[k])api[k]=deny;for(const k of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])cp[k]=deny;globalThis.fetch=deny;syncBuiltinESMExports();process.on('exit',()=>process.stderr.write('AUDIT attempts='+attempts+'\\n'));`);
 const loader=path.join(root,'candidate-loader.mjs');await writeFile(loader,`import {pathToFileURL} from 'node:url';const root=pathToFileURL(process.env.CANDIDATE_ALLOWED_ROOT+'/').href;export async function resolve(specifier,context,next){const result=await next(specifier,context);if(result.url.startsWith('file:')&&!result.url.startsWith(root)&&result.url!==pathToFileURL(process.env.CANDIDATE_RUNNER).href)throw Error('Import escaped explicit candidate root');process.stderr.write('MODULE '+result.url+'\\n');return result;}`);
 const register=path.join(root,'candidate-register.mjs');await writeFile(register,`import {register} from 'node:module';import {pathToFileURL} from 'node:url';register(pathToFileURL(${JSON.stringify(loader)}));`);
 const candidateLiteralCases=[{"id": "P01", "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"python\"},\"content\":[{\"type\":\"text\",\"text\":\"print(\\\"ordinary\\\")\\n\"}]}]}", "input_sha256": "a0c8ab6a3a4af1e561be1745c30eb4fad8c88e0ac33a5e9eaa0c9d60cd462b08", "expected": null}, {"id": "P03", "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"python\"},\"content\":[{\"type\":\"text\",\"text\":\"print(\\\"ordinary\\\")\\n\"}]},{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1\\\",\\\"requirements_digest\\\":\\\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\\\",\\\"assignment\\\":null,\\\"role\\\":\\\"manager\\\",\\\"kind\\\":\\\"admission\\\",\\\"from_stage\\\":\\\"Ready to Work\\\",\\\"to_stage\\\":\\\"In Progress\\\",\\\"payload\\\":{\\\"project_id\\\":\\\"100\\\",\\\"stream\\\":\\\"stream-1\\\",\\\"mode\\\":\\\"new_work\\\",\\\"previous_assignment\\\":null,\\\"requests\\\":[],\\\"existing_pr\\\":null},\\\"resume_authorization\\\":null}\"}]}]}", "input_sha256": "52de5621e4aab0f8f03a09c77a6c8790dfd083e7e7f84fca2e01aa1cb79eeeaa", "expected": {"value": {"schema": "pigboard-handoff/v1", "record_id": "00000000-0000-4000-8000-000000000001", "operation_id": "00000000-0000-4000-8000-000000000001", "ticket_id": "1", "requirements_digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "assignment": null, "role": "manager", "kind": "admission", "from_stage": "Ready to Work", "to_stage": "In Progress", "payload": {"project_id": "100", "stream": "stream-1", "mode": "new_work", "previous_assignment": null, "requests": [], "existing_pr": null}, "resume_authorization": null}, "record_digest": "sha256:87b713f187502f9a81591171ab1252d8f8a614044ebcaa660598d42e7923fc11"}}, {"id": "P07", "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"schema: {value: pigboard-handoff/v1}\\n\"}]}]}", "input_sha256": "e7ed1aceeb0234ffa0e4b17dc49ff12775692c2d855074829bd6040deabd63d9", "expected": {"diagnostic": "STRUCTURE"}}];
 const runner=path.join(root,'candidate-runner.mjs');await writeFile(runner,`import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';const {extractHandoffCandidate}=await import(pathToFileURL(process.env.CANDIDATE_MODULE));const cases=${JSON.stringify(candidateLiteralCases)};const observations=[];for(const item of cases){if(item.expected?.diagnostic){assert.throws(()=>extractHandoffCandidate(item.input),error=>error.diagnostic?.code===item.expected.diagnostic);observations.push({id:item.id,diagnostic:item.expected.diagnostic});}else{const actual=extractHandoffCandidate(item.input);assert.deepEqual(JSON.parse(JSON.stringify(actual)),item.expected);observations.push({id:item.id,result:actual});}}console.log(JSON.stringify({cwd:process.cwd(),module:process.env.CANDIDATE_MODULE,observations}));`);
 const canonicalRunner = await realpath(runner);
 const runs=[];
 for(const explicitRoot of [new URL('../',import.meta.url).pathname.replace(/\/$/,''),runtime]){
  const env={...process.env,CANDIDATE_ALLOWED_ROOT:explicitRoot,CANDIDATE_MODULE:path.join(explicitRoot,'lib/contracts/handoff.mjs'),CANDIDATE_RUNNER:canonicalRunner};delete env.NODE_PATH;
  const run=spawnSync(process.execPath,['--import',guard,'--import',register,canonicalRunner],{cwd,env,encoding:'utf8'});
  runs.push({root:explicitRoot,cwd,runner:canonicalRunner,status:run.status,stdout:run.stdout,stderr:run.stderr});
 }
 // Evidence is copied before fixture cleanup, including failing attempts.
 if(process.env.PGB172_EVIDENCE_DIR){const evidence=process.env.PGB172_EVIDENCE_DIR;await mkdir(evidence,{recursive:true});await writeFile(path.join(evidence,'copy-receipt.json'),JSON.stringify({commit:a.commit,manifest,bindings,dependencyBindings,runs,inputs:candidateLiteralCases.map(c=>({id:c.id,input_sha256:c.input_sha256})),cleanup:'t.after removes only this fixture'},null,2)+'\n');await cp(loader,path.join(evidence,'import-guard.mjs'));await cp(guard,path.join(evidence,'effect-guard.mjs'));await cp(runner,path.join(evidence,'runner.mjs'));}
 for(const run of runs){assert.equal(run.status,0,run.stdout+run.stderr);assert.match(run.stderr,/AUDIT attempts=0/);assert.equal(JSON.parse(run.stdout).observations.length,3);}
 assert.deepEqual(JSON.parse(runs[0].stdout).observations,JSON.parse(runs[1].stdout).observations);
 for(const [relative,digest]of Object.entries(bindings))assert.equal(hash(await readFile(new URL('../'+relative,import.meta.url))),digest,relative+' unchanged after calls');
});

// Opt-in prepared dependency roots make this a genuine source-byte audit, never
// the placeholder SKILL mechanics exercised by fixture() above.
test('P166-COPY real instruction bytes and finite source/copied proof',{
 skip:!process.env.PIGBOARD_PREPARED_HELPER_ROOT&&'Prepared physical helper dependency copies are required for the real-source audit.'
},async t=>{
 const {createHash}=await import('node:crypto'),{spawnSync}=await import('node:child_process'),{validateWorkerCurrent}=await import('../lib/contracts/receipts.mjs');
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),root=await mkdtemp(path.join(os.tmpdir(),'pigboard166-real-copy-'));
 // Optional external evidence retains this one audit's actual receipt and bundle
 // for the contributor operator. It is never read as a test verdict.
 const evidence=process.env.PIGBOARD_P166_COPY_EVIDENCE;
 if(!evidence)t.after(()=>rm(root,{recursive:true,force:true}));
 const source=path.join(root,'source'),app=path.join(root,'app'),cache=path.join(root,'cache'),cwd=path.join(root,'unrelated');
 await mkdir(source);await mkdir(app);await mkdir(cwd);git(source,'init','-b','main');git(source,'config','user.name','Fixture');git(source,'config','user.email','fixture@example.invalid');
 const sourceRoot=new URL('../',import.meta.url).pathname;
 // Actual complete skill folders, including sibling references: no stub markers.
 for(const name of bundle.skills)await cp(path.join(sourceRoot,'skills',name),path.join(source,'skills',name),{recursive:true,filter:p=>!p.split(path.sep).includes('node_modules')});
 for(const relative of bundle.validatorPayload.sources){const dest=path.join(source,relative);await mkdir(path.dirname(dest),{recursive:true});await cp(path.join(sourceRoot,relative),dest);}
 git(source,'add','.');git(source,'commit','-m','Disposable complete actual-source packaging snapshot');
 const copies=[];
 const prepared=await prepare({source,app,cache,ref:git(source,'rev-parse','HEAD')},async dir=>{
  const component=path.basename(dir)==='work-validator'?'root':path.basename(path.dirname(dir)),dependencySource=component==='root'?sourceRoot:path.join(process.env.PIGBOARD_PREPARED_HELPER_ROOT,component);
  const lock=await readFile(path.join(dir,'package-lock.json')),originalLock=await readFile(path.join(dependencySource,'package-lock.json'));assert.deepEqual(lock,originalLock,component+' exact dependency lock');
  await cp(path.join(dependencySource,'node_modules'),path.join(dir,'node_modules'),{recursive:true,dereference:true});copies.push({component,dependency_source:dependencySource,lock_sha256:hash(lock),physical_copy:true,network_or_install:false});
 });
 const manifest=JSON.parse(await readFile(prepared.manifest)),sourceFiles={};
 async function compare(relative){
  const copied=await readFile(path.join(prepared.skills,relative)),original=await readFile(path.join(source,'skills',relative));assert.deepEqual(copied,original,relative);assert.equal(hash(original),manifest.sourceFiles[relative],relative+' manifest hash');sourceFiles[relative]=hash(original);
 }
 for(const relative of Object.keys(manifest.sourceFiles)){
  if(relative.startsWith('work-validator/')&&bundle.validatorPayload.sources.includes(relative.slice('work-validator/'.length))){
   const payload=relative.slice('work-validator/'.length),original=await readFile(path.join(source,payload)),copied=await readFile(path.join(prepared.skills,relative));assert.deepEqual(copied,original,relative);assert.equal(hash(original),manifest.sourceFiles[relative]);sourceFiles[relative]=hash(original);
  }else await compare(relative);
 }
 const changedInstructions=['implementer-entrypoint/SKILL.md','implementer-jira/SKILL.md','implementer-entrypoint/references/handoff.md','request-rework/SKILL.md','request-rework/references/example.md'];
 for(const relative of changedInstructions)assert(sourceFiles[relative],relative);
 for(const name of ['pigboard-pr-review','reviewer-jira','qa-entrypoint','qa-jira'])assert(sourceFiles[name+'/SKILL.md'],name);
 const packets=JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json',import.meta.url))).repair_loop_p166,results=[];
 const env={...process.env};delete env.NODE_PATH;
 for(const [name,input]of Object.entries({...packets.inputs,...Object.fromEntries(Object.entries(packets.refusals).map(([n,e])=>['refusal_'+n,e]))})){
  const file=path.join(root,name+'.json'),raw=JSON.stringify(input);await writeFile(file,raw);const args=['--mode','worker-current','--input',file,'--json'];
  const original=spawnSync(process.execPath,[path.join(sourceRoot,'scripts/validate-handoff.mjs'),...args],{cwd,env,encoding:'utf8'}),copied=spawnSync(process.execPath,[path.join(prepared.skills,'work-validator/scripts/validate-handoff.mjs'),...args],{cwd,env,encoding:'utf8'});
  assert.equal(copied.status,name.startsWith('refusal_')?1:0,name+copied.stdout+copied.stderr);assert.equal(original.status,copied.status);assert.equal(copied.stderr,'');assert.deepEqual(JSON.parse(copied.stdout),JSON.parse(original.stdout));assert.deepEqual(JSON.parse(copied.stdout),JSON.parse(JSON.stringify(validateWorkerCurrent(raw))));assert.equal(await readFile(file,'utf8'),raw);results.push({name,input_sha256:hash(raw),exit:copied.status,result:JSON.parse(copied.stdout)});
 }
 const audit={category:'Actual source/copied byte and supplied-proof test; not subject/human/live acceptance',product_source_revision:git(sourceRoot,'rev-parse','HEAD'),disposable_snapshot_revision:prepared.commit,receipt:prepared,manifested_files:Object.keys(sourceFiles).length,source_files:sourceFiles,dependencies:copies,proof_results:results};
 if(evidence){await mkdir(evidence,{recursive:true});await writeFile(path.join(evidence,'audit.json'),JSON.stringify(audit,null,2));await cp(prepared.manifest,path.join(evidence,'manifest.json'));}
 t.diagnostic('Compared '+Object.keys(sourceFiles).length+' actual source/copied manifested files; '+results.length+' finite API/CLI parity cases. Disposable snapshot commit is separate from product revision.');
});

// The public selectors are prescribed by the Story, independently of harness dispatch.
const inventoryCases = {
  'R1-34-H01': ['complete-domain', 'unrelated-history', 'retained-incomplete'],
  'R1-34-H02': [
    'seed-page-missing', 'child-page-missing', 'label-page-missing', 'token-repeat',
    'token-missing', 'search-duplicate', 'fresh-membership-change', 'malformed-seed',
    'malformed-record', 'reference-missing', 'reference-digest-change', 'reference-cycle',
    'epic-limit', 'stream-limit', 'page-size', 'closure-target-limit'
  ],
  'R1-34-H03': [
    'two-projects', 'cross-project-prerequisite', 'renamed-alias', 'old-ownership',
    'denied-project', 'isolated-conflict', 'out-of-scope-reference'
  ],
  'R1-34-H04': ['guide-and-install', 'missing-retained-input', 'no-effects']
};
const focusedInventoryCases = ['seed-page-missing', 'token-missing', 'page-size'];
const inventoryControls = ['epic-limit', 'stream-limit', 'page-size', 'closure-target-limit'];
const inventoryModule = 'lib/jira/inventory.mjs';
const inventoryFixture = 'test/fixtures/jira-inventory-cases.json';
const inventoryOverlay = 'test/fixtures/jira-scoped-inventory-cases.mjs';
const inventoryHarness = 'test/fixtures/jira-preview-harness.mjs';
const inventoryGuide = 'docs/manager-preview.md';
const inventoryFixturePin = '27384cd88441ba7f9e5b13e852ea2efc37bc08d3295e727ee991188d9e75ace3';
const inventoryHash = bytes => createHash('sha256').update(bytes).digest('hex');

async function assertInventoryManifest({receipt, expectedCommit, sourceRoot, commitRoot = null}) {
  assert.equal(receipt.commit, expectedCommit, 'receipt revision matches the chosen source revision');
  for (const key of ['skills', 'manifest']) {
    assert(typeof receipt[key] === 'string' && path.isAbsolute(receipt[key]), 'absolute receipt ' + key);
  }
  const skills = await realpath(receipt.skills);
  const copiedRoot = await realpath(path.join(skills, 'work-validator'));
  assert.equal(copiedRoot, path.join(skills, 'work-validator'), 'versioned validator root');
  const manifestPath = await realpath(receipt.manifest);
  assert.equal(manifestPath, path.join(path.dirname(skills), 'manifest.json'), 'manifest belongs to the prepared root');
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.commit, expectedCommit, 'manifest revision matches the chosen source revision');
  const expectedPaths = [...bundle.validatorPayload.sources].sort();
  assert.equal(expectedPaths.length, 46);
  assert.deepEqual(manifest.bundle, bundle, 'manifest bundle matches approved source');
  const paths = Object.keys(manifest.sourceFiles).filter(relative => relative.startsWith('work-validator/'))
    .map(relative => relative.slice('work-validator/'.length)).sort();
  assert.deepEqual(paths, expectedPaths, 'all 46 validator payload paths');
  const payload = {};
  for (const relative of paths) {
    const source = await readFile(path.join(sourceRoot, relative));
    if (commitRoot !== null) {
      const approved = execFileSync('git', ['show', expectedCommit + ':' + relative], {
        cwd: commitRoot, maxBuffer: source.length + 1
      });
      assert(source.equals(approved), relative + ' approved revision bytes');
    }
    const copiedPath = path.join(copiedRoot, relative);
    assert.equal(await realpath(copiedPath), copiedPath, relative + ' prepared path');
    const copied = await readFile(copiedPath);
    const sha = inventoryHash(source);
    assert(source.equals(copied), relative + ' prepared bytes');
    assert.equal(manifest.sourceFiles['work-validator/' + relative], sha, relative + ' manifest SHA');
    payload[relative] = sha;
  }
  assert.equal(payload[inventoryFixture], inventoryFixturePin);
  return {copiedRoot, manifestPath, manifestHash: inventoryHash(manifestBytes), payload};
}

async function prepareInventoryTest(t) {
  const o = await fixture(t);
  const sourceRoot = await realpath(fileURLToPath(new URL('../', import.meta.url)));
  const fixtureCommit = git(o.source, 'rev-parse', 'HEAD');
  const prepared = await prepare({...o, ref: fixtureCommit}, async dir => {
    if (path.basename(dir) === 'work-validator') {
      await cp(path.join(sourceRoot, 'node_modules'), path.join(dir, 'node_modules'), {
        recursive: true, verbatimSymlinks: true
      });
    } else {
      await install(dir);
    }
  });
  const cwd = await realpath(o.app);
  const {copiedRoot, payload} = await assertInventoryManifest({
    receipt: prepared, expectedCommit: fixtureCommit, sourceRoot
  });
  for (const [relative, sha] of Object.entries(payload)) {
    assert.equal(inventoryHash(await readFile(path.join(o.source, relative))), sha, relative + ' fixture bytes');
  }
  for (const relative of ['node_modules/yaml/package.json', 'node_modules/ajv/package.json']) {
    assert.deepEqual(await readFile(path.join(copiedRoot, relative)), await readFile(path.join(sourceRoot, relative)));
    assert.equal(await realpath(path.join(copiedRoot, relative)), path.join(copiedRoot, relative));
  }
  const preparedDependencies = path.join(copiedRoot, 'node_modules');
  for (const bin of ['canonicalize', 'yaml']) {
    const sourceBin = path.join(sourceRoot, 'node_modules', '.bin', bin);
    const copiedBin = path.join(preparedDependencies, '.bin', bin);
    const original = await lstat(sourceBin);
    const copied = await lstat(copiedBin);
    assert.equal(copied.isFile(), original.isFile(), bin + ' regular file parity');
    assert.equal(copied.isSymbolicLink(), original.isSymbolicLink(), bin + ' symlink parity');
    if (original.isSymbolicLink()) {
      const target = await readlink(sourceBin);
      assert(!path.isAbsolute(target), bin + ' has a relative npm bin target');
      assert.equal(await readlink(copiedBin), target, bin + ' preserves its relative target');
      const resolved = await realpath(copiedBin);
      assert(resolved.startsWith(preparedDependencies + path.sep), bin + ' resolves inside the versioned copy');
      assert.equal(resolved, path.resolve(path.dirname(copiedBin), target));
    } else {
      assert(original.isFile(), bin + ' is a regular bin file');
    }
    assert.deepEqual(await readFile(copiedBin), await readFile(sourceBin), bin + ' executable bytes');
  }

  const env = {...process.env};
  delete env.NODE_PATH;
  const previewPacket = JSON.parse(await readFile(path.join(sourceRoot, 'test/fixtures/jira-preview-cases.json')));
  const packet = JSON.parse(await readFile(path.join(copiedRoot, inventoryFixture)));
  const canaries = new Set([
    previewPacket.token, 'ERROR-CANARY', '-----BEGIN',
    ...packet.variants.map(v => v.config.jira.connection.secret_reference),
    ...packet.variants.flatMap(v => Object.values(v.oracle.raw_bodies ?? {}))
  ].filter(value => typeof value === 'string' && value.length > 0));
  let evidenceFile;
  if (process.env.PGB148_EVIDENCE_DIR) {
    const directory = path.resolve(process.env.PGB148_EVIDENCE_DIR);
    await mkdir(directory, {recursive: true});
    const evidence = await mkdtemp(path.join(directory, 'inventory-'));
    evidenceFile = path.join(evidence, 'observations.jsonl');
  }
  async function record(data) {
    if (evidenceFile) await appendFile(evidenceFile, JSON.stringify(data) + '\n', {mode: 0o600});
  }
  await record({
    test: t.name, source_revision: git(sourceRoot, 'rev-parse', 'HEAD'),
    fixture_commit: fixtureCommit, fixture_pin: inventoryFixturePin, source_root: sourceRoot,
    copied_root: copiedRoot, manifest: prepared.manifest, cwd, payload_hashes: payload,
    human_acceptance: 'NOT_RUN'
  });
  t.after(async () => {
    let removed = false;
    try {
      await readdir(path.dirname(o.source));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      removed = true;
    }
    await record({disposable_fixture_removed: removed});
    assert(removed, 'disposable fixture is removed after the tests');
  });

  async function invoke(args, readable = false) {
    const result = spawnSync(process.execPath, args, {
      cwd, env, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024
    });
    const stdout = result.stdout ?? '', stderr = result.stderr ?? '';
    const safe = ![...canaries].some(canary =>
      [canary, JSON.stringify(canary).slice(1, -1)].some(value =>
        stdout.includes(value) || stderr.includes(value)));
    let output;
    if (safe) {
      try {
        if (readable && result.status === 0) {
          const split = stdout.indexOf('\n');
          output = {heading: stdout.slice(0, split), report: JSON.parse(stdout.slice(split + 1))};
        } else {
          output = JSON.parse(stdout);
        }
      } catch {
        // Preserve status and fingerprints even when a subprocess emits unusable evidence.
      }
    }
    await record({
      command: [process.execPath, ...args], cwd, status: result.status, signal: result.signal,
      error_code: result.error?.code ?? null, stdout_sha256: inventoryHash(stdout),
      stderr_sha256: inventoryHash(stderr), stdout_bytes: Buffer.byteLength(stdout),
      stderr_bytes: Buffer.byteLength(stderr), ...(output === undefined ? {} : {output})
    });
    assert(safe, 'subprocess output kept private fixture material out of its reports');
    assert.equal(result.error?.code ?? null, null);
    assert.equal(stderr, '');
    assert.notEqual(output, undefined, 'subprocess emitted a readable safe report');
    return {status: result.status, output};
  }
  const run = (root, caseId, variant, json = true) => invoke([
    path.join(root, inventoryHarness), '--case', caseId, '--variant', variant,
    '--runtime', root, ...(json ? ['--json'] : [])
  ], !json);
  return {sourceRoot, copiedRoot, cwd, run, invoke, packet, payload, record, prepared, fixtureCommit, fixtureRoot: o.source};
}

function deterministicInventoryReport(report) {
  const copy = structuredClone(report);
  for (const key of ['elapsed_ms', 'peak_request_elapsed_ms']) {
    if (key === 'peak_request_elapsed_ms' && report.counters.requests_attempted === 0) continue;
    assert(Number.isFinite(copy.counters[key]) && copy.counters[key] >= 0, 'valid timing for ' + key);
    delete copy.counters[key];
  }
  return copy;
}

function assertInventoryRun(run, variant, oracle, payload) {
  const {report, trace, server_trace: serverTrace, server_audit: audit} = run;
  assert.equal(report.inspection_scope, 'configured_inventory');
  assert.equal(report.status, oracle.status);
  assert.equal(report.domain_complete, oracle.domain_complete);
  assert.equal(report.retained_complete, oracle.retained_complete);
  assert.deepEqual(report.scopes, oracle.scopes);
  assert.deepEqual(report.diagnostics.map(d => d.code).includes(oracle.code), Boolean(oracle.code));
  if (oracle.diagnostic_reach) {
    const normalized = diagnostics => diagnostics.map(({code, scope}) =>
      JSON.stringify([code, scope === null ? null : [scope.project_id, scope.label]])).sort();
    assert.deepEqual(normalized(report.diagnostics), normalized(oracle.diagnostic_reach),
      variant + ' exact diagnostic codes and affected scopes');
  }
  if (oracle.seed_pages) assert.deepEqual(run.seed_pages, oracle.seed_pages);
  assert.equal(report.admission, 'not_evaluated');
  assert.equal(report.receipt_proof, 'not_evaluated');
  assert.equal(report.counters.requests_attempted, oracle.calls);
  assert.deepEqual(trace, oracle.trace);
  assert.deepEqual(serverTrace, oracle.trace);
  for (const [key, value] of Object.entries(oracle.counters ?? {})) assert.equal(report.counters[key], value, key);
  assert.equal(run.oracle_matched, true);
  assert.equal(run.effects, 0);
  assert.equal(run.mutations, 0);
  assert.equal(run.getter_calls, 0);
  assert.equal(run.cleanup_complete, true);
  assert.deepEqual(run.input_hashes.before, run.input_hashes.after);
  assert.deepEqual(run.runtime_hashes.before, run.runtime_hashes.after);
  for (const [relative, expected] of Object.entries(payload)) assert.equal(run.runtime_hashes.before[relative], expected);
  assert.equal(run.fixture_hashes.inventory, inventoryFixturePin);
  assert.equal(run.fixture_hashes.scoped_inventory, payload[inventoryOverlay]);
  assert.equal(run.caller_request_hashes.before, run.caller_request_hashes.after);
  assert.match(run.caller_request_hashes.before, /^[0-9a-f]{64}$/);
  assert.equal(audit.unrelated_issue_count, variant === 'unrelated-history' ? 65 : 0);
  assert.equal(audit.unrelated_comment_count, variant === 'unrelated-history' ? 512 : 0);
  assert.equal(audit.unrelated_access_count, 0);
  assert.equal(audit.before_sha256, audit.after_sha256);
  assert.match(audit.before_sha256, /^[0-9a-f]{64}$/);
  if (['complete-domain', 'unrelated-history', 'guide-and-install'].includes(variant)) {
    const provenance = run.provenance_comparison;
    assert.equal(provenance.matched, true);
    assert.equal(provenance.algorithm, 'sha256');
    assert.equal(provenance.actual_sha256, provenance.expected_sha256);
    assert.match(provenance.actual_sha256, /^[0-9a-f]{64}$/);
  }
  if (variant === 'missing-retained-input') {
    assert.equal(run.resolver_calls, 0);
    assert.equal(report.counters.requests_attempted, 0);
    assert.deepEqual(report.diagnostics.map(d => d.code), ['INPUT_INVALID']);
  }
  return {...run, report: deterministicInventoryReport(report)};
}

async function compareInventoryRoots(testRuntime, caseId, variant, authored) {
  const {sourceRoot, copiedRoot, run, payload} = testRuntime;
  const outputs = [];
  for (const root of [sourceRoot, copiedRoot]) {
    const result = await run(root, caseId, variant);
    assert.equal(result.status, 0, variant + ' at ' + root);
    assert.equal(result.output.case, caseId);
    assert.equal(result.output.variant, variant);
    const scoped = applyScopedInventoryCase(authored);
    const oracles = inventoryControls.includes(variant) ? [scoped.oracle, scoped.control.oracle] : [scoped.oracle];
    assert.equal(result.output.runs.length, oracles.length);
    outputs.push(result.output.runs.map((item, index) => assertInventoryRun(item, variant, oracles[index], payload)));
  }
  assert.deepEqual(outputs[0], outputs[1], variant + ' source and prepared deterministic parity');
  return outputs[0];
}

test('PGB-148 focused inventory pagination and import effects', async t => {
  const runtime = await prepareInventoryTest(t);
  const {sourceRoot, copiedRoot, packet, cwd, invoke, record} = runtime;
  const results = new Map();
  for (const variant of focusedInventoryCases) {
    const authored = packet.variants.find(row => row.variant === variant);
    const evidence = await compareInventoryRoots(runtime, 'R1-34-H02', variant, authored);
    results.set(variant, evidence);
    t.diagnostic('R1-34-H02 ' + variant + ' verified at ' + sourceRoot + ' and ' + copiedRoot);
  }
  const [missingPage] = results.get('seed-page-missing');
  const [missingToken] = results.get('token-missing');
  assert.equal(missingPage.seed_pages.length, 2);
  assert.equal(missingPage.seed_pages[1].request_token, 'missing-seed-page');
  assert.equal(missingPage.seed_pages[1].response_status, 404);
  assert.equal(missingToken.seed_pages.length, 1);
  assert.equal(missingToken.seed_pages[0].is_last, false);
  assert.equal(missingToken.seed_pages[0].next_token, null);

  const [maxOne, maxTwo] = [...results.get('page-size')]
    .sort((left, right) => left.seed_pages[0].request_max_results - right.seed_pages[0].request_max_results);
  assert.deepEqual(maxOne.seed_pages.map(page => page.issue_ids), [['100'], ['106'], ['107']]);
  assert.deepEqual(maxTwo.seed_pages.map(page => page.issue_ids), [['100'], ['106', '107']]);
  for (const [run, size] of [[maxOne, 1], [maxTwo, 2]]) {
    assert(run.seed_pages.every(page => page.request_max_results === size));
    assert.equal(run.seed_pages[0].is_last, false);
    assert.equal(run.seed_pages[1].request_token, run.seed_pages[0].next_token);
    assert.equal(run.seed_pages.at(-1).is_last, true);
    assert.equal(run.report.domain_complete, true);
  }

  // Run the import sentinels against their own copy. With the guard absent,
  // invalid URLs/arguments and absent parent paths still prevent real effects.
  const probeRoot = path.join(path.dirname(cwd), 'inventory-effect-probe');
  await cp(copiedRoot, probeRoot, {recursive: true});
  try {
    const modulePath = path.join(probeRoot, inventoryModule);
    const original = await readFile(modulePath, 'utf8');
    await writeFile(modulePath, original + `
      import {strict as probeAssert} from 'node:assert';
      import {fileURLToPath as probeFileURLToPath} from 'node:url';
      import {get as probeGet, request as probeRequest} from 'node:https';
      import {connect as probeConnect, createConnection as probeCreateConnection, Socket as ProbeSocket} from 'node:net';
      import {connect as probeTlsConnect} from 'node:tls';
      import {createSocket as probeDatagram, Socket as ProbeDatagramSocket} from 'node:dgram';
      import {spawnSync as probeSpawn} from 'node:child_process';
      import {
        constants as probeFlags, open as probeOpen, openSync as probeOpenSync,
        closeSync as probeCloseSync, writeSync as probeWriteSync, ftruncateSync as probeTruncateSync
      } from 'node:fs';
      import {open as probeOpenPromise} from 'node:fs/promises';
      const probeDenied = {message: 'Disallowed fixture effect.'};
      const probeInput = probeFileURLToPath(import.meta.url);
      const probeAbsent = probeInput + '/missing-parent/sentinel';
      const probeFd = probeOpenSync(probeInput, probeFlags.O_RDONLY);
      try {
        probeAssert.throws(() => probeGet('https://[invalid'), probeDenied);
        probeAssert.throws(() => probeRequest('https://[invalid'), probeDenied);
        probeAssert.throws(() => probeConnect(-1, '127.0.0.1'), probeDenied);
        probeAssert.throws(() => probeCreateConnection(-1, '127.0.0.1'), probeDenied);
        probeAssert.throws(() => ProbeSocket.prototype.connect.call({}, -1, '127.0.0.1'), probeDenied);
        probeAssert.throws(() => probeTlsConnect({port: -1, host: '127.0.0.1'}), probeDenied);
        probeAssert.throws(() => probeDatagram('invalid'), probeDenied);
        for (const name of ['connect', 'send', 'sendto']) {
          probeAssert.throws(() => ProbeDatagramSocket.prototype[name].call({}), probeDenied);
        }
        probeAssert.throws(() => probeSpawn(null), probeDenied);
        probeAssert.throws(() => probeOpenSync(probeAbsent, 'w'), probeDenied);
        await probeAssert.rejects(async () => new Promise((resolve, reject) => {
          probeOpen(probeAbsent, 'a', error => error ? reject(error) : resolve());
        }), probeDenied);
        await probeAssert.rejects(async () => probeOpenPromise(probeAbsent, probeFlags.O_RDWR), probeDenied);
        probeAssert.throws(() => probeWriteSync(probeFd, 'sentinel'), probeDenied);
        probeAssert.throws(() => probeTruncateSync(probeFd, 0), probeDenied);
      } finally {
        probeCloseSync(probeFd);
      }
      const probeHandle = await probeOpenPromise(probeInput, 'r');
      try {
        await probeAssert.rejects(async () => probeHandle.write('sentinel'), probeDenied);
        await probeAssert.rejects(async () => probeHandle.truncate(0), probeDenied);
      } finally {
        await probeHandle.close();
      }
    `);
    const program = `
      import {runFixture} from ${JSON.stringify(pathToFileURL(path.join(probeRoot, inventoryHarness)).href)};
      try {
        await runFixture('R1-34-H04', 'missing-retained-input', process.argv[1]);
        console.log(JSON.stringify({error: null}));
      } catch (error) {
        console.log(JSON.stringify({error: error.message.split('\\n')[0], denied_attempts: error.actual}));
      }
    `;
    const result = await invoke(['--input-type=module', '--eval', program, probeRoot]);
    assert.equal(result.status, 0);
    assert.deepEqual(result.output, {error: 'Unexpected fixture effects.', denied_attempts: 18});
    assert.equal(inventoryHash(await readFile(path.join(copiedRoot, inventoryModule))), runtime.payload[inventoryModule]);
  } finally {
    await rm(probeRoot, {recursive: true});
  }
  await assert.rejects(readdir(probeRoot), {code: 'ENOENT'});
  assert.deepEqual(await readdir(cwd), []);
  await record({import_effect_sentinels: 'DENIED_DURING_IMPORT', denied_attempts: 18,
    probe_root: probeRoot, disposable_copy_removed: true});
  t.diagnostic('R1-34-H04 import effect sentinels denied at disposable root ' + probeRoot);
});

async function verifyInventoryGuide(runtime, receipt, {expectedCommit, commitRoot, label, receiptIdentity = null}) {
  const {sourceRoot, cwd, invoke, record} = runtime;
  const {copiedRoot, manifestPath, manifestHash, payload} = await assertInventoryManifest({
    receipt, expectedCommit, sourceRoot, commitRoot
  });
  const guide = await readFile(path.join(copiedRoot, inventoryGuide), 'utf8');
  for (const marker of ['inspectJiraInventory', 'R1-34-H04', '--runtime', 'work-validator']) assert(guide.includes(marker));
  const loader = path.join(path.dirname(cwd), 'inventory-import-loader-' + label + '.mjs');
  await writeFile(loader, `
    const allowed = ${JSON.stringify(pathToFileURL(copiedRoot + path.sep).href)};
    export async function resolve(specifier, context, next) {
      const resolved = await next(specifier, context);
      if (resolved.url.startsWith('file:')) {
        const allowedFile = resolved.url.startsWith(allowed) &&
          !/^lib\\/(manager\\/|aws\\/|state\\/|release\\/|jira\\/write\\.mjs|contracts\\/receipts\\.mjs)/.test(resolved.url.slice(allowed.length));
        if (!allowedFile) throw Error('Unexpected inventory import');
      }
      return resolved;
    }
  `);
  const program = `
    import {readFileSync} from 'node:fs';
    import {join} from 'node:path';
    import {pathToFileURL} from 'node:url';
    const root = process.argv[1];
    const {inspectJiraInventory} = await import(pathToFileURL(join(root, ${JSON.stringify(inventoryModule)})));
    const packet = JSON.parse(readFileSync(join(root, ${JSON.stringify(inventoryFixture)})));
    const {config, request} = packet.variants.find(row => row.variant === 'missing-retained-input');
    let resolverCalls = 0;
    const result = await inspectJiraInventory(JSON.stringify(config), request, {
      resolveSecret() { resolverCalls++; throw Error('Unexpected resolver call'); }
    });
    console.log(JSON.stringify({report: result.report, resolver_calls: resolverCalls}));
  `;
  // Node 20.0 supports the loader flag and emits an ExperimentalWarning for it.
  const library = await invoke([
    '--no-warnings', '--experimental-loader', pathToFileURL(loader).href,
    '--input-type=module', '--eval', program, copiedRoot
  ]);
  assert.equal(library.status, 0);
  assert.equal(library.output.resolver_calls, 0);
  assert.equal(library.output.report.status, 'invalid');
  assert.equal(library.output.report.inspection_scope, 'configured_inventory');
  assert.equal(library.output.report.counters.requests_attempted, 0);
  assert.deepEqual(library.output.report.diagnostics.map(d => d.code), ['INPUT_INVALID']);

  const verified = {
    guide_verification: label, receipt: receiptIdentity, revision: expectedCommit, committed_source_root: commitRoot,
    manifest: manifestPath, manifest_sha256: manifestHash, runtime_root: copiedRoot,
    payload_hashes: payload, guarded_import: 'PASSED', resolver_calls: 0
  };
  await record(verified);
  return verified;
}

test('PGB-148 prepared inventory guide and recovery', async t => {
  const runtime = await prepareInventoryTest(t);
  const {sourceRoot, copiedRoot, run, payload, packet, cwd, record, prepared, fixtureCommit, fixtureRoot} = runtime;
  const caseId = 'R1-34-H04', variant = 'guide-and-install';
  const authored = packet.variants.find(v => v.variant === 'complete-domain');
  const [expected] = await compareInventoryRoots(runtime, caseId, variant, authored);
  assert.equal(expected.report.status, 'complete');
  assert.equal(expected.report.counters.requests_attempted, 24);
  for (const root of [sourceRoot, copiedRoot]) {
    const result = await run(root, caseId, variant, false);
    assert.equal(result.status, 0);
    assert.match(result.output.heading, /^R1-34-H04 \/ guide-and-install: literal oracle matched/);
    assert.deepEqual(deterministicInventoryReport(result.output.report), expected.report);
  }

  await verifyInventoryGuide(runtime, prepared, {
    expectedCommit: fixtureCommit, commitRoot: fixtureRoot, label: 'disposable'
  });
  if (Object.hasOwn(process.env, 'PGB148_VERIFY_RECEIPT')) {
    const receiptPath = process.env.PGB148_VERIFY_RECEIPT;
    assert(path.isAbsolute(receiptPath), 'PGB148_VERIFY_RECEIPT is an absolute saved receipt path');
    const receiptBytes = await readFile(receiptPath);
    const receipt = JSON.parse(receiptBytes);
    const revision = git(sourceRoot, 'rev-parse', 'HEAD');
    const verified = await verifyInventoryGuide(runtime, receipt, {
      expectedCommit: revision, commitRoot: sourceRoot, label: 'designated',
      receiptIdentity: {path: receiptPath, sha256: inventoryHash(receiptBytes)}
    });
    t.diagnostic('Verified receipt ' + receiptPath + ' (SHA256 ' + verified.receipt.sha256 +
      ') at ' + revision + '. All 46 payload hashes match. Guarded read-only import used ' + verified.runtime_root);
  }

  for (const [label, relative] of [['module', inventoryModule], ['packet', inventoryFixture], ['overlay', inventoryOverlay]]) {
    const damaged = path.join(path.dirname(cwd), 'damaged-inventory-' + label);
    await cp(copiedRoot, damaged, {recursive: true});
    await rm(path.join(damaged, relative));
    const failure = await run(damaged, caseId, variant, label === 'module');
    assert.equal(failure.status, 2);
    assert.equal(failure.output.status, 'setup_failed');
    assert.equal(failure.output.inspection_scope, 'configured_inventory');
    assert.equal(failure.output.case, caseId);
    assert.equal(failure.output.variant, variant);
    assert.deepEqual(failure.output.runs, []);
    assert.deepEqual(failure.output.run_roles, []);
    assert.deepEqual(failure.output.failed_run, {
      role: 'main', observations: 'unavailable', cleanup: 'not_reported'
    });
    assert.equal(failure.output.domain_complete, false);
    assert.equal(failure.output.admission, 'not_evaluated');
    assert.equal(failure.output.receipt_proof, 'not_evaluated');
    assert.deepEqual(failure.output.diagnostics.map(d => d.code), ['SETUP_MISSING']);
    assert.match(failure.output.diagnostics[0].message, /prepare/i);
    await assert.rejects(readFile(path.join(damaged, relative)), {code: 'ENOENT'});
    assert.equal(inventoryHash(await readFile(path.join(copiedRoot, relative))), payload[relative]);
    if (label === 'module') {
      const legacy = await run(damaged, 'R1-45-H01', 'complete-domain');
      assert.equal(legacy.status, 2);
      assert.equal(legacy.output.status, 'setup_failed');
      assert.equal(legacy.output.inspection_scope, 'requested_issues');
      assert.deepEqual(legacy.output.diagnostics.map(d => d.code), ['SETUP_MISSING']);
    }
    // Selection precedes setup, even with an absent fixture packet.
    if (label === 'packet') {
      const unsupported = await run(damaged, 'R1-34-H01', variant);
      assert.equal(unsupported.status, 2);
      assert.equal(unsupported.output.status, 'selection_failed');
      assert.deepEqual(unsupported.output.diagnostics.map(d => d.code), ['FIXTURE_SELECTION_INVALID']);
      assert.deepEqual(unsupported.output.runs, []);
    }
    await rm(damaged, {recursive: true});
    await assert.rejects(readdir(damaged), {code: 'ENOENT'});
    await record({damaged_copy: label, removed: true, intact_copy_sha256: payload[relative]});
  }
  assert.deepEqual(await readdir(cwd), []);
  await record({source_and_copy_match: true, readable_and_json_match: true, unrelated_cwd_unmodified: true});
});

test('PGB-148 source and prepared scoped inventory cases', async t => {
  const runtime = await prepareInventoryTest(t);
  const {packet, cwd, record} = runtime;
  const selectors = Object.entries(inventoryCases).flatMap(([caseId, variants]) =>
    variants.map(variant => ({caseId, variant})));
  assert.equal(selectors.length, 29);
  const remaining = selectors.filter(entry => entry.variant !== 'guide-and-install');
  assert.equal(remaining.length, 28);
  assert.deepEqual(packet.variants.map(v => [v.case, v.variant]), remaining.map(({caseId, variant}) =>
    [caseId.replace('R1-34-', 'R1-45-'), variant]));
  assert.deepEqual(packet.variants.filter(v => v.control).map(v => v.variant), inventoryControls);
  const corpus = packet.variants.find(v => v.variant === 'unrelated-history');
  for (const [rows, size] of [[corpus.unrelated_issues, 65], [corpus.unrelated_comments, 512]]) {
    assert.equal(rows.length, size);
    assert.equal(new Set(rows.map(row => row.id)).size, size);
  }
  let completeDomain;
  for (const [index, {caseId, variant}] of remaining.entries()) {
    if (focusedInventoryCases.includes(variant)) continue;
    const runs = await compareInventoryRoots(runtime, caseId, variant, packet.variants[index]);
    if (variant === 'complete-domain') completeDomain = runs[0];
    if (variant === 'unrelated-history') {
      const {server_audit: historyAudit, ...history} = runs[0];
      const {server_audit: ordinaryAudit, ...ordinary} = completeDomain;
      assert.notEqual(historyAudit.before_sha256, ordinaryAudit.before_sha256);
      assert.deepEqual(history, ordinary, 'unrelated history changes only the mounted server corpus');
    }
  }
  assert.deepEqual(await readdir(cwd), []);
  await record({
    source_and_copy_match: true, main_cases_per_runtime: remaining.length - focusedInventoryCases.length,
    controls_per_runtime: inventoryControls.length - 1, unrelated_cwd_unmodified: true
  });
});

test('real prepared copy runs both native receipt groups from an unrelated directory',async t=>{
 const source=await fixture(t),root=path.dirname(source.source),cwd=path.join(root,'unrelated-native-receipt');
 await mkdir(cwd);
 const release=await prepare(source,async dir=>{
  if(path.basename(dir)==='work-validator')await cp(new URL('../node_modules/',import.meta.url),path.join(dir,'node_modules'),{recursive:true,verbatimSymlinks:true});
  else await install(dir);
 });
 const runtime=path.join(release.skills,'work-validator');
 assert.equal(release.commit,git(source.source,'rev-parse','HEAD'));
 const {manifest}=release,prepared=JSON.parse(await readFile(manifest));
 const native=JSON.parse(await readFile(path.join(runtime,'test/fixtures/jira-preview-cases.json'))).native_receipts;
 for(const name of bundle.validatorPayload.sources){
  const original=await readFile(path.join(source.source,name)),copy=await readFile(path.join(runtime,name));
  assert.deepEqual(copy,original);
  assert.equal(prepared.sourceFiles['work-validator/'+name],createHash('sha256').update(copy).digest('hex'));
 }
 const bin=path.join(runtime,'node_modules/.bin');
 for(const name of await readdir(bin)){
  const target=await readlink(path.join(bin,name));
  assert(!path.isAbsolute(target));
  assert((await realpath(path.join(bin,name))).startsWith(runtime+path.sep));
 }
 const env={...process.env};delete env.NODE_PATH;
 for(const [group,variants] of [['PGB-163-H01',native.positive],['PGB-163-H02',native.negative]]){
  for(const variant of Object.keys(variants)){
   const result=spawnSync(process.execPath,[path.join(runtime,'test/fixtures/jira-preview-harness.mjs'),
    '--case',group,'--variant',variant,'--runtime',runtime,'--json'],{cwd,env,encoding:'utf8',timeout:20000});
   assert.equal(result.status,0,variant+' '+result.stdout+' '+result.stderr);
   const [run]=JSON.parse(result.stdout).runs;
   assert(run.oracle_matched&&run.cleanup_complete);
   assert.equal(run.effects,0);assert.equal(run.evidence_execution,'simulated-local-tls');
   t.diagnostic(group+' '+variant+' '+run.report.status+' '+run.trace.length+' calls');
  }
 }
 const comparisons = `
  import path from 'node:path';
  import { pathToFileURL } from 'node:url';
  const [root,variant,receiptComparison]=process.argv.slice(1);
  const {runFixture}=await import(pathToFileURL(path.join(root,'test/fixtures/jira-preview-harness.mjs')));
  const run=await runFixture('PGB-163-H01',variant,root,{receiptComparison});
  console.log(JSON.stringify({code:run.report.code,proof_evaluated:run.observed.proof_evaluated,effects:run.effects}));
 `;
 for(const [comparison,variant,code] of [
  ['scoped-pointer','current-qa-outstanding-request','RECORDED_PROOF_INVALID'],
  ['target-denied','current-qa-outstanding-request','READ_DENIED_OR_MISSING'],
  ['ownership-conflict','current-qa','CLOSURE_INCOMPLETE'],
  ['generic-foreign-pointer','current-qa','CLOSURE_INCOMPLETE'],
  ['reconciliation-unrelated-pointer','original-admission','OK']
 ]){
  const result=spawnSync(process.execPath,['--input-type=module','--eval',comparisons,runtime,variant,comparison],{cwd,env,encoding:'utf8',timeout:20000});
  assert.equal(result.status,0,comparison+' '+result.stdout+' '+result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),{code,proof_evaluated:['scoped-pointer','reconciliation-unrelated-pointer'].includes(comparison),effects:0});
 }
 assert.deepEqual(await readdir(cwd),[]);
});
