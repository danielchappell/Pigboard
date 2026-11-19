import test from 'node:test';
import assert from 'node:assert/strict';
import {runReconciliationGroup} from '../scripts/test-manager-apply.mjs';
import {operatorActorId,validOperatorActor,parseReconciliationRequest} from '../lib/state/contract.mjs';

test('reconciliation request rejects duplicate, unknown and non-JSON authority fields', () => {
  assert.throws(() => parseReconciliationRequest('{"schema":"x","schema":"y"}'));
  assert.throws(() => parseReconciliationRequest('schema: pigboard-reconciliation-request/v1'));
  assert.throws(() => parseReconciliationRequest('{"drained":true}'));
});

test('exact native principal encoding is reversible, bounded and preserves session identity', () => {
  const actor=operatorActorId({account_id:'123456789012',user_id:'AROA:session'});
  assert(validOperatorActor(actor));
  assert(!validOperatorActor(actor+'='));
  assert(!validOperatorActor('aws:arbitrary'));
  assert.notEqual(actor,operatorActorId({account_id:'123456789012',user_id:'AROA:next-session'}));
  assert.throws(()=>operatorActorId({account_id:'123456789012',user_id:'a'.repeat(187)}),error=>error.stateResult.code==='OPERATOR_ID_UNSUPPORTED');
});

test('conditional writes preserve all four actions and require current verified stop lineage',async()=>{
  const {runs}=await runReconciliationGroup('R1-15-H01',{regressions:['write_before_commit','conditional_race',
    'prior_stop','wrong_stop_scope','missing_stop','production_stop']});
  assert.equal(runs.length,6);
  for(const {id,commands} of runs){
    const submit=commands.find(({command})=>command[2]==='reconcile');
    assert.notEqual(submit.exitCode,0,submit.stdout);
    assert.equal(submit.state_writes.length,['write_before_commit','conditional_race'].includes(id)?1:0,id);
    const before=new Map(submit.state_before),after=new Map(submit.state_after);
    assert.deepEqual([...before.keys()],[...after.keys()],id);
    for(const [key,row] of before){
      const expected=id==='conditional_race'&&row.kind==='stream'?{...row,revision:row.revision+1}:row;
      assert.deepEqual(after.get(key),expected,id);
    }
    assert.equal(commands.at(-1).outcome.data.records[0].outcome,'pending',id);
  }
});

test('verified lifecycle maintenance stop authorizes the original named decision before a separate restart',async()=>{
  const {runLifecycleFixture}=await import('../scripts/test-aws-manager.mjs');
  const {commands,sender,rejected_updates:rejected}=await runLifecycleFixture('R1-16-H01');
  for(const verb of ['upgrade','configure'])assert.deepEqual(rejected.filter(row=>row.verb===verb).map(row=>row.code),
    ['UNSUPPORTED_VERSION','UNSUPPORTED_PACKAGE','MALFORMED_RECORD','INCOMPLETE_INVENTORY']);
  const stop=commands.find(({outcome})=>outcome?.proof===true);
  const reconcile=commands.find(({command})=>command[2]==='reconcile');
  assert.equal(reconcile.exitCode,0,reconcile.stdout);
  assert(commands.indexOf(stop)<commands.indexOf(reconcile));
  assert.equal(reconcile.state_before.find(([,row])=>row.kind==='installation')[1].writes_enabled,false);
  const decision=reconcile.state_after.find(([,row])=>row.schema==='pigboard-operator-decision/v1')?.[1];
  assert(decision);
  assert.equal(decision.attempt_id,sender.decision_input.attempt_id);
  assert.equal(commands.at(-1).outcome.status,'configured');
});
