import * as verificationFs from 'node:fs';
import {createHash as verificationHash} from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync as rawExecFileSync, spawnSync as rawSpawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const VERIFICATION_LABEL='cursor-environment';

// Contributor verification only. Opt-in capture retains existing observations
// before disposable fixture cleanup; it never changes a product input/oracle.
const verificationRoot=process.env.PGB81_EVIDENCE_DIR;
let verificationSequence=0,verificationCurrent=null;
const verificationFixtures=[],verificationErrors=[];
if(verificationRoot)assert(path.isAbsolute(verificationRoot),'Use an absolute external verification directory.');
const verificationSHA=bytes=>verificationHash('sha256').update(bytes).digest('hex');
const verificationInside=(root,file)=>{const relative=path.relative(root,file);return relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
function verificationBlob(bytes){if(!verificationRoot)return null;const hash=verificationSHA(bytes),dir=path.join(verificationRoot,'blobs');verificationFs.mkdirSync(dir,{recursive:true});const file=path.join(dir,hash);try{verificationFs.writeFileSync(file,bytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}return {sha256:hash,bytes:Buffer.byteLength(bytes),file};}
function verificationRecord(kind,value){if(!verificationRoot)return;const dir=path.join(verificationRoot,VERIFICATION_LABEL);verificationFs.mkdirSync(dir,{recursive:true});verificationFs.writeFileSync(path.join(dir,String(verificationSequence++).padStart(6,'0')+'-'+kind+'.json'),JSON.stringify(value,null,2)+'\n');}
function verificationError(error){const own={};for(const key of Object.getOwnPropertyNames(error)){const value=error[key];own[key]=Buffer.isBuffer(value)?verificationBlob(value):value;}return {own,status:error.status??null,signal:error.signal??null,stdout:error.stdout==null?null:verificationBlob(error.stdout),stderr:error.stderr==null?null:verificationBlob(error.stderr),unavailable:['status','signal','stdout','stderr'].filter(k=>!Object.hasOwn(error,k))};}
function verificationLatch(error,context){const failure={context,message:error.message,stack:error.stack,registered_fixture_paths:verificationFixtures.map(f=>f.tmp)};verificationErrors.push(failure);try{verificationRecord('capture-error',failure);}catch(persist){console.error('PGB81 evidence persistence failed: '+persist.message);}console.error('PGB81 evidence incomplete; retain surviving fixtures: '+failure.registered_fixture_paths.join(', '));}
function verificationCheck(){if(verificationRoot)assert.equal(verificationErrors.length,0,'PGB81 evidence capture failed; retain disposable fixtures: '+verificationFixtures.map(f=>f.tmp).join(', '));}
function verificationAfter(context,observe){if(!verificationRoot)return;try{observe();}catch(error){verificationLatch(error,context);}}
function verificationBefore(context,observe){verificationCheck();try{return observe();}catch(error){verificationLatch(error,context);throw error;}}
function verificationFixture(file){return verificationFixtures.find(f=>verificationInside(f.tmp,path.resolve(file)));}
// A registered lexical path is readable only while all of its existing ancestors
// remain ordinary directories. Symlink entries are recorded, never traversed.
function verificationSafe(file){const f=verificationFixture(file);if(!f)return false;let cursor=f.tmp;const parts=path.relative(f.tmp,path.resolve(file)).split(path.sep).filter(Boolean);for(const part of parts.slice(0,-1)){cursor=path.join(cursor,part);try{if(!verificationFs.lstatSync(cursor).isDirectory())return false;}catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')return false;throw error;}}return true;}
function verificationMap(root){if(!verificationSafe(root))return {root,state:'NOT_CAPTURED_UNREGISTERED_OR_SYMLINK_PATH'};const entries=[];function walk(file,relative){let st;try{st=verificationFs.lstatSync(file);}catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR'){entries.push({path:relative,state:'NOT_PRESENT_AT_RETURN'});return;}throw error;}if(st.isSymbolicLink()){entries.push({path:relative,kind:'symlink',link:verificationFs.readlinkSync(file)});return;}if(st.isFile()){const bytes=verificationFs.readFileSync(file);entries.push({path:relative,kind:'file',bytes:bytes.length,content:verificationBlob(bytes)});return;}entries.push({path:relative,kind:st.isDirectory()?'directory':'other'});if(st.isDirectory())for(const name of verificationFs.readdirSync(file).sort()){if(name==='.git')continue;walk(path.join(file,name),relative?relative+'/'+name:name);}}walk(root,'');return {root,entries};}
function verificationFiles(args,cwd){const result=[];for(const flag of ['--config','--input','--context']){const i=args.indexOf(flag);if(i<0||!args[i+1])continue;const file=path.resolve(cwd??process.cwd(),args[i+1]);result.push({flag,argument:args[i+1],...verificationMap(file)});}return result;}
function verificationInventory(cwd){const dir=cwd??process.cwd();if(!verificationSafe(dir))return {root:dir,state:'NOT_CAPTURED_UNREGISTERED_OR_SYMLINK_PATH'};const st=verificationFs.lstatSync(dir);if(!st.isDirectory())return {root:dir,state:'NOT_CAPTURED_NON_DIRECTORY'};return verificationFs.readdirSync(dir,{withFileTypes:true}).map(e=>{const file=path.join(dir,e.name);return {name:e.name,kind:e.isSymbolicLink()?'symlink':e.isFile()?'file':e.isDirectory()?'directory':'other',sha256:e.isFile()?verificationSHA(verificationFs.readFileSync(file)):null,link:e.isSymbolicLink()?verificationFs.readlinkSync(file):null};}).sort((a,b)=>a.name.localeCompare(b.name));}
function verificationChildBefore(args,options){const f=verificationFixture(options.cwd??process.cwd());if(f)verificationCurrent=f;return {test:f?.label??null,...f?.context,inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)};}
function spawnSync(file,args=[],options={}){if(!verificationRoot||file!==process.execPath)return rawSpawnSync(file,args,options);const before=verificationBefore('spawnSync before',()=>verificationChildBefore(args,options)),r=rawSpawnSync(file,args,options);verificationAfter('spawnSync after',()=>verificationRecord('child',{file,args,options,input_present:Object.hasOwn(options,'input'),input:options.input===undefined?null:verificationBlob(options.input),cwd:options.cwd??process.cwd(),status:r.status,signal:r.signal,error:r.error?verificationError(r.error):null,stdout:r.stdout===undefined||r.stdout===null?null:verificationBlob(r.stdout),stderr:r.stderr===undefined||r.stderr===null?null:verificationBlob(r.stderr),before,after:{inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)}}));return r;}
function execFileSync(file,args=[],options={}){if(!verificationRoot||file!==process.execPath)return rawExecFileSync(file,args,options);const before=verificationBefore('execFileSync before',()=>verificationChildBefore(args,options));let value;try{value=rawExecFileSync(file,args,options);}catch(error){verificationAfter('execFileSync rejection',()=>verificationRecord('child',{file,args,options,cwd:options.cwd??process.cwd(),outcome:'threw',error:verificationError(error),before,after:{inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)}}));throw error;}verificationAfter('execFileSync return',()=>verificationRecord('child',{file,args,options,input_present:Object.hasOwn(options,'input'),input:options.input===undefined?null:verificationBlob(options.input),cwd:options.cwd??process.cwd(),outcome:'returned',stdout:verificationBlob(value),stderr:null,stderr_observation:'UNAVAILABLE_FROM_EXECFILESYNC_RETURN',before,after:{inputs:verificationFiles(args,options.cwd),inventory:verificationInventory(options.cwd)}}));return value;}
function verificationContext(o,context){const f=verificationFixture(o.app);if(f){f.context=context;verificationCurrent=f;}}
function verificationAPI(c,config,snapshot,actual){verificationAfter('source API return',()=>verificationRecord('api',{test:verificationCurrent?.label??null,...verificationCurrent?.context,case_id:verificationCurrent?.context.case_id??c.id??null,input_case_id:c.id??null,config:verificationBlob(config),snapshot:verificationBlob(snapshot),options_present:Object.hasOwn(c,'options'),options:c.options??{},actual}));}
function verificationHistory(c,input,expected,actual,extra={}){verificationAfter('history API return',()=>verificationRecord('history-api',{test:verificationCurrent?.label??null,...verificationCurrent?.context,case_id:c.id,input:verificationBlob(JSON.stringify(input)),expected:verificationBlob(JSON.stringify(expected)),actual,projection:'JSON plain-data comparison; full public result retained in actual',...extra}));}
function verificationComplete(o,group){verificationCheck();verificationAfter('assertion group '+group,()=>verificationRecord('assertion-group',{test:verificationFixture(o.app)?.label??null,group,status:'PASSED_EXISTING_ASSERTIONS'}));verificationCheck();}

import { installCursorSkills as rawInstallCursorSkills } from '../scripts/install-cursor-skills.mjs';

function verificationStable(f){const file=path.join(f.root,'skills');if(!verificationSafe(file))return {state:'NOT_CAPTURED_UNREGISTERED_OR_SYMLINK_PATH'};try{const st=verificationFs.lstatSync(file);let resolved;try{resolved=verificationFs.realpathSync(file);}catch(error){if(error.code!=='ENOENT'&&error.code!=='ENOTDIR')throw error;resolved={state:'NOT_PRESENT_AT_RETURN'};}return {kind:st.isSymbolicLink()?'symlink':'unmanaged',link:st.isSymbolicLink()?verificationFs.readlinkSync(file):null,realpath:resolved};}catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')return {state:'NOT_PRESENT_AT_RETURN'};throw error;}}
function verificationReleases(f){const root=path.join(f.root,'releases');if(!verificationSafe(root))return [];try{if(!verificationFs.lstatSync(root).isDirectory())return [];return verificationFs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();}catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')return [];throw error;}}
function verificationInstallAfter(f,before,receipt,error){const releases=verificationReleases(f),candidates=releases.filter(name=>!before.releases.includes(name)).map(name=>{const release=path.join(f.root,'releases',name),manifest=path.join(release,'manifest.json');return {release,map:verificationMap(release),manifest:verificationMap(manifest)};});verificationRecord('installation',{test:f.label,attempt:before.attempt,...f.context,options:before.options,before,stable_after:verificationStable(f),releases_after:releases,new_candidates:candidates,candidate_state:candidates.length?'PRESENT_AT_RETURN':'NOT_PRESENT_AT_RETURN',outcome:error?'threw':'returned',receipt:receipt??null,error:error?verificationError(error):null,receipt_release:receipt?.release??null,receipt_manifest:receipt?verificationMap(receipt.manifest):null,internal_observation:'UNAVAILABLE_INTERNAL: installer children, successful internal stderr and deleted staging/smoke temporary files are not observed.',runtime_kind:'Existing disposable source-test fixture: real copied work-validator dependencies; nonvalidator QA engines remain fakeInstall stubs. Not live installation acceptance.'});f.pending--;}
async function installCursorSkills(options,install){if(!verificationRoot)return rawInstallCursorSkills(options,install);const f=verificationFixture(options.source)??verificationFixture(options.app);assert(f,'Capture only registered disposable fixture installations.');verificationCurrent=f;const before=verificationBefore('installer before',()=>{const value={attempt:++f.attempt,options:{...options},stable:verificationStable(f),releases:verificationReleases(f),source:verificationMap(f.source),fault_inputs:['lib/manager/repair-policy.mjs','test/fixtures/manager-repairs.json'].map(p=>({path:p,map:verificationMap(path.join(f.source,p))}))};verificationRecord('installation-start',{test:f.label,...f.context,...value});f.pending++;return value;});let receipt;try{receipt=await rawInstallCursorSkills(options,install);}catch(error){verificationAfter('installer rejection',()=>verificationInstallAfter(f,before,null,error));throw error;}verificationAfter('installer return',()=>verificationInstallAfter(f,before,receipt,null));return receipt;}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
const bundle = JSON.parse(await readFile(new URL('../config/skill-bundle.json', import.meta.url)));
async function fixture(t) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'pigboard-env-'));
  const source = path.join(tmp, 'source'), app = path.join(tmp, 'app'), root = path.join(tmp, 'installed');
  const observed={tmp,source,app,root,label:t.name,attempt:0,context:{},pending:0};
  verificationFixtures.push(observed);
  if(verificationRoot){assert(!verificationInside(tmp,path.resolve(verificationRoot)),'Evidence must be outside disposable fixture roots.');if(verificationFs.existsSync(verificationRoot))assert(!verificationInside(tmp,verificationFs.realpathSync(verificationRoot)),'Evidence must resolve outside disposable fixture roots.');}
  t.after(async()=>{verificationCheck();assert.equal(observed.pending,0,'Public capture incomplete; retain fixture '+tmp);await rm(tmp,{recursive:true,force:true});});
  await mkdir(source); await mkdir(app);
  git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  for (const name of bundle.skills) await cp(new URL(`../skills/${name}`, import.meta.url), path.join(source, 'skills', name), { recursive: true, filter: file => !file.includes('node_modules') });
  for (const relative of bundle.validatorPayload.sources) {
    const target = path.join(source, relative); await mkdir(path.dirname(target), { recursive:true });
    await cp(new URL('../' + relative, import.meta.url), target);
  }
  git(source, 'add', '.'); git(source, 'commit', '-m', 'fixture');
  return { source, app, root, ref: 'main' };
}
async function fakeInstall(dir) {
  if (path.basename(dir) === 'work-validator') { await cp(new URL('../node_modules', import.meta.url), path.join(dir,'node_modules'), { recursive:true }); return; }
  const declared = JSON.parse(await readFile(path.join(dir, 'package.json'))).dependencies;
  for (const [name, version] of Object.entries(declared)) {
    const module = path.join(dir, 'node_modules', name);
    await mkdir(module, { recursive: true });
    await writeFile(path.join(module, 'package.json'), JSON.stringify({ name, version, main: 'index.cjs', bin: { bru: 'cli.cjs' } }));
    await writeFile(path.join(module, 'index.cjs'), 'exports.Client = class Client {};');
    await writeFile(path.join(module, 'cli.cjs'), `console.log(${JSON.stringify(version)});`);
  }
}
test('install and refresh expose verified skills without changing app or older release', async t => {
  const o = await fixture(t);
  const first = await installCursorSkills(o, fakeInstall);
  assert.equal(await realpath(first.stableSkills), first.skills);
  assert.equal(first.verification.entrypoints, 22);
  for (const relative of ['write-pr-sized-stories/SKILL.md', 'write-pr-sized-stories/references/pigboard-ticket.md', 'write-pr-sized-stories/references/pigboard-example.md']) {
    assert.equal(await readFile(path.join(first.stableSkills, relative), 'utf8'), await readFile(path.join(o.source, 'skills', relative), 'utf8'));
  }
  const previous = await readFile(path.join(first.skills, 'qa-api/SKILL.md'), 'utf8');
  await writeFile(path.join(o.source, 'skills/qa-api/SKILL.md'), previous + '\nUpdated fixture.\n');
  git(o.source, 'add', '.'); git(o.source, 'commit', '-m', 'refresh');
  const next = await installCursorSkills(o, fakeInstall);
  assert.notEqual(first.commit, next.commit);
  assert.equal(await realpath(first.stableSkills), next.skills);
  assert.equal(await readFile(path.join(first.skills, 'qa-api/SKILL.md'), 'utf8'), previous);
  assert.deepEqual(await readdir(o.app), []);
});
test('failed fetch, dependency smoke check and changed source preserve previous binding', async t => {
  const o = await fixture(t);
  const first = await installCursorSkills(o, fakeInstall);
  await assert.rejects(installCursorSkills({ ...o, ref: 'missing' }, fakeInstall));verificationCheck();
  await assert.rejects(installCursorSkills(o, async dir => {
    await fakeInstall(dir);
    if (dir.includes('qa-bruno')) await writeFile(path.join(dir, 'node_modules/@usebruno/cli/cli.cjs'), 'process.exit(1);');
  }), /smoke check/);verificationCheck();
  await assert.rejects(installCursorSkills(o, async dir => {
    await fakeInstall(dir);
    await writeFile(path.join(dir, '../SKILL.md'), 'unexpected modification');
  }), /hash mismatch/);verificationCheck();
  assert.equal(await realpath(first.stableSkills), first.skills);
  assert.deepEqual((await readdir(o.root)).sort(), ['releases', 'skills']);
});
test('unsafe roots and unmanaged destinations are rejected before preparation', async t => {
  const o = await fixture(t);
  await assert.rejects(installCursorSkills({ ...o, root: path.parse(o.app).root }, fakeInstall), /separate/);verificationCheck();
  await assert.rejects(installCursorSkills({ ...o, root: path.join(o.app, 'unsafe') }, fakeInstall), /separate/);verificationCheck();
  await assert.rejects(installCursorSkills({ ...o, root: path.dirname(o.app) }, fakeInstall), /separate/);verificationCheck();
  await assert.rejects(installCursorSkills({ ...o, root: path.join(o.source, 'unsafe') }, fakeInstall), /Git checkout/);verificationCheck();
  await symlink(o.app, o.root);
  await assert.rejects(installCursorSkills(o, fakeInstall), /symlink/);verificationCheck();
  await rm(o.root); await mkdir(o.root); await mkdir(path.join(o.root, 'skills'));
  await assert.rejects(installCursorSkills(o, fakeInstall), /unmanaged/);verificationCheck();
  await rm(path.join(o.root, 'skills'), { recursive: true });
  await symlink(o.app, path.join(o.root, 'skills'));
  await assert.rejects(installCursorSkills(o, fakeInstall), /unmanaged/);verificationCheck();
  assert.deepEqual(await readdir(o.root), ['skills']);
});
test('real installed validator runs outside checkout and failed runtime variants preserve stable link',async t=>{
 const o=await fixture(t), first=await installCursorSkills(o,fakeInstall);
 assert.deepEqual(first.verification.smokeChecks,['pg.Client','bru --version','work-validator epic draft','work-validator ticket draft','handoff-validator admission record','config-validator project scope','manager-preview nonexecuting selection','manager-preview nonexecuting repair queue']);
 const validator=path.join(first.stableSkills,'work-validator');
 const pair=JSON.parse(await readFile(new URL('./fixtures/work-semantics.json',import.meta.url),'utf8')).mixed;
 const workFile=path.join(o.app,'work.json'),contextFile=path.join(o.app,'facts.json');
 await writeFile(workFile,JSON.stringify(pair.work));await writeFile(contextFile,JSON.stringify(pair.context));
 const start=()=>execFileSync(process.execPath,[path.join(validator,'scripts/validate-work.mjs'),'--mode','start','--input',workFile,'--context',contextFile,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000});
 assert.equal(JSON.parse(start()).valid,true);
 const originalRepository=pair.work.technical_acceptance_criteria.repository.url;
 for(const repository of ['https://example.invalid/a%20b','https://example.invalid/raw space']){
  pair.work.technical_acceptance_criteria.repository.url=repository;pair.context.repositories[0].url=repository;
  const input=JSON.stringify(pair.work),facts=JSON.stringify(pair.context);await writeFile(workFile,input);await writeFile(contextFile,facts);
  if(repository.includes('%20'))assert.equal(JSON.parse(start()).valid,true);
  else assert.throws(start,error=>{assert.equal(error.status,1);const r=JSON.parse(error.stdout);assert(r.diagnostics.some(d=>d.code==='LEDGER_FIELD'&&d.path==='/technical_acceptance_criteria/repository/url'));assert.equal(r.ledger_budget.ai_steps,4);assert.equal(r.ledger_budget.human_cases,1);assert.equal(r.ledger_budget.omitted_entries,0);return true;});
  assert.equal(await readFile(workFile,'utf8'),input);assert.equal(await readFile(contextFile,'utf8'),facts);
 }
 pair.work.technical_acceptance_criteria.repository.url=originalRepository;pair.context.repositories[0].url=originalRepository;await writeFile(workFile,JSON.stringify(pair.work));await writeFile(contextFile,JSON.stringify(pair.context));
 pair.context.operations[0].contract.action='Stale reviewed prescription.';await writeFile(contextFile,JSON.stringify(pair.context));
 assert.throws(start,error=>{assert.equal(error.status,2);assert(JSON.parse(error.stdout).diagnostics.some(d=>d.code==='CONTEXT_OPERATION'));return true;});
 assert.equal(await realpath(first.stableSkills),first.skills);
 await rm(workFile);await rm(contextFile);
 for(const mode of ['draft','structure']) {
  const output=execFileSync(process.execPath,[path.join(validator,'scripts/validate-work.mjs'),'--mode',mode,'--input',path.join(validator,'docs/architecture/examples/manager-ticket-populated.yaml'),'--json'],{cwd:o.app,encoding:'utf8',timeout:30000});assert.equal(JSON.parse(output).valid,true);
 }
 for(const mutate of [
  async dir=>rm(path.join(dir,'node_modules/yaml'),{recursive:true}),
  async dir=>rm(path.join(dir,'node_modules/ajv-formats'),{recursive:true}),
  async dir=>writeFile(path.join(dir,'node_modules/ajv-formats/package.json'),'{"version":"0.0.0"}'),
  async dir=>writeFile(path.join(dir,'node_modules/ajv-formats/dist/index.js'),'throw Error("corrupt formats runtime");'),
  async dir=>rm(path.join(dir,'lib/contracts/work-semantics.mjs')),
  async dir=>writeFile(path.join(dir,'lib/contracts/case-graph.mjs'),'throw Error("corrupt semantics");'),
  async dir=>rm(path.join(dir,'contracts/work-validation-context-v1.schema.json')),
  async dir=>writeFile(path.join(dir,'config/skill-bundle.json'),'{}'),
  async dir=>writeFile(path.join(dir,'node_modules/yaml/package.json'),'{"version":"0.0.0"}'),
  async dir=>writeFile(path.join(dir,'node_modules/yaml/dist/index.js'),'throw Error("corrupt runtime");'),
  async dir=>writeFile(path.join(dir,'scripts/validate-work.mjs'),'process.exit(0);'),
  async dir=>{const p=JSON.parse(await readFile(path.join(dir,'package.json')));p.dependencies.yaml='^2.9.1';await writeFile(path.join(dir,'package.json'),JSON.stringify(p));},
 ]) {
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));verificationCheck();
  assert.equal(await realpath(first.stableSkills),first.skills);
 }
 assert.deepEqual(await readdir(o.app),[]);
 const refreshed=await installCursorSkills(o,fakeInstall);assert.equal(await realpath(refreshed.stableSkills),refreshed.skills);
 assert.equal(JSON.parse(execFileSync(process.execPath,[path.join(first.skills,'work-validator/scripts/validate-work.mjs'),'--mode','draft','--input',path.join(first.skills,'work-validator/docs/architecture/examples/manager-epic.yaml'),'--json'],{encoding:'utf8',timeout:30000})).valid,true);
});

