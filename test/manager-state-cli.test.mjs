import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync,execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runReconciliationGroup} from '../scripts/test-manager-apply.mjs';
import {formatTransitionInspection,runStateCommand} from '../scripts/manager-state.mjs';
import {resolverJourney} from '../scripts/test-aws-manager.mjs';
test('bound state CLI resolves selected operator and renders readable JSON all four record kinds',async()=>{const r=await resolverJourney();assert.equal(Object.keys(r.inspections).length,8);});
test('state CLI help and strict flags perform no resolution',async()=>{let calls=0;const options={resolveInstallation:()=>{calls++;}};assert.equal((await runStateCommand(['--help'],options)).exitCode,0);assert.equal((await runStateCommand(['init','--config','x','--installation','x','--operator-profile','operator','--force'],options)).exitCode,2);assert.equal((await runStateCommand(['init','--config','x','--installation','x','--operator-profile','operator','--recovery'],options)).exitCode,2);assert.equal(calls,0);});

test('explicit recovery inspect dispatches only the recovery purpose and preserves State result and warning parity',async()=>{
 const purposes=[],stateResult={schema:'pigboard-state-result/v1',status:'confirmed',code:'OK',diagnostics:[],data:{records:[],controls_match:false,complete:true,next_cursor:null}},metadata={package_verified:false,warning:'Recovery only; package safety unverified',original:{configuration_digest:'original'},desired:{configuration_digest:'desired'},observed:{configuration_digest:null},applied:{configuration_digest:'applied'},omissions:'unavailable observed digest'};
 const dependencies={resolveInstallation:async input=>{purposes.push(input.purpose);return {recovery:metadata};},createState:()=>({inspect:async()=>stateResult,close(){}})},args=['inspect','--config','x','--installation','x','--operator-profile','operator','--kind','attempt'];
 const normal=await runStateCommand([...args,'--json'],dependencies);assert.equal(normal.outcome.recovery,undefined);
 const readable=await runStateCommand([...args,'--recovery'],dependencies),json=await runStateCommand([...args,'--recovery','--json'],dependencies);assert.equal(json.exitCode,0);assert.deepEqual(json.outcome.data,stateResult.data);assert.deepEqual(readable.outcome,json.outcome);assert(readable.stdout.includes(JSON.stringify(metadata)));assert.deepEqual(JSON.parse(json.stdout),json.outcome);assert.deepEqual(purposes,['inspect','recovery-inspect','recovery-inspect']);
 let calls=0;const refused=await runStateCommand(args,{resolveInstallation:async()=>{calls++;throw Error('strict binding failed');}});assert.equal(refused.exitCode,2);assert.equal(calls,1);assert.equal(refused.outcome.recovery,undefined);assert((await runStateCommand(['--help'])).stdout.includes('--recovery'));
});

import {composedTransitionFixture} from '../scripts/test-transition-proof.mjs';
import {transitionProof} from '../lib/state/contract.mjs';
test('actual bound CLI displays capture states with truthful read-only control mismatch', async () => {
  const c = await composedTransitionFixture();
  try {
    const initial = await c.inspect();
    assert.match(initial.readable, /Transition capture: none/);
    assert.equal(initial.json.data.controls_match, false);
    assert.equal((await c.retain()).status, 'confirmed');
    assert.equal((await c.prepare()).status, 'confirmed');
    const prepared = await c.inspect();
    assert.match(prepared.readable, /Transition capture: prepared/);
    assert.match(prepared.readable, new RegExp(c.expected.request_digest));
    assert.equal(transitionProof(prepared.json.data.records[0]).http_status, null);
    assert.equal((await c.response(409)).status, 'confirmed');
    const captured = await c.inspect();
    assert.match(captured.readable, /Transition capture: response-captured/);
    assert.match(captured.readable, /Original HTTP response: 409; outcome remains pending/);
    assert.deepEqual(captured.json.data.records[0], c.records().attempt);
    assert.equal(c.records().attempt.extensions.pb_capture_request_digest, c.expected.request_digest);
    assert.equal(c.records().attempt.extensions.pb_capture_publication_digest, c.expected.publication_digest);
    assert.equal(c.records().attempt.extensions.unrelated_flag, true);
    assert.equal(c.records().stream.pending_attempt_id, c.records().attempt.attempt_id);
    assert.equal(c.records().stream.revision, 0);
    const record = c.records().attempt;
    c.provider.seed({...record, extensions: {...record.extensions, pb_capture_version: 2}});
    const unsupported = await c.inspect();
    assert.match(unsupported.readable, /Transition capture: unsupported/);
    assert.equal(transitionProof(unsupported.json.data.records[0]).state, 'unsupported');
  } finally { c.cleanup(); }
});

