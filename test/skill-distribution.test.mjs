import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir, cp } from 'node:fs/promises';
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
 const guide=cases.variants.find(v=>v.variant==='guide-and-install'),human=run(runtime,guide,false),json=run(runtime,guide);assert.equal(human.status,0);const humanReport=JSON.parse(human.stdout.slice(human.stdout.indexOf('\n')+1)),jsonReport=JSON.parse(json.stdout).runs[0].report;humanReport.counters.elapsed_ms=0;jsonReport.counters.elapsed_ms=0;assert.deepEqual(humanReport,jsonReport);assert.match(human.stdout,/Human acceptance remains a separate review/);
 const damaged=path.join(root,'damaged-jira');await cp(runtime,damaged,{recursive:true});await rm(path.join(damaged,'lib/jira/read.mjs'));const failed=run(damaged,guide);assert.equal(failed.status,2);assert.equal(JSON.parse(failed.stdout).diagnostics[0].code,'SETUP_MISSING');assert.equal(await readFile(path.join(runtime,'lib/jira/read.mjs'),'utf8'),await readFile(new URL('../lib/jira/read.mjs',import.meta.url),'utf8'));
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
 const result=JSON.parse(p.stdout);assert.deepEqual(Object.keys(result).sort(),['status','diagnostics','case','variant','runs','run_roles','failed_run','domain_complete','admission','receipt_proof'].sort());
 assert.equal(result.status,'fixture_failed');assert.deepEqual(result.diagnostics,[{code:'FIXTURE_RUN_FAILED',message:'The fixture run did not verify. Retain completed runs and inspect the prescribed check; do not treat this as missing setup or a passing observation.'}]);
 assert.equal(result.case,'R1-33-H03');assert.equal(result.variant,'total-byte-limit');assert.deepEqual(result.run_roles,['main','control']);assert.equal(result.runs.length,2);
 assert.deepEqual(result.failed_run,{role:'private_projection',observations:'unavailable',cleanup:'not_reported'});assert.equal(result.domain_complete,false);assert.equal(result.admission,'not_evaluated');assert.equal(result.receipt_proof,'not_evaluated');
 for(const run of result.runs){assert.equal(run.oracle_matched,true);assert.equal(run.effects,0);assert.equal(run.cleanup_complete,true);assert.equal(run.report.domain_complete,false);assert.equal(run.report.admission,'not_evaluated');assert.equal(run.report.receipt_proof,'not_evaluated');assert.equal(Object.hasOwn(run,'observations'),false);}
 const [main,control]=result.runs;assert.equal(main.report.status,'incomplete');assert(main.report.diagnostics.some(d=>d.code==='LIMIT_REACHED'));assert.deepEqual([main.report.counters.requests_attempted,main.report.counters.requests_completed,main.report.counters.requests_failed,main.report.counters.response_bytes,main.report.counters.observation_bytes],[3,2,1,754,635]);
 assert.equal(control.report.status,'complete');assert.deepEqual(control.report.diagnostics,[]);assert.deepEqual([control.report.counters.requests_attempted,control.report.counters.requests_completed,control.report.counters.requests_failed,control.report.counters.response_bytes,control.report.counters.observation_bytes],[3,3,0,754,745]);
 for(const canary of [original.token,variant.config.jira.connection.secret_reference,'ERROR-CANARY','"body":','"stack":','"actual":','"expected":'])assert(!p.stdout.includes(canary));
 assert.equal(hash(await readFile(originalFile)),originalHash);assert.equal(hash(await readFile(new URL('./fixtures/jira-preview-cases.json',import.meta.url))),originalHash);
});