test('installed writer ships full hashed folders and validates its own templates/examples outside the checkout', async t => {
  const o = await fixture(t), installed = await installCursorSkills(o, fakeInstall);
  const { createHash } = await import('node:crypto');
  async function inventory(dir, prefix = '') {
    const result = {};
    for (const entry of await readdir(path.join(dir, prefix), { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) Object.assign(result, await inventory(dir, relative));
      else {
        assert(entry.isFile(), relative);
        result[relative] = createHash('sha256').update(await readFile(path.join(dir, relative))).digest('hex');
      }
    }
    return result;
  }
  for (const name of ['write-pr-sized-stories', 'human-writing', 'implementer-entrypoint', 'implementer-job', 'implementer-jira']) {
    const target = path.join(installed.skills, name);
    const sourceFiles = await inventory(path.join(o.source, 'skills', name));
    assert.deepEqual(await inventory(target), sourceFiles);
    // Validate all local Markdown links in these complete installed folders.
    for (const relative of Object.keys(sourceFiles).filter(p => p.endsWith('.md'))) {
      const markdown = await readFile(path.join(target, relative), 'utf8');
      for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const [link, anchor] = match[1].split('#');
        if (/^[a-z][a-z0-9+.-]*:/i.test(link)) continue;
        const resolved = link ? path.resolve(target, path.dirname(relative), decodeURIComponent(link)) : path.join(target, relative);
        assert(resolved.startsWith(installed.skills + path.sep), `${relative}: ${link} escapes bundle`);
        const linked = await readFile(resolved, 'utf8');
        if (anchor) assert(linked.split('\n').some(line => line.startsWith('#') && line.replace(/^#+ /, '').toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-') === anchor), `${relative}: missing ${anchor}`);
      }
    }
  }
  // Follow the actual help guide copied into work-validator, not an independently
  // constructed writer path. Each column explicitly applies to one layout only.
  const guidePath = path.join(installed.skills, 'work-validator/docs/authoring.md');
  const guide = await readFile(guidePath, 'utf8');
  assert.equal(guide, await readFile(new URL('../docs/authoring.md', import.meta.url), 'utf8'));
  const routes = [...guide.matchAll(/^\| ([^|]+) \| \[Source [^\]]+\]\(([^)]+)\) \| \[Installed [^\]]+\]\(([^)]+)\) \|$/gm)];
  assert.equal(routes.length, 5, 'all five source/installed help routes must be explicit');
  const installedRoutes = {};
  for (const [, label, sourceLink, installedLink] of routes) {
    const sourcePath = new URL('../docs/' + sourceLink, import.meta.url);
    const installedPath = path.resolve(path.dirname(guidePath), installedLink);
    assert(installedPath.startsWith(installed.skills + path.sep), label);
    assert(!installedPath.startsWith(path.join(installed.skills, 'work-validator') + path.sep), label);
    assert.equal(await readFile(installedPath, 'utf8'), await readFile(sourcePath, 'utf8'), label);
    installedRoutes[label.trim()] = installedPath;
  }
  const writer = path.dirname(installedRoutes['Writer entrypoint']);
  assert.equal(writer, path.join(installed.skills, 'write-pr-sized-stories'));
  const expectedReferences = ['basic-workflow-ticket.md', 'epic.yaml', 'ticket.yaml', 'pigboard-epic.md', 'pigboard-ticket.md', 'pigboard-example.md'];
  const references = await readdir(path.join(writer, 'references'));
  for (const name of expectedReferences) assert(references.includes(name), name);
  const cli = path.join(installed.skills, 'work-validator/scripts/validate-work.mjs');
  function run(mode, input, context, expected = 0) {
    try {
      const result = JSON.parse(execFileSync(process.execPath, [cli, '--mode', mode, '--input', input, ...(context ? ['--context', context] : []), '--json'], { cwd: o.app, encoding: 'utf8', timeout: 30000 }));
      assert.equal(expected, 0); assert.equal(result.valid, true); assert.equal(result.readiness, 'not_evaluated');
      return result;
    } catch (error) {
      if (error.status !== expected) throw error;
      const result = JSON.parse(error.stdout); assert.equal(result.valid, false);
      return result;
    }
  }
  for (const kind of ['epic', 'ticket']) {
    const input = installedRoutes[kind === 'epic' ? 'Epic template' : 'Ticket template'], before = await readFile(input, 'utf8');
    run('draft', input);
    const incomplete = run('structure', input, null, 1);
    assert(incomplete.diagnostics.some(d => d.path === '/problem_to_solve'));
    assert.equal(await readFile(input, 'utf8'), before);
  }
  const example = await readFile(installedRoutes['Complete briefs, work and contexts'], 'utf8');
  const blocks = [...example.matchAll(/<!-- example:(epic|mixed|human):(work|context) -->\n```yaml\n([\s\S]*?)```/g)];
  assert.equal(blocks.length, 6);
  const files = {};
  for (const [, name, kind, text] of blocks) {
    const file = path.join(o.app, `${name}-${kind}.yaml`);
    await writeFile(file, text); files[`${name}-${kind}`] = { file, text };
  }
  for (const name of ['epic', 'mixed', 'human']) {
    const { file } = files[`${name}-work`], context = files[`${name}-context`].file;
    run('draft', file); run('structure', file);
    const result = run('start', file, context);
    if (name !== 'epic') {
      assert.equal(result.ledger_budget.ai_steps, name === 'mixed' ? 4 : 0);
      assert.equal(result.ledger_budget.human_cases, 1);
      assert.equal(result.ledger_budget.omitted_entries, 0);
    }
  }
  for (const { file, text } of Object.values(files)) assert.equal(await readFile(file, 'utf8'), text);
  for (const name of ['write-pr-sized-stories', 'human-writing', 'implementer-entrypoint', 'implementer-job', 'implementer-jira']) assert.deepEqual(await inventory(path.join(installed.skills, name)), await inventory(path.join(o.source, 'skills', name)));
});


test('installed receipt validator runs a complete repaired stack with real copied dependencies',async t=>{
 const o=await fixture(t), first=await installCursorSkills(o,fakeInstall),validator=path.join(first.stableSkills,'work-validator'),input=path.join(o.app,'receipts.json');
 const envelope=JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json',import.meta.url),'utf8')).chains.stack,raw=JSON.stringify(envelope);await writeFile(input,raw);
 const result=JSON.parse(execFileSync(process.execPath,[path.join(validator,'scripts/validate-handoff.mjs'),'--mode','chain','--input',input,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000}));
 assert.equal(result.valid,true);assert.equal(result.completion_established,true);assert.deepEqual(result.validated_leaf,envelope.target);assert.equal(result.ai_steps,0);assert.equal(result.human_pending.length,1);assert.equal(await readFile(input,'utf8'),raw);await rm(input);
 assert.equal(await readFile(path.join(validator,'docs/handoffs.md'),'utf8'),await readFile(new URL('../docs/handoffs.md',import.meta.url),'utf8'));
 for(const mutate of [
  async dir=>rm(path.join(dir,'node_modules/canonicalize'),{recursive:true}),
  async dir=>writeFile(path.join(dir,'node_modules/canonicalize/lib/canonicalize.js'),'export default () => "wrong";'),
  async dir=>rm(path.join(dir,'node_modules/parse5'),{recursive:true}),
  async dir=>writeFile(path.join(dir,'node_modules/parse5/dist/index.js'),'throw Error("corrupt parser");'),
  async dir=>rm(path.join(dir,'contracts/handoff-v1.schema.json')),
  async dir=>rm(path.join(dir,'contracts/work-pointer-v1.schema.json')),
  async dir=>writeFile(path.join(dir,'lib/contracts/receipts.mjs'),'throw Error("corrupt chain");'),
  async dir=>writeFile(path.join(dir,'scripts/validate-handoff.mjs'),'process.exit(0);'),
 ]){
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));verificationCheck();
  assert.equal(await realpath(first.stableSkills),first.skills);
 }
 assert.deepEqual(await readdir(o.app),[]);
});


test('installed config checker validates and previews outside checkout; corrupt config runtime preserves binding',async t=>{
 const o=await fixture(t),first=await installCursorSkills(o,fakeInstall),validator=path.join(first.skills,'work-validator');
 const config=JSON.parse(await readFile(new URL('./fixtures/project-configs.json',import.meta.url),'utf8')).two_project;
 const input=path.join(o.app,'scope.json'),previous=path.join(o.app,'previous.json');
 await writeFile(previous,JSON.stringify(config));config.projects[0].key='RENAMED';await writeFile(input,JSON.stringify(config));
 const run=args=>execFileSync(process.execPath,[path.join(validator,'scripts/check-config.mjs'),'--input',input,...args,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000});
 const checked=JSON.parse(run(['--label','AI-Daniel-1']));assert.equal(checked.valid,true);assert.equal(checked.resolved_scope.projects.length,2);assert.notEqual(checked.streams[0].key,checked.streams[1].key);
 const preview=JSON.parse(run(['--previous',previous]));assert.equal(preview.preview.status,'review_required');assert.equal(preview.preview.display_changed.length,1);assert.deepEqual(preview.preview.state_actions,[]);
 await writeFile(input,'token: SECRET-INSTALLED');assert.throws(()=>run([]),error=>error.status===1&&!error.stdout.toString().includes('SECRET-INSTALLED'));
 for(const mutate of [async dir=>rm(path.join(dir,'lib/config/projects.mjs')),async dir=>writeFile(path.join(dir,'lib/config/parse.mjs'),'throw Error("corrupt config")'),async dir=>rm(path.join(dir,'contracts/config-v1.schema.json')),async dir=>writeFile(path.join(dir,'scripts/check-config.mjs'),'process.exit(0);')]){
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));verificationCheck();assert.equal(await realpath(first.stableSkills),first.skills);
 }
 assert.equal(await readFile(input,'utf8'),'token: SECRET-INSTALLED');assert.equal(await readFile(previous,'utf8'),JSON.stringify(JSON.parse(await readFile(new URL('./fixtures/project-configs.json',import.meta.url),'utf8')).two_project));
});

test('installed composed implementer retains complete links and runs source-identical publication helper outside app', async t => {
 const o = await fixture(t), first = await installCursorSkills(o, fakeInstall);
 const { extractHandoff } = await import('../lib/contracts/handoff.mjs');
 const { createHash } = await import('node:crypto');
 const envelope = JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json', import.meta.url), 'utf8')).chains.human;
 const comment = envelope.comment_pages[0].comments.find(c => extractHandoff(c.body, {format:c.format}).value.kind === 'implementation');
 const record = extractHandoff(comment.body, {format:comment.format}).value;
 const input = path.join(o.app, 'record.yaml'), summary = path.join(o.app, 'summary.txt');
 const before = JSON.stringify(record), prose = `Ready <literal> &amp; 🐷`;
 await writeFile(input, before); await writeFile(summary, prose);
 const sourceCLI = new URL('../scripts/prepare-handoff.mjs', import.meta.url).pathname;
 const helper = path.join(first.skills, 'work-validator/scripts/prepare-handoff.mjs');
 const manifest = JSON.parse(await readFile(first.manifest, 'utf8'));
 assert(manifest.sourceFiles['work-validator/scripts/prepare-handoff.mjs'] || Object.keys(manifest.sourceFiles).some(k=>k.endsWith('scripts/prepare-handoff.mjs')));
 for (const format of ['html','adf']) {
  const args = ['--input', input, '--summary', summary, '--format', format];
  const installed = execFileSync(process.execPath, [helper, ...args], {cwd:o.app,encoding:'utf8',timeout:30000});
  const source = execFileSync(process.execPath, [sourceCLI, ...args], {cwd:o.app,encoding:'utf8',timeout:30000});
  assert.equal(installed, source);
  const result = JSON.parse(installed);
  const extracted = extractHandoff(format === 'html' ? result.body : JSON.stringify(result.body), {format});
  assert.equal(extracted.record_digest, result.record_digest);
  assert.deepEqual(JSON.parse(JSON.stringify(extracted.value)), JSON.parse(JSON.stringify(record)));
  // Use the actual prepared transport as the exact observed comment in a complete
  // supplied receipt chain; no synthetic provider success or agent run is inferred.
  const supplied = structuredClone(envelope);
  const actual = supplied.comment_pages[0].comments.find(c => c.id === comment.id);
  actual.format = format; actual.body = format === 'html' ? result.body : JSON.stringify(result.body);
  supplied.target = {ticket_id:record.ticket_id,comment_id:comment.id,record_id:record.record_id,digest:result.record_digest};
  supplied.issues[0].stage_id = supplied.trusted.projects[0].stages['In Progress'];
  const receiptInput = path.join(o.app,'receipts.json'); await writeFile(receiptInput,JSON.stringify(supplied));
  const validated = JSON.parse(execFileSync(process.execPath,[path.join(first.skills,'work-validator/scripts/validate-handoff.mjs'),'--mode','chain','--input',receiptInput,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000}));
  assert.equal(validated.valid,true);assert.deepEqual(validated.validated_leaf,supplied.target);assert.equal(validated.qa_report,null);assert.equal(validated.completion_established,false);
  await rm(receiptInput);
 }
 assert.equal(await readFile(input,'utf8'), before);assert.equal(await readFile(summary,'utf8'), prose);
 await rm(input);await rm(summary);
 const original = await readFile(path.join(o.source,'scripts/prepare-handoff.mjs'));
 assert.equal(createHash('sha256').update(await readFile(helper)).digest('hex'),createHash('sha256').update(original).digest('hex'));
 for (const mutate of [
  async dir => rm(path.join(dir,'scripts/prepare-handoff.mjs')),
  async dir => writeFile(path.join(dir,'scripts/prepare-handoff.mjs'),'process.exit(0);'),
  async dir => rm(path.join(dir,'../implementer-job/SKILL.md')),
  async dir => writeFile(path.join(dir,'../implementer-jira/SKILL.md'),'corrupt sibling'),
 ]) {
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));verificationCheck();
  assert.equal(await realpath(first.stableSkills),first.skills);
 }
 assert.deepEqual(await readdir(o.app),[]);
});

