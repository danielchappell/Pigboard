import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runApplyFixture,runRepairGroup,packet} from '../scripts/test-manager-apply.mjs';
import {chooseOrdinaryStream} from '../lib/manager/apply.mjs';
test('R1-17-H01 ordinary admission and no replay',async()=>{
 const e=await runApplyFixture({repeat:true});assert.equal(e.result.status,'applied',JSON.stringify(e.result));assert.equal(e.result.apply.stage,'complete');assert.equal(e.result.writes,3);assert.deepEqual(e.result.apply.effects,packet.oracle.effects);assert.deepEqual(e.mutations,packet.oracle.mutations);
 assert.deepEqual(e.state_calls.slice(0,10).map(c=>c.name),packet.oracle.state_calls);assert.deepEqual(e.events.slice(0,13),packet.oracle.effect_order);for(const [kind,revision]of Object.entries(packet.oracle.final_revisions))assert.equal(e.records.find(r=>r.kind===kind).revision,revision,kind);
 assert.equal(e.records.find(r=>r.kind==='attempt').outcome,'applied');assert.equal(e.second.writes,0);assert(['no_action','held'].includes(e.second.status));assert.equal(e.human_status,'NOT_RUN');
 const choices=[['2','AI-Daniel-1'],['10','AI-Daniel-2'],['10','AI-Daniel-10']].map(([project_id,label])=>({scope:{project_id,label},decision:'select',proposal:{kind:'admit_new'}}));assert.equal(chooseOrdinaryStream(choices).scope.label,'AI-Daniel-10');choices[2].decision='hold';assert.equal(chooseOrdinaryStream(choices).scope.label,'AI-Daniel-2');
});
test('R1-17-H02 uncertain intent',async()=>{const e=await runApplyFixture({fault:'intent:after',repeat:true});assert.equal(e.result.status,'held');assert.equal(e.result.apply.stage,'begin');assert.equal(e.result.apply.effects.intent,'unconfirmed');assert.match(e.result.diagnostics[0].message,/check State.*original attempt ID.*Jira writes did not start/i);assert.equal(e.result.writes,0);assert.equal(e.second.writes,0);assert.equal(e.records.filter(r=>r.kind==='attempt').length,1);assert.equal(e.mutations.length,0);assert.equal(e.worker_calls,0);const dispatch=await runApplyFixture({fault:'intent:after',twoStreams:true});const oracle=packet.oracle.uncertain_intent_dispatch;assert.deepEqual(dispatch.result.apply.scope,oracle.selected_scope);assert.equal(dispatch.result.apply.ticket_id,oracle.selected_ticket_id);assert.equal(dispatch.state_calls.filter(c=>c.name==='begin').length,oracle.begin_calls);assert.equal(dispatch.mutations.length,oracle.mutations);assert(!dispatch.state_calls.some(c=>c.name==='begin'&&c.input.stream.label===oracle.second_stream_label));});
test('R1-17-H03 global-only transition',async()=>{const e=await runApplyFixture({global:true});assert.equal(e.result.status,'held');assert.equal(e.result.code,'SOURCE_EDGE_REQUIRED');assert.equal(e.result.writes,0);assert.equal(e.records.filter(r=>r.kind==='attempt').length,0);assert.equal(e.worker_calls,0);});
for(const fault of packet.oracle.fault_positions)test('R1-17-H02 prescribed boundary '+fault,async()=>{const e=await runApplyFixture({fault,repeat:true});assert.equal(e.result.status,'held',fault);assert.equal(e.injected,true,fault);assert.equal(e.worker_calls,0,fault);if(fault.startsWith('member:'))assert.match(e.result.diagnostics[0].message,/verify.*membership.*revisions in State.*before starting an attempt/i);const count=e.records.filter(r=>r.kind==='attempt').length;assert(count<=1,fault);if(!fault.startsWith('member:')&&fault!=='intent:before')assert.equal(e.second.writes,0,fault);if(fault==='intent:before'){const oracle=packet.oracle.pre_intent_fence;assert.equal(e.result.apply.stage,oracle.first_stage);assert.equal(e.result.writes,oracle.first_writes);assert.equal(e.second.status,oracle.fresh_status);assert.equal(e.second.writes,oracle.fresh_writes);const begins=e.state_calls.filter(c=>c.name==='begin');assert.equal(begins.length,2);assert.equal(begins[0].input.attempt.attempt_id,oracle.original_attempt_id);assert.equal(begins[1].input.attempt.attempt_id,oracle.fresh_attempt_id);assert.equal(begins[0].input.expected_installation_revision,oracle.first_begin_expected_installation_revision);assert.equal(begins[1].input.expected_installation_revision,oracle.fresh_begin_expected_installation_revision);const first=e.state_calls.indexOf(begins[0]),fence=e.state_calls.slice(first+1).find(c=>c.name==='retainMembers');assert.equal(fence.input.expected_installation_revision,oracle.fresh_retain_expected_installation_revision);assert.equal(fence.result.status,'confirmed');assert.equal(fence.result.data.installation_revision,oracle.fresh_retain_confirmed_installation_revision);const coherent=e.state_calls[e.state_calls.indexOf(fence)+1];assert.equal(coherent.name,'readInventory');assert.equal(coherent.result.status,'confirmed');assert.equal(coherent.result.data.installation.revision,oracle.fresh_retain_confirmed_installation_revision);assert.equal(begins[1].result.status,'confirmed');assert.equal(e.records.find(r=>r.kind==='attempt').attempt_id,oracle.fresh_attempt_id);assert.deepEqual(e.mutations,packet.oracle.fresh_mutations);assert.deepEqual(e.events.slice(e.events.indexOf('state:begin')+1),packet.oracle.effect_order);}const proof=packet.oracle.proof_boundary_injections[fault];if(proof){assert.equal(e.result.apply.stage,proof.expected_stage);assert.equal(e.result.writes,proof.writes);assert.equal(e.result.apply.effects[proof.blocked_effect],'not_attempted');}if(fault==='finalize:after'){assert.equal(e.result.apply.effects.transition,'confirmed');assert.equal(e.result.apply.effects.finalization,'unconfirmed');}else assert.notEqual(e.result.status,'applied',fault);});
test('R1-17-H03 existing six holds forbid ordinary effects',async()=>{for(const hold of packet.oracle.holds){const e=await runApplyFixture({hold});assert.equal(e.result.writes,0,hold);assert.equal(e.result.code,packet.oracle.hold_expectations[hold],hold);assert.equal(e.records.filter(r=>r.kind==='attempt').length,0,hold);assert.equal(e.worker_calls,0);}});

