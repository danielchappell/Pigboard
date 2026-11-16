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