test('installed manager preview runs all frozen complete snapshots with real copied dependencies and no input writes',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator');
 const {previewSnapshot}=await import('../lib/manager/decisions.mjs');
 const cases=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-candidates.json'))).cases;
 const repairFixture=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-repairs.json'))),legacyFull=new Map(repairFixture.legacy_native_full.cases.map(c=>[c.id,c.expected]));
 // Exercise the same native/schema boundary through installed ADF extraction.
 for(const fixture of cases.filter(c=>c.id.startsWith('native-'))){const c=structuredClone(fixture),i=c.snapshot.issues[c.id.startsWith('native-epic-')?0:1];c.id+='-adf';i.format='adf';i.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:i.body}]}]});cases.push(c);}
 const config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),cli=path.join(validator,'scripts/manager-preview.mjs');
 for(const c of cases){const rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[cli,'--config',config,'--input',input,'--json',...(c.options?.expectedSnapshotDigest?['--expected-snapshot-digest',c.options.expectedSnapshotDigest]:[])];let output;try{output=execFileSync(process.execPath,args,{cwd:o.app,encoding:'utf8',timeout:30000});}catch(e){assert.equal(e.status,1);output=e.stdout.toString();}const result=JSON.parse(output);if(legacyFull.has(c.id))assert.deepEqual(result,legacyFull.get(c.id),c.id+'full native oracle');assert.deepEqual(result,previewSnapshot(rawConfig,rawSnapshot,c.options),c.id);assert.equal(result.streams.length,c.expected.streams.length);for(const expected of c.expected.streams){const actual=result.streams.find(s=>s.scope.project_id===expected.project_id&&s.scope.label===expected.label);assert.equal(actual.decision,expected.decision,c.id);assert.equal(actual.selected_ticket_id,expected.selected_ticket_id,c.id);assert.equal(actual.return_count,expected.return_count,c.id);for(const d of expected.reason_details??[])assert.ok(actual.reasons.some(r=>r.code===d.code&&r.path===d.path),c.id+' '+JSON.stringify(d));if(expected.reason)assert.ok(actual.reasons.some(r=>r.code===expected.reason),c.id);if(c.id.startsWith('membership-')){assert.deepEqual(actual.scope,{site:c.snapshot.site,project_id:expected.project_id,label:expected.label});for(const field of ['occupied_ids','blocked_ids','human_review_ids','counts_complete'])if(Object.hasOwn(expected,field))assert.deepEqual(actual[field],expected[field],c.id+' '+field);for(const code of expected.reasons??[])assert.ok(actual.reasons.some(r=>r.code===code),c.id+' '+code);for(const code of expected.absent_reasons??[])assert.ok(!actual.reasons.some(r=>r.code===code),c.id+' '+code);if(expected.mismatch_path)assert.ok(actual.reasons.some(r=>r.code==='MEMBERSHIP_MISMATCH'&&r.path===expected.mismatch_path),c.id);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);}}const human=spawnSync(process.execPath,args.filter(a=>a!=='--json'),{cwd:o.app,encoding:'utf8',timeout:30000});assert.equal(human.status,result.status==='complete'?0:1,c.id);assert.equal(human.stderr,'');assert.match(human.stdout,/No execution authority; writes: 0/);for(const e of c.expected.streams){assert(human.stdout.includes(JSON.stringify({site:c.snapshot.site,project_id:e.project_id,label:e.label})+': '+e.decision+';'));if(e.reason)assert(human.stdout.includes(e.reason+' '));}assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);}
 // Literal owner/diagnostic oracles supplement source parity on actual copied runtime.
 for(const spec of ownershipCases(cases)){
  const rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);
  const args=[cli,'--config',config,'--input',input],invoke=json=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000});
  const output=invoke(true);assert.equal(output.status,spec.owners||['retained','wrong-declaration'].includes(spec.control)?1:0);assert.equal(output.stderr,'');assertOwnershipResult(JSON.parse(output.stdout),spec);assert.equal(invoke(true).stdout,output.stdout);
  if(spec.readable){const human=invoke(false);assert.equal(human.status,spec.owners||spec.control==='wrong-declaration'?1:0);assert.equal(human.stderr,'');assertOwnershipText(human.stdout,spec);assert.equal(invoke(false).stdout,human.stdout);}
  assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);
 }
 for(const spec of parentCases(cases)){
  const rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[cli,'--config',config,'--input',input],invoke=json=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000}),p=invoke(true);assert.equal(p.status,spec.valid?0:1);assert.equal(p.stderr,'');assertParentResult(JSON.parse(p.stdout),spec);assert.equal(invoke(true).stdout,p.stdout);if(spec.readable){const human=invoke(false);assert.equal(human.status,1);assert.equal(human.stderr,'');assertParentText(human.stdout);assert.equal(invoke(false).stdout,human.stdout);}assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);
 }
 for(const spec of obligationCases(cases)){
  const rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[cli,'--config',config,'--input',input],invoke=json=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000}),p=invoke(true);assert.equal(p.status,spec.decision==='hold'?1:0);assert.equal(p.stderr,'');assertObligationResult(JSON.parse(p.stdout),spec);assert.equal(invoke(true).stdout,p.stdout);if(spec.readable){const human=invoke(false);assert.equal(human.status,1);assert.equal(human.stderr,'');assertObligationText(human.stdout,spec);assert.equal(invoke(false).stdout,human.stdout);}assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);
 }
 let firstOrderControl=null;const reachedQ6=[];
 for(const spec of prerequisitePathCases(cases)){
  if(spec.orderControl)q6Descriptor(spec);const rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);if(spec.strictProof){const proof=path.join(o.app,'proof.json');await writeFile(proof,spec.c.snapshot.completion_receipts[0]);const p=spawnSync(process.execPath,[path.join(validator,'scripts/validate-handoff.mjs'),'--mode','chain','--input',proof,'--json'],{cwd:o.app,encoding:'utf8',timeout:5000});assert.equal(p.status,0);assert.equal(p.stderr,'');assert.equal(JSON.parse(p.stdout).valid,true);assert.equal(JSON.parse(p.stdout).completion_established,true);await rm(proof);}
  const args=[cli,'--config',config,'--input',input],invoke=json=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000}),p=invoke(true),exit=spec.field?(spec.missing||spec.field==='pending_intents'?1:0):spec.claimed||spec.missingNative?1:0;assert.equal(p.status,exit);assert.equal(p.stderr,'');const result=JSON.parse(p.stdout);assertPrerequisitePathResult(result,spec);assert.equal(invoke(true).stdout,p.stdout);if(spec.orderControl){reachedQ6.push(spec.id);if(firstOrderControl)assertQ6Pair(result,spec,firstOrderControl.result,firstOrderControl.spec);else firstOrderControl={result,spec};}if(spec.readable){const human=invoke(false);assert.equal(human.status,exit);assert.equal(human.stderr,'');assertPrerequisitePathText(human.stdout,spec);assert.equal(invoke(false).stdout,human.stdout);}assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);
 }
 assert.deepEqual(reachedQ6.sort(),['Q6-accounted-first','Q6-unaccounted-first']);
 const formatDir=await mkdtemp(path.join(os.tmpdir(),'installed-json-format-'));t.after(()=>rm(formatDir,{recursive:true,force:true}));
 const control=cases.find(c=>c.id==='S01'),literal=path.join(formatDir,'--json'),snapshot=path.join(formatDir,'snapshot.json'),hook=path.join(formatDir,'audit-open.mjs');
 await writeFile(literal,JSON.stringify(control.config));await writeFile(snapshot,JSON.stringify(control.snapshot));await writeFile(hook,"import fsp from 'node:fs/promises';import{syncBuiltinESMExports}from'node:module';let calls=0;fsp.open=async()=>{calls++;throw Error('AUDITED_INPUT_OPEN');};syncBuiltinESMExports();process.on('exit',()=>process.stderr.write('OPEN_ATTEMPTS='+calls+'\\n'));\n");
 const before=[await readFile(literal,'utf8'),await readFile(snapshot,'utf8')],invoke=(args,audit=false)=>spawnSync(process.execPath,[...(audit?['--import',hook]:[]),cli,...args],{cwd:formatDir,encoding:'utf8',timeout:5000});
 const malformed=[];for(const flag of ['--config','--input','--expected-site','--expected-snapshot-digest'])malformed.push([flag,'--json'],['--json',flag]);malformed.push(['--unknown','SECRET_INPUT_NEVER_OPENED','--json'],['--json','--json'],['--config',literal,'--config',literal,'--json']);
 for(const args of malformed){const p=invoke(args,true),r=JSON.parse(p.stdout);assert.equal(p.status,2);assert.equal(p.stderr,'OPEN_ATTEMPTS=0\n');assert.equal(r.schema,'pigboard-manager-preview/v1');assert.equal(r.valid,false);assert.equal(r.status,'invalid');assert.equal(r.scope_diagnostics[0].code,'USAGE');assert.deepEqual(r.streams,[]);assert.equal(r.execution_authorized,false);assert.equal(r.writes,0);assert.ok(!p.stdout.includes('SECRET_INPUT'));assert.ok(!p.stdout.includes(formatDir));const normal=invoke(args);assert.equal(normal.stdout,p.stdout);assert.equal(normal.stderr,'');}
 for(const flag of ['--config','--input','--expected-site','--expected-snapshot-digest']){const p=invoke([flag],true);assert.equal(p.status,2);assert.equal(p.stderr,'OPEN_ATTEMPTS=0\n');assert.match(p.stdout,/USAGE/);assert.ok(!p.stdout.startsWith('{'));}
 for(const file of ['./--json',literal]){const args=['--config',file,'--input',snapshot],human=invoke(args),json=invoke([...args,'--json']);assert.equal(human.status,0);assert.match(human.stdout,/selected EX-2/);assert.ok(!human.stdout.startsWith('{'));assert.equal(human.stderr,'');assert.equal(json.status,0);assert.deepEqual(JSON.parse(json.stdout),previewSnapshot(JSON.stringify(control.config),JSON.stringify(control.snapshot)));}
 for(const args of [['--help'],['--help','--json']]){const p=invoke(args,true);assert.equal(p.status,0);assert.equal(p.stderr,'OPEN_ATTEMPTS=0\n');if(args.includes('--json'))assert.match(JSON.parse(p.stdout).help,/Preview ready work/);else assert.match(p.stdout,/Preview ready work/);}
 const observed=invoke(['--config',literal,'--input',snapshot,'--json'],true);assert.equal(observed.status,2);assert.equal(observed.stderr,'OPEN_ATTEMPTS=1\n');assert.equal(JSON.parse(observed.stdout).scope_diagnostics[0].code,'INPUT');assert.deepEqual([await readFile(literal,'utf8'),await readFile(snapshot,'utf8')],before);
 assert.deepEqual((await readdir(o.app)).sort(),['config.json','snapshot.json']);
 for(const mutate of [async dir=>rm(path.join(dir,'lib/manager/availability.mjs')),async dir=>writeFile(path.join(dir,'lib/manager/snapshot.mjs'),'throw Error("corrupt preview runtime")'),async dir=>writeFile(path.join(dir,'scripts/manager-preview.mjs'),'process.exit(0);')]){await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));verificationCheck();assert.equal(await realpath(installed.stableSkills),installed.skills);}
 // Committed wrong-result sources pass source hashing, so actual smoke semantics
 // (rather than tamper detection alone) must reject them before stable selection.
 for(const badSource of ['process.exit(0);', 'console.log(JSON.stringify({schema:"pigboard-manager-preview/v1",valid:true,status:"complete",execution_authorized:true,writes:0,streams:[]}));']){
  await writeFile(path.join(o.source,'scripts/manager-preview.mjs'),badSource);git(o.source,'add','.');git(o.source,'commit','-m','wrong preview smoke fixture');
  await assert.rejects(installCursorSkills(o,fakeInstall),/Manager preview nonexecuting smoke check failed/);verificationCheck();assert.equal(await realpath(installed.stableSkills),installed.skills);
 }
 const manifest=JSON.parse(await readFile(installed.manifest));for(const relative of ['scripts/manager-preview.mjs','lib/manager/snapshot.mjs','lib/manager/availability.mjs','lib/manager/decisions.mjs','lib/manager/repair-policy.mjs','docs/manager-preview.md','test/fixtures/manager-candidates.json','test/fixtures/manager-repairs.json'])assert.ok(manifest.sourceFiles['work-validator/'+relative]);
 const guide=await readFile(path.join(validator,'docs/manager-preview.md'),'utf8');for(const match of guide.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){if(/^(?:https?:|<)/.test(match[1]))continue;await readFile(path.resolve(path.dirname(path.join(validator,'docs/manager-preview.md')),match[1]));}
});

// Closure/encoding evidence only; instruction decisions are independently exercised.
test('reviewer sibling installation preserves complete folders and real formatter output from unrelated cwd',async t=>{
 const o=await fixture(t),first=await installCursorSkills(o,fakeInstall);
 for(const name of ['pigboard-pr-review','reviewer-jira','implementer-entrypoint']){
  async function compare(relative=''){
   for(const entry of await readdir(path.join(o.source,'skills',name,relative),{withFileTypes:true})){
    const sub=path.join(relative,entry.name);
    if(entry.isDirectory())await compare(sub);
    else assert.deepEqual(await readFile(path.join(first.skills,name,sub)),await readFile(path.join(o.source,'skills',name,sub)));
   }
  }
  await compare();
 }
 const guide=await readFile(path.join(first.skills,'work-validator/docs/handoffs.md'),'utf8');
 assert(guide.includes('[Installed reviewer](../../pigboard-pr-review/references/jira-handoff.md)'));
 assert.equal(await readFile(path.resolve(first.skills,'work-validator/docs/../../pigboard-pr-review/references/jira-handoff.md'),'utf8'),await readFile(path.join(o.source,'skills/pigboard-pr-review/references/jira-handoff.md'),'utf8'));
 const wrapper=await readFile(path.join(first.skills,'pigboard-pr-review/SKILL.md'),'utf8');
 assert(wrapper.includes('../reviewer-jira/SKILL.md'));
 for(const relative of ['implementer-entrypoint/SKILL.md','implementer-entrypoint/references/handoff.md']){
  const text=await readFile(path.join(first.skills,relative),'utf8');assert(text.includes('structured reviewer'));
 }
 const seeds=JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json',import.meta.url))).chains;
 const {extractHandoff,digestValue}=await import('../lib/contracts/handoff.mjs');
 const record=seeds.human.comment_pages.flatMap(p=>p.comments).map(c=>extractHandoff(c.body,{format:c.format}).value).find(r=>r.kind==='review');
 const input=path.join(o.app,'review.json'),summary=path.join(o.app,'summary.txt');
 await writeFile(input,JSON.stringify(record));await writeFile(summary,'Complete review <literal> & exact implementation.');
 for(const format of ['html','adf']){
  const args=['--input',input,'--summary',summary,'--format',format];
  const installed=execFileSync(process.execPath,[path.join(first.skills,'work-validator/scripts/prepare-handoff.mjs'),...args],{cwd:o.app,encoding:'utf8'});
  const source=execFileSync(process.execPath,[new URL('../scripts/prepare-handoff.mjs',import.meta.url).pathname,...args],{cwd:o.app,encoding:'utf8'});
  assert.equal(installed,source);assert.equal(JSON.parse(installed).record_digest,digestValue(record));
 }
 await assert.rejects(installCursorSkills(o,async dir=>{
  await fakeInstall(dir);
  if(path.basename(dir)==='work-validator')await writeFile(path.join(dir,'../reviewer-jira/SKILL.md'),'corrupted reviewer sibling');
 }),/hash mismatch/);verificationCheck();
 assert.equal(await realpath(first.stableSkills),first.skills);
 await rm(path.join(o.source,'skills/reviewer-jira'),{recursive:true});
 git(o.source,'add','.');git(o.source,'commit','-m','missing reviewer sibling');
 await assert.rejects(installCursorSkills(o,fakeInstall));verificationCheck();
 assert.equal(await realpath(first.stableSkills),first.skills);
});

test('installed structured QA composer/helpers/publisher retain full sibling closure and validate fixed packet outside source', async t => {
  // Dependency mocks here test installation only; the actual validator runtime is
  // copied above. Actual Bruno/PostgreSQL instruction execution is separate QA.
  const o=await fixture(t), installed=await installCursorSkills(o,fakeInstall);
  const {prepareFixture}=await import('./fixtures/qa-helper-case.mjs');
  const run=path.join(o.app,'fixed-helper-input');await prepareFixture(run);
  const common=path.join(installed.skills,'qa-api/references/structured-steps.md');
  assert.equal(await readFile(common,'utf8'),await readFile(new URL('../skills/qa-api/references/structured-steps.md',import.meta.url),'utf8'));
  // qa-jira's deliberate source/installed route pairs are exercised by the
  // standalone publisher installation test below; check its bytes here too.
  for(const name of ['qa-api','qa-bruno','qa-database','qa-ui','qa-entrypoint']){
    async function inspect(relative=''){
      for(const entry of await readdir(path.join(o.source,'skills',name,relative),{withFileTypes:true})){
        const file=path.join(relative,entry.name);if(entry.isDirectory()){await inspect(file);continue;}
        const source=await readFile(path.join(o.source,'skills',name,file)),target=path.join(installed.skills,name,file);
        assert.deepEqual(await readFile(target),source,`${name}/${file}`);
        if(!file.endsWith('.md'))continue;
        for(const match of source.toString().matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
          const [link]=match[1].split('#');if(!link||/^[a-z][a-z0-9+.-]*:/i.test(link))continue;
          const resolved=path.resolve(path.dirname(target),decodeURIComponent(link));assert(resolved.startsWith(installed.skills+path.sep));await readFile(resolved);
        }
      }
    }
    await inspect();
  }
  for(const guide of ['authoring.md','handoffs.md']){
    const fromCommon=path.resolve(path.dirname(common),'../../work-validator/docs',guide);
    assert.equal(await readFile(fromCommon,'utf8'),await readFile(new URL('../docs/'+guide,import.meta.url),'utf8'));
  }
  const args=['--mode','start','--input',path.join(run,'work.yaml'),'--context',path.join(run,'facts.yaml'),'--json'];
  const cli=path.join(installed.skills,'work-validator/scripts/validate-work.mjs');
  const actual=execFileSync(process.execPath,[cli,...args],{cwd:o.app,encoding:'utf8',timeout:30000});
  const source=execFileSync(process.execPath,[new URL('../scripts/validate-work.mjs',import.meta.url).pathname,...args],{cwd:o.app,encoding:'utf8',timeout:30000});
  assert.equal(actual,source);assert.equal(JSON.parse(actual).valid,true);
  assert.equal(installed.verification.entrypoints,22);assert.equal(installed.verification.dependencies,'verified');
  assert.deepEqual(installed.verification.smokeChecks,['pg.Client','bru --version','work-validator epic draft','work-validator ticket draft','handoff-validator admission record','config-validator project scope','manager-preview nonexecuting selection','manager-preview nonexecuting repair queue']);
  // Changed instruction bytes are copied exactly; neither this check nor the
  // dependency mocks establish actual Grok/helper/clock or publisher execution.
  for(const relative of ['qa-entrypoint/SKILL.md','qa-entrypoint/references/execution-record.md','qa-entrypoint/references/cursor.md','qa-jira/SKILL.md'])assert.deepEqual(await readFile(path.join(installed.skills,relative)),await readFile(path.join(o.source,'skills',relative)),relative);
  await assert.rejects(readFile(path.join(installed.skills,'test/fixtures/qa-helper-case.mjs')));verificationCheck();
});

// This existing installation fixture simulates QA-helper packages, while copying
// real locked validator dependencies. Genuine default installer acceptance is a
// separate candidate receipt; neither test establishes agent/provider behavior.
test('human rework folder/siblings survive installation and real canonical CLIs match source from an unrelated cwd',async t=>{
 const o=await fixture(t),first=await installCursorSkills(o,fakeInstall);
 const {packet}=await import('./fixtures/human-rework.mjs');
 const {extractHandoff}=await import('../lib/contracts/handoff.mjs');
 const {stringify}=await import('yaml');
 const {createHash}=await import('node:crypto');
 assert.equal(first.verification.entrypoints,22);
 const manifest=JSON.parse(await readFile(first.manifest,'utf8'));
 const actualManifest=Object.keys(manifest.sourceFiles);
 for(const name of ['request-rework','human-writing']) {
  async function compare(relative='') {
   for(const entry of await readdir(path.join(o.source,'skills',name,relative),{withFileTypes:true})) {
    const sub=path.join(relative,entry.name);
    if(entry.isDirectory())await compare(sub);
    else {
     const expected=await readFile(path.join(o.source,'skills',name,sub));
     assert.deepEqual(await readFile(path.join(first.skills,name,sub)),expected);
     const key=actualManifest.find(k=>k.endsWith(`${name}/${sub}`));assert(key,`${name}/${sub} manifest`);
     assert.equal(manifest.sourceFiles[key],createHash('sha256').update(expected).digest('hex'));
    }
   }
  }
  await compare();
 }
 const skill=await readFile(path.join(first.skills,'request-rework/SKILL.md'),'utf8');
 assert.equal(await readFile(path.resolve(first.skills,'request-rework/../human-writing/SKILL.md'),'utf8'),await readFile(path.join(o.source,'skills/human-writing/SKILL.md'),'utf8'));
 assert(skill.includes('../human-writing/SKILL.md'));
 const referencePath=path.join(first.skills,'request-rework/references/example.md'),example=await readFile(referencePath,'utf8');
 assert.equal(await readFile(path.resolve(path.dirname(referencePath),'../../human-writing/SKILL.md'),'utf8'),await readFile(path.join(o.source,'skills/human-writing/SKILL.md'),'utf8'));
 const route=[...example.matchAll(/^\| Canonical handoff \| \[Source handoff\]\(([^)]+)\) \| \[Installed handoff\]\(([^)]+)\) \|$/gm)];
 assert.equal(route.length,1);
 const sourceHelp=new URL('../skills/request-rework/references/'+route[0][1],import.meta.url);
 assert.equal(await readFile(path.resolve(path.dirname(referencePath),route[0][2]),'utf8'),await readFile(sourceHelp,'utf8'));
 const p=packet(),files={
  'record.yaml':stringify(p.record),'summary.txt':p.summary,
  'work.yaml':p.preflight.requirements[0].body,'facts.yaml':p.preflight.requirements[0].context_body,
  'preflight.json':JSON.stringify(p.preflight),'published.json':JSON.stringify(p.published)
 };
 for(const [name,text]of Object.entries(files))await writeFile(path.join(o.app,name),text);
 const cases=[
  ['validate-work.mjs',['--mode','start','--input',path.join(o.app,'work.yaml'),'--context',path.join(o.app,'facts.yaml'),'--json']],
  ['validate-handoff.mjs',['--mode','record','--input',path.join(o.app,'record.yaml'),'--format','yaml','--json']],
  ...['preflight','published'].map(name=>['validate-handoff.mjs',['--mode','chain','--input',path.join(o.app,name+'.json'),'--json']]),
  ...['html','adf'].map(format=>['prepare-handoff.mjs',['--input',path.join(o.app,'record.yaml'),'--summary',path.join(o.app,'summary.txt'),'--format',format]])
 ];
 for(const [script,args]of cases) {
  const run=cli=>execFileSync(process.execPath,[cli,...args],{cwd:o.app,encoding:'utf8',timeout:30000});
  const installed=run(path.join(first.skills,'work-validator/scripts',script));
  assert.equal(installed,run(new URL('../scripts/'+script,import.meta.url).pathname));
  const result=JSON.parse(installed);
  if(script==='prepare-handoff.mjs')assert.deepEqual(JSON.parse(JSON.stringify(extractHandoff(result.format==='html'?result.body:JSON.stringify(result.body),{format:result.format}).value)),p.record);
  else assert.equal(result.valid,true);
 }
 for(const [name,text]of Object.entries(files))assert.equal(await readFile(path.join(o.app,name),'utf8'),text);
 for(const relative of ['request-rework/SKILL.md','request-rework/references/example.md']) {
  await assert.rejects(installCursorSkills(o,async dir=>{
   await fakeInstall(dir);if(path.basename(dir)==='work-validator')await writeFile(path.join(dir,'..',relative),'changed new skill');
  }),/hash mismatch/);verificationCheck();
  assert.equal(await realpath(first.stableSkills),first.skills);
 }
});