test('R1-17-H01 ordinary Bug admission and no replay',async()=>{const e=await runApplyFixture({bug:true,repeat:true});const oracle=packet.oracle.bug;assert.equal(packet.bug_issue.fields.issuetype.id,oracle.type_id);assert.equal(e.result.status,oracle.status,JSON.stringify(e.result));assert.equal(e.result.apply.ticket_id,oracle.ticket_id);assert.equal(e.result.writes,oracle.writes);assert.equal(e.second.writes,oracle.repeat_writes);assert.deepEqual(e.mutations,packet.oracle.mutations);assert.equal(e.records.find(r=>r.kind==='attempt').outcome,'applied');});

test('R1-17-H01 native member ownership excludes Epic roots',async()=>{
 const e=await runApplyFixture({variant:'native-members',fault:'intent:after'}),oracle=packet.regressions['native-members'].oracle;
 const retain=e.state_calls.find(c=>c.name==='retainMembers'),begin=e.state_calls.find(c=>c.name==='begin');
 assert.deepEqual(retain?.input.members,oracle.members,'retain only real ticket members with their native Epic ownership');
 assert.deepEqual(begin?.input.required_members,oracle.required_members);
 assert.deepEqual(e.records.filter(r=>r.kind==='member').map(r=>Object.fromEntries(['site','project_id','label','ticket_id','epic_id','assignment','revision'].map(k=>[k,r[k]]))).sort((a,b)=>a.ticket_id<b.ticket_id?-1:1),oracle.stored_members);
 assert(!e.records.some(r=>r.kind==='member'&&oracle.excluded_member_ids.includes(r.ticket_id)));
 assert.equal(begin.input.attempt.ticket_id,oracle.ticket_id);assert.equal(begin.input.attempt.epic_id,oracle.epic_id);
 assert.deepEqual(e.state_calls.map(c=>c.name),oracle.state_calls);assert.equal(e.records.filter(r=>r.kind==='attempt'&&r.outcome==='pending').length,oracle.attempts);
 assert.equal(e.result.status,oracle.status);assert.equal(e.result.code,oracle.code);assert.equal(e.result.apply.stage,oracle.stage);assert.equal(e.result.writes,oracle.writes);assert.equal(e.mutations.length,0);assert.equal(e.worker_calls,0);
});