test('Jira evidence flags require one exact named attempt before resolving AWS',async()=>{
  const base=['--config','config.yaml','--installation','receipt.json','--operator-profile','operator'];
  const attempt='attempt:11111111-1111-4111-8111-111111111111';
  const evidence=['inspect',...base,'--kind','attempt','--record-id',attempt,'--jira-evidence'];
  let calls=0;
  const dependencies={resolveInstallation:async()=>{calls++;throw Error('unexpected resolution');}};
  const invalid=[
    ['init',...base,'--jira-evidence'],
    ['init',...base,'--original-installation','prior.json'],
    ['inspect',...base,'--kind','attempt','--record-id',attempt,'--original-installation','prior.json'],
    ['inspect',...base,'--kind','attempt','--jira-evidence'],
    ['inspect',...base,'--kind','stream','--record-id',attempt,'--jira-evidence'],
    ['inspect',...base,'--kind','attempt','--record-id','attempt:NOT-A-UUID','--jira-evidence'],
    [...evidence,'--recovery'],[...evidence,'--limit','1'],[...evidence,'--cursor','AAAA'],
    [...evidence,'--endpoint','https://never-used.invalid'],[...evidence,'--secret-reference','opaque'],
    [...evidence,'--evidence-result','result.json']
  ];
  for(const args of invalid){
    const result=await runStateCommand([...args,'--json'],dependencies);
    assert.equal(result.exitCode,2,args.join(' '));
    assert.equal(result.outcome.status,'invalid');
    assert.equal(result.outcome.code,'INVALID_INPUT');
  }
  assert.equal(calls,0);
  const help=(await runStateCommand(['--help'])).stdout;
  assert.match(help,/--jira-evidence/);
  assert.match(help,/--original-installation/);
});

test('readable history encodes a multiline provider actor on one line with exact machine parity',()=>{
  const actor='fixture actor\ncontinued\r\u001b[2J\u0085\u2028\u2029';
  const item={issue_id:'1001',history_id:'42',item_index:0,actor_id:actor,from_status_id:'1',to_status_id:'2',created:'2026-11-17T12:00:00.000Z'};
  const dimension=(status,extra={})=>({status,code:null,...extra});
  const attempt_id='11111111-1111-4111-8111-111111111111';
  const outcome={schema:'pigboard-transition-inspection/v1',status:'complete',code:'OK',diagnostics:[],writes:0,execution_authorized:false,
    data:{attempt_id,pending_attempt_id:attempt_id,state_outcome:'pending',revisions:{installation:5,stream:0,attempt:3},
      desired_controls:{writes_enabled:true},applied_controls:{writes_enabled:true},observed_schedule:'ENABLED',controls_match:true,schedule_matches_applied:true,
      pending:dimension('held'),original_capture:dimension('confirmed',{http_status:204,interpretation:'success_reply'}),
      original_authority:dimension('confirmed',{source:'current_receipt'}),original_metadata:dimension('confirmed'),inventory:dimension('confirmed'),
      recovery_credential:dimension('acquired'),jira_acquisition:dimension('acquired'),assignment:dimension('matched'),recorded_proof:dimension('confirmed'),
      publication:dimension('confirmed'),native_history:dimension('complete',{observed_count:1,items:[item],truncated:false,request_attribution:'none'}),
      jira_observations:'as_observed',state_fence:dimension('confirmed'),current_agreement:'confirmed'}};
  const output=formatTransitionInspection(outcome,false).stdout;
  const machine=JSON.parse(formatTransitionInspection(outcome,true).stdout);
  const prefix='Native history item ';
  const lines=output.split('\n').filter(line=>line.startsWith(prefix));
  assert.equal(lines.length,1);
  assert.deepEqual(JSON.parse(lines[0].slice(prefix.length)),item);
  assert.deepEqual(machine.data.native_history.items,[item]);
  assert(!/[\r\u001b\u0085\u2028\u2029]/u.test(output));
});