// Literal ownership oracles use unchanged frozen snapshots; derived controls are local copies.
function ownershipCases(fixtures){
 const fresh=id=>structuredClone(fixtures.find(c=>c.id===id));
 const frozen=[{c:fresh('S30'),project:'100',owners:[['900',0],['901',2]],readable:true},{c:fresh('H03-B-conflict'),project:'200',owners:[['10900',7],['11901',9]],readable:true}];
 const cases=[...frozen];
 for(const id of ['S01','S02','S40','S18','H03-A-full'])cases.push({c:fresh(id),control:id});
 // Preserve the old contradictory facts as negatives; give each positive its own native child.
 for(const mode of ['paused','not-opted']){
  const wrong=fresh('S30');wrong.id=`second-${mode}-wrong-declaration`;if(mode==='paused')wrong.snapshot.issues[2].status_id='1';else wrong.snapshot.issues[2].labels=[];cases.push({c:wrong,control:'wrong-declaration',readable:true});
  const c=structuredClone(wrong);c.id=`second-${mode}-correct-parent`;const child=structuredClone(c.snapshot.issues[1]);child.id='1002';child.key='EX-3';child.parent_id='901';child.context_body=child.context_body.replaceAll('EX-2','EX-3');c.snapshot.issues.push(child);const ep=c.snapshot.issues[2],w=JSON.parse(ep.body),ctx=JSON.parse(ep.context_body);w.workstreams[0].story_order=['EX-3'];ctx.prerequisite_graph=ctx.prerequisite_graph.map(n=>n.ticket==='EX-2'?{...n,ticket:'EX-3'}:n);ep.body=JSON.stringify(w);ep.context_body=JSON.stringify(ctx);cases.push({c,control:'unique',readable:true});
 }
 const reordered=fresh('S30');reordered.id+='-reordered';reordered.snapshot.issues.reverse();cases.push({c:reordered,project:'100',owners:[['900',2],['901',0]],readable:true});
 const independent=fresh('S30'),other=fresh('S18');independent.id+='-independent';
 for(const i of other.snapshot.issues.filter(i=>['901','1002'].includes(i.id))){if(i.id==='901'){i.id='902';i.key='EX-92';i.context_body=i.context_body.replaceAll('EX-91','EX-92');}else{i.parent_id='902';i.status_id='1';}independent.snapshot.issues.push(i);}
 independent.snapshot.stream_checks.push(other.snapshot.stream_checks[1]);cases.push({c:independent,project:'100',owners:[['900',0],['901',2]],independent:true});
 const sentinel=fresh('S30');sentinel.id+='-sentinel';for(const i of sentinel.snapshot.issues.filter(i=>i.type_id==='21')){const w=JSON.parse(i.body),ctx=JSON.parse(i.context_body);w.problem_to_solve+=' PRIVATE_EPIC_NARRATIVE_SENTINEL';ctx.references.push('PRIVATE_EPIC_CONTEXT_SENTINEL');i.body=JSON.stringify(w);i.context_body=JSON.stringify(ctx);}cases.push({c:sentinel,project:'100',owners:[['900',0],['901',2]],readable:true});
 const invalid=fresh('S30');invalid.id+='-invalid-claimant';const invalidWork=JSON.parse(invalid.snapshot.issues[2].body);invalidWork.problem_to_solve=null;invalid.snapshot.issues[2].body=JSON.stringify(invalidWork);cases.push({c:invalid,project:'100',owners:[['900',0],['901',2]],invalid:true});
 cases.push({c:fresh('membership-retained-conflict'),control:'retained'});
 return cases;
}
const conflictMessage=id=>`Active opted-in Epic ID ${id} conflicts with another active opted-in Epic for this stream. Reconcile competing Epic ownership before choosing work.`;
function assertOwnershipResult(result,{c,project,owners,control,independent,invalid}){
 assert.equal(result.valid,true,c.id);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);
 const serialized=JSON.stringify(result);assert.ok(!serialized.includes('PRIVATE_EPIC_'),c.id);for(const i of c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!serialized.includes(JSON.stringify(raw)),c.id+' raw document');
 if(owners){
  const scope={site:c.snapshot.site,project_id:project,label:'stream-1'},s=result.streams.find(s=>s.scope.project_id===project&&s.scope.label==='stream-1');
  assert.deepEqual(s.scope,scope);assert.equal(s.decision,'hold');assert.equal(s.epic_id,null);assert.deepEqual(s.candidates,[]);assert.equal(s.selected_ticket_id,null);assert.equal(s.selected_key,null);
  const expected=owners.map(([id,index])=>({code:'OWNERSHIP_CONFLICT',path:`/issues/${index}/id`,message:conflictMessage(id)})).sort((a,b)=>a.path.localeCompare(b.path));
  assert.deepEqual(s.reasons.filter(r=>r.code==='OWNERSHIP_CONFLICT'),expected,c.id);
  assert.deepEqual(result.scope_diagnostics.filter(d=>d.code==='OWNERSHIP_CONFLICT'),expected.map(r=>({...r,scope})),c.id);
  for(const [id,index]of owners)assert.equal(c.snapshot.issues[index].id,id);
  assert.ok(!s.reasons.some(r=>['NO_OPT_IN','EPIC_PAUSED'].includes(r.code)));
  for(const field of ['occupied_ids','blocked_ids','human_review_ids'])assert.deepEqual(s[field],[]);
  assert.equal(s.counts_complete,true);assert.equal(s.return_count,1);
  if(project==='200'){const a=result.streams.find(s=>s.scope.project_id==='100');assert.equal(a.decision,'wait');assert.equal(a.epic_id,'900');assert.equal(a.return_count,6);assert.deepEqual(a.human_review_ids,['2000','2001','2002','2003','2004']);assert.ok(a.reasons.some(r=>r.code==='HUMAN_REVIEW_CAP'));assert.ok(!a.reasons.some(r=>r.code==='OWNERSHIP_CONFLICT'));}
  if(independent){const other=result.streams.find(s=>s.scope.label==='stream-2');assert.equal(result.status,'partial');assert.equal(other.decision,'select');assert.equal(other.epic_id,'902');assert.equal(other.selected_ticket_id,'1002');assert.ok(!other.reasons.some(r=>r.code==='OWNERSHIP_CONFLICT'));}
  if(invalid)assert.ok(s.reasons.some(r=>r.code==='INVALID_WORK'));
 }else{
  const conflicts=result.streams.flatMap(s=>s.reasons).filter(r=>r.code==='OWNERSHIP_CONFLICT');
  if(control==='retained'){assert.ok(conflicts.length);assert.ok(conflicts.every(r=>r.path==='/retained_members'&&r.message==='Reconcile competing Epic or retained ownership before choosing work.'));assert.ok(result.streams.every(s=>s.decision==='hold'));return;}
  assert.deepEqual(conflicts,[]);
  if(control==='wrong-declaration'){assertParentResult(result,{c});assert.ok(!result.streams[0].reasons.some(r=>['NO_OPT_IN','EPIC_PAUSED'].includes(r.code)));return;}
  if(control==='unique'||control==='S01'){const s=result.streams[0];assert.ok(!s.reasons.some(r=>r.code==='MEMBERSHIP_MISMATCH'));assert.deepEqual(s.scope,{site:c.snapshot.site,project_id:'100',label:'stream-1'});assert.equal(s.counts_complete,true);assert.equal(s.return_count,1);for(const field of ['occupied_ids','blocked_ids','human_review_ids'])assert.deepEqual(s[field],[]);assert.equal(s.epic_id,'900');assert.equal(s.decision,'select');assert.equal(s.selected_ticket_id,'1001');assert.ok(s.candidates.some(x=>x.ticket_id==='1001'&&x.eligible));}
  if(control==='S02'){assert.equal(result.streams[0].decision,'wait');assert.ok(result.streams[0].reasons.some(r=>r.code==='NO_OPT_IN'));}
  if(control==='S40'){assert.equal(result.streams[0].decision,'wait');assert.ok(result.streams[0].reasons.some(r=>r.code==='EPIC_PAUSED'));assert.ok(!result.streams[0].reasons.some(r=>r.code==='NO_OPT_IN'));}
  if(control==='S18')assert.deepEqual(result.streams.filter(s=>s.decision==='select').map(s=>s.selected_ticket_id),['1001']);
  if(control==='H03-A-full'){assert.equal(result.streams.find(s=>s.scope.project_id==='200').selected_ticket_id,'11001');assert.equal(result.streams.find(s=>s.scope.project_id==='100').return_count,6);}
 }
}
function assertOwnershipText(text,{c,owners,control}){
 if(control==='wrong-declaration')assertParentText(text);if(control==='unique')assert.ok(!text.includes('MEMBERSHIP_MISMATCH'));
 for(const [id,index]of owners??[])assert.ok(text.includes(`OWNERSHIP_CONFLICT /issues/${index}/id: ${conflictMessage(id)}`),c.id);
 assert.ok(!text.includes('PRIVATE_EPIC_'));assert.ok(!text.includes('OWNERSHIP_CONFLICT /issues:'));
 for(const i of c.snapshot.issues){if(i.body)assert.ok(!text.includes(i.body));if(i.context_body)assert.ok(!text.includes(i.context_body));}
}

function parentCases(fixtures){
 const fresh=id=>structuredClone(fixtures.find(c=>c.id===id)),cases=[];
 for(const id of ['declared-null-native-parent','declared-other-native-parent']){
  const c=fresh(id);cases.push({c,readable:true});
  for(const stage of ['9','10']){const c=fresh(id);c.id+='-'+stage;c.snapshot.issues[1].status_id=stage;cases.push({c});}
 }
 const alternative=fresh('declared-null-native-parent'),child=structuredClone(alternative.snapshot.issues[1]);alternative.id+='-valid-alternative';child.id='1002';child.key='EX-3';child.parent_id='900';child.context_body=child.context_body.replaceAll('EX-2','EX-3');alternative.snapshot.issues.push(child);const ep=alternative.snapshot.issues[0],w=JSON.parse(ep.body),ctx=JSON.parse(ep.context_body);w.workstreams[0].story_order.push('EX-3');ctx.prerequisite_graph.push({ticket:'EX-3',prerequisites:[]});ep.body=JSON.stringify(w);ep.context_body=JSON.stringify(ctx);cases.push({c:alternative,alternative:true});
 const independent=fresh('S18');independent.id='parent-mismatch-independent-stream';independent.snapshot.issues[3].status_id='1';independent.snapshot.issues[1].parent_id=null;cases.push({c:independent,otherStream:true});
 const project=fresh('H03-A-full');project.id='parent-mismatch-independent-project';project.snapshot.issues[1].parent_id=null;cases.push({c:project,otherProject:true});
 for(const id of ['S01','S04','S33','membership-safe-removal-9','membership-safe-removal-1','membership-safe-removal-10'])cases.push({c:fresh(id),valid:true,invalidWork:id==='S04'});
 return cases;
}
const parentMessage='Reconcile original and current project, parent, full label and Epic membership without dropping retained work.';
function assertParentResult(result,{c,valid,invalidWork,alternative,otherStream,otherProject}){
 assert.equal(result.valid,true,c.id);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);
 const s=result.streams.find(s=>s.scope.project_id==='100'&&s.scope.label==='stream-1');assert.deepEqual(s.scope,{site:c.snapshot.site,project_id:'100',label:'stream-1'});
 if(valid){assert.equal(s.selected_ticket_id,'1001');assert.equal(s.decision,'select');assert.ok(!result.scope_diagnostics.some(d=>d.code==='MEMBERSHIP_MISMATCH'&&d.path.endsWith('/parent_id')));if(invalidWork)assert.ok(s.candidates.some(c=>c.reasons.some(r=>r.code==='INVALID_WORK')));return;}
 const mismatch={code:'MEMBERSHIP_MISMATCH',path:'/issues/1/parent_id',message:parentMessage};
 assert.equal(s.decision,'hold');assert.equal(s.epic_id,'900');assert.equal(s.selected_ticket_id,null);assert.equal(s.selected_key,null);assert.ok(s.reasons.some(r=>JSON.stringify(r)===JSON.stringify(mismatch)),c.id);assert.ok(result.scope_diagnostics.some(d=>d.code===mismatch.code&&d.path===mismatch.path&&d.message===mismatch.message&&JSON.stringify(d.scope)===JSON.stringify(s.scope)),c.id);
 assert.deepEqual(s.occupied_ids,[]);assert.deepEqual(s.blocked_ids,[]);assert.equal(s.counts_complete,true);assert.deepEqual(s.human_review_ids,otherProject?['2000','2001','2002','2003','2004']:[]);assert.equal(s.return_count,otherProject?6:1);assert.ok(!s.reasons.some(r=>r.code==='INVALID_WORK'));
 if(alternative)assert.ok(s.candidates.some(c=>c.ticket_id==='1002'&&c.eligible));
 if(c.id.startsWith('declared-other-native-parent')){const other=result.streams.find(s=>s.scope.label==='stream-2');assert.equal(other.decision,'wait');assert.deepEqual(other.occupied_ids,['1002']);assert.equal(other.return_count,1);assert.ok(other.reasons.some(r=>r.code==='OCCUPIED'));assert.ok(!other.reasons.some(r=>r.path.endsWith('/parent_id')));}
 if(otherStream||otherProject){const other=result.streams.find(s=>otherProject?s.scope.project_id==='200':s.scope.label==='stream-2');assert.equal(result.status,'partial');assert.equal(other.decision,'select');assert.equal(other.selected_ticket_id,otherProject?'11001':'1002');assert.ok(!other.reasons.some(r=>r.code==='MEMBERSHIP_MISMATCH'));}
 const serialized=JSON.stringify(result);for(const i of c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!serialized.includes(JSON.stringify(raw)),c.id+' raw document');
}
function assertParentText(text){assert.ok(text.includes(`MEMBERSHIP_MISMATCH /issues/1/parent_id: ${parentMessage}`));}

// Real copied validator and manifest, simulated unrelated QA-helper packages.
// This checks release closure/parity, not default installer or provider acceptance.
test('installed receipt validator preserves incomplete QA outcomes and old input bytes from unrelated cwd', async t => {
 const o = await fixture(t), installed = await installCursorSkills(o, fakeInstall);
 const { preparePartialFixtures } = await import('./fixtures/qa-partial-results.mjs');
 const { createHash } = await import('node:crypto');
 const inputRoot = path.join(o.app, 'partial-inputs'), hashes = await preparePartialFixtures(inputRoot);
 const validator = path.join(installed.skills, 'work-validator'), manifest = JSON.parse(await readFile(installed.manifest));
 assert.equal(manifest.commit, installed.commit);
 for (const relative of ['contracts/handoff-v1.schema.json', 'lib/contracts/receipts.mjs', 'docs/handoffs.md']) {
  const key = 'work-validator/' + relative;
  assert.equal(manifest.sourceFiles[key], createHash('sha256').update(await readFile(new URL('../' + relative, import.meta.url))).digest('hex'));
  assert.deepEqual(await readFile(path.join(validator, relative)), await readFile(new URL('../' + relative, import.meta.url)));
 }
 assert(!Object.keys(manifest.sourceFiles).some(k => k.includes('qa-partial-results')));
 const { spawnSync } = await import('node:child_process');
 const { targetRecord } = await import('./fixtures/qa-partial-results.mjs');
 const validTransitive = new Set(['three', 'four', 'join', 'independent', 'ownership', 'binding', 'pass']);
 const invalidTransitive = { 'missing-middle': '/steps/2/finding_ids', 'missing-last': '/steps/3/finding_ids', 'unknown-last': '/steps/3/finding_ids', 'four-missing-last': '/steps/4/finding_ids', 'join-missing-F1': '/steps/4/finding_ids', 'join-missing-F2': '/steps/4/finding_ids' };
 let transitiveChains = 0, transitiveValid = 0, transitiveRecords = 0, proofChains = 0, proofValid = 0, proofRecords = 0;
 for (const [file, hash] of Object.entries(hashes)) {
  const mode = file.endsWith('.json') ? 'chain' : 'record', input = path.join(inputRoot, file);
  const args = ['--mode', mode, '--input', input, ...(mode === 'record' ? ['--format', 'yaml'] : []), '--json'];
  const run = cli => spawnSync(process.execPath, [cli, ...args], { cwd: o.app, encoding: 'utf8', timeout: 30000 });
  const source = run(new URL('../scripts/validate-handoff.mjs', import.meta.url).pathname), actual = run(path.join(validator, 'scripts/validate-handoff.mjs'));
  assert.equal(actual.status, source.status, file + actual.stderr); assert.equal(actual.stdout, source.stdout, file); assert.equal(actual.stderr, '', file);
  const result = JSON.parse(actual.stdout);
  const transitive = /^transitive-(repair|blocked|wait)-(.+)\.(json|yaml)$/.exec(file);
  const proof = file.startsWith('proof-') || file === 'human-static.json';
  if (proof) {
   const name = file.replace(/\.(json|yaml)$/, '');
   const expectedValid = mode === 'record' || /-exact-(pass|fail)$|-not-run$/.test(name) || name === 'human-static';
   assert.equal(source.status, expectedValid ? 0 : 1, file + source.stdout);
   assert.equal(actual.status, expectedValid ? 0 : 1, file + actual.stdout);
   assert.equal(result.valid, expectedValid, file + actual.stdout);
   assert.equal(result.completion_established, mode === 'chain' && name === 'human-static', file);
   if (mode === 'chain') {
    proofChains++;
    if (expectedValid) {
     proofValid++;
     const target = targetRecord(JSON.parse(await readFile(input, 'utf8')));
     assert.deepEqual(result.qa_report, target.payload.qa_report ?? target.payload.report, file);
     assert.deepEqual(result.human_pending, ['HQA-01'], file);
     if (name === 'human-static') { assert.equal(result.ai_steps, 0); assert.deepEqual(result.qa_report.steps, []); }
    } else {
     const base = '/comment_pages/0/comments/3/body/payload/';
     const [code, field] = name.endsWith('-real-null-environment') ? ['EVIDENCE', 'qa_report/environment'] : name.endsWith('-foreign-result') ? ['EVIDENCE', 'qa_report/steps/0/evidence/0'] : name.endsWith('-foreign-finding') ? ['EVIDENCE', 'findings/0/evidence/0'] : ['PR', 'pr'];
     assert(result.diagnostics.some(x => x.code === code && x.path === base + field), file + actual.stdout);
    }
    t.diagnostic(JSON.stringify({ file, input_sha256: hash, source: { status: source.status, output: JSON.parse(source.stdout) }, installed: { status: actual.status, output: result } }));
   } else proofRecords++;
  } else if (transitive) {
   const [, kind, variant] = transitive;
   const shapeInvalid = kind === 'repair' && ['empty', 'empty-array'].includes(variant);
   const expectedValid = mode === 'record' ? !shapeInvalid : validTransitive.has(variant) || (variant === 'empty' && kind !== 'repair');
   assert.equal(result.valid, expectedValid, file + actual.stdout);
   assert.equal(result.completion_established, false, file);
   if (mode === 'chain') {
    transitiveChains++;
    if (expectedValid) {
     transitiveValid++;
     const envelope = JSON.parse(await readFile(input, 'utf8')), target = targetRecord(envelope);
     assert.deepEqual(result.qa_report, target.payload.qa_report, file);
     assert.deepEqual(result.human_pending, target.payload.qa_report.human_pending, file);
     assert.deepEqual(result.human_pending, ['HQA-01'], file);
    } else {
     const suffix = invalidTransitive[variant], code = shapeInvalid ? 'STRUCTURE' : 'LEDGER';
     const expectedPath = '/comment_pages/0/comments/3/body/payload/' + (shapeInvalid ? 'findings' : 'qa_report' + suffix);
     assert(result.diagnostics.some(x => x.code === code && x.path === expectedPath), file + actual.stdout);
    }
   } else transitiveRecords++;
  } else if (['blocked-no-environment.json', 'blocked-retained-fail.json', 'wait-retained-fail.json', 'old-blocked.json', 'old-wait.json', 'human-static.json'].includes(file)) {
   assert.equal(result.valid, true, file); assert.equal(result.completion_established, file === 'human-static.json');
  } else if (mode === 'chain') { assert.equal(result.valid, false, file); assert.equal(result.completion_established, false); }
  assert.equal(createHash('sha256').update(await readFile(input)).digest('hex'), hash, file);
 }
 assert.equal(transitiveChains, 43); assert.equal(transitiveValid, 23); assert.equal(transitiveRecords, 43);
 assert.equal(proofChains, 19); assert.equal(proofValid, 7); assert.equal(proofRecords, 18);
 assert.equal(await realpath(installed.stableSkills), installed.skills);
});