test('R1-17-H01 isolated scoped recheck preserves selected safety',async()=>{
 const positive=await runApplyFixture({variant:'isolated-comments'}),oracle=packet.regressions['isolated-comments'].oracle;
 assert.equal(positive.result.status,oracle.status,JSON.stringify(positive.result));assert.equal(positive.result.code,oracle.code);assert.equal(positive.result.apply.stage,oracle.stage);assert.equal(positive.result.writes,oracle.writes);
 assert.deepEqual(positive.trace.filter(t=>t.status===403).map(t=>t.path),oracle.denied_paths);assert.deepEqual(positive.mutations,packet.oracle.mutations);assert.deepEqual(positive.result.apply.effects,packet.oracle.effects);
 const begins=positive.state_calls.filter(c=>c.name==='begin');assert.equal(begins.length,1);assert.equal(begins[0].input.attempt.ticket_id,oracle.selected_ticket_id);assert.equal(begins[0].input.attempt.epic_id,oracle.selected_epic_id);assert(!positive.mutations.some(m=>m.path.includes('/'+oracle.unselected_ticket_id+'/')));
 const held=await runApplyFixture({variant:'selected-recheck-comments'}),hold=packet.regressions['selected-recheck-comments'].oracle;
 assert.equal(held.result.status,hold.status);assert.equal(held.result.code,hold.code);assert.equal(held.result.apply.stage,hold.stage);assert.equal(held.result.writes,hold.writes);assert.deepEqual(held.trace.filter(t=>t.status===403).map(t=>t.path),hold.denied_paths);assert.deepEqual(held.mutations,packet.oracle.mutations.slice(0,2));
 assert.equal(held.result.apply.effects.intent,'confirmed');assert.equal(held.result.apply.effects.comment,'confirmed');assert.equal(held.result.apply.effects.pointer,'confirmed');assert.equal(held.result.apply.effects.transition,'not_attempted');assert.equal(held.result.apply.effects.finalization,'not_attempted');assert.equal(held.records.filter(r=>r.kind==='attempt'&&r.outcome==='pending').length,hold.pending_attempts);assert.equal(held.state_calls.filter(c=>c.name==='begin').length,1);assert.equal(held.result.apply.ticket_id,hold.selected_ticket_id);assert(!held.mutations.some(m=>m.path.includes('/'+hold.unselected_ticket_id+'/')));assert.equal(held.worker_calls,0);
});

test('apply processing reports original effects separately from globally incomplete scopes',async()=>{const e=await runApplyFixture({variant:'isolated-comments'});assert.equal(e.result.status,'applied');assert.equal(e.result.processing.result,packet.health_oracle.isolated_comments);assert.equal(e.result.processing.acquisition.domain_complete,false);assert(e.result.processing.acquisition.scopes.some(s=>!s.complete));assert.equal(e.result.processing.policy_complete,true);assert.equal(e.result.processing.recheck_complete,false);assert.deepEqual(e.mutations,packet.oracle.mutations);assert(e.result.processing.reason_codes.includes('OK'));});

test('PGB-88 ordinary admission survives an unrelated retained ticket moving projects', async () => {
  const moved = packet.regressions['moved-project'].moved_project;
  const {result, state_calls, trace, mutations, records} = await runApplyFixture({variant: 'moved-project'});
  const {project_id, label, ticket_id, epic_id, assignment} = moved.retained_member;
  const readInventory = state_calls.find(call => call.name === 'readInventory');
  const fromState = readInventory.result.data.members.find(member => member.ticket_id === ticket_id);
  assert.deepEqual({project_id: fromState.project_id, label: fromState.label, epic_id: fromState.epic_id, assignment: fromState.assignment},
    {project_id, label, epic_id, assignment});
  const movedReads = trace.filter(row => row.method === 'GET' && row.path.startsWith('/rest/api/3/issue/'+ticket_id+'?fields='));
  assert.equal(movedReads.length, 2);
  assert.deepEqual(movedReads.map(row => row.response.fields.project.id), [moved.current.project_id, moved.current.project_id]);
  const firstMovedRead = trace.indexOf(movedReads[0]);
  assert(!trace.slice(0, firstMovedRead).some(row => row.response?.issues?.some(issue => issue.id === ticket_id)));
  for (const id of [project_id, moved.current.project_id]) {
    const held = result.processing.projects.find(project => project.project_id === id);
    assert(held.reason_codes.includes('MEMBERSHIP_MISMATCH'));
    assert.equal(held.selected_count, 0);
  }
  assert.equal(result.status, 'applied', JSON.stringify(result));
  assert.equal(result.apply.ticket_id, packet.issues[1].id);
  assert.equal(result.apply.effects.finalization, 'confirmed');
  assert.deepEqual(mutations, packet.oracle.mutations);
  assert.deepEqual(records.find(record => record.kind === 'member' && record.ticket_id === ticket_id), fromState);
});

