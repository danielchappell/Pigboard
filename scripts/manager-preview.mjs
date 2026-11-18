#!/usr/bin/env node
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
const args=process.argv.slice(2),options={};let json=args.includes('--json'),result,exit=2;
const base=()=>({schema:'pigboard-manager-preview/v1',valid:false,status:'invalid',validation_scope:'supplied_snapshot',live_freshness:'not_evaluated',permission:'not_evaluated',destination_authority:'not_evaluated',execution_authorized:false,writes:0,configuration_digest:null,snapshot_digest:null,scope_diagnostics:[],streams:[],...(options.mode==='ordinary'?{schema:'pigboard-manager-preview/v2',mode:'ordinary',proof_basis:'authenticated_recorded_handoffs',external_freshness:'not_evaluated',metadata_continuity:'supplied_prior_tuples_only'}:{})});
const help=`Preview ready work and repairs from a complete supplied snapshot (Node 20+).\nSource: node scripts/manager-preview.mjs --config FILE --input FILE [--mode ordinary] [--expected-site HTTPS_ORIGIN] [--expected-snapshot-digest sha256:HEX] [--json]\nInstalled: node <receipt.skills>/work-validator/scripts/manager-preview.mjs --config FILE --input FILE --json\nLocal only: no provider access, credentials, state writes, execution or activation.\nOrdinary mode requires snapshot/v2 and authenticated recorded handoffs; hidden external PR changes are not detected. Omitted mode retains legacy snapshot/v1 repair preview.\nSupply the one canonical YAML/JSON configuration and JSON snapshot. Completeness is a supplied assertion; live freshness and permissions are not evaluated.\nBounds: configuration 1MiB; snapshot 16MiB, depth48, arrays1000, projects100, Epics100, issues1000, streams1000, receipts100. Embedded contracts keep their stricter bounds.\nExamples, fixture export and recovery: docs/manager-preview.md. Repair proposals distinguish queue-only edges, admission and required stack-request publication. No proposal executes or publishes its payload.\nExit 0: evaluated selection/wait; 1: invalid/held/partial/changed; 2: usage/input/setup/internal failure.\n`;
async function readLocal(filePath,limit){let file;try{file=await open(filePath,constants.O_RDONLY|constants.O_NONBLOCK);if(!(await file.stat()).isFile())throw Error();const bytes=Buffer.alloc(limit+1);let count=0;while(count<bytes.length){const r=await file.read(bytes,count,bytes.length-count,null);if(!r.bytesRead)break;count+=r.bytesRead;}return bytes.subarray(0,count);}catch{throw Error('INPUT');}finally{await file?.close();}}
try{
 const seen=new Set();for(let i=0;i<args.length;i++){const flag=args[i];if(!['--mode','--config','--input','--expected-site','--expected-snapshot-digest','--json','--help'].includes(flag)||seen.has(flag))throw Error('USAGE');seen.add(flag);if(['--json','--help'].includes(flag))options[flag.slice(2)]=true;else{if(!args[i+1]||args[i+1].startsWith('--')||args[i+1]==='-')throw Error('USAGE');options[flag.slice(2)]=args[++i];}}
 if(options.help){if(args.some(a=>!['--help','--json'].includes(a)))throw Error('USAGE');if(json)console.log(JSON.stringify({schema:'pigboard-manager-preview/v1',help,execution_authorized:false,writes:0}));else process.stdout.write(help);process.exitCode=0;}
 else{
  if(options.mode!==undefined&&options.mode!=='ordinary')throw Error('USAGE');
  if(!options.config||!options.input)throw Error('USAGE');let runtime,configRuntime;try{runtime=await import('../lib/manager/decisions.mjs');configRuntime=await import('../lib/config/parse.mjs');}catch{throw Error('SETUP');}
  if(options['expected-site']!==undefined&&!configRuntime.httpsURL(options['expected-site'],true)||options['expected-snapshot-digest']!==undefined&&!/^sha256:[0-9a-f]{64}$/.test(options['expected-snapshot-digest']))throw Error('USAGE');
  const config=await readLocal(options.config,1048576),snapshot=await readLocal(options.input,16*1024*1024);
  result=runtime.previewSnapshot(config,snapshot,{...(options.mode?{mode:options.mode}:{}),...(options['expected-site']===undefined?{}:{expectedSite:options['expected-site']}),...(options['expected-snapshot-digest']===undefined?{}:{expectedSnapshotDigest:options['expected-snapshot-digest']})});exit=result.valid&&result.status==='complete'?0:1;
 }
}catch(e){const code=['USAGE','INPUT','SETUP'].includes(e.message)?e.message:'INTERNAL';result={...base(),scope_diagnostics:[{code,path:'',scope:null,message:{USAGE:'Use --config FILE --input FILE and optional expected-site/digest and --json. Run --help for examples.',INPUT:'Read local regular files with sufficient permissions; use an explicit path for a filename resembling a flag.',SETUP:'Preview runtime is missing or corrupt. Prepare source dependencies or rerun normal approved Pigboard preparation outside preview; this command never repairs dependencies.',INTERNAL:'Preview could not complete. Check the prepared runtime and report this failure.'}[code]}]};}
if(result){if(json)console.log(JSON.stringify(result));else{
 console.log(`Local supplied snapshot only. Preview: ${result.status}. No execution authority; writes: 0. Freshness and permissions: not evaluated.`);
 if(result.mode==='ordinary')console.log('Ordinary proof: authenticated recorded handoffs; hidden external PR changes are not detected. Earlier metadata is compared only when supplied.');
 for (const s of result.streams) {
  console.log(`${JSON.stringify(s.scope)}: ${s.decision}; Human Review ${s.counts_complete?s.human_review_ids.length:'unknown'}; return ${s.return_count??'unknown'}; selected ${s.selected_key??'none'}.`);
  const proposal = s.proposal;
  if (proposal) {
   console.log(`  Proposal ${proposal.kind}: ${proposal.from_stage} → ${proposal.to_stage}; publication required ${proposal.publication_required}.`);
   if (result.mode === 'ordinary' && proposal.kind === 'admit_repair') {
    const assignment = proposal.existing_assignment;
    const pr = proposal.existing_pr;
    console.log(`  Existing assignment: ticket ${assignment.ticket_id}; comment ${assignment.comment_id}; record ${assignment.record_id}; digest ${assignment.digest}.`);
    console.log(`  Recorded PR: provider ${pr.provider}; repository ${pr.repository}; number ${pr.number}; source revision ${pr.source_revision}; target branch ${pr.target_branch}.`);
   }
   if (proposal.required_parent) console.log(`  Parent ${proposal.required_parent.ticket_id} revision ${proposal.required_parent.required_revision}; retained causes ${proposal.roots.length}.`);
   for (const root of proposal.roots) console.log(`  Cause: ticket ${root.ticket_id}; comment ${root.comment_id}; record ${root.record_id}; digest ${root.digest}.`);
  }
  for (const row of s.repair_order??[]) console.log(`  Repair ${row.key}: ${row.state}.`);
  for (const r of s.reasons) console.log(`  ${r.code} ${r.path}: ${r.message}`);
  for (const c of s.candidates) for (const r of c.reasons) console.log(`  Candidate ${c.key}: ${r.code} ${r.path}: ${r.message}`);
 }
 for(const d of result.scope_diagnostics)console.log(`${d.code} ${d.path}: ${d.message}`);
 if(result.snapshot_digest)console.log(`Snapshot digest: ${result.snapshot_digest}`);
 }process.exitCode=exit;}
