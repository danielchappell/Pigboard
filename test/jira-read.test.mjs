import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {fixtureCases,runFixture} from './fixtures/jira-preview-harness.mjs';
import {inspectJiraIssues} from '../lib/jira/read.mjs';
import {snapshotSchema} from '../lib/manager/snapshot.mjs';
import {validateWork} from '../lib/contracts/work.mjs';
const runtime=fileURLToPath(new URL('..',import.meta.url));
for(const v of fixtureCases.variants){test(v.case+' '+v.variant,async()=>{const r=await runFixture(v.case,v.variant,runtime);assert(r.oracle_matched);if(v.control)assert((await runFixture(v.case,v.variant,runtime,{control:true})).oracle_matched);if(v.private_projection)assert((await runFixture(v.case,v.variant,runtime,{privateProjection:true})).oracle_matched);});}
test('accessors and non-JSON inputs are rejected without invoking either accessor or resolver',async()=>{let effects=0;const request={get issue_ids(){effects++;return ['1000'];},comment_targets:[]};const r=await inspectJiraIssues('{}',request,{resolveSecret(){effects++;}});assert.equal(r.report.status,'invalid');assert.equal(effects,0);assert.equal(Object.keys(r).join(','),'report');assert.equal(Object.getOwnPropertyDescriptor(r,'observations').writable,false);});

const pageADF={type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:'A'},{type:'text',text:'B'}]}]};
const exactADF={content:[{content:[{text:'A',type:'text'},{text:'B',type:'text'}],type:'paragraph'}],version:1,type:'doc'};
const changedArrayADF={content:[{content:[{text:'B',type:'text'},{text:'A',type:'text'}],type:'paragraph'}],version:1,type:'doc'};
const pageBody='{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"A"},{"type":"text","text":"B"}]}]}';
const exactBody='{"content":[{"content":[{"text":"A","type":"text"},{"text":"B","type":"text"}],"type":"paragraph"}],"version":1,"type":"doc"}';
assert.equal(JSON.stringify(pageADF),pageBody);
assert.equal(JSON.stringify(exactADF),exactBody);

const regressionDesign=[
 {case:'R1-38-H01',variant:'null-description',status:'complete',code:null,calls:4,lengths:[146,265,258,206],responseBytes:875,observationBytes:1109},
 {case:'R1-38-H01',variant:'missing-description',status:'incomplete',code:'RESPONSE_INVALID',calls:1,lengths:[127],responseBytes:127,observationBytes:0},
 {case:'R1-38-H02',variant:'adf-nested-order',status:'complete',code:null,calls:4,lengths:[181,265,344,292],responseBytes:1082,observationBytes:1370},
 {case:'R1-38-H02',variant:'adf-array-change',status:'incomplete',code:'CHANGED_INPUT',calls:4,lengths:[181,265,344,292],responseBytes:1082,observationBytes:1048}
];

function authoredRegression(d){
 const original=fixtureCases.variants.find(v=>v.case==='R1-33-H04'&&v.variant==='guide-and-install');
 const v=structuredClone(original);v.case=d.case;v.variant=d.variant;
 if(d.variant==='null-description'){
  v.script[0].body.fields.description=null;
  v.oracle.acquisition.issues[0].body=null;
 }else if(d.variant==='missing-description'){
  delete v.script[0].body.fields.description;
  v.oracle.issue_rows=[{id:'1000',key:null,project_id:null,issue_read:'incomplete',pointer_read:'not_requested',comments_read:'not_requested',exact_comments_read:'not_requested',comment_ids:[],comment_count:0}];
  v.oracle.acquisition={issues:[],comment_pages:[],exact_comments:[],references:[],provenance:[]};
 }else{
  v.script[2].body.comments[0].body=structuredClone(pageADF);
  v.script[3].body.body=structuredClone(d.variant==='adf-array-change'?changedArrayADF:exactADF);
  v.oracle.acquisition.comment_pages[0].comments[0].body=pageBody;
  if(d.variant==='adf-array-change'){
   v.oracle.issue_rows[0].exact_comments_read='incomplete';
   v.oracle.acquisition.exact_comments=[];
  }else v.oracle.acquisition.exact_comments[0].body=exactBody;
 }
 v.oracle.status=d.status;v.oracle.code=d.code;v.oracle.calls=d.calls;
 v.oracle.trace=v.script.slice(0,d.calls).map(step=>({method:'GET',path:step.path}));
 v.oracle.counters={requests_completed:d.calls,requests_failed:0,known_issues:d.calls===1?0:1,comments:d.calls===1?0:1,response_bytes:d.responseBytes,observation_bytes:d.observationBytes,search_pages:0,epics:0,streams:0};
 assert.deepEqual(v.script.slice(0,d.calls).map(step=>Buffer.byteLength(JSON.stringify(step.body))),d.lengths);
 return v;
}