for (const group of Object.keys(packet.repair_admission.groups)) {
  for (const {id} of packet.repair_admission.groups[group]) {
    test(group + ' ' + id, async () => {
      await runRepairGroup(group, {caseId: id});
    });
  }
}

function assertPreflightLimit(e) {
  assert.equal(e.result.status, 'held');
  assert.equal(e.result.apply.stage, 'preflight', JSON.stringify({result: e.result,
    mutations: e.mutations.map(({method, path}) => ({method, path})), state: e.state_calls.map(({name}) => name)}));
  assert.equal(e.result.code, 'LIMIT_REACHED');
  assert.deepEqual(e.state_calls.map(({name}) => name), ['readInventory']);
  assert.deepEqual(e.mutations, []);
  assert(!e.provider_calls.some(call => call.name === 'TransactWriteCommand'));
  assert(e.trace.every(row => row.acquisition === 1));
  assert.equal(e.result.writes, 0);
  assert.deepEqual(e.records, e.initial_records);
}

for (const [label, readBounds, listedPageSize] of [
  ['observed Jira comment page', {max_response_bytes: 8000}],
  ['cumulative Jira reads', {max_response_bytes: 9000, max_total_response_bytes: 37000}],
  ['the rollover page limit', {max_pages: 5}, 4],
  ['the rollover request limit', {max_pages: 6, max_requests: 15}, 4],
  ['the native admission envelope limit', {max_response_bytes: 9000, max_total_response_bytes: 40200}, 4]
]) test('PGB-88 repair projects '+label+' before any effects', async () => {
  const e = await runApplyFixture({repairCase: {historyId: 'qa', readBounds, listedPageSize}});
  assert.equal(e.result.processing.acquisition.status, 'complete');
  assertPreflightLimit(e);
});

for (const [label, max_response_bytes, listedPageSize] of [
  ['room for the observed Jira comment page', 9000, undefined],
  ['a full Jira page that rolls over before append', 8000, 4]
]) test('PGB-88 repair with '+label+' finalizes in order', async () => {
  const e = await runApplyFixture({repairCase: {historyId: 'qa', readBounds: {
    max_response_bytes, max_total_response_bytes: 41000,
    ...(listedPageSize ? {max_pages: 6, max_requests: 16} : {})
  }, listedPageSize}});
  assert.equal(e.result.status, 'applied', JSON.stringify(e.result));
  assert.equal(e.result.apply.stage, 'complete');
  assert.equal(e.result.apply.effects.finalization, 'confirmed');
  assert.equal(e.result.writes, 3);
  const ticket = e.result.apply.ticket_id;
  assert.deepEqual(e.events, packet.oracle.effect_order.map(event => event.replace('/1001/', '/'+ticket+'/')));
  const pages = e.trace.filter(row => row.acquisition === 2 && row.path.includes('/comment?'));
  assert(pages.some(row => row.response.total === 0 && row.response.comments.length === 0));
  const selected = pages.filter(row => row.path.includes('/'+ticket+'/comment?'));
  assert.deepEqual(selected.map(row => [row.response.startAt, row.response.total, row.response.comments.length]),
    listedPageSize ? [[0, 5, 4], [4, 5, 1]] : [[0, 5, 5]]);
  if (listedPageSize) {
    const firstWrite = e.trace.findIndex(row => row.method === 'POST' && row.path.endsWith('/comment'));
    const initial = e.trace.slice(0, firstWrite);
    const fresh = e.trace.filter(row => row.acquisition === 2 && row.status === 200);
    const pageCount = rows => rows.filter(row => row.path.endsWith('/search/jql') || row.path.includes('/comment?')).length;
    assert.deepEqual([initial.length, pageCount(initial)], [13, 5]);
    assert.deepEqual([fresh.length, pageCount(fresh)], [16, 6]);
    const bytes = value => Buffer.byteLength(JSON.stringify(value));
    const responseBytes = rows => rows.reduce((sum, row) => sum + bytes(row.response), 0);
    assert.deepEqual([responseBytes(initial), responseBytes(fresh)], [34277, 40250]);
    const assignmentId = e.initial_records.find(record => record.kind === 'member').assignment.comment_id;
    const priorExact = initial.find(row => row.path.endsWith('/comment/'+assignmentId)).response;
    const priorListed = initial.flatMap(row => row.response.comments ?? []).find(comment => comment.id === assignmentId);
    assert.deepEqual([priorListed, priorExact].map(comment => bytes(comment) - bytes(comment.body)), [159, 159]);
  } else {
    const bytes = rows => rows.reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify(row.response)), 0);
    const originalReads = e.trace.slice(0, e.trace.findIndex(row => row.method === 'POST' && row.path.endsWith('/comment')));
    const recheckReads = e.trace.filter(row => row.acquisition === 2 && row.status === 200);
    assert(bytes(originalReads) < 37000);
    assert(bytes(recheckReads) > 37000);
    assert(recheckReads.every(row => bytes([row]) <= 9000));
  }
});

