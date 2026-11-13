#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash, randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const names=['pigboard-plan-review','pigboard-execution'];
const sources=fileURLToPath(new URL('../config/cursor/agents/',import.meta.url));
const inside=(a,b)=>{const r=path.relative(a,b);return r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
async function stat(p){try{return await fs.lstat(p);}catch(e){if(e.code!=='ENOENT')throw e;}}
async function canonical(p){try{return await fs.realpath(p);}catch(e){if(e.code!=='ENOENT')throw e;if(await stat(p))throw Error('Dangling setup path.');return path.join(await canonical(path.dirname(p)),path.basename(p));}}
async function validateDestination(root,app){
  if(!path.isAbsolute(root)||path.resolve(root)!==root||await canonical(root)!==root)throw Error('Agent directory must be absolute, canonical and without symlinks.');
  if(inside(app,root)||inside(root,app))throw Error('Agent directory must be separate from the application.');
  for(let dir=root;;dir=path.dirname(dir)){
    if(await stat(path.join(dir,'.git')))throw Error('Agent directory must be outside Git checkouts.');
    if(path.dirname(dir)===dir)break;
  }
  const existing=await stat(root);if(existing&&!existing.isDirectory())throw Error('Agent destination is not a directory.');
}
async function checkProjectAgents(dir){
  const info=await stat(dir);if(!info)return;
  if(info.isSymbolicLink()||!info.isDirectory())throw Error('Project agent path requires operator inspection.');
  for(const item of await fs.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,item.name);
    if(item.isSymbolicLink())throw Error('Project agent symlink requires operator inspection.');
    if(item.isDirectory()){await checkProjectAgents(p);continue;}
    if(!item.isFile()||!item.name.endsWith('.md'))continue;
    const body=await fs.readFile(p,'utf8');
    const front=body.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]??'';
    const declared=front.match(/^name:\s*["']?([a-z0-9-]+)["']?\s*$/m)?.[1];
    if(names.includes(path.basename(item.name,'.md'))||names.includes(declared))throw Error('Project definition shadows a Pigboard phase agent; preserved for operator resolution.');
  }
}
export async function installCursorAgents({app=process.cwd(),directory=path.join(os.homedir(),'.cursor','agents')}={}){
  if(Number(process.versions.node.split('.')[0])<20)throw Error('Node 20+ required.');
  app=await fs.realpath(app);await validateDestination(directory,app);
  for(const tool of ['.cursor','.claude','.codex']){
    const toolPath=path.join(app,tool), info=await stat(toolPath);
    if(info?.isSymbolicLink())throw Error('Project agent parent symlink requires operator inspection.');
    await checkProjectAgents(path.join(toolPath,'agents'));
  }
  const definitions=[];
  for(const name of names){
    const source=path.join(sources,name+'.md'), sourceStat=await fs.lstat(source);
    if(!sourceStat.isFile()||sourceStat.isSymbolicLink())throw Error('Invalid phase definition source.');
    const bytes=await fs.readFile(source), target=path.join(directory,name+'.md'), existing=await stat(target);
    if(existing&&(!existing.isFile()||existing.isSymbolicLink()||!bytes.equals(await fs.readFile(target))))throw Error('Existing phase definition differs; preserved for operator resolution.');
    definitions.push({name,bytes,target,reused:Boolean(existing)});
  }
  await fs.mkdir(directory,{recursive:true,mode:0o700});await validateDestination(directory,app);
  for(const item of definitions){
    if(item.reused)continue;
    const temporary=path.join(directory,'.pigboard-'+randomUUID());
    try{
      await fs.writeFile(temporary,item.bytes,{flag:'wx',mode:0o600});
      await fs.link(temporary,item.target);
    }finally{await fs.rm(temporary,{force:true});}
  }
  return {directory,definitions:definitions.map(x=>({name:x.name,reused:x.reused,sha256:createHash('sha256').update(x.bytes).digest('hex')})),actualModelVerified:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),options={};
    for(let i=0;i<args.length;i+=2){
      if(!['--app','--directory'].includes(args[i])||!args[i+1]||options[args[i].slice(2)])throw Error('Usage: install-cursor-agents.mjs [--app DIR] [--directory DIR]');
      options[args[i].slice(2)]=args[i+1];
    }
    console.log(JSON.stringify(await installCursorAgents(options)));
  }catch(e){console.error(e.code?'Phase setup failed; inspect paths; complete files already installed may remain.':e.message);process.exitCode=1;}
}