for(const group of ['R1-38-H01','R1-38-H02']){
 test(group+' finite regressions preserve literal native observations',async t=>{
  const originalCount=fixtureCases.variants.length;
  for(const d of regressionDesign.filter(d=>d.case===group)){
   await t.test(d.case+' '+d.variant,async()=>{
    const v=authoredRegression(d);fixtureCases.variants.push(v);
    try{
     const r=await runFixture(v.case,v.variant,runtime);
     assert.equal(r.oracle_matched,true);
     assert.equal(r.report.counters.response_bytes,d.responseBytes);
     assert.equal(r.report.counters.observation_bytes,d.observationBytes);
     assert.deepEqual(r.trace,v.oracle.trace);
     assert.deepEqual(r.input_hashes.before,r.input_hashes.after);
     assert.deepEqual(r.runtime_hashes.before,r.runtime_hashes.after);
     assert.equal(r.effects,0);assert.equal(r.resolver_calls,1);assert.equal(r.cleanup_complete,true);
     assert.equal(Object.hasOwn(r.report,'observations'),false);
    }finally{
     assert.equal(fixtureCases.variants.pop(),v);
    }
   });
  }
  assert.equal(fixtureCases.variants.length,originalCount);
  if(group==='R1-38-H01'){
   assert(snapshotSchema.properties.issues.items.properties.body.anyOf.some(s=>s.type==='null'));
   assert.equal(validateWork(null,{mode:'start',format:'adf',contextInput:null}).valid,false);
  }
 });
}

test('R1-40-H01 target pair identity rejects duplicates and accepts one reversed-order target',async t=>{
 const original=fixtureCases.variants.find(v=>v.case==='R1-33-H04'&&v.variant==='guide-and-install');
 const originalCount=fixtureCases.variants.length;
 for(const variant of ['duplicate-target-member-order','unique-target-member-order']){
  await t.test(variant,async()=>{
   const v=structuredClone(original);v.case='R1-40-H01';v.variant=variant;
   const reversed={comment_id:'2001',ticket_id:'1000'};
   if(variant==='duplicate-target-member-order'){
    v.request.comment_targets.push(reversed);
    v.script.push(structuredClone(v.script[3]));
    v.oracle={status:'invalid',code:'INPUT_INVALID',calls:0,trace:[],issue_rows:[],acquisition:{issues:[],comment_pages:[],exact_comments:[],references:[],provenance:[]},diagnostic:{operation:null,issue_id:null,scope:null},cleanup_resolver:'settled',counters:{requests_completed:0,requests_failed:0,search_pages:0,comment_pages:0,epics:0,streams:0,known_issues:0,comments:0,response_bytes:0,observation_bytes:0,elapsed_ms:0}};
   }else{
    v.request.comment_targets=[reversed];
    v.oracle.trace=v.script.map(step=>({method:'GET',path:step.path}));
    v.oracle.counters={requests_completed:4,requests_failed:0,known_issues:1,comments:1,response_bytes:910,observation_bytes:1154,search_pages:0,epics:0,streams:0};
    assert.deepEqual(v.script.map(step=>Buffer.byteLength(JSON.stringify(step.body))),[181,265,258,206]);
   }
   fixtureCases.variants.push(v);
   try{
    const r=await runFixture(v.case,v.variant,runtime);
    assert.equal(r.oracle_matched,true);
    assert.deepEqual(r.trace,v.oracle.trace);
    assert.deepEqual(r.server_trace,v.oracle.trace);
    assert.deepEqual(r.input_hashes.before,r.input_hashes.after);
    assert.deepEqual(r.runtime_hashes.before,r.runtime_hashes.after);
    assert.equal(r.effects,0);
    assert.equal(r.resolver_calls,variant==='duplicate-target-member-order'?0:1);
    assert.equal(r.cleanup_complete,true);
    assert.equal(Object.hasOwn(r.report,'observations'),false);
    if(variant==='duplicate-target-member-order'){
     assert.equal(r.report.limits,null);
     assert.deepEqual(r.report.counters,{requests_attempted:0,...v.oracle.counters});
     assert.deepEqual(r.report.diagnostics,[{code:'INPUT_INVALID',message:'Supply unique immutable issue IDs and matching exact comment targets.',operation:null,issue_id:null,scope:null}]);
    }else{
     assert.equal(r.report.counters.requests_attempted,4);
     assert.equal(r.report.counters.response_bytes,910);
     assert.equal(r.report.counters.observation_bytes,1154);
    }
   }finally{
    assert.equal(fixtureCases.variants.pop(),v);
   }
  });
 }
 assert.equal(fixtureCases.variants.length,originalCount);
});

