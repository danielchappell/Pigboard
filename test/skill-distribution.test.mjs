import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir, cp, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepare } from '../scripts/prepare-pigboard-skills.mjs';
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

test('real copied named-issue inspection uses its complete payload and TLS packet from unrelated cwd',async t=>{
 const {spawnSync}=await import('node:child_process');const {createHash}=await import('node:crypto');
 const o=await fixture(t),root=path.dirname(o.source),dependencyRoot=new URL('../node_modules/',import.meta.url);
 const a=await prepare(o,async dir=>{if(path.basename(dir)==='work-validator')await cp(dependencyRoot,path.join(dir,'node_modules'),{recursive:true,dereference:true});else await install(dir);});
 const runtime=path.join(a.skills,'work-validator'),cwd=path.join(root,'unrelated-jira');await mkdir(cwd);const env={...process.env};delete env.NODE_PATH;
 const cases=JSON.parse(await readFile(path.join(runtime,'test/fixtures/jira-preview-cases.json')));
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 for(const relative of ['lib/jira/read.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json','lib/config/projects.mjs','node_modules/yaml/package.json','node_modules/ajv/package.json'])assert.equal(hash(await readFile(path.join(runtime,relative))),hash(await readFile(new URL('../'+relative,import.meta.url))));
 const run=(runtimeRoot,v,json=true)=>spawnSync(process.execPath,[path.join(runtimeRoot,'test/fixtures/jira-preview-harness.mjs'),'--case',v.case,'--variant',v.variant,'--runtime',runtimeRoot,...(json?['--json']:[])],{cwd,env,encoding:'utf8',timeout:10000});
 // Every named variant includes its literal paired controls and L06 private projection.
 for(const v of cases.variants){const copied=run(runtime,v);assert.equal(copied.status,0,v.variant+' '+copied.stdout+' '+copied.stderr);const packet=JSON.parse(copied.stdout);assert.equal(packet.case,v.case);assert.equal(packet.variant,v.variant);assert(packet.runs.every(r=>r.oracle_matched&&r.effects===0));}
 const guide=cases.variants.find(v=>v.variant==='guide-and-install'),human=run(runtime,guide,false),json=run(runtime,guide);assert.equal(human.status,0);const humanReport=JSON.parse(human.stdout.slice(human.stdout.indexOf('\n')+1)),jsonReport=JSON.parse(json.stdout).runs[0].report;const durationFields=['elapsed_ms','peak_request_elapsed_ms'];for(const report of [humanReport,jsonReport])for(const field of durationFields){assert(Number.isFinite(report.counters[field]),field+' must be finite');assert(report.counters[field]>=0,field+' must be nonnegative');}const humanComparison=structuredClone(humanReport),jsonComparison=structuredClone(jsonReport);for(const field of durationFields){humanComparison.counters[field]=0;jsonComparison.counters[field]=0;}assert.deepEqual(humanComparison,jsonComparison);assert.match(human.stdout,/Human acceptance remains a separate review/);
 const damaged=path.join(root,'damaged-jira');await cp(runtime,damaged,{recursive:true});await rm(path.join(damaged,'lib/jira/read.mjs'));const failed=run(damaged,guide);assert.equal(failed.status,2);assert.equal(JSON.parse(failed.stdout).diagnostics[0].code,'SETUP_MISSING');assert.equal(JSON.parse(failed.stdout).inspection_scope,'requested_issues');assert.equal(await readFile(path.join(runtime,'lib/jira/read.mjs'),'utf8'),await readFile(new URL('../lib/jira/read.mjs',import.meta.url),'utf8'));
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