// Full publisher closure and actual copied canonical CLIs. Helper-package mocks
// remain installation fixtures; this test is not instruction/provider acceptance.
test('standalone QA publisher ships exact folder and same-release contracts; source-only inputs stay outside installed payload',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall);
 const {prepareQaFixture}=await import('./fixtures/qa-helper-case.mjs');
 const {createHash}=await import('node:crypto');
 const {targetRecord}=await import('./fixtures/qa-partial-results.mjs');
 const {stringify}=await import('yaml');
 const manifest=JSON.parse(await readFile(installed.manifest,'utf8'));
 assert.equal(installed.verification.entrypoints,22);
 const relative='qa-jira/SKILL.md',publisher=path.join(installed.skills,relative),source=await readFile(new URL('../skills/'+relative,import.meta.url));
 assert.deepEqual(await readFile(publisher),source);assert.equal(manifest.sourceFiles[relative],createHash('sha256').update(source).digest('hex'));
 assert.deepEqual(await readdir(path.dirname(publisher)),['SKILL.md']);
 const guide=source.toString();
 const routes=[...guide.matchAll(/^\| [^|]+ \| \[Source [^\]]+\]\(([^)]+)\) \| \[Installed [^\]]+\]\(([^)]+)\) \|$/gm)];assert.equal(routes.length,3);
 for(const [,sourceLink,installedLink]of routes){const actual=path.resolve(path.dirname(publisher),installedLink),expected=new URL('../skills/qa-jira/'+sourceLink,import.meta.url);assert(actual.startsWith(installed.skills+path.sep));assert.deepEqual(await readFile(actual),await readFile(expected));}
 assert(!Object.keys(manifest.sourceFiles).some(k=>k.includes('qa-helper-case')||k.includes('qa-partial-results')));
 const p=await prepareQaFixture(path.join(o.app,'publisher-inputs')),validator=path.join(installed.skills,'work-validator');
 for(const id of ['H01-story','H01-bug','H02-defect','H02-defect-inability','H02-wait','H03-static','H03-resume']){
  const base=p.cases[id],input=path.join(base,'inputs'),full=path.join(base,'operator/validator-inputs/published.json'),record=targetRecord(JSON.parse(await readFile(full,'utf8'))),candidate=path.join(o.app,'candidate.yaml'),summary=path.join(o.app,'summary.txt');
  await writeFile(candidate,stringify(record));await writeFile(summary,'Prepared <QA> & preserved evidence.');
  const commands=[
   ['validate-work.mjs',['--mode','start','--input',path.join(input,'work.yaml'),'--context',path.join(input,'facts.yaml'),'--json']],
   ['validate-handoff.mjs',['--mode','record','--input',candidate,'--format','yaml','--json']],
   ['validate-handoff.mjs',['--mode','chain','--input',full,'--json']],
   ...['html','adf'].map(format=>['prepare-handoff.mjs',['--input',candidate,'--summary',summary,'--format',format]])
  ];
  for(const [script,args]of commands){const run=cli=>execFileSync(process.execPath,[cli,...args],{cwd:o.app,encoding:'utf8',timeout:30000}),actual=run(path.join(validator,'scripts',script));assert.equal(actual,run(new URL('../scripts/'+script,import.meta.url).pathname),id+script);const output=JSON.parse(actual);if(script!=='prepare-handoff.mjs')assert.equal(output.valid,true);}
 }
 for(const corrupt of [
  dir=>writeFile(path.join(dir,'../qa-jira/SKILL.md'),'corrupted publisher'),
  dir=>rm(path.join(dir,'scripts/prepare-handoff.mjs')),
  dir=>writeFile(path.join(dir,'docs/configuration.md'),'corrupted scope guide'),
 ]){
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await corrupt(dir);}));verificationCheck();
  assert.equal(await realpath(installed.stableSkills),installed.skills);
 }
 await rm(path.join(o.source,'skills/qa-jira'),{recursive:true});git(o.source,'add','.');git(o.source,'commit','-m','missing publisher fixture');await assert.rejects(installCursorSkills(o,fakeInstall));verificationCheck();assert.equal(await realpath(installed.stableSkills),installed.skills);
});

// These local copies preserve the eight sealed triage inputs, including raw packet bytes.
function obligationCases(fixtures){
 const fresh=id=>structuredClone(fixtures.find(c=>c.id===id));
 const base=fresh('S18');base.snapshot.issues[2].body="{\"schema\": \"pigboard-epic/v1\", \"problem_to_solve\": \"Choose complete work.\", \"outcome\": \"One usable proposal.\", \"scope\": {\"included\": [\"Offline preview.\"], \"excluded\": [\"Execution.\"]}, \"workstreams\": [{\"label\": \"stream-3\", \"story_order\": [\"EX-3\"]}], \"accepted_decisions\": [], \"open_questions\": []}";
 for(const i of base.snapshot.issues.filter(i=>['901','1002'].includes(i.id)))i.labels=i.labels.map(l=>l==='stream-2'?'stream-3':l);
 base.snapshot.issues[3].status_id='1';base.snapshot.stream_checks[1].label='stream-3';
 const cases=[],add=(id,c,decision,selected,reason=null,path='',extra={})=>{c.id='obligation-'+id;const spec={id,c,decision,selected,reason,path,...extra};cases.push(spec);return spec;};
 for(const [id,mode]of [['P1','wrong-label'],['P2','wrong-project'],['P3','correct-scope'],['P4','no-intent']]){
  const c=structuredClone(base);let claimed=null;
  if(mode!=='no-intent'){claimed=mode==='wrong-project'?['200','stream-1']:['100',mode==='wrong-label'?'stream-2':'stream-1'];c.snapshot.pending_intents=[{project_id:claimed[0],label:claimed[1],ticket_id:'1001',attempt_id:'intent-'+(mode==='correct-scope'?'correct':mode)}];}
  if(mode==='wrong-label')c.snapshot.stream_checks.push({...c.snapshot.stream_checks[0],label:'stream-2'});
  if(mode==='wrong-project'){const h=fresh('H03-A-full');c.config=h.config;c.snapshot.projects=h.snapshot.projects;c.snapshot.issues.push(...h.snapshot.issues.filter(i=>i.project_id==='200'));c.snapshot.stream_checks.push(...h.snapshot.stream_checks.filter(s=>s.project_id==='200'));}
  add(id,c,claimed?'hold':'select',claimed?null:'1001',claimed?'PENDING_INTENT':null,'/pending_intents',{claimed,seal:['pending-intent',mode],readable:['P1','P2'].includes(id)});
 }
 const reference={ticket_id:'1001',comment_id:'2023',record_id:'00000000-0000-4000-8000-000000000023',digest:'sha256:'+'1'.repeat(64)};
 for(const [id,mode,wrong,native]of [['R1','wrong-label',true,false],['R2','correct-scope-unbound-native-reference',false,false],['R3','wrong-label-native-reference-present',true,true],['R4','correct-scope-native-reference-present',false,true]]){
  const c=structuredClone(base),claimed=['100',wrong?'stream-2':'stream-1'];c.snapshot.required_repairs=[{project_id:'100',label:claimed[1],ticket_id:'1001',reason:'required_request',references:[structuredClone(reference)]}];if(native)c.snapshot.issues[1].required_requests=[structuredClone(reference)];if(wrong)c.snapshot.stream_checks.push({...c.snapshot.stream_checks[0],label:'stream-2'});
  add(id,c,wrong?'hold':'wait',null,wrong?'MEMBERSHIP_MISMATCH':'LINEAGE_REQUIRED','/required_repairs/0',{claimed,seal:['required-repair-scope',mode],readable:wrong});
 }
 const proof=fresh('repair-independent-complete'),target=proof.snapshot.issues.find(i=>i.id==='1000');proof.snapshot.required_repairs=[{project_id:'100',label:'stream-1',ticket_id:'1000',reason:'required_request',references:structuredClone(target.required_requests)}];proof.snapshot.issues.push(...structuredClone(base.snapshot.issues.filter(i=>['901','1002'].includes(i.id))));proof.snapshot.stream_checks.push(structuredClone(base.snapshot.stream_checks[1]));add('R5',proof,'select','1100','REPAIR_ACCOUNTED_FOR','/issues/2',{accounted:true});
 for(const [id,kind,native]of [['B1','pending',false],['B2-absent','repair',false],['B2-present','repair',true],['B3','none',false]]){
  const c=structuredClone(base),child=c.snapshot.issues[1],alternative=structuredClone(child);child.labels=[];alternative.id='1003';alternative.key='EX-4';alternative.context_body=alternative.context_body.replaceAll('EX-2','EX-4');c.snapshot.issues.push(alternative);const ep=c.snapshot.issues[0],w=JSON.parse(ep.body),ctx=JSON.parse(ep.context_body);w.workstreams[0].story_order=['EX-4'];ctx.prerequisite_graph=ctx.prerequisite_graph.map(n=>n.ticket==='EX-2'?{...n,ticket:'EX-4'}:n);ep.body=JSON.stringify(w);ep.context_body=JSON.stringify(ctx);
  if(kind==='pending')c.snapshot.pending_intents=[{project_id:'100',label:'stream-2',ticket_id:'1001',attempt_id:'unpublished-intent'}];
  if(kind==='repair'){c.snapshot.required_repairs=[{project_id:'100',label:'stream-2',ticket_id:'1001',reason:'required_request',references:[structuredClone(reference)]}];if(native)child.required_requests=[structuredClone(reference)];}
  if(kind!=='none')c.snapshot.stream_checks.push({...c.snapshot.stream_checks[0],label:'stream-2'});
  add(id,c,kind==='none'?'select':'hold',kind==='none'?'1003':null,kind==='pending'?'PENDING_INTENT':kind==='repair'?'MEMBERSHIP_MISMATCH':null,kind==='pending'?'/pending_intents':kind==='repair'?'/required_repairs/0':'',{claimed:kind==='none'?null:['100','stream-2'],removal:true});
 }
 // Isolate the native-request guard: no intent, side row or orphan claimed check.
 const nativeOnly=structuredClone(cases.find(s=>s.id==='B3').c);nativeOnly.snapshot.issues[1].required_requests=[structuredClone(reference)];add('B4',nativeOnly,'hold',null,'MEMBERSHIP_MISMATCH','/issues/1',{claimed:null,removal:true,nativeOnly:true,readable:true});
 return cases;
}
function assertObligationResult(result,spec){
 const {c,decision,selected,reason,path,claimed,accounted,removal,nativeOnly}=spec;
 assert.equal(result.valid,true,'HARNESS_INVALID_SNAPSHOT '+c.id+' '+JSON.stringify(result.scope_diagnostics));assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);
 const find=([project_id,label])=>result.streams.find(s=>s.scope.project_id===project_id&&s.scope.label===label),native=find(['100','stream-1']),independent=find(['100','stream-3']);
 assert.deepEqual(native.scope,{site:c.snapshot.site,project_id:'100',label:'stream-1'});assert.equal(native.decision,decision,c.id);assert.equal(native.selected_ticket_id,selected,c.id);assert.equal(native.selected_key,selected==='1001'?'EX-2':selected==='1003'?'EX-4':selected==='1100'?'EX-20':null,c.id);
 const has=(s,code,path)=>s.reasons.some(r=>r.code===code&&r.path===path);
 if(reason)assert.ok(has(native,reason,path),c.id+' native '+reason+' '+path);
 if(claimed){const target=find(claimed);assert.equal(target.decision,decision==='wait'?'wait':'hold',c.id+' claimed');assert.equal(target.selected_ticket_id,null);assert.deepEqual(target.scope,{site:c.snapshot.site,project_id:claimed[0],label:claimed[1]});if(reason==='PENDING_INTENT')assert.ok(has(target,'PENDING_INTENT','/pending_intents'));if(reason==='MEMBERSHIP_MISMATCH')for(const s of [native,target]){assert.ok(has(s,reason,path));assert.ok(result.scope_diagnostics.some(d=>d.code===reason&&d.path===path&&JSON.stringify(d.scope)===JSON.stringify(s.scope)));}}
 if(decision==='wait'||accounted)assert.ok(!result.scope_diagnostics.some(d=>d.code==='MEMBERSHIP_MISMATCH'&&d.path.startsWith('/required_repairs/')),c.id);
 assert.deepEqual(independent.scope,{site:c.snapshot.site,project_id:'100',label:'stream-3'});assert.equal(independent.decision,'select');assert.equal(independent.selected_ticket_id,'1002');assert.deepEqual(independent.reasons,[]);
 for(const s of result.streams){assert.equal(s.counts_complete,true,c.id);assert.deepEqual(s.occupied_ids,[]);assert.deepEqual(s.blocked_ids,[]);assert.deepEqual(s.human_review_ids,accounted&&s===native?['1000']:[]);assert.equal(s.return_count,accounted&&s===native?2:1,c.id);}
 if(removal)assert.ok(native.candidates.some(c=>c.ticket_id==='1003'&&c.eligible));
 if(removal&&decision==='select'){assert.ok(!native.reasons.some(r=>r.code==='MEMBERSHIP_MISMATCH'));assert.ok(!native.candidates.some(c=>c.ticket_id==='1001'));}
 if(nativeOnly){assert.deepEqual(c.snapshot.pending_intents,[]);assert.deepEqual(c.snapshot.required_repairs,[]);assert.equal(c.snapshot.issues[1].required_requests.length,1);assert.ok(has(native,'LINEAGE_REQUIRED','/issues/1/required_requests'));assert.deepEqual(result.streams.map(s=>s.scope),[native.scope,independent.scope]);assert.ok(result.scope_diagnostics.some(d=>d.code==='MEMBERSHIP_MISMATCH'&&d.path==='/issues/1'&&JSON.stringify(d.scope)===JSON.stringify(native.scope)));assert.ok(!result.scope_diagnostics.some(d=>d.path.startsWith('/required_repairs/')||d.path==='/pending_intents'));}
 assert.equal(result.status,decision==='hold'?'partial':'complete');
 const serialized=JSON.stringify(result);for(const i of c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!serialized.includes(JSON.stringify(raw)),c.id+' raw document');
}
function assertObligationText(text,spec){
 assert.ok(text.includes(`${spec.reason} ${spec.path}:`),spec.c.id);assert.ok(text.includes('selected EX-3.'),spec.c.id);assert.ok(!text.includes('selected EX-2.'),spec.c.id);for(const i of spec.c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!text.includes(raw));
}

// Target the native-only removal guard without rerunning the complete installed matrix.
test('installed B4 native-request removal stays held without a side row',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator'),cases=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-candidates.json'))).cases,spec=obligationCases(cases).find(s=>s.id==='B4');
 const config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[path.join(validator,'scripts/manager-preview.mjs'),'--config',config,'--input',input];
 for(const json of [false,true]){const invoke=()=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000}),p=invoke();assert.equal(p.status,1);assert.equal(p.stderr,'');assert.equal(invoke().stdout,p.stdout);if(json)assertObligationResult(JSON.parse(p.stdout),spec);else assertObligationText(p.stdout,spec);}
 assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);assert.deepEqual((await readdir(o.app)).sort(),['config.json','snapshot.json']);
});

