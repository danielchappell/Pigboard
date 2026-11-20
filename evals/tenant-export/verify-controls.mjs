// Fixture qualification only: no model calls and no effectiveness result.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
import { exportPublic, publicFiles } from './export-public.mjs';
export { exportPublic, publicFiles };
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const publicNames=Object.freeze([
  'existing tenant list and administrator access',
  'prepared pagination handles empty continued pages and repeated cursors',
  'existing HTTP trusted tenant and admin checks',
  'export examples: pages, tenant scope, empty, validation and source error'
]);
export function inspectPublicChecks(stdout) {
  const outcomes=[], counts={};
  let planSeen=false;
  const incomplete=reason=>({status:'INCOMPLETE',outcomes,counts,reason});
  for(const line of stdout.split(/\r?\n/)) {
    if(/^Bail out!/i.test(line))return incomplete('Public run bailed out');
    if(/^(?:not )?ok\b/.test(line)) {
      if(planSeen)return incomplete('Test result follows completion plan');
      const match=/^(not ok|ok) (\d+) - (.+)$/.exec(line);
      if(!match)return incomplete('Malformed top-level test result');
      const ordinal=Number(match[2]);
      if(ordinal!==outcomes.length+1 || publicNames[ordinal-1]!==match[3])
        return incomplete('Missing, duplicate, unexpected or skipped public case');
      outcomes.push({ordinal,name:match[3],result:match[1]==='ok'?'PASS':'FAIL'});
    } else if(/^\d+\.\./.test(line)) {
      if(planSeen || line!=='1..4' || outcomes.length!==4)return incomplete('Invalid completion plan');
      planSeen=true;
    } else {
      const match=/^# (tests|pass|fail|cancelled|skipped|todo) (.*)$/.exec(line);
      if(!match)continue; // Node diagnostics, YAML and timing comments are not results.
      if(!planSeen || Object.hasOwn(counts,match[1]) || !/^\d+$/.test(match[2]))
        return incomplete('Missing, duplicate or malformed completion counts');
      counts[match[1]]=Number(match[2]);
    }
  }
  if(!planSeen || outcomes.length!==4)return incomplete('Public execution did not complete');
  const passed=outcomes.filter(o=>o.result==='PASS').length;
  if(counts.tests!==4 || counts.pass!==passed || counts.fail!==4-passed ||
      counts.cancelled!==0 || counts.skipped!==0 || counts.todo!==0)
    return incomplete('Public completion counts are missing or inconsistent');
  return {status:'COMPLETE',outcomes,counts,reason:null};
}
export function publicChecksMatch(checks,receipt,expectedExit) {
  return checks.status==='COMPLETE' && !receipt.error && !receipt.signal &&
    receipt.status===expectedExit && [0,1].includes(expectedExit) &&
    checks.outcomes.every((o,index)=>o.result===(index<3 || expectedExit===0?'PASS':'FAIL'));
}
async function command(output,id,cwd,executable,args,env={}) {
  const started=performance.now();
  const childEnv={...process.env,...env};
  delete childEnv.NODE_TEST_CONTEXT;
  const result=spawnSync(executable,args,{cwd,env:childEnv,encoding:'utf8',timeout:10000,maxBuffer:2*1024*1024});
  const receipt={executable,args,cwd,status:result.status,signal:result.signal,error:result.error?.message??null,wallMs:Math.ceil(performance.now()-started)};
  await writeFile(path.join(output,id+'.stdout.txt'),result.stdout??'');
  await writeFile(path.join(output,id+'.stderr.txt'),result.stderr??'');
  await writeFile(path.join(output,id+'.receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  return {receipt,stdout:result.stdout??''};
}
export async function verifyControls(output) {
  output=path.resolve(output);await mkdir(output); // Refuse any reused path.
  const spec=JSON.parse(await readFile(path.join(here,'private/broken-controls.json'),'utf8'));
  const pass={adapter:'PASS',requirements:Object.fromEntries(['M1.1','M1.2','M1.3','M1.4'].map(id=>[id,'PASS']))};
  const cases=[{id:'reference',expected:pass,expectedPublicExit:0},...spec.controls,spec.alternative];
  const results=[];
  for(const control of cases) {
    const folder=path.join(output,control.id);await mkdir(folder);
    const subject=path.join(folder,'public');
    const manifest=await exportPublic(subject);
    await writeFile(path.join(folder,'starter-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    try {
      const patch=await command(folder,'apply-reference',subject,'git',['apply',path.join(here,'private/reference.patch')]);
      if(patch.receipt.status!==0)throw new Error('Reference patch did not apply');
      if(control.file) {
        const target=path.join(subject,control.file), text=await readFile(target,'utf8');
        if(text.split(control.before).length!==2)throw new Error(`Mutation does not match once: ${control.id}`);
        await writeFile(target,text.replace(control.before,control.after));
      }
      const publicRun=await command(folder,'public-checks',subject,process.execPath,['--test','--test-reporter=tap','test.mjs'],{EXPORT_TASK_TEST:'1'});
      let publicChecks=inspectPublicChecks(publicRun.stdout);
      if(publicRun.receipt.error || publicRun.receipt.signal || publicRun.receipt.status===null)
        publicChecks={...publicChecks,status:'INCOMPLETE',reason:'Public process failed to complete'};
      const grading=await command(folder,'private-grade',subject,process.execPath,[path.join(here,'private/grade.mjs'),subject,...(control.graderArgs??[])]);
      const observed=JSON.parse(grading.stdout);
      const actual={adapter:observed.adapter,requirements:observed.requirements};
      const expectedGradeExit=control.expected.adapter==='FAIL'||Object.values(control.expected.requirements).includes('FAIL')?1:Object.values(control.expected.requirements).includes('INCOMPLETE')?2:0;
      const matched=JSON.stringify(actual)===JSON.stringify(control.expected)&&publicChecksMatch(publicChecks,publicRun.receipt,control.expectedPublicExit)&&grading.receipt.status===expectedGradeExit&&!grading.receipt.error&&!grading.receipt.signal;
      const finalManifest={};for(const name of publicFiles)finalManifest[name]=hash(await readFile(path.join(subject,name)));
      await writeFile(path.join(folder,'result-manifest.json'),JSON.stringify(finalManifest,null,2)+'\n');
      results.push({id:control.id,matched,expected:control.expected,actual,expectedPublicExit:control.expectedPublicExit,publicExit:publicRun.receipt.status,publicChecks,graderExit:grading.receipt.status,observations:observed.observations??[],folder});
    } catch(error) { results.push({id:control.id,matched:false,setup:'INCOMPLETE',detail:error.message,folder}); }
  }
  const report={kind:'fixture_qualification',fixture:'tenant-export',model:null,complete:results.every(r=>r.matched),results};
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==3){console.error('Usage: node evals/tenant-export/verify-controls.mjs NEW_DIRECTORY');process.exitCode=2;}
  else try{const report=await verifyControls(process.argv[2]);console.log(JSON.stringify({output:path.resolve(process.argv[2]),complete:report.complete,controls:report.results.length,matched:report.results.filter(r=>r.matched).length}));process.exitCode=report.complete?0:1;}
  catch(error){console.error(error.message);process.exitCode=2;}
}
