#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,cpSync,readdirSync,lstatSync,utimesSync,existsSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {hostConfig,sha256,deriveHostControls,loadHostSDK,hostError} from '../lib/aws/installation.mjs';
import {synthesizeTemplate} from '../lib/aws/template.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const hashFile=p=>sha256(readFileSync(p));
function walk(base,prefix=''){let files=[];for(const e of readdirSync(join(base,prefix),{withFileTypes:true})){const p=prefix?prefix+'/'+e.name:e.name;if(e.isDirectory())files.push(...walk(base,p));else if(e.isFile())files.push(p);else if(!e.isSymbolicLink())throw hostError('PAYLOAD_TYPE');}return files.sort();}
function closure(source,entry,seen=new Set()){
 if(seen.has(entry))return seen;seen.add(entry);const text=readFileSync(join(source,entry),'utf8');
 for(const match of text.matchAll(/(?:from\s*|import\s*\(|new URL\s*\()(['"])(\.[^'"]+)\1/g)){const target=relative(source,resolve(dirname(join(source,entry)),match[2]));if(target.startsWith('..'))throw hostError('PAYLOAD_PATH');if(target.endsWith('.mjs'))closure(source,target,seen);else if(existsSync(join(source,target))&&lstatSync(join(source,target)).isFile())seen.add(target);}
 return seen;
}
export function packageManager({configPath,output,source=root,revision,generation}={}){
 source=resolve(source);output=resolve(output);if(existsSync(output))throw hostError('OUTPUT_EXISTS');
 const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();const head=git('rev-parse','HEAD');if(!revision||head!==revision||!/^[0-9a-f]{40}$/.test(revision)||git('status','--porcelain','--untracked-files=normal'))throw hostError('PINNED_CLEAN_SOURCE_REQUIRED');
 loadHostSDK();const text=readFileSync(configPath,'utf8'),{config,digest}=hostConfig(text),projection=deriveHostControls(text,{package_revision:revision});if(!generation&&(config.manager.controls.schedule_enabled||config.manager.controls.writes_enabled||config.manager.controls.maintenance))throw hostError('INITIAL_DISABLED_REQUIRED');
 const manifest={schema:'pigboard-manager-package/v1',source_revision:revision,configuration_digest:digest,installation_id:config.manager.installation_id,domain_id:config.manager.domain_id,installation_generation:generation??randomUUID(),runtime:'nodejs24.x',sender:true,canonical_config:config,dependency_hashes:{root:hashFile(join(source,'package-lock.json')),aws:hashFile(join(source,'runtime/aws/package-lock.json'))},payload_hashes:{},logical_resources:['Function','Schedule','LogGroup','StateTable','RuntimeRole','SchedulerRole']};
 const payload=join(output,'payload');mkdirSync(payload,{recursive:true});
 for(const p of new Set([...closure(source,'lib/aws/manager-lambda.mjs'),'contracts/epic-v1.schema.json','contracts/ticket-v1.schema.json'])){mkdirSync(dirname(join(payload,p)),{recursive:true});cpSync(join(source,p),join(payload,p));}
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
export function runPackageCommand(argv){try{if(argv.length===1&&argv[0]==='--help')return {exitCode:0,stdout:'Usage: node scripts/package-manager.mjs --config FILE --revision COMMIT --output NEW_DIRECTORY [--generation ORIGINAL_GENERATION]\nPrepare pinned root/runtime AWS dependencies and zip first. No download or deployment occurs.\n'};const args={};for(let i=0;i<argv.length;i+=2){if(!['--config','--revision','--output','--generation'].includes(argv[i])||args[argv[i]]||!argv[i+1]||argv[i+1].startsWith('--'))throw hostError('INVALID_INPUT');args[argv[i]]=argv[i+1];}if(!args['--config']||!args['--revision']||!args['--output'])throw hostError('INVALID_INPUT');const result=packageManager({configPath:args['--config'],revision:args['--revision'],output:args['--output'],generation:args['--generation']});return {exitCode:0,stdout:JSON.stringify({status:'packaged',output:result.output,manifest:result.manifest})+'\n'};}catch(e){return {exitCode:2,stdout:JSON.stringify({status:'unavailable',code:e.code??'PACKAGE_SETUP'})+'\n'};}}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=runPackageCommand(process.argv.slice(2));process.stdout.write(r.stdout);process.exitCode=r.exitCode;}