test('reconcile help and request flags expose no caller-controlled authority',async()=>{
  const flags=['--config','config.json','--installation','receipt.json','--operator-profile','operator','--request','request.json'];
  const help=(await runStateCommand(['--help'])).stdout;
  assert.match(help,/manager-state\.mjs reconcile .*--operator-profile NAME --request FILE/);
  let calls=0;
  const resolver=async()=>{calls++;throw Error('Invalid arguments must stop before installation resolution');};
  for(const injected of [['--actor','fixture'],['--stop-id','fixture'],['--endpoint','https://never-used.invalid'],['--recovery'],['--kind','attempt']]){
    const answer=await runStateCommand(['reconcile',...flags,...injected,'--json'],{resolveInstallation:resolver});
    assert.equal(answer.outcome.code,'INVALID_INPUT');
    assert.equal(answer.exitCode,2);
  }
  assert.equal(calls,0);
});

test('real request files are regular, nonblocking and bounded at 16 KiB before providers',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'pigboard-state-file-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const request={schema:'pigboard-reconciliation-request/v1',attempt_id:'11111111-1111-4111-8111-111111111111',
    disposition:'confirmed_applied',expected_installation_revision:0,expected_stream_revision:0,expected_attempt_revision:0};
  const body=JSON.stringify(request);
  const regular=join(directory,'request.json'),limit=join(directory,'limit.json'),
    oversized=join(directory,'oversized.json'),fifo=join(directory,'request.fifo');
  await writeFile(regular,body);
  await writeFile(limit,body.padEnd(16384,' '));
  await writeFile(oversized,body.padEnd(16385,' '));
  const args=path=>['reconcile','--config','invalid-local-path','--installation','invalid-local-path','--operator-profile','operator',
    '--request',path,'--json'];
  let resolved=0;
  const dependencies={resolveInstallation(){resolved++;throw Error('Injected fixture stops before SDK construction');}};
  for(const path of [regular,limit]){
    const answer=await runStateCommand(args(path),dependencies);
    assert.notEqual(answer.outcome.code,'INVALID_INPUT');
  }
  assert.equal(resolved,2);
  for(const path of [directory,join(directory,'missing.json'),oversized]){
    const answer=await runStateCommand(args(path),dependencies);
    assert.equal(answer.exitCode,2);
    assert.equal(answer.outcome.code,'INVALID_INPUT');
    assert.equal(answer.outcome.data,null);
    assert(!answer.stdout.includes(directory));
  }
  assert.equal(resolved,2);
  execFileSync('mkfifo',[fifo]);
  const child=spawnSync(process.execPath,['scripts/manager-state.mjs',...args(fifo)],{encoding:'utf8',timeout:4000});
  assert.equal(child.error,undefined);
  assert.equal(child.signal,null);
  assert.equal(child.status,2);
  assert.equal(child.stderr,'');
  const outcome=JSON.parse(child.stdout);
  assert.equal(outcome.status,'invalid');
  assert.equal(outcome.code,'INVALID_INPUT');
  assert.equal(outcome.data,null);
  assert(!child.stdout.includes(directory));
});

test('named inspect reports the coherent terminal revision and decision after a competing settlement',async()=>{
  const {runs:[run]}=await runReconciliationGroup('R1-15-H01',{regressions:['coherent_readback']});
  const [readable,json,unavailable]=run.commands.slice(-3);
  const oldRevision=run.request.expected_attempt_revision;
  assert.deepEqual(readable.outcome,json.outcome);
  assert.match(readable.stdout,/"outcome":"applied"/);
  assert.equal(json.outcome.data.records[0].revision,oldRevision+1);
  assert.equal(json.outcome.data.operator_decision.attempt_revision,oldRevision+1);
  assert.equal(unavailable.outcome.data.records[0].revision,oldRevision);
  assert.equal(unavailable.outcome.data.records[0].outcome,'pending');
  assert.equal(unavailable.outcome.data.operator_decision,undefined);
  assert.equal(unavailable.outcome.data.operator_decision_provenance.status,'unavailable');
});