// Portable copies of sealed prerequisite/native facts; outer side rows are separate assertions.
function prerequisitePathCases(fixtures){
 const fresh=id=>structuredClone(fixtures.find(c=>c.id===id)),raw={"ownerBody":"{\"schema\": \"pigboard-epic/v1\", \"problem_to_solve\": \"Choose complete work.\", \"outcome\": \"One usable proposal.\", \"scope\": {\"included\": [\"Offline preview.\"], \"excluded\": [\"Execution.\"]}, \"workstreams\": [{\"label\": \"stream-1\", \"story_order\": [\"EX-1\"]}], \"accepted_decisions\": [], \"open_questions\": []}","dependentBody":"{\"schema\": \"pigboard-epic/v1\", \"problem_to_solve\": \"Choose complete work.\", \"outcome\": \"One usable proposal.\", \"scope\": {\"included\": [\"Offline preview.\"], \"excluded\": [\"Execution.\"]}, \"workstreams\": [{\"label\": \"stream-2\", \"story_order\": [\"EX-20\"]}], \"accepted_decisions\": [], \"open_questions\": []}","dependentContext":"{\"schema\": \"pigboard-work-validation-context/v1\", \"subject_key\": \"EX-91\", \"repositories\": [{\"url\": \"https://example.invalid/example/application\", \"base_branches\": [\"main\"]}], \"allowed_skills\": [], \"configured_targets\": [\"local-review\"], \"references\": [], \"prerequisite_graph\": [{\"ticket\": \"EX-91\", \"prerequisites\": []}, {\"ticket\": \"EX-1\", \"prerequisites\": []}, {\"ticket\": \"EX-20\", \"prerequisites\": [\"EX-1\"]}], \"related_changes\": [], \"operations\": []}","independentBody":"{\"schema\": \"pigboard-epic/v1\", \"problem_to_solve\": \"Choose complete work.\", \"outcome\": \"One usable proposal.\", \"scope\": {\"included\": [\"Offline preview.\"], \"excluded\": [\"Execution.\"]}, \"workstreams\": [{\"label\": \"stream-3\", \"story_order\": [\"EX-30\"]}], \"accepted_decisions\": [], \"open_questions\": []}","independentContext":"{\"schema\": \"pigboard-work-validation-context/v1\", \"subject_key\": \"EX-92\", \"repositories\": [{\"url\": \"https://example.invalid/example/application\", \"base_branches\": [\"main\"]}], \"allowed_skills\": [], \"configured_targets\": [\"local-review\"], \"references\": [], \"prerequisite_graph\": [{\"ticket\": \"EX-92\", \"prerequisites\": []}, {\"ticket\": \"EX-30\", \"prerequisites\": []}], \"related_changes\": [], \"operations\": []}"},base=fresh('repair-prerequisite-complete');
 base.snapshot.issues[0].body=raw.ownerBody;base.snapshot.issues[1].parent_id='901';base.snapshot.issues[1].labels=['stream-2'];
 for(const [id,key,body,context_body]of [['901','EX-91',raw.dependentBody,raw.dependentContext],['902','EX-92',raw.independentBody,raw.independentContext]])base.snapshot.issues.push({...structuredClone(base.snapshot.issues[0]),id,key,body,context_body});
 const independent=structuredClone(fresh('S01').snapshot.issues[1]);Object.assign(independent,{id:'1200',key:'EX-30',parent_id:'902',labels:['stream-3']});independent.context_body=independent.context_body.replaceAll('EX-2','EX-30');base.snapshot.issues.push(independent);
 base.snapshot.stream_checks=['stream-1','stream-2','stream-3'].map(label=>({...structuredClone(base.snapshot.stream_checks[0]),label}));
 const unproved={ticket_id:'1000',comment_id:'9876',record_id:'40000000-0000-4000-8000-000000009876',digest:'sha256:'+'4'.repeat(64)},native=base.snapshot.issues[2],row=references=>({project_id:'100',label:'stream-1',ticket_id:'1000',reason:'required_request',references:structuredClone(references)}),cases=[];
 const add=(id,c,extra={})=>{c.id='prerequisite-path-'+id;const spec={id,c,...extra};cases.push(spec);return spec;};
 const q1=structuredClone(base);q1.snapshot.required_repairs=[row([unproved])];add('Q1',q1,{qualified:false,own:'wait',readable:true,strictProof:true,seal:['prerequisite','new-unaccounted-repair']});
 const q2=structuredClone(base);q2.snapshot.required_repairs=[row(native.required_requests)];add('Q2',q2,{qualified:true,own:'wait',accounted:true,seal:['prerequisite','existing-accounted-repair']});
 add('Q3',structuredClone(base),{qualified:true,own:'wait',accounted:true,seal:['prerequisite','no-new-advertised-repair']});
 const q4=structuredClone(q2);q4.snapshot.completion_receipts=[];add('Q4',q4,{qualified:false,own:'wait'});
 for(const project of [false,true]){const c=structuredClone(q1),claimed={project_id:project?'200':'100',label:'stream-4'};Object.assign(c.snapshot.required_repairs[0],claimed);if(project){c.config=fresh('H03-A-full').config;c.snapshot.projects.push({project_id:'200',complete:true});}c.snapshot.stream_checks.push({...claimed,known_ids_complete:true,repair_inventory_complete:true});add(project?'Q5-project':'Q5-label',c,{qualified:false,own:'hold',claimed});}
 for(const reverse of [false,true]){const c=structuredClone(q1);c.snapshot.required_repairs=[row(native.required_requests),row([unproved])];if(reverse)c.snapshot.required_repairs.reverse();add(reverse?'Q6-unaccounted-first':'Q6-accounted-first',c,{qualified:false,own:'wait',orderControl:true});}
 const q7=structuredClone(q2);q7.snapshot.issues=q7.snapshot.issues.filter(i=>i.id!=='1000');add('Q7',q7,{qualified:false,own:'hold',missingNative:true});
 add('Q8',fresh('S06'),{ordinary:true});
 const reference=structuredClone(native.required_requests[0]);
 for(const [field,missingId,controlId]of [['retained_members','D1','D4'],['pending_intents','D2','D5'],['required_repairs','D3','D6']])for(const missing of [true,false]){
  const c=fresh('S01'),known={project_id:'100',label:'stream-1',ticket_id:'1001',...(field==='retained_members'?{epic_id:'900',assignment:null}:field==='pending_intents'?{attempt_id:'triage-known-intent'}:{reason:'required_request',references:[structuredClone(reference)]})};c.snapshot[field]=[known];if(missing)c.snapshot[field].push({...structuredClone(known),ticket_id:'999999'});add(missing?missingId:controlId,c,{field,missing,readable:missing,seal:['diagnostic',field+'-'+(missing?'missing':'known-control')]});
 }
 return cases;
}
const lineageRecovery='Supply authenticated repair history for this queued ticket or required request before choosing work.';
const q6Unproved={ticket_id:'1000',comment_id:'9876',record_id:'40000000-0000-4000-8000-000000009876',digest:'sha256:'+'4'.repeat(64)};
function q6Descriptor(spec){
 const index=({'Q6-accounted-first':1,'Q6-unaccounted-first':0})[spec.id];assert.notEqual(index,undefined);const rows=spec.c.snapshot.required_repairs,native=spec.c.snapshot.issues.find(i=>i.id==='1000');assert.equal(rows.length,2);assert.deepEqual(rows[index].references,[q6Unproved]);assert.equal(rows[index].ticket_id,'1000');assert.deepEqual(rows[1-index].references,native.required_requests);assert.equal(rows.filter(r=>r.references.some(v=>JSON.stringify(v)===JSON.stringify(q6Unproved))).length,1);return {id:spec.id,index,path:'/required_repairs/'+index};
}
function assertQ6PairInputs(a,b){
 const da=q6Descriptor(a),db=q6Descriptor(b);assert.deepEqual([da.id,db.id].sort(),['Q6-accounted-first','Q6-unaccounted-first']);assert.deepEqual(a.c.config,b.c.config);assert.deepEqual(a.c.options,b.c.options);const other=structuredClone(b.c.snapshot);other.required_repairs.reverse();assert.deepEqual(a.c.snapshot,other);
}
function comparableQ6(result,spec){
 const d=q6Descriptor(spec);assert.match(result.snapshot_digest,/^sha256:[0-9a-f]{64}$/);const copy=structuredClone(result),natives=copy.streams.filter(s=>s.scope.project_id==='100'&&s.scope.label==='stream-1');assert.equal(natives.length,1);const s=natives[0];assert.equal(s.decision,'wait');assert.equal(s.selected_ticket_id,null);assert.equal(s.selected_key,null);assert.equal(s.proposal,null);
 const rs=s.reasons.filter(r=>r.code==='LINEAGE_REQUIRED');assert.equal(rs.length,1);assert.deepEqual(rs[0],{code:'LINEAGE_REQUIRED',path:d.path,message:lineageRecovery});assert.deepEqual(spec.c.snapshot.required_repairs[d.index].references,[q6Unproved]);
 const rows=s.repair_order.filter(r=>r.ticket_id==='1000');assert.ok(rows.length<=1);const mirrors=rows.flatMap(r=>r.reasons.map((reason,index)=>({reason,index})).filter(v=>v.reason.code==='LINEAGE_REQUIRED'));assert.ok(mirrors.length<=1);if(mirrors.length){assert.deepEqual(mirrors[0].reason,{code:'LINEAGE_REQUIRED',path:d.path,message:lineageRecovery});mirrors[0].reason.path='UNPROVED-1000-9876-40000000-0000-4000-8000-000000009876';}
 rs[0].path='UNPROVED-1000-9876-40000000-0000-4000-8000-000000009876';
 const independent=copy.streams.find(s=>s.scope.project_id==='100'&&s.scope.label==='stream-3');assert.deepEqual(independent.proposal,{kind:'admit_new',ticket_id:'1200',scope:independent.scope,from_stage:'Ready to Work',to_stage:'In Progress',from_status_id:'1',to_status_id:'2',existing_assignment:null,existing_pr:null,request_refs:[],roots:[],required_parent:null,child_completion:null,required_stack_updates:[],publication_required:false,execution_authorized:false});copy.snapshot_digest=null;return {copy,mirror:mirrors.map(v=>v.index)};
}
function assertQ6Pair(a,sa,b,sb){assertQ6PairInputs(sa,sb);assert.notEqual(a.snapshot_digest,b.snapshot_digest);const ca=comparableQ6(a,sa),cb=comparableQ6(b,sb);assert.deepEqual(ca.mirror,cb.mirror);assert.deepEqual(ca.copy,cb.copy);}

const prerequisiteRecovery='Obtain coherent current canonical AI-QA completion and resolve required repairs for every prerequisite.';
function assertPrerequisitePathResult(result,spec){
 const {c,id,field,missing,qualified,own,claimed,missingNative,ordinary,accounted}=spec;
 assert.equal(result.valid,true,'HARNESS_INVALID_SNAPSHOT '+id+' '+JSON.stringify(result.scope_diagnostics));const serialized=JSON.stringify(result);for(const i of c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!serialized.includes(JSON.stringify(raw)),id+' raw document');assert.equal(result.validation_scope,'supplied_snapshot');assert.equal(result.live_freshness,'not_evaluated');assert.equal(result.permission,'not_evaluated');assert.equal(result.execution_authorized,false);assert.equal(result.writes,0);
 const get=(label,project_id='100')=>result.streams.find(s=>s.scope.project_id===project_id&&s.scope.label===label),has=(s,code,path)=>s.reasons.some(r=>r.code===code&&(path===undefined||r.path===path)),native=get('stream-1');assert.deepEqual(native.scope,{site:c.snapshot.site,project_id:'100',label:'stream-1'});
 if(field){const path='/'+field+'/1',diagnostics=result.scope_diagnostics.filter(d=>d.code==='MISSING_KNOWN_ID'),decision=missing||field==='pending_intents'?'hold':field==='required_repairs'?'wait':'select';assert.equal(result.streams.length,1);assert.equal(native.decision,decision);assert.equal(native.selected_ticket_id,decision==='select'?'1001':null);assert.equal(native.selected_key,decision==='select'?'EX-2':null);assert.equal(native.counts_complete,!missing);assert.equal(native.return_count,missing?null:1);for(const key of ['occupied_ids','blocked_ids','human_review_ids'])assert.deepEqual(native[key],[]);if(missing){assert.equal(diagnostics.length,1);assert.equal(diagnostics[0].path,path);assert.deepEqual(diagnostics[0].scope,native.scope);assert.ok(has(native,'MISSING_KNOWN_ID',path));assert.ok(!has(native,'MISSING_KNOWN_ID','/retained_members'));}else assert.deepEqual(diagnostics,[]);if(field==='pending_intents')assert.ok(has(native,'PENDING_INTENT','/pending_intents'));if(field==='required_repairs')assert.ok(has(native,'LINEAGE_REQUIRED','/required_repairs/0'));assert.equal(result.status,decision==='hold'?'held':'complete');return;}
 if(ordinary){assert.equal(result.streams.length,1);assert.equal(native.decision,'select');assert.equal(native.selected_ticket_id,'1100');assert.equal(native.counts_complete,true);assert.deepEqual(native.human_review_ids,['1000']);assert.equal(native.return_count,2);assert.equal(result.status,'complete');return;}
 const dependent=get('stream-2'),independent=get('stream-3');assert.equal(native.decision,own);assert.equal(native.selected_ticket_id,null);assert.equal(dependent.decision,missingNative?'hold':qualified?'select':'wait');assert.equal(dependent.selected_ticket_id,qualified?'1100':null);assert.equal(dependent.selected_key,qualified?'EX-20':null);const candidate=dependent.candidates.find(c=>c.ticket_id==='1100');assert.ok(candidate);assert.equal(candidate.eligible,qualified);if(!qualified){assert.ok(candidate.reasons.some(r=>r.code==='PREREQUISITE_UNSATISFIED'&&r.path==='/issues/1'));if(id==='Q1')assert.ok(candidate.reasons.some(r=>r.message===prerequisiteRecovery));}else assert.deepEqual(candidate.reasons,[]);
 assert.deepEqual(independent.scope,{site:c.snapshot.site,project_id:'100',label:'stream-3'});assert.equal(independent.decision,'select');assert.equal(independent.selected_ticket_id,'1200');assert.deepEqual(independent.reasons,[]);
 if(!missingNative){const repairPath=id==='Q4'?'/issues/2/required_requests':id==='Q6-accounted-first'?'/required_repairs/1':'/required_repairs/0';assert.ok(has(native,accounted?'REPAIR_ACCOUNTED_FOR':'LINEAGE_REQUIRED',accounted?'/issues/2':repairPath));if(accounted){assert.ok(!has(native,'LINEAGE_REQUIRED'));assert.ok(!has(native,'REPAIR_PROOF_INVALID'));}}else{assert.ok(has(native,'MISSING_KNOWN_ID'));assert.ok(has(dependent,'MISSING_KNOWN_ID'));}
 for(const s of result.streams){const unknown=missingNative&&s!==independent,human=!missingNative&&(s===native||claimed&&s.scope.project_id===claimed.project_id&&s.scope.label===claimed.label);assert.equal(s.counts_complete,!unknown);assert.deepEqual(s.occupied_ids,[]);assert.deepEqual(s.blocked_ids,[]);assert.deepEqual(s.human_review_ids,human?['1000']:[]);assert.equal(s.return_count,unknown?null:human?2:1);}
 if(claimed){const s=get(claimed.label,claimed.project_id);assert.equal(s.decision,'hold');assert.equal(s.selected_ticket_id,null);assert.ok(has(s,'MEMBERSHIP_MISMATCH','/required_repairs/0'));assert.ok(has(native,'MEMBERSHIP_MISMATCH','/required_repairs/0'));}
 assert.equal(result.status,claimed||missingNative?'partial':'complete');
}
function assertPrerequisitePathText(text,spec){
 if(spec.field){assert.ok(text.includes(`MISSING_KNOWN_ID /${spec.field}/1:`));assert.ok(!text.includes('MISSING_KNOWN_ID /retained_members:'));}
 else{assert.ok(text.includes(`PREREQUISITE_UNSATISFIED /issues/1: ${prerequisiteRecovery}`));assert.ok(text.includes(`LINEAGE_REQUIRED /required_repairs/0: ${lineageRecovery}`));assert.ok(text.includes('selected EX-30.'));assert.ok(!text.includes('selected EX-20.'));}
 for(const i of spec.c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!text.includes(raw));
}

// PGB-113 source fixtures stay source-only; installed validation receives absolute
// envelope paths and executes the actual copied module with real dependencies.
test('installed repeated-parent chain matrix and layered work bounds preserve exact source behavior',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator'),{createHash}=await import('node:crypto'),{pathToFileURL}=await import('node:url');
 const digest=bytes=>createHash('sha256').update(bytes).digest('hex'),modulePath=path.join(validator,'lib/contracts/receipts.mjs'),moduleURL=pathToFileURL(modulePath).href,sourceBytes=await readFile(new URL('../lib/contracts/receipts.mjs',import.meta.url));
 assert.equal(digest(await readFile(modulePath)),digest(sourceBytes));const manifest=JSON.parse(await readFile(installed.manifest));assert.equal(manifest.sourceFiles['work-validator/lib/contracts/receipts.mjs'],digest(sourceBytes));assert(!Object.keys(manifest.sourceFiles).some(k=>k.includes('handoff-chains')));
 const F=JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json',import.meta.url))).repeated_parent,inputRoot=path.join(o.app,'repeated-inputs');await mkdir(inputRoot);
 const check=(r,expected,input,name)=>{assert.equal(r.valid,expected.valid,name+JSON.stringify(r.diagnostics));assert.equal(r.completion_established,expected.completion_established,name);assert.equal(r.validation_scope,'supplied_receipts');assert.equal(r.live_freshness,'not_evaluated');if(expected.diagnostic)assert(r.diagnostics.some(d=>d.code===expected.diagnostic.code&&(!expected.diagnostic.path||d.path===expected.diagnostic.path)),name+JSON.stringify(r.diagnostics));if(expected.valid){assert.deepEqual(r.validated_leaf,input.target);if(expected.validated_leaf)assert.deepEqual(r.validated_leaf,expected.validated_leaf);if(expected.qa_report)assert.deepEqual(JSON.parse(JSON.stringify(r.qa_report)),expected.qa_report,name);if(expected.human_pending)assert.deepEqual(r.human_pending,expected.human_pending);}};
 assert.equal(Object.keys(F.inputs).length,35);assert.equal(Object.keys(F.inputs).filter(name=>name.startsWith('F1-')).length,10);
 for(const[name,input]of Object.entries(F.inputs)){const raw=JSON.stringify(input),file=path.join(inputRoot,name+'.json');await writeFile(file,raw);const before=digest(await readFile(file));for(const json of [false,true]){const p=spawnSync(process.execPath,[path.join(validator,'scripts/validate-handoff.mjs'),'--mode','chain','--input',file,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:30000});assert.equal(p.status,F.expected[name].valid?0:1,name+p.stderr);assert.equal(p.stderr,'');if(json)check(JSON.parse(p.stdout),F.expected[name],input,name);else{assert(p.stdout.startsWith((F.expected[name].valid?'Valid':'Invalid')+' chain validation;'));if(F.expected[name].valid)assert(p.stdout.includes('completion established: '+F.expected[name].completion_established));if(F.expected[name].diagnostic){assert(p.stdout.includes(F.expected[name].diagnostic.code+' '));if(F.expected[name].diagnostic.path)assert(p.stdout.includes(JSON.stringify(F.expected[name].diagnostic.path)));}}}assert.equal(digest(await readFile(file)),before);}
 const {validateReceiptChain}=await import(moduleURL),{Session}=await import('node:inspector/promises');
 for(const name of ['F1-05','F1-04','F1-09','F1-03'])check(validateReceiptChain(JSON.stringify(F.inputs[name])),F.expected[name],F.inputs[name],name);
 for(const[name,edges,budget]of [['layered-positive',256,545536],['layered-extra-r2',257,546304]]){
  assert.equal(F.layered_budgets[name],budget);assert.equal(256*(68+edges+1)*3+64*68**2,budget);assert(budget<2**20);
  const raw=JSON.stringify(F.inputs[name]),session=new Session();session.connect();
  try{await session.post('Profiler.enable');await session.post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});const result=validateReceiptChain(raw);const {result:coverage}=await session.post('Profiler.takePreciseCoverage');check(result,F.expected[name],F.inputs[name],name);const scripts=coverage.filter(x=>x.url===moduleURL);assert.equal(scripts.length,1,'Require actual copied receipt-module coverage.');const entries=scripts[0].functions.reduce((sum,f)=>sum+f.ranges[0].count,0);assert(entries>0&&entries<=budget,`${name}: ${entries} > ${budget}`);t.diagnostic(`${name}: ${entries} copied receipt-module entries <= ${budget}`);}finally{try{await session.post('Profiler.stopPreciseCoverage');}finally{session.disconnect();}}
 }
 assert.equal(digest(await readFile(modulePath)),digest(sourceBytes));assert.deepEqual((await readdir(o.app)).sort(),['repeated-inputs']);
});

