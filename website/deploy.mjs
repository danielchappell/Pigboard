import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {build} from './build.mjs';
import {canonicalOrigin, currentContract, smoke, saveReport} from './smoke.mjs';

export const app='pigboard-website';
const config='deploy/fly/website.toml';
const sha=/^[a-f0-9]{40}$/;
export function guard(env, head, remote) {
  if(env.GITHUB_REPOSITORY!=='danielchappell/ski-stack' || env.GITHUB_REF!=='refs/heads/main' ||
    !['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) || env.GITHUB_EVENT_NAME==='pull_request' ||
    !sha.test(env.GITHUB_SHA || '') || head!==env.GITHUB_SHA || remote!==head || !env.FLY_API_TOKEN) {
    throw new Error('Refusing deployment: require this repository, current main, push/manual event, exact checkout and app token');
  }
}
// Read historical exports as data. Unsupported syntax stops before any deployment.
export function historicalContract(source) {
  const art=source.match(/export const artwork = Object\.freeze\(\{([\s\S]*?)\}\);/);
  const pages=source.match(/export const routes = \[([\s\S]*?)\n\];/);
  if(!art || !pages) throw new Error('Unsupported historical website contract');
  const artwork={};
  const leftover=art[1].replace(/'([a-z0-9-]+\.png)'\s*:\s*'([a-f0-9]{64})'/g,(_,name,hash)=>{
    if(artwork[name]) throw new Error('Duplicate historical artwork');
    artwork[name]=hash; return '';
  }).replace(/[\s,]/g,'');
  const files=[];
  for(const line of pages[1].split('\n').filter(line=>line.trim())) {
    const match=line.match(/^\s*\['([a-z0-9.-]+\.html)', '(?:[^'\\]|\\.)*', '(?:[^'\\]|\\.)*'\],?\s*$/);
    if(!match || files.includes(match[1]) || match[1].includes('..')) throw new Error('Unsupported historical routes');
    files.push(match[1]);
  }
  if(leftover || !Object.keys(artwork).length || !files.includes('index.html')) throw new Error('Incomplete historical website contract');
  return {pages:files,artwork};
}
export function immutableImage(machine) {
  const image=machine.image_ref;
  if(image?.registry!=='registry.fly.io' || image.repository!==app || !/^sha256:[a-f0-9]{64}$/.test(image.digest || '')) throw new Error('Previous image lacks a dedicated immutable digest');
  return `${image.registry}/${image.repository}@${image.digest}`;
}
function realRun(command,args) {
  const result=spawnSync(command,args,{encoding:'utf8',timeout:600000,maxBuffer:16*1024*1024});
  if(result.error || result.status!==0) {
    const detail=(result.stderr || result.error?.message || '').replaceAll(process.env.FLY_API_TOKEN || 'unused-secret-marker','[redacted]').slice(-4000);
    throw new Error(`${command} ${args[0] || ''} failed: ${detail}`);
  }
  return result.stdout.trim();
}
export async function publish({env=process.env, run=realRun, verify=smoke, fetcher=fetch,
  buildSite=()=>build({out:'dist/website-image',origin:canonicalOrigin,commit:env.GITHUB_SHA}),
  pause=delay, output='dist/website-release'}={}) {
  mkdirSync(output,{recursive:true});
  const report={app, requested_commit:env.GITHUB_SHA, status:'preparing', previous:null};
  let mutated=false;
  const current=()=>guard(env,run('git',['rev-parse','HEAD']),run('git',['ls-remote','origin','refs/heads/main']).split(/\s/)[0]);
  const verifyEventually=async(commit,contract,name)=>{
    let last;
    for(let attempt=1;attempt<=6;attempt++) {
      try {return await verify({origin:canonicalOrigin,commit,contract,output:resolve(output,name)});}
      catch(error) {last=error;if(attempt<6) await pause(5000);}
    }
    throw last;
  };
  try {
    current();
    run('git',['diff','--exit-code','HEAD','--']);
    const machines=JSON.parse(run('flyctl',['machine','list','--app',app,'--json']));
    if(!Array.isArray(machines) || machines.length>1) throw new Error('Require zero or one website Machine before deployment');
    if(machines.length===1) {
      const image=immutableImage(machines[0]);
      const response=await fetcher(canonicalOrigin+'/version.json',{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!response.ok) throw new Error('Cannot establish previous live revision');
      const previous=await response.json();
      if(!sha.test(previous.commit || '') || previous.origin!==canonicalOrigin || previous.preview!==false) throw new Error('Invalid previous live revision');
      run('git',['merge-base','--is-ancestor',previous.commit,'HEAD']);
      const contract=historicalContract(run('git',['show',previous.commit+':website/build.mjs']));
      await verify({origin:canonicalOrigin,commit:previous.commit,contract,output:resolve(output,'previous-smoke.json')});
      const previousConfig=run('flyctl',['config','show','--app',app,'--toml']);
      if(!/^app\s*=\s*(['"])pigboard-website\1\s*$/m.test(previousConfig)) throw new Error('Previous config belongs to another app');
      const configPath=resolve(output,'previous.toml');
      writeFileSync(configPath,previousConfig+'\n');
      report.previous={commit:previous.commit,image,config:configPath,contract};
      saveReport(resolve(output,'previous.json'),report.previous);
    }
    buildSite();
    current();
    mutated=true; report.status='deploying'; saveReport(resolve(output,'release.json'),report);
    run('flyctl',['deploy','--app',app,'--config',config,'--remote-only','--ha=false','--image-label','website-'+env.GITHUB_SHA]);
    await verifyEventually(env.GITHUB_SHA,currentContract,'smoke.json');
    report.status='deployed';
  } catch(error) {
    report.error=String(error.message).replaceAll(env.FLY_API_TOKEN || 'unused-secret-marker','[redacted]');
    if(!mutated) report.status='refused';
    else if(report.previous) {
      try {
        run('flyctl',['deploy','--app',app,'--config',report.previous.config,'--image',report.previous.image,'--ha=false']);
        await verifyEventually(report.previous.commit,report.previous.contract,'rollback-smoke.json');
        report.status='rolled_back';
      } catch(rollbackError) {
        report.status='rollback_failed';report.rollback_error=String(rollbackError.message).replaceAll(env.FLY_API_TOKEN || 'unused-secret-marker','[redacted]');
      }
    } else {
      report.status='first_release_failed';
      report.recovery='No previous release exists. Inspect only pigboard-website Machines; fix forward or stop its new Machine. Do not delete the app or DNS.';
      try {
        report.machines=JSON.parse(run('flyctl',['machine','list','--app',app,'--json'])).map(m=>({id:m.id,state:m.state,image:m.image_ref}));
      } catch { report.machines_unavailable=true; }
    }
  } finally {
    report.finished_at=new Date().toISOString(); saveReport(resolve(output,'release.json'),report);
  }
  return report;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  publish().then(report=>{
    console.log(`Website release ${report.status}; evidence: dist/website-release/release.json`);
    if(report.status!=='deployed') {console.error(report.error);process.exitCode=1;}
  }).catch(error=>{console.error('Website release failed: '+error.message);process.exitCode=1;});
}