test('PGB-88 repair fits observed reads with a shorter unrelated search row', async () => {
  const e = await runApplyFixture({repairCase: {historyId: 'qa', shortLabelSearch: true,
    readBounds: {max_response_bytes: 12000, max_total_response_bytes: 53000}}});
  const {result, trace} = e;
  const bytes = rows => rows.reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify(row.response)), 0);
  const initialReads = trace.filter(row => row.acquisition === 1 && row.status === 200);
  // Verification reads following the publish writes do not count toward inventory.
  const firstWrite = trace.findIndex(row => row.status === 201);
  assert.equal(bytes(firstWrite === -1 ? initialReads : trace.slice(0, firstWrite)), 46339);
  assert.deepEqual(result.processing.acquisition.scopes.map(({label, complete}) => [label, complete]),
    [['stream-1', true], ['stream-2', false]]);
  assert(result.processing.reason_codes.includes('CHANGED_INPUT'));
  assert.equal(result.status, 'applied', JSON.stringify(result));
  assert.equal(result.apply.stage, 'complete');
  assert.equal(result.writes, 3);
  assert.equal(result.apply.effects.finalization, 'confirmed');
  assert.deepEqual(e.events, packet.oracle.effect_order.map(event => event.replace('/1001/', '/'+result.apply.ticket_id+'/')));
  const freshReads = trace.filter(row => row.acquisition === 2 && row.status === 200);
  assert.equal(bytes(freshReads), 52261);
  for (const rows of [initialReads, freshReads]) {
    const label = rows.filter(row => row.body?.jql?.includes('labels = "stream-2"'));
    const issue = rows.filter(row => row.path.includes('/issue/1012?'));
    assert.equal(label.length, 1);
    assert.equal(issue.length, 1);
    assert.deepEqual([bytes(label), bytes(issue)], [195, 5261]);
  }
});

for (const [label, readBounds, applied] of [
  ['request limit', {max_requests: 23, max_pages: 12}, false],
  ['byte limit', {max_total_response_bytes: 57024}, false],
  ['roomy positive', {}, true]
]) test('PGB-88 repair includes physical old-key reads in the '+label, async () => {
  const e = await runApplyFixture({repairCase: {historyId: 'qa', shortLabelSearch: true, oldIssueKey: true,
    readBounds: {max_response_bytes: 9000, max_total_response_bytes: 100000, ...readBounds}}});
  const {result, trace} = e;
  assert.deepEqual(result.processing.acquisition.scopes.map(({label, complete}) => [label, complete]),
    [['stream-1', true], ['stream-2', false]]);
  assert(result.processing.reason_codes.includes('CHANGED_INPUT'));
  const firstWrite = trace.findIndex(row => row.status === 201);
  const initial = firstWrite === -1 ? trace : trace.slice(0, firstWrite);
  const fresh = trace.filter(row => row.acquisition === 2 && row.status === 200);
  const measure = rows => ({
    requests: rows.length,
    bytes: rows.reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify(row.response)), 0),
    aliases: rows.map(row => row.path.match(/\/(1012|OLD-12)\?fields=/)?.[1]).filter(Boolean)
  });
  assert.deepEqual(measure(initial), {requests: 22, bytes: 51602, aliases: ['1012', 'OLD-12']});
  if (!applied) {
    assertPreflightLimit(e);
    return;
  }
  assert.equal(result.status, 'applied', JSON.stringify(result));
  assert.equal(result.apply.stage, 'complete');
  assert.equal(result.writes, 3);
  assert.equal(result.apply.effects.finalization, 'confirmed');
  assert.deepEqual(e.events, packet.oracle.effect_order.map(event => event.replace('/1001/', '/'+result.apply.ticket_id+'/')));
  assert.deepEqual(measure(fresh), {requests: 24, bytes: 57524, aliases: ['1012', 'OLD-12']});
});