// Conflict inputs stay source-only; the real installed command reads absolute files.
test('installed preview rejects frozen current-proof contradictions and preserves complete current results',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator');
 const F=JSON.parse(await readFile(new URL('./fixtures/manager-proof-conflicts.json',import.meta.url)));
 const compatibility=JSON.parse(await readFile(new URL('./fixtures/manager-repairs.json',import.meta.url))).inherited_current_preview,successors=new Map(compatibility.cases.map(c=>[c.id,c.expected]));assert.equal(successors.size,33);assert.deepEqual([...successors.keys()],F.cases.map(c=>c.id));
 const {createHash}=await import('node:crypto'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const manifest=JSON.parse(await readFile(installed.manifest));
 for(const relative of ['lib/contracts/receipts.mjs','lib/manager/snapshot.mjs']){
  const bytes=await readFile(new URL('../'+relative,import.meta.url));assert.equal(hash(await readFile(path.join(validator,relative))),hash(bytes));assert.equal(manifest.sourceFiles['work-validator/'+relative],hash(bytes));
 }
 assert(!Object.keys(manifest.sourceFiles).some(k=>k.includes('manager-proof-conflicts')));
 const {pathToFileURL}=await import('node:url'),{inspectManagerCompletion}=await import(pathToFileURL(path.join(validator,'lib/contracts/receipts.mjs')).href);
 const matching=F.cases.find(c=>c.id==='matching-shared-inventory-123'),expected=F.matching_overlap.expected_bindings,groups=new Map();
 const sorted=bs=>structuredClone(bs).sort((a,b)=>JSON.stringify([a.kind,a.key,a.digest]).localeCompare(JSON.stringify([b.kind,b.key,b.digest])));
 assert.equal(expected.length,57);assert.equal(new Set(expected.map(b=>JSON.stringify([b.kind,b.key]))).size,57);
 for(const [index,raw]of matching.snapshot.completion_receipts.entries()){
  const target=F.matching_overlap.targets[index],control=F.public_controls.find(c=>c.input.target.ticket_id===target.ticket_id),r=inspectManagerCompletion(raw);
  const validation=JSON.parse(JSON.stringify(r.validation));assert.deepEqual(validation,control.expected);assert.deepEqual(validation.target,target);assert.deepEqual(sorted(r.bindings),sorted(expected));assert.equal(new Set(r.bindings.map(b=>JSON.stringify([b.kind,b.key]))).size,57);
  for(const b of r.bindings){const key=JSON.stringify([b.kind,b.key]);if(!groups.has(key))groups.set(key,{digests:new Set(),participants:new Set()});groups.get(key).digests.add(b.digest);groups.get(key).participants.add(target.ticket_id);}
 }
 assert.equal(groups.size,57);for(const b of expected){const group=groups.get(JSON.stringify([b.kind,b.key]));assert.deepEqual([...group.digests],[b.digest]);assert.deepEqual([...group.participants],['1000','2000','3000']);}
 const config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),proof=path.join(o.app,'proof.json');
 for(const c of F.public_controls){const raw=JSON.stringify(c.input);await writeFile(proof,raw);const p=spawnSync(process.execPath,[path.join(validator,'scripts/validate-handoff.mjs'),'--mode','chain','--input',proof,'--json'],{cwd:o.app,encoding:'utf8',timeout:5000});assert.equal(p.status,0);assert.equal(p.stderr,'');assert.deepEqual(JSON.parse(p.stdout),c.expected,c.name);assert.equal(await readFile(proof,'utf8'),raw);}await rm(proof);
 for(const c of F.invalid_public_controls){const raw=JSON.stringify(c.input);await writeFile(proof,raw);const p=spawnSync(process.execPath,[path.join(validator,'scripts/validate-handoff.mjs'),'--mode','chain','--input',proof,'--json'],{cwd:o.app,encoding:'utf8',timeout:5000});assert.equal(p.status,1);assert.equal(p.stderr,'');assert.deepEqual(JSON.parse(p.stdout),c.expected,c.name);assert.equal(await readFile(proof,'utf8'),raw);}await rm(proof);
 for(const original of F.cases){const c={...original,expected:successors.get(original.id)};
  const rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const before=(await readdir(o.app)).sort();
  const args=[path.join(validator,'scripts/manager-preview.mjs'),'--config',config,'--input',input];
  for(const json of [true,false]){const p=spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000});assert.equal(p.status,c.expected.status==='complete'?0:1,c.id+p.stderr);assert.equal(p.stderr,'');assert(!p.stdout.includes('FICTITIOUS-MARKER'));if(json)assert.deepEqual(JSON.parse(p.stdout),c.expected,c.id);else {assert.match(p.stdout,/Local supplied snapshot only/);if(c.expected.status==='partial')assert.match(p.stdout,/REPAIR_PROOF_INVALID/);}}
  assert.deepEqual((await readdir(o.app)).sort(),before);assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);assert.equal(c.expected.writes,0);assert.equal(c.expected.execution_authorized,false);
 }
});

test('installed preview preserves inherited36 typed own-repair outcomes and three controls',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator'),packet=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-repairs.json'))),own=packet.inherited_own_preview,F={...own.original,cases:own.original.cases.map(c=>({...c,expected:own.cases.find(e=>e.id===c.id).expected}))};
 const {createHash}=await import('node:crypto'),sha=b=>createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(await readFile(installed.manifest));
 assert.equal(installed.verification.entrypoints,22);assert.equal(installed.verification.smokeChecks.length,8);assert(Object.hasOwn(manifest.sourceFiles,'work-validator/lib/manager/repair-policy.mjs'));assert(Object.hasOwn(manifest.sourceFiles,'work-validator/test/fixtures/manager-repairs.json'));
 for(const relative of ['lib/contracts/receipts.mjs','lib/manager/snapshot.mjs','lib/manager/decisions.mjs']){const bytes=await readFile(new URL('../'+relative,import.meta.url));assert.equal(sha(await readFile(path.join(validator,relative))),sha(bytes));assert.equal(manifest.sourceFiles['work-validator/'+relative],sha(bytes));}
 assert.deepEqual(F.installed_case_ids,['OC01-selection','OC04-cap-5','OC05-stack-request']);
 const config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),cli=path.join(validator,'scripts/manager-preview.mjs');
 for(const c of F.cases){const id=c.id,rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot),exit=c.expected.status==='complete'?0:1;await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const before=(await readdir(o.app)).sort(),args=[cli,'--config',config,'--input',input];
  for(const json of [true,false]){const p=spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000});assert.equal(p.status,exit,id+p.stderr);assert.equal(p.stderr,'');if(json)assert.deepEqual(JSON.parse(p.stdout),c.expected,id);else{assert.match(p.stdout,/No execution authority; writes: 0/);const expectedCauses=c.expected.streams.flatMap(s=>(s.proposal?.roots??[]).map(r=>`  Cause: ticket ${r.ticket_id}; comment ${r.comment_id}; record ${r.record_id}; digest ${r.digest}.`));assert.deepEqual(p.stdout.split('\n').filter(line=>line.startsWith('  Cause:')),expectedCauses,c.id+' every ordered cause and exact cardinality');for(const s of c.expected.streams){if(s.selected_key)assert(p.stdout.includes('selected '+s.selected_key+'.'));for(const r of s.reasons)assert(p.stdout.includes(r.code+' '+r.path+':'));}}}
  assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);assert.deepEqual((await readdir(o.app)).sort(),before);
 }
});

// The copied runtime consumes independently frozen repair oracles; parity alone
// is additional evidence, never the source of an expected report.
test('installed repair preview preserves complete checkpoint and historical contracts',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator');
 const {createHash}=await import('node:crypto'),{pathToFileURL}=await import('node:url'),sha=b=>createHash('sha256').update(b).digest('hex');
 const relative='test/fixtures/manager-repairs.json',bytes=await readFile(new URL('../'+relative,import.meta.url)),F=JSON.parse(bytes),manifest=JSON.parse(await readFile(installed.manifest));
 assert.equal(sha(await readFile(path.join(validator,relative))),sha(bytes));assert.equal(manifest.sourceFiles['work-validator/'+relative],sha(bytes));assert.equal(F.native_cases.length,42);
 for(const p of ['lib/contracts/receipts.mjs','lib/manager/snapshot.mjs','lib/manager/repair-policy.mjs']){const source=await readFile(new URL('../'+p,import.meta.url));assert.equal(sha(await readFile(path.join(validator,p))),sha(source));assert.equal(manifest.sourceFiles['work-validator/'+p],sha(source));}
 const {inspectManagerHistory,validateReceiptChain}=await import(pathToFileURL(path.join(validator,'lib/contracts/receipts.mjs')).href),plain=v=>JSON.parse(JSON.stringify(v));
 const pair=F.projection_pair,histories=[],currents=[];
 let historyStage='not_started';
 try {
 for(const [index,mode]of ['history','current','current','history','history','current'].entries()){
  verificationContext(o,{group:'history',case_id:'projection_pair',mode,repetition:index+1,pointer:'/projection_pair'});historyStage='call';
  const actual=mode==='history'?inspectManagerHistory(pair.input):validateReceiptChain(pair.input);historyStage='assertions';
  const r=plain(actual);verificationHistory({id:'projection_pair'},pair.input,mode==='history'?pair.expected_history:pair.expected_current,actual,{comparison:r});
  if(mode==='history'){assert.deepEqual(r,pair.expected_history);histories.push(r);}else{assert.deepEqual(r,pair.expected_current);currents.push(r);}
 }
 for(const h of histories)assert.deepEqual(h,histories[0]);for(const c of currents)assert.deepEqual(c,currents[0]);
 for(const [index,c]of F.projections.entries())for(const repetition of [1,2]){
  verificationContext(o,{group:'history',case_id:c.id,mode:'history',repetition,pointer:'/projections/'+index});historyStage='call';
  const actual=inspectManagerHistory(c.input);historyStage='assertions';const result=plain(actual);verificationHistory(c,c.input,c.expected,actual,{comparison:result});assert.deepEqual(result,c.expected,c.id+(repetition===2?' repeat':''));
 }
 for(const [index,c]of F.normalization.positive_history_projections.entries()){
  verificationContext(o,{group:'history',case_id:c.id,mode:'history',repetition:1,pointer:'/normalization/positive_history_projections/'+index});historyStage='call';
  const actual=inspectManagerHistory(c.input);historyStage='assertions';const result=plain(actual);verificationHistory(c,c.input,c.expected,actual,{comparison:result});assert.deepEqual(result,c.expected,c.id);
 }
 for(const [index,c]of F.normalization.canonical_controls.entries())for(const [repetition,mode]of ['current','history','history','current'].entries()){
  verificationContext(o,{group:'history',case_id:c.id,mode,repetition:repetition+1,pointer:'/normalization/canonical_controls/'+index});historyStage='call';
  const actual=mode==='current'?validateReceiptChain(c.input):inspectManagerHistory(c.input);historyStage='assertions';const result=plain(actual);verificationHistory(c,c.input,mode==='current'?c.expected_current:c.expected_history,actual,{comparison:result});assert.deepEqual(result,mode==='current'?c.expected_current:c.expected_history,c.id+' '+mode);
 }
 for(const [index,c]of F.bounded_history_cases.entries()){
  verificationContext(o,{group:'history',case_id:c.id,mode:'history',repetition:1,pointer:'/bounded_history_cases/'+index});
  const {Session}=await import('node:inspector/promises'),session=new Session();session.connect();
  try{
   await session.post('Profiler.enable');await session.post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});historyStage='call';
   const result=inspectManagerHistory(c.input);const {result:coverage}=await session.post('Profiler.takePreciseCoverage');historyStage='assertions';
   const scripts=coverage.filter(x=>x.url===pathToFileURL(path.join(validator,'lib/contracts/receipts.mjs')).href),entries=scripts.length===1?scripts[0].functions.reduce((n,f)=>n+f.ranges[0].count,0):null;
   verificationHistory(c,c.input,c.expected,result,{coverage:scripts,module_entries:entries,module_entry_budget:c.module_entry_budget});
   assert.equal(result.valid,c.expected.valid,c.id+JSON.stringify(result.diagnostics));assert.equal(result.completion_established,false);assert.equal(result.execution_authorized,false);if(c.expected.diagnostic){assert(result.diagnostics.some(d=>d.code===c.expected.diagnostic.code&&d.path===c.expected.diagnostic.path));assert.deepEqual(result.records,[]);assert.deepEqual(result.coverage_segments,[]);assert.deepEqual(result.bindings,[]);}assert.equal(scripts.length,1);assert(entries>0&&entries<=c.module_entry_budget,c.id+': '+entries+' > '+c.module_entry_budget);t.diagnostic(c.id+': '+entries+' copied history-module entries <= '+c.module_entry_budget);
  }finally{try{await session.post('Profiler.stopPreciseCoverage');}finally{session.disconnect();}}
 }
 }catch(error){verificationAfter('history API/assertion failure',()=>verificationRecord('history-failure',{test:t.name,...verificationCurrent?.context,stage:historyStage,error:verificationError(error)}));throw error;}
 verificationComplete(o,'history');

 const config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),cli=path.join(validator,'scripts/manager-preview.mjs');
 for(const [caseIndex,c]of [...F.cases,...F.scenarios,...F.normalization.cases].entries()){verificationContext(o,{group:'full-loop',case_id:c.id,case_index:caseIndex});const rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const before=(await readdir(o.app)).sort(),args=[cli,'--config',config,'--input',input,...(c.options?.expectedSite?['--expected-site',c.options.expectedSite]:[]),...(c.options?.expectedSnapshotDigest?['--expected-snapshot-digest',c.options.expectedSnapshotDigest]:[])];
  const expectedExit=c.expected.status==='complete'?0:1;
  for(const json of [true,false]){let repetition=0;const invoke=()=>{verificationContext(o,{group:'full-loop',case_id:c.id,case_index:caseIndex,mode:json?'json':'readable',repetition:++repetition});return spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:30000});},p=invoke();assert.equal(p.status,expectedExit,c.id+p.stderr);assert.equal(p.stderr,'');assert.equal(invoke().stdout,p.stdout,c.id+' deterministic');if(json)assert.deepEqual(JSON.parse(p.stdout),c.expected,c.id);else{assert.match(p.stdout,/No execution authority; writes: 0/);const expectedCauses=c.expected.streams.flatMap(s=>(s.proposal?.roots??[]).map(r=>`  Cause: ticket ${r.ticket_id}; comment ${r.comment_id}; record ${r.record_id}; digest ${r.digest}.`));assert.deepEqual(p.stdout.split('\n').filter(line=>line.startsWith('  Cause:')),expectedCauses,c.id+' every ordered cause and exact cardinality');for(const s of c.expected.streams)if(s.proposal){assert(p.stdout.includes('Proposal '+s.proposal.kind));if(s.proposal.required_parent)assert(p.stdout.includes(s.proposal.required_parent.required_revision));assert(p.stdout.includes('publication required '+s.proposal.publication_required));}}}
  assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);assert.deepEqual((await readdir(o.app)).sort(),before);assert.equal(c.expected.writes,0);assert.equal(c.expected.execution_authorized,false);
 }
 assert.equal(sha(await readFile(path.join(validator,relative))),sha(bytes));
 verificationComplete(o,'full-loop');
});

test('repair closure and eighth semantic smoke preserve the previous stable link on failure',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),originalRef=git(o.source,'rev-parse','HEAD');
 const paths=['lib/manager/repair-policy.mjs','test/fixtures/manager-repairs.json'];
 for(const p of paths)for(const corrupt of [false,true]){verificationContext(o,{group:'five-faults',fault_id:(corrupt?'corrupt-':'missing-')+p});git(o.source,'checkout',originalRef,'--',p);if(corrupt)await writeFile(path.join(o.source,p),p.endsWith('.json')?'not JSON':'throw Error("corrupt repair runtime");');else await rm(path.join(o.source,p));git(o.source,'add',p);git(o.source,'commit','-m','invalid repair closure fixture');await assert.rejects(installCursorSkills(o,fakeInstall));verificationCheck();assert.equal(await realpath(installed.stableSkills),installed.skills);git(o.source,'checkout',originalRef,'--',p);git(o.source,'commit','-m','restore repair closure fixture');}
 // Preserve ordinary selection; only a repair decision has a deliberately wrong
 // semantic result. Commit it so source hashing succeeds before the eighth check.
 const p='lib/manager/repair-policy.mjs',good=await readFile(path.join(o.source,p),'utf8'),literal='if(chosen)return {required,proposal:chosen.proposal';assert.equal(good.split(literal).length-1,1,'Require the prescribed single fault literal.');const bad=good.replace(literal,'if(chosen)return {required,proposal:null');assert.notEqual(bad,good);verificationContext(o,{group:'five-faults',fault_id:'ordinary-correct-repair-wrong',original_ref:originalRef});await writeFile(path.join(o.source,p),bad);git(o.source,'add',p);git(o.source,'commit','-m','wrong repair semantics fixture');await assert.rejects(installCursorSkills(o,fakeInstall),/Manager preview nonexecuting repair queue smoke check failed/);verificationCheck();assert.equal(await realpath(installed.stableSkills),installed.skills);
 verificationComplete(o,'five-faults');
});

function boundedNativeCases(fixtures){
 const fresh=id=>structuredClone(fixtures.find(c=>c.id===id));
 const refs=[{ticket_id:'1001',comment_id:'9001',record_id:'40000000-0000-4000-8000-000000000001',digest:'sha256:'+'1'.repeat(64)},{ticket_id:'1001',comment_id:'9002',record_id:'40000000-0000-4000-8000-000000000002',digest:'sha256:'+'2'.repeat(64)}];
 const cases=[]; for(const side of [false,true]){const c=fresh('S01');c.snapshot.issues[1].required_requests=structuredClone(refs);if(side)c.snapshot.required_repairs=[{project_id:'100',label:'stream-1',ticket_id:'1001',reason:'required_request',references:structuredClone(refs)}];cases.push({side,c});}return cases;
}
function assertBoundedNativeResult(r){assert.equal(r.valid,true);assert.equal(r.status,'complete');assert.deepEqual(r.streams.filter(s=>s.decision==='select').map(s=>s.selected_ticket_id),[]);assert.ok(r.streams.some(s=>s.reasons.some(r=>r.code==='LINEAGE_REQUIRED'&&r.path==='/issues/1/required_requests')));}

test('focused copied-installed obligation provenance and unfinished child waits',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator'),{previewSnapshot}=await import('../lib/manager/decisions.mjs');
 const cases=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-candidates.json'))).cases,repairs=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-repairs.json'))),obligations=obligationCases(cases),prerequisites=prerequisitePathCases(cases),q6=[];
 const specs=[{...obligations.find(s=>s.id==='R4'),expectedExit:0,assertion:assertObligationResult},...['Q5-label','Q5-project','Q6-accounted-first','Q6-unaccounted-first'].map(id=>({...prerequisites.find(s=>s.id===id),expectedExit:id.startsWith('Q5-')?1:0,assertion:assertPrerequisitePathResult})),...boundedNativeCases(cases).map(s=>({...s,expectedExit:0,assertion:assertBoundedNativeResult})),{...prerequisites.find(s=>s.id==='Q4'),expectedExit:0,assertion:assertPrerequisitePathResult},{...obligations.find(s=>s.id==='B4'),expectedExit:1,assertion:assertObligationResult},...['H02-B-own-dependency-wait','S21-after-worker-wait-B-Rework-Queued'].map(id=>({id,expectedExit:0,c:repairs.scenarios.find(c=>c.id===id),assertion:(r,s)=>assert.deepEqual(r,s.c.expected,s.id)}))];
 for(const [caseIndex,spec]of specs.entries()){verificationContext(o,{group:'focused-provenance',case_id:spec.id??('BN-'+(spec.side?'side':'no-side')),case_index:caseIndex,mode:'json',repetition:1});const c=spec.c,before=JSON.stringify(c),config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);if(spec.orderControl)q6Descriptor(spec);
  const p=spawnSync(process.execPath,[path.join(validator,'scripts/manager-preview.mjs'),'--config',config,'--input',input,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000});assert.equal(p.stderr,'');assert.equal(p.status,spec.expectedExit,spec.id);const result=JSON.parse(p.stdout);spec.assertion(result,spec);let source;try{source=previewSnapshot(rawConfig,rawSnapshot,c.options);}catch(error){verificationAfter('source API throw',()=>verificationRecord('api-failure',{test:t.name,...verificationCurrent?.context,error:verificationError(error)}));throw error;}verificationAPI(c,rawConfig,rawSnapshot,source);assert.deepEqual(result,JSON.parse(JSON.stringify(source)),c.id+' source/installed parity');assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);assert.equal(JSON.stringify(c),before);assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);assert.deepEqual((await readdir(o.app)).sort(),['config.json','snapshot.json']);if(spec.orderControl)q6.push({spec,result});
 }
 assert.equal(q6.length,2);assertQ6Pair(q6[0].result,q6[0].spec,q6[1].result,q6[1].spec);verificationComplete(o,'focused-provenance');
});