// PGB-156 / R1-42: finite boundary observations. These derive inputs from the
// frozen authored packet but keep the expected wire and private counts literal.
const guide=fixtureCases.variants.find(v=>v.case==='R1-33-H04'&&v.variant==='guide-and-install');
const twoIssue=fixtureCases.variants.find(v=>v.case==='R1-33-H03'&&v.variant==='known-limit');
const completeTwo=fixtureCases.variants.find(v=>v.case==='R1-33-H01'&&v.variant==='complete');
const initialTls=fixtureCases.variants.find(v=>v.case==='R1-33-H03'&&v.variant==='untrusted-ca');
const traceOf=v=>v.script.map(step=>({method:'GET',path:step.path}));
function boundaryVariant(group,variant){
 const v=structuredClone(group==='R1-42-H04'?initialTls:guide);v.case=group;v.variant=variant;
 if(group==='R1-42-H01'){
  v.resolver=variant;
  v.oracle.trace=traceOf(v);
  v.oracle.counters={requests_completed:4,requests_failed:0,known_issues:1,comments:1,response_bytes:910,observation_bytes:1154,search_pages:0,epics:0,streams:0};
 }else if(group==='R1-42-H02'){
  v.request.issue_ids.push('1001');
  v.script.push(...structuredClone(twoIssue.script.slice(4)));
  if(variant==='exact-wire-stop'){
   v.script[3].wire_prefix=' '.repeat(600);
   v.config.jira.read_bounds.max_response_bytes=1000;
   v.config.jira.read_bounds.max_total_response_bytes=1500;
   v.oracle={status:'incomplete',code:'LIMIT_REACHED',calls:4,trace:traceOf(v).slice(0,4),diagnostic:{code:'LIMIT_REACHED',bound:'max_total_response_bytes',operation:'comment',issue_id:'1000'},issue_rows:structuredClone(guide.oracle.issue_rows),acquisition:structuredClone(guide.oracle.acquisition),counters:{requests_completed:3,requests_failed:1,response_bytes:1510,observation_bytes:940,known_issues:1,comments:1}};
  }else if(variant==='exact-private-stop'){
   v.config.jira.read_bounds.max_response_bytes=1000;
   v.config.jira.read_bounds.max_total_response_bytes=1153;
   v.oracle={status:'incomplete',code:'LIMIT_REACHED',calls:4,trace:traceOf(v).slice(0,4),diagnostic:{code:'LIMIT_REACHED',bound:'max_total_response_bytes',operation:'comment',issue_id:'1000'},issue_rows:structuredClone(guide.oracle.issue_rows),acquisition:structuredClone(guide.oracle.acquisition),counters:{requests_completed:4,requests_failed:0,response_bytes:910,observation_bytes:940,known_issues:1,comments:1}};
  }else{
   v.script[3].wire_prefix=' '.repeat(600);
   v.config.jira.read_bounds.max_response_bytes=1000;
   v.config.jira.read_bounds.max_total_response_bytes=2008;
   v.oracle={status:'complete',code:null,calls:7,trace:traceOf(v),issue_rows:[structuredClone(guide.oracle.issue_rows[0]),structuredClone(completeTwo.oracle.issue_rows[1])],acquisition:structuredClone(guide.oracle.acquisition),counters:{requests_completed:7,requests_failed:0,response_bytes:2008,observation_bytes:1818,known_issues:2,comments:1}};
   v.oracle.acquisition.issues.push(structuredClone(completeTwo.oracle.acquisition.issues[1]));
   v.oracle.acquisition.comment_pages.push(structuredClone(completeTwo.oracle.acquisition.comment_pages[2]));
   v.oracle.acquisition.provenance.push(structuredClone(completeTwo.oracle.acquisition.provenance[1]));
  }
  if(variant!=='exact-two-issue-control'){
   v.oracle.issue_rows[0].exact_comments_read='incomplete';
   v.oracle.acquisition.exact_comments=[];
  }
 }else if(group==='R1-42-H03'){
  const bytes=variant==='provider-adf-over'?262145:262144;
  const adf={type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:''}]}]};
  adf.content[0].content[0].text='x'.repeat(bytes-Buffer.byteLength(JSON.stringify(adf)));
  assert.equal(Buffer.byteLength(JSON.stringify(adf)),bytes);
  v.script[0].body.fields.description=adf;
  v.config.jira.read_bounds.max_response_bytes=300000;
  v.config.jira.read_bounds.max_total_response_bytes=400000;
  v.request.comment_targets=[];
  if(variant==='provider-adf-over'){
   v.oracle={status:'incomplete',code:'RESPONSE_INVALID',calls:1,trace:traceOf(v).slice(0,1),diagnostic:{code:'RESPONSE_INVALID',operation:'issue',issue_id:'1000'},issue_rows:[{id:'1000',key:null,project_id:null,issue_read:'incomplete',pointer_read:'not_requested',comments_read:'not_requested',exact_comments_read:'not_requested',comment_ids:[],comment_count:0}],acquisition:{issues:[],comment_pages:[],exact_comments:[],references:[],provenance:[]},counters:{requests_completed:1,requests_failed:0,response_bytes:262287,observation_bytes:0,known_issues:0,comments:0}};
  }else{
   v.script.length=3;
   v.oracle={status:'complete',code:null,calls:3,trace:traceOf(v),issue_rows:structuredClone(guide.oracle.issue_rows),acquisition:structuredClone(guide.oracle.acquisition),counters:{requests_completed:3,requests_failed:0,comment_pages:1,response_bytes:262809,observation_bytes:263059,known_issues:1,comments:1}};
   v.oracle.issue_rows[0].exact_comments_read='not_requested';
   v.oracle.acquisition.issues[0].body=JSON.stringify(adf);
   v.oracle.acquisition.exact_comments=[];
  }
 }else{
  v.tls=variant;v.oracle.trace=[{method:'GET',path:guide.script[0].path}];
  v.oracle.counters={requests_completed:0,requests_failed:1,response_bytes:0,observation_bytes:0,known_issues:0,comments:0};
  v.oracle.code=variant==='future-certificate'?'TLS_FAILED':'READ_DENIED_OR_MISSING';
 }
 if(group==='R1-42-H02'||group==='R1-42-H03'){
  const lengths=v.script.map(step=>Buffer.byteLength((step.wire_prefix??'')+JSON.stringify(step.body)));
  const expected=group==='R1-42-H03'
   ?variant==='provider-adf-over'?[262287,265,258,206]:[262286,265,258]
   :variant==='exact-private-stop'?[181,265,258,206,181,265,52]:[181,265,258,806,181,265,52];
  assert.deepEqual(lengths,expected);
  assert(v.config.jira.read_bounds.max_response_bytes<=v.config.jira.read_bounds.max_total_response_bytes);
 }
 return v;
}
const boundaryGroups={
 'R1-42-H01':['mutate-values','replace-accessors'],
 'R1-42-H02':['exact-wire-stop','exact-private-stop','exact-two-issue-control'],
 'R1-42-H03':['provider-adf-over','provider-adf-at'],
 'R1-42-H04':['future-certificate','connection-reset-control']
};
for(const [group,variants] of Object.entries(boundaryGroups))test(group+' fixed boundary regressions',async t=>{
 const originalCount=fixtureCases.variants.length;
 for(const variant of variants)await t.test(variant,async()=>{
  const v=boundaryVariant(group,variant);fixtureCases.variants.push(v);
  try{
   const r=await runFixture(group,variant,runtime);
   assert.equal(r.oracle_matched,true);assert.deepEqual(r.trace,v.oracle.trace);
   assert.deepEqual(r.input_hashes.before,r.input_hashes.after);
   assert.deepEqual(r.runtime_hashes.before,r.runtime_hashes.after);
   assert.equal(r.effects,0);assert.equal(r.cleanup_complete,true);
   assert.equal(r.resolver_calls,1);assert.equal(r.server_trace.length,group==='R1-42-H04'?0:v.oracle.calls);
   assert.equal(r.mutations,group==='R1-42-H01'?1:0);
   assert.equal(r.getter_calls,0);
   assert.equal(Object.hasOwn(r.report,'observations'),false);
   if(v.oracle.acquisition)assert.equal(r.report.counters.observation_bytes,v.oracle.counters.observation_bytes);
  }finally{assert.equal(fixtureCases.variants.pop(),v);}
 });
 assert.equal(fixtureCases.variants.length,originalCount);
});
