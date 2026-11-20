#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,cpSync,readdirSync,lstatSync,utimesSync,existsSync,realpathSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {hostConfig,sha256,loadHostSDK,hostError} from '../lib/aws/installation.mjs';
import {lifecycleManifestFields,synthesizeTemplate} from '../lib/aws/template.mjs';
import {assertAlarmWindow} from '../lib/aws/alarms.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const hashFile=p=>sha256(readFileSync(p));
function walk(base,prefix=''){let files=[];for(const e of readdirSync(join(base,prefix),{withFileTypes:true})){const p=prefix?prefix+'/'+e.name:e.name;if(e.isDirectory())files.push(...walk(base,p));else if(e.isFile())files.push(p);else if(!e.isSymbolicLink())throw hostError('PAYLOAD_TYPE');}return files.sort();}
function closure(source,entry,seen=new Set()){
 if(seen.has(entry))return seen;seen.add(entry);const text=readFileSync(join(source,entry),'utf8');
 for(const match of text.matchAll(/(?:from\s*|import\s*\(|new URL\s*\()(['"])(\.[^'"]+)\1/g)){const target=relative(source,resolve(dirname(join(source,entry)),match[2]));if(target.startsWith('..'))throw hostError('PAYLOAD_PATH');if(target.endsWith('.mjs'))closure(source,target,seen);else if(existsSync(join(source,target))&&lstatSync(join(source,target)).isFile())seen.add(target);}
 return seen;
}
export function packageManager({configPath,output,source=root,revision,generation,lifecycle=false,compatibleFrom}={}){
 source=resolve(source);output=resolve(output);if(existsSync(output))throw hostError('OUTPUT_EXISTS');
 const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();const head=git('rev-parse','HEAD');if(!revision||head!==revision||!/^[0-9a-f]{40}$/.test(revision)||git('status','--porcelain','--untracked-files=normal'))throw hostError('PINNED_CLEAN_SOURCE_REQUIRED');
 if(compatibleFrom!==undefined){
  if(!lifecycle||!generation||compatibleFrom===revision||!/^[a-f0-9]{40}$/.test(compatibleFrom))throw hostError('PACKAGE_LINEAGE_MISMATCH');
  try{git('merge-base','--is-ancestor',compatibleFrom,revision);}catch{throw hostError('PACKAGE_LINEAGE_MISMATCH');}
 }
 loadHostSDK();const text=readFileSync(configPath,'utf8'),{config,digest}=hostConfig(text);if(!generation&&(config.manager.controls.schedule_enabled||config.manager.controls.writes_enabled||config.manager.controls.maintenance))throw hostError('INITIAL_DISABLED_REQUIRED');
 const installationGeneration=generation??randomUUID();
 const payloadSources=closure(source,'lib/aws/manager-lambda.mjs');
 const alarmCapability=lifecycle&&payloadSources.has('lib/aws/alarms.mjs');
 if(alarmCapability)assertAlarmWindow(config);
 const fields=lifecycle
  ? lifecycleManifestFields({installationId:config.manager.installation_id,generation:installationGeneration,previousRevision:compatibleFrom,alarmCapability})
  : {schema:'pigboard-manager-package/v1',logical_resources:['Function','Schedule','LogGroup','StateTable','RuntimeRole','SchedulerRole']};
 const manifest={...fields,source_revision:revision,configuration_digest:digest,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,installation_generation:installationGeneration,runtime:'nodejs24.x',sender:true,canonical_config:config,dependency_hashes:{root:hashFile(join(source,'package-lock.json')),aws:hashFile(join(source,'runtime/aws/package-lock.json'))},payload_hashes:{}};
 const payload=join(output,'payload');mkdirSync(payload,{recursive:true});
 for(const p of new Set([...payloadSources,'contracts/epic-v1.schema.json','contracts/ticket-v1.schema.json'])){mkdirSync(dirname(join(payload,p)),{recursive:true});cpSync(join(source,p),join(payload,p));}
 for(const p of ['node_modules','runtime/aws/node_modules','runtime/aws/package.json','runtime/aws/package-lock.json','package.json']){mkdirSync(dirname(join(payload,p)),{recursive:true});cpSync(join(source,p),join(payload,p),{recursive:true,dereference:false});}
 mkdirSync(join(payload,'config'),{recursive:true});writeFileSync(join(payload,'config/manager.json'),JSON.stringify(config,null,2)+'\n');
 for(const p of walk(payload))manifest.payload_hashes[p]=hashFile(join(payload,p));
 // The embedded manifest cannot include the hash of its containing zip.
 writeFileSync(join(payload,'package-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 manifest.payload_hashes['package-manifest.json']=hashFile(join(payload,'package-manifest.json'));
 const files=walk(payload),epoch=new Date('2000-01-01T00:00:00Z');for(const p of files)utimesSync(join(payload,p),epoch,epoch);
 execFileSync('/usr/bin/zip',['-X','-q',join(output,'manager.zip'),'-@'],{cwd:payload,input:files.join('\n')+'\n'});
 manifest.zip_digest=hashFile(join(output,'manager.zip'));writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');writeFileSync(join(output,'manifest.sha256'),hashFile(join(output,'manifest.json'))+'\n');writeFileSync(join(output,'template.json'),JSON.stringify(synthesizeTemplate(text,manifest,{initial:!generation}),null,2)+'\n');return {manifest,output,payload,template:join(output,'template.json')};
}
export function runPackageCommand(argv){
 try{
  if(argv.length===1&&argv[0]==='--help')return {exitCode:0,stdout:'Usage: node scripts/package-manager.mjs --config FILE --revision COMMIT --output NEW_DIRECTORY [--lifecycle] [--generation ORIGINAL_GENERATION] [--compatible-from REVIEWED_PREVIOUS_COMMIT]\nPrepare pinned root/runtime AWS dependencies and zip first. No download or deployment occurs.\nKeep manager.zip next to manifest.json for upgrade checks. The lifecycle template includes alarm links and required permissions.\n'};
  const args={};
  for(let i=0;i<argv.length;i++){
   const flag=argv[i];
   if(args[flag]||!['--lifecycle','--config','--revision','--output','--generation','--compatible-from'].includes(flag))throw hostError('INVALID_INPUT');
   if(flag==='--lifecycle'){args[flag]=true;continue;}
   const value=argv[++i];
   if(!value||value.startsWith('--'))throw hostError('INVALID_INPUT');
   args[flag]=value;
  }
  if(!args['--config']||!args['--revision']||!args['--output'])throw hostError('INVALID_INPUT');
  const result=packageManager({configPath:args['--config'],revision:args['--revision'],output:args['--output'],generation:args['--generation'],lifecycle:args['--lifecycle'],compatibleFrom:args['--compatible-from']});
  return {exitCode:0,stdout:JSON.stringify({status:'packaged',output:result.output,manifest:result.manifest})+'\n'};
 }catch(e){
  const window=e.alarm_window;
  const detail=window?{
   alarm_window:window,
   message:`The alarm evaluation window is ${window.window_seconds} seconds with a limit of ${window.limit_seconds}. For example, use a 300-second cadence and 900-second freshness.`
  }:{};
  return {exitCode:2,stdout:JSON.stringify({status:'unavailable',code:e.code??'PACKAGE_SETUP',...detail})+'\n'};
 }
}
if(process.argv[1]&&existsSync(process.argv[1])&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){const r=runPackageCommand(process.argv.slice(2));process.stdout.write(r.stdout);process.exitCode=r.exitCode;}