function s41ContrastCases(f){return ['S41-published-U1-intent-and-drift','H02-03-u1-queued-r2-arrived','H02-paused','H02-five-Human-Review-cap','H02-unrelated-authentic-active-D','S17-unresolved-intent','S28-scoped-fix-worker-blocker'].map(id=>{const c=[...f.cases,...f.scenarios].find(c=>c.id===id);assert(c,id);return c;});}
function assertS41Readable(text,c){assert.match(text,/No execution authority; writes: 0/);if(c.id==='S41-published-U1-intent-and-drift'){assert(text.includes(': hold;'));for(const r of [{code:'PARENT_REPAIR_PENDING',path:'/issues/2'},{code:'PARENT_REPAIR_PENDING',path:'/issues/3'},{code:'CHANGED_INPUT',path:''},{code:'PENDING_INTENT',path:'/pending_intents'}])assert(text.includes(r.code+' '+r.path+':'),r.code);for(const key of ['EX-2','EX-3'])assert(text.includes('Repair '+key+': parent_completion.'));}}

test('focused S41 and six fixed contrasts copied installed',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator'),f=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-repairs.json'))),{previewSnapshot}=await import('../lib/manager/decisions.mjs');
 for(const [caseIndex,c]of s41ContrastCases(f).entries()){verificationContext(o,{group:'focused-S41',case_id:c.id,case_index:caseIndex,repetition:1});const before=JSON.stringify(c),config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[path.join(validator,'scripts/manager-preview.mjs'),'--config',config,'--input',input,...(c.options?.expectedSite?['--expected-site',c.options.expectedSite]:[]),...(c.options?.expectedSnapshotDigest?['--expected-snapshot-digest',c.options.expectedSnapshotDigest]:[])],exit=c.expected.status==='complete'?0:1;
 for(const json of [true,false]){verificationContext(o,{group:'focused-S41',case_id:c.id,case_index:caseIndex,mode:json?'json':'readable',repetition:1});const p=spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:30000});assert.equal(p.status,exit,c.id);assert.equal(p.stderr,'');if(json){const result=JSON.parse(p.stdout);assert.deepEqual(result,c.expected,c.id);let source;try{source=previewSnapshot(rawConfig,rawSnapshot,c.options);}catch(error){verificationAfter('source API throw',()=>verificationRecord('api-failure',{test:t.name,...verificationCurrent?.context,error:verificationError(error)}));throw error;}verificationAPI(c,rawConfig,rawSnapshot,source);assert.deepEqual(result,JSON.parse(JSON.stringify(source)),c.id+' parity');assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);}else assertS41Readable(p.stdout,c);}
 assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);assert.deepEqual((await readdir(o.app)).sort(),['config.json','snapshot.json']);assert.equal(JSON.stringify(c),before);}
 verificationComplete(o,'focused-S41');
});


// Independently reviewed complete payload path set; equality of two incomplete maps is insufficient.
const expected169PayloadPaths = [
  "package.json",
  "package-lock.json",
  "scripts/validate-work.mjs",
  "lib/contracts/work.mjs",
  "contracts/epic-v1.schema.json",
  "contracts/ticket-v1.schema.json",
  "docs/authoring.md",
  "docs/architecture/examples/manager-epic.yaml",
  "docs/architecture/examples/manager-epic-populated.yaml",
  "docs/architecture/examples/manager-ticket.yaml",
  "docs/architecture/examples/manager-ticket-populated.yaml",
  "lib/contracts/work-semantics.mjs",
  "lib/contracts/case-graph.mjs",
  "contracts/work-validation-context-v1.schema.json",
  "config/skill-bundle.json",
  "contracts/handoff-v1.schema.json",
  "contracts/work-pointer-v1.schema.json",
  "lib/contracts/handoff.mjs",
  "lib/contracts/receipts.mjs",
  "scripts/validate-handoff.mjs",
  "docs/handoffs.md",
  "scripts/check-config.mjs",
  "lib/config/parse.mjs",
  "lib/config/projects.mjs",
  "lib/config/diff.mjs",
  "contracts/config-v1.schema.json",
  "config/pigboss.example.yaml",
  "docs/configuration.md",
  "scripts/prepare-handoff.mjs",
  "lib/manager/snapshot.mjs",
  "lib/manager/availability.mjs",
  "lib/manager/decisions.mjs",
  "lib/manager/repair-policy.mjs",
  "scripts/manager-preview.mjs",
  "docs/manager-preview.md",
  "test/fixtures/manager-candidates.json",
  "test/fixtures/manager-repairs.json",
  "lib/jira/read.mjs",
  "test/fixtures/jira-preview-harness.mjs",
  "test/fixtures/jira-preview-cases.json",
  "test/fixtures/jira-preview-tls.json"
];
async function assertCurrentPayloadCopy({sourceRoot,installed,expectedCommit}) {
 const manifest=JSON.parse(await readFile(installed.manifest,'utf8'));
 assert.equal(manifest.commit,expectedCommit,'actual prepared fixture commit');
 assert.equal(installed.commit,expectedCommit,'installation receipt fixture commit');
 assert.deepEqual(manifest.bundle,bundle,'actual current bundle');
 assert.equal(bundle.validatorPayload.directory,'work-validator');
 assert.equal(expected169PayloadPaths.length,41);
 assert.deepEqual([...bundle.validatorPayload.sources].sort(),[...expected169PayloadPaths].sort(),'independent complete bundle payload paths');
 const paths=Object.keys(manifest.sourceFiles).filter(p=>p.startsWith('work-validator/')).map(p=>p.slice('work-validator/'.length)).sort();
 assert.deepEqual(paths,[...expected169PayloadPaths].sort(),'independent complete manifest payload paths');
 const records=[];
 for(const relative of expected169PayloadPaths) {
  const source=await readFile(new URL('../'+relative,import.meta.url)),fixture=await readFile(path.join(sourceRoot,relative)),copied=await readFile(path.join(installed.skills,'work-validator',relative)),expected=verificationSHA(source);
  assert(source.equals(fixture),relative+' actual source/fixture bytes');
  assert(source.equals(copied),relative+' actual source/installed bytes');
  assert.equal(manifest.sourceFiles['work-validator/'+relative],expected,relative+' actual source/manifest SHA');
  records.push({path:relative,source_sha256:expected,fixture_sha256:verificationSHA(fixture),installed_sha256:verificationSHA(copied),manifest_sha256:manifest.sourceFiles['work-validator/'+relative]});
 }
 return {fixture_commit:expectedCommit,manifest_commit:manifest.commit,payload_paths:paths,records};
}
test('PGB-169 every current source payload byte matches its installed copy and manifest',async t=>{
 const o=await fixture(t),expectedCommit=git(o.source,'rev-parse','HEAD'),installed=await installCursorSkills(o,fakeInstall);
 const evidence=await assertCurrentPayloadCopy({sourceRoot:o.source,installed,expectedCommit});
 t.diagnostic('Verified all41 source/fixture/installed/manifest entries at actual fixture '+expectedCommit);
 verificationAfter('current complete payload parity',()=>verificationRecord('payload-parity',{test:t.name,source:o.source,installed:installed.skills,...evidence}));
 const relative='lib/contracts/work.mjs',originalSHA=evidence.records.find(r=>r.path===relative).source_sha256;
 const controls=[
  {id:'missing-copied-payload',mutate:async copy=>rm(path.join(copy.skills,'work-validator',relative)),expected:/ENOENT/},
  {id:'missing-manifest-payload',mutate:async copy=>{const m=JSON.parse(await readFile(copy.manifest));delete m.sourceFiles['work-validator/'+relative];await writeFile(copy.manifest,JSON.stringify(m));},expected:/independent complete manifest payload paths/},
  {id:'mismatched-copied-bytes',mutate:async copy=>writeFile(path.join(copy.skills,'work-validator',relative),'changed disposable payload bytes'),expected:/actual source\/installed bytes/},
  {id:'mismatched-manifest-hash',mutate:async copy=>{const m=JSON.parse(await readFile(copy.manifest));m.sourceFiles['work-validator/'+relative]='0'.repeat(64);await writeFile(copy.manifest,JSON.stringify(m));},expected:/actual source\/manifest SHA/},
 ];
 for(const c of controls) {
  const release=path.join(o.app,c.id);await cp(installed.release,release,{recursive:true});
  const copy={...installed,release,skills:path.join(release,'skills'),manifest:path.join(release,'manifest.json')};
  await c.mutate(copy);
  let observed;
  await assert.rejects(async()=>{try{await assertCurrentPayloadCopy({sourceRoot:o.source,installed:copy,expectedCommit});}catch(error){observed={message:error.message,code:error.code??null};throw error;}},c.expected);
  verificationAfter('bounded payload mutation '+c.id,()=>verificationRecord('payload-control',{test:t.name,control:c.id,fixture_commit:expectedCommit,source:o.source,copy:copy.skills,path:relative,independent_expected_sha256:originalSHA,outcome:'REJECTED_AS_EXPECTED',observed,manifest:verificationBlob(verificationFs.readFileSync(copy.manifest)),copied_payload:verificationFs.existsSync(path.join(copy.skills,'work-validator',relative))?verificationBlob(verificationFs.readFileSync(path.join(copy.skills,'work-validator',relative))):{state:'MISSING_AS_PRESCRIBED'}}));
  t.diagnostic(c.id+': rejected against unchanged actual source and fixture '+expectedCommit);
  await rm(release,{recursive:true,force:true});
 }
 assert.equal(await realpath(installed.stableSkills),installed.skills,'disposable controls preserve stable release');
 await assertCurrentPayloadCopy({sourceRoot:o.source,installed,expectedCommit});
 verificationComplete(o,'PGB-169-current-payload');
});

test('PGB-159 copied scheduling preserves source contracts from unrelated cwd',async t=>{
 const o=await fixture(t),expectedCommit=git(o.source,'rev-parse','HEAD');
 const installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator');
 await assertCurrentPayloadCopy({sourceRoot:o.source,installed,expectedCommit});
 const fixtures=JSON.parse(await readFile(new URL('./fixtures/work-semantics.json',import.meta.url),'utf8'));
 const {sizeLedger}=await import('../lib/contracts/work-semantics.mjs');
 const fresh=()=>structuredClone(fixtures.scheduling);
 const sourceCLI=new URL('../scripts/validate-work.mjs',import.meta.url).pathname;
 const copiedCLI=path.join(validator,'scripts/validate-work.mjs');
 const files={work:path.join(o.app,'work.json'),config:path.join(o.app,'config.json'),facts:path.join(o.app,'scheduling.json'),context:path.join(o.app,'context.json')};
 const controlSample=control=>{
  const inputs=fresh(),sample={work:inputs.variants[control.variant],config:inputs.config,facts:inputs.facts};
  for(const [pointer,value]of control.patches){
   const keys=pointer.split('/');let target=sample;
   for(const key of keys.slice(0,-1))target=target[key];
   target[keys.at(-1)]=structuredClone(value);
  }
  if(control.ledger_bytes){
   const strategy=sample.work.testing_strategy,template=strategy.human_review.cases[0];
   strategy.human_review.cases=Array.from({length:65},(_,i)=>({...structuredClone(template),id:i===0?template.id:'H'+i+'x'.repeat(200)}));
   while(sizeLedger(sample.work).ledger_budget.projection_bytes>16384)strategy.human_review.cases.pop();
   let remaining=control.ledger_bytes-sizeLedger(sample.work).ledger_budget.projection_bytes;
   for(const human of strategy.human_review.cases.slice(1)){
    const length=Math.min(255-human.id.length,remaining);human.id+='x'.repeat(length);remaining-=length;
   }
   strategy.human_review.no_ai_cases_reason+='x'.repeat(remaining);
  }
  return sample;
 };
 const run=(checker,args,json=true)=>{
  const child=spawnSync(process.execPath,[checker,...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:30000});
  assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(child.stderr,'');
  return {...child,...(json?{result:JSON.parse(child.stdout)}:{})};
 };
 const save=async sample=>{
  const raw={work:JSON.stringify(sample.work),config:JSON.stringify(sample.config),facts:JSON.stringify(sample.facts)};
  for(const key of Object.keys(raw))await writeFile(files[key],raw[key]);
  return raw;
 };
 const unchanged=async raw=>{for(const key of Object.keys(raw))assert.equal(await readFile(files[key],'utf8'),raw[key],key+' input bytes unchanged');};
 const schedulingArgs=['--mode','scheduling','--input',files.work,'--config',files.config,'--scheduling',files.facts];
 const assertScheduling=(child,sample,control)=>{
  const result=child.result,valid=control===undefined;
  assert.equal(child.status,valid?0:1,control?.name??'positive');
  assert.equal(result.schema,'pigboard-work-validation/v1');assert.equal(result.mode,'scheduling');
  assert.equal(result.purpose,'scheduling');assert.equal(result.validation_scope,'scheduling_declarations');
  assert.equal(result.valid,valid);assert.equal(result.start_semantics_valid,null);
  assert.equal(result.readiness,'not_evaluated');assert.equal(result.execution_authorized,false);
  assert.deepEqual(result.start_diagnostics,[]);
  if(control){
   assert(result.diagnostics.some(d=>d.code===control.code&&(d.path===control.path||d.path.startsWith(control.path+'/'))),JSON.stringify(result.diagnostics));
   assert.equal(result.start_structure_valid,control.code!=='VALUE');
   assert.equal(result.scheduling_semantics_valid,control.code==='VALUE'?null:false);
  }else{
   assert.equal(result.start_structure_valid,true);assert.equal(result.scheduling_semantics_valid,true);assert.deepEqual(result.diagnostics,[]);
  }
  if(control?.code==='VALUE')assert.equal(result.ledger_budget,null);
  else{
   const budget=result.ledger_budget;
   assert(budget);assert.equal(budget.omitted_entries,0);assert.equal(budget.actual_publication,'not_evaluated');
   assert.equal(budget.human_cases,sample.work.testing_strategy.human_review.cases.length);
   const expectedSteps=control?.name==='duplicate dispatch'?6:sample.work.testing_strategy.cases.flatMap(c=>c.steps).length;
   assert.equal(budget.ai_steps,expectedSteps);assert.equal(budget.limit_bytes,16384);
   if(control?.ledger_bytes)assert.equal(budget.projection_bytes,16385);
   else assert(budget.projection_bytes>0&&budget.projection_bytes<=16384);
  }
 };
 const assertReadable=(child,valid)=>{
  assert.equal(child.status,valid?0:1);
  assert.match(child.stdout,valid?/Scheduling declarations passed/:/Scheduling declarations failed/);
  assert.match(child.stdout,/execution readiness and human Ready to Work are not evaluated; execution is not authorized/);
 };
 const matrix=async(sample,control)=>{
  const before=JSON.stringify(sample),raw=await save(sample),outcomes=[];
  for(const checker of [sourceCLI,copiedCLI]){
   const json=run(checker,schedulingArgs);assertScheduling(json,sample,control);await unchanged(raw);
   const readable=run(checker,schedulingArgs,false);assertReadable(readable,!control);
   if(control)assert(readable.stdout.includes(JSON.stringify(control.path)),control.name+' readable field');
   await unchanged(raw);outcomes.push({json:json.result,readable:readable.stdout});
  }
  assert.deepEqual(outcomes[1],outcomes[0],'source/copied scheduling parity after independent expectations');
  assert.equal(JSON.stringify(sample),before);
 };
 for(const name of ['mixed','human']){
  const inputs=fresh(),sample={work:inputs.variants[name],config:inputs.config,facts:inputs.facts};
  await matrix(sample);
  const raw=await save(sample),context=structuredClone(fixtures[name].context);
  for(const operation of context.operations){
   const step=sample.work.testing_strategy.cases.flatMap(c=>c.steps).find(s=>s.id===operation.step);
   operation.contract=structuredClone(step);
  }
  const rawContext=JSON.stringify(context);await writeFile(files.context,rawContext);
  const starts=[];
  for(const checker of [sourceCLI,copiedCLI]){
   const refused=run(checker,['--mode','start','--input',files.work]);
   assert.equal(refused.status,2);assert.equal(refused.result.valid,false);
   assert.equal(refused.result.diagnostics[0].code,'USAGE');assert.equal(refused.result.readiness,'not_evaluated');
   const complete=run(checker,['--mode','start','--input',files.work,'--context',files.context]);
   assert.equal(complete.status,0,complete.stdout);assert.equal(complete.result.valid,true);
   assert.equal(complete.result.start_semantics_valid,true);assert.equal(complete.result.validation_scope,'local_start');
   assert.equal(complete.result.readiness,'not_evaluated');assert.equal(complete.result.ledger_budget.omitted_entries,0);
   assert.equal(complete.result.ledger_budget.ai_steps,name==='mixed'?4:0);assert.equal(complete.result.ledger_budget.human_cases,1);
   starts.push({refused:refused.result,complete:complete.result});await unchanged(raw);
   assert.equal(await readFile(files.context,'utf8'),rawContext);
  }
  assert.deepEqual(starts[1],starts[0],'source/copied strict-start parity after independent expectations');
  await rm(files.context);
 }
 assert.equal(fixtures.scheduling.negatives.length,12);
 for(const control of fixtures.scheduling.negatives)await matrix(controlSample(control),control);
 const inputs=fresh(),sample={work:inputs.variants.mixed,config:inputs.config,facts:inputs.facts},raw=await save(sample);
 const configURL=new URL('file://'+path.join(validator,'lib/config/parse.mjs')).href;
 const workURL=new URL('file://'+path.join(validator,'lib/contracts/work.mjs')).href;
 for(const order of [[configURL,workURL],[workURL,configURL]]){
  const program=`await import(${JSON.stringify(order[0])});await import(${JSON.stringify(order[1])});const fs=await import('node:fs');const runtime=await import(${JSON.stringify(workURL)});const result=runtime.validateWork(fs.readFileSync(${JSON.stringify(files.work)}),{mode:'scheduling',configInput:fs.readFileSync(${JSON.stringify(files.config)}),schedulingInput:fs.readFileSync(${JSON.stringify(files.facts)})});console.log(JSON.stringify(result));`;
  const child=spawnSync(process.execPath,['--input-type=module','--eval',program],{cwd:o.app,encoding:'utf8',timeout:30000});
  assert.equal(child.stderr,'');assert.equal(child.status,0);
  assertScheduling({...child,result:JSON.parse(child.stdout)},sample);await unchanged(raw);
 }
 const configResult=run(path.join(validator,'scripts/check-config.mjs'),['--input',files.config]);
 assert.equal(configResult.status,0);assert.equal(configResult.result.valid,true);
 assert.equal(configResult.result.live_readiness,'not_evaluated');await unchanged(raw);
 const help=[];
 for(const checker of [sourceCLI,copiedCLI]){
  const child=run(checker,['--help']);assert.equal(child.status,0);
  assert.deepEqual(child.result.modes,['draft','structure','scheduling','start']);
  assert.deepEqual(child.result.schemas,['pigboard-epic/v1','pigboard-ticket/v1','pigboard-work-validation-context/v1','pigboard-config/v1','pigboard-work-scheduling/v1']);
  assert.equal(child.result.readiness,'not_evaluated');assert.match(child.result.help,/--config CONFIG.yaml --scheduling FACTS.yaml/);
  help.push(child.result);
 }
 assert.deepEqual(help[1],help[0],'source/copied help capability parity');
 assert.deepEqual((await readdir(o.app)).sort(),['config.json','scheduling.json','work.json']);await unchanged(raw);
 t.diagnostic('One installation; all41 actual payload entries;2 preparation-bearing forms;12 declaration controls; strict start;2 copied import orders; config CLI/help; unchanged inputs. Real work-validator dependencies; other QA-helper installs simulated. Human H01/H02 not run.');
});