for (const [limit, applied] of [[53530, false], [100000, true]]) {
  test('PGB-88 repair counts a scoped failed read at a '+limit+'-byte cap', async () => {
    const e = await runApplyFixture({repairCase: {historyId: 'qa', shortLabelSearch: true, denyUnrelatedComments: true,
      readBounds: {max_response_bytes: 9000, max_total_response_bytes: limit}}});
    const {result, trace} = e;
    assert.deepEqual(result.processing.acquisition.scopes.map(({label, complete}) => [label, complete]),
      [['stream-1', true], ['stream-2', false]]);
    assert(result.processing.reason_codes.includes('READ_DENIED_OR_MISSING'));
    const bytes = response => Buffer.byteLength(JSON.stringify(response));
    const measure = rows => ({
      requests: rows.length,
      bytes: rows.reduce((sum, row) => sum + bytes(row.response), 0),
      denials: rows.filter(row => row.status === 403).map(row => bytes(row.response))
    });
    const firstWrite = trace.findIndex(row => row.status === 201);
    assert.deepEqual(measure(firstWrite === -1 ? trace : trace.slice(0, firstWrite)),
      {requests: 21, bytes: 48108, denials: [1822]});
    if (!applied) {
      assertPreflightLimit(e);
      return;
    }
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(result.apply.stage, 'complete');
    assert.equal(result.writes, 3);
    assert.equal(result.apply.effects.finalization, 'confirmed');
    assert.deepEqual(e.events, packet.oracle.effect_order.map(event => event.replace('/1001/', '/'+result.apply.ticket_id+'/')));
    const fresh = trace.filter(row => row.acquisition === 2 && [200, 403].includes(row.status));
    assert.deepEqual(measure(fresh), {requests: 23, bytes: 54030, denials: [1822]});
  });
}

for (const [limit, applied] of [[53140, false], [100000, true]]) {
  test('PGB-88 repair budgets an escaped plain note at a '+limit+'-byte cap', async () => {
    const e = await runApplyFixture({repairCase: {historyId: 'qa', escapedPlainNote: true,
      readBounds: {max_response_bytes: 40000, max_total_response_bytes: limit}}});
    const {result, trace} = e;
    assert.equal(result.processing.acquisition.status, 'complete');
    assert.deepEqual(result.processing.acquisition.scopes.map(({label, complete}) => [label, complete]), [['stream-1', true]]);
    const firstWrite = trace.findIndex(row => row.status === 201);
    const initial = firstWrite === -1 ? trace : trace.slice(0, firstWrite);
    const bytes = rows => rows.reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify(row.response)), 0);
    assert.equal(bytes(initial), 44541);
    assert.deepEqual(initial.filter(row => row.path.includes('?fields=')).map(row => row.response.id), ['1000', '900']);
    if (!applied) {
      assertPreflightLimit(e);
      return;
    }
    assert.equal(result.status, 'applied', JSON.stringify(result));
    assert.equal(result.apply.stage, 'complete');
    assert.equal(result.writes, 3);
    assert.equal(result.apply.effects.finalization, 'confirmed');
    assert.deepEqual(e.events, packet.oracle.effect_order.map(event => event.replace('/1001/', '/'+result.apply.ticket_id+'/')));
    const fresh = trace.filter(row => row.acquisition === 2 && row.status === 200);
    assert.equal(bytes(fresh), 50463);
    assert.deepEqual(fresh.filter(row => row.path.includes('?fields=')).map(row => row.response.id), ['1000', '900']);
    const notes = rows => rows.flatMap(row => row.response.comments ?? []).filter(comment => comment.id === '990001');
    assert.equal(notes(initial).length, 1);
    assert.deepEqual(notes(fresh), notes(initial));
  });
}
