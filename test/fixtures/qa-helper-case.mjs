// Test-only fixed preparation mechanics. No helper execution, policy evaluator or verdict.
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packet = {
  "work": {
    "schema": "pigboard-ticket/v1",
    "problem_to_solve": "Observe the prepared synthetic record through one API child, a scoped PostgreSQL query and visible UI.",
    "prerequisites": [],
    "acceptance_criteria": [
      {
        "id": "AC-01",
        "requirement": "The prepared tenant-a record has state ready in each prescribed observation."
      }
    ],
    "technical_acceptance_criteria": {
      "repository": {
        "url": "https://example.invalid/example/application",
        "base_branch": "main",
        "change_boundary": "Fixed disposable local QA helper instruction exercise only.",
        "out_of_scope": [
          "Changing ownership or cross-tenant access."
        ],
        "related_repositories": []
      },
      "accepted_decisions": [],
      "constraints": [
        {
          "id": "TAC-01",
          "requirement": "Observe only the prepared tenant-a record and declared columns without retries or extra operations."
        }
      ]
    },
    "testing_strategy": {
      "testing_types": [
        "api",
        "database",
        "ui"
      ],
      "environment": {
        "source": "pipeline_pr_comment",
        "target_reference": null,
        "required_capabilities": [
          "Prepared API requests",
          "Restricted PostgreSQL reader",
          "Computer-use browser"
        ]
      },
      "actors": [
        {
          "id": "ACTOR-01",
          "role": "reader",
          "tenant": "tenant-a",
          "identity_reference": "fixture://pgb77/tenant-a",
          "access_owner": "Fixture operator"
        }
      ],
      "fixtures": [
        {
          "id": "DATA-01",
          "description": "Synthetic record-001 and isolated tenant-b negative control.",
          "initial_state": "tenant-a record-001 is ready; tenant-b is inaccessible.",
          "reference": "fixture://pgb77/data",
          "preparation_id": null,
          "owner": "Fixture operator"
        }
      ],
      "preparation": [],
      "dispatch_order": [
        "E01.S1",
        "E01.S3",
        "E01.S4"
      ],
      "cases": [
        {
          "id": "E01",
          "execution": "ai",
          "purpose": "Observe the prepared synthetic record without creating it.",
          "requirements": [
            "AC-01",
            "TAC-01"
          ],
          "actors": [
            "ACTOR-01"
          ],
          "fixtures": [
            "DATA-01"
          ],
          "preconditions": [
            "Actual candidate install, local endpoint, TLS/restricted-role proof, viewport/retention and mock deployment receipt are frozen before invocation."
          ],
          "depends_on": [],
          "observation": {
            "mode": "synchronous",
            "schedule": null,
            "deadline_seconds": null,
            "step": null,
            "completion": null
          },
          "cleanup": {
            "mode": "none",
            "reason": "All observations are read-only against a prepared fixture.",
            "owner": null,
            "steps": null
          },
          "manual_qa": "Use actual API record_id in SQL and visible UI lookup. Retain each prescribed checkpoint.",
          "steps": [
            {
              "id": "E01.S1",
              "caller": "qa-entrypoint",
              "skill": "qa-api",
              "action": "Observe the prepared tenant-a record.",
              "children": [
                "E01.S2"
              ],
              "inputs": {},
              "bindings": [],
              "outputs": [
                "record_id"
              ],
              "expected": [
                "Visible/returned record-001 belongs to tenant-a and has state ready."
              ],
              "evidence": [
                "Actual revision-bound result and prescribed request/query or screenshot evidence."
              ],
              "prepared_artifact": {
                "reference": "fixture://pgb77/collection",
                "preparation_id": null
              },
              "api": {
                "method": "GET",
                "operation": "Observe fixed synthetic record",
                "route": "/api/record",
                "route_preparation_id": null,
                "actor": "ACTOR-01",
                "request_selector": "selected.bru",
                "selector_preparation_id": null,
                "expected_status": 200,
                "expected_response": [
                  "record_id record-001, tenant_id tenant-a, state ready."
                ]
              },
              "database": null,
              "ui": null
            },
            {
              "id": "E01.S2",
              "caller": "E01.S1",
              "skill": "qa-bruno",
              "action": "Observe the prepared tenant-a record.",
              "children": [],
              "inputs": {},
              "bindings": [],
              "outputs": [
                "record_id"
              ],
              "expected": [
                "Visible/returned record-001 belongs to tenant-a and has state ready."
              ],
              "evidence": [
                "Actual revision-bound result and prescribed request/query or screenshot evidence."
              ],
              "prepared_artifact": {
                "reference": "fixture://pgb77/collection",
                "preparation_id": null
              },
              "api": {
                "method": "GET",
                "operation": "Observe fixed synthetic record",
                "route": "/api/record",
                "route_preparation_id": null,
                "actor": "ACTOR-01",
                "request_selector": "selected.bru",
                "selector_preparation_id": null,
                "expected_status": 200,
                "expected_response": [
                  "record_id record-001, tenant_id tenant-a, state ready."
                ]
              },
              "database": null,
              "ui": null
            },
            {
              "id": "E01.S3",
              "caller": "qa-entrypoint",
              "skill": "qa-database",
              "action": "Observe the prepared tenant-a record.",
              "children": [],
              "inputs": {
                "record_id": null
              },
              "bindings": [
                {
                  "from_step": "E01.S1",
                  "output": "record_id",
                  "to_input": "record_id"
                }
              ],
              "outputs": [],
              "expected": [
                "Visible/returned record-001 belongs to tenant-a and has state ready."
              ],
              "evidence": [
                "Actual revision-bound result and prescribed request/query or screenshot evidence."
              ],
              "prepared_artifact": {
                "reference": "fixture://pgb77/query",
                "preparation_id": null
              },
              "api": null,
              "database": {
                "engine": "postgresql",
                "reader": "qa-database/read-postgres.mjs",
                "access_reference": "fixture://pgb77/restricted-access",
                "scope": {
                  "tenant": "tenant-a",
                  "records": "Only record-001 in tenant-a",
                  "columns": [
                    "record_id",
                    "tenant_id",
                    "state"
                  ],
                  "max_rows": 1
                },
                "parameters": [
                  "tenant-a",
                  null
                ],
                "parameters_preparation_id": null,
                "observations": [
                  "Exactly one row: record_id record-001, tenant_id tenant-a, state ready."
                ],
                "parameter_bindings": [
                  {
                    "input": "record_id",
                    "index": 1
                  }
                ]
              },
              "ui": null
            },
            {
              "id": "E01.S4",
              "caller": "qa-entrypoint",
              "skill": "qa-ui",
              "action": "Navigate /ui, capture start, enter actual record_id, capture input, activate Lookup once, capture result.",
              "children": [],
              "inputs": {
                "record_id": null
              },
              "bindings": [
                {
                  "from_step": "E01.S1",
                  "output": "record_id",
                  "to_input": "record_id"
                }
              ],
              "outputs": [],
              "expected": [
                "Visible/returned record-001 belongs to tenant-a and has state ready."
              ],
              "evidence": [
                "Actual revision-bound result and prescribed request/query or screenshot evidence."
              ],
              "prepared_artifact": {
                "reference": null,
                "preparation_id": null
              },
              "api": null,
              "database": null,
              "ui": {
                "surface": "REQUIRED_ACTUAL_SURFACE",
                "browser": "REQUIRED_ACTUAL_BROWSER",
                "device": "desktop",
                "viewport": {
                  "mode": "supplied_default",
                  "width": null,
                  "height": null,
                  "reference": "fixture://pgb77/actual-viewport"
                },
                "entry_route": "/ui",
                "route_preparation_id": null,
                "required_capabilities": [
                  "Browser navigation",
                  "Keyboard input",
                  "Screenshot capture"
                ],
                "screenshot_checkpoints": [
                  "start: Record ID field and Lookup button",
                  "input: actual API record_id entered",
                  "result: record-001, tenant-a, ready visible"
                ]
              }
            }
          ]
        }
      ],
      "human_review": {
        "no_ai_cases_reason": null,
        "cases": []
      },
      "automated_regression": "Fixed instruction exercise; no designated human acceptance is completed."
    },
    "open_questions": []
  },
  "context": {
    "schema": "pigboard-work-validation-context/v1",
    "subject_key": "EX-77",
    "repositories": [
      {
        "url": "https://example.invalid/example/application",
        "base_branches": [
          "main"
        ]
      }
    ],
    "allowed_skills": [
      "qa-api",
      "qa-bruno",
      "qa-database",
      "qa-ui"
    ],
    "configured_targets": [
      "local-review"
    ],
    "references": [
      "fixture://pgb77/tenant-a",
      "fixture://pgb77/data",
      "fixture://pgb77/collection",
      "fixture://pgb77/query",
      "fixture://pgb77/restricted-access",
      "fixture://pgb77/actual-viewport"
    ],
    "prerequisite_graph": [
      {
        "ticket": "EX-77",
        "prerequisites": []
      }
    ],
    "related_changes": [],
    "operations": []
  }
};
packet.context.operations = packet.work.testing_strategy.cases[0].steps.map(step => ({
  step: step.id, contract: structuredClone(step), read_only: true,
  max_duration_seconds: step.database ? 20 : 5,
  parameter_count: step.database ? 2 : null
}));
export const query = 'SELECT record_id, tenant_id, state\nFROM qa_fixture.records\nWHERE tenant_id = $1 AND record_id = $2\nORDER BY record_id\n';
const seed = `CREATE SCHEMA qa_fixture;
CREATE TABLE qa_fixture.records (tenant_id text NOT NULL, record_id text NOT NULL, state text NOT NULL, PRIMARY KEY (tenant_id, record_id));
INSERT INTO qa_fixture.records VALUES ('tenant-a', 'record-001', 'ready'), ('tenant-b', 'record-001', 'tenant-b-control');
ALTER TABLE qa_fixture.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_fixture.records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_a_read ON qa_fixture.records FOR SELECT TO qa_reader USING (tenant_id = 'tenant-a');
GRANT CONNECT ON DATABASE pgb77_fixture TO qa_reader;
GRANT USAGE ON SCHEMA qa_fixture TO qa_reader;
GRANT SELECT (record_id, tenant_id, state) ON qa_fixture.records TO qa_reader;
`;
const selected = `meta {
  name: Prepared record
  type: http
  seq: 1
}
get {
  url: http://127.0.0.1:REQUIRED_PORT/api/record
  body: none
  auth: none
}
assert {
  res.status: 200
  res.body.tenant_id: tenant-a
  res.body.state: ready
}
tests {
  test("record identity is usable for binding", function () {
    expect(res.getBody().record_id).to.equal("record-001");
  });
}
`;
const ui = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Prepared record lookup</title>
<style>body{font:20px system-ui;max-width:42rem;margin:3rem auto;padding:1rem}label,input,button{display:block;margin:1rem 0}input,button{font:inherit;padding:.5rem}output{display:block;padding:1rem;background:#eef7f5}</style>
<h1>Prepared record lookup</h1><p>Synthetic tenant: tenant-a</p>
<form><label for="record">Record ID</label><input id="record" name="record" autocomplete="off"><button>Lookup</button></form>
<output aria-live="polite">Enter a record ID.</output>
<script>document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const value=document.querySelector('input').value;document.querySelector('output').textContent=value==='record-001'?'record-001 | tenant-a | ready':'No prepared record found.';});</script></html>`;

export async function prepareFixture(runDir) {
  const root = resolve(runDir);
  await mkdir(root, { recursive: true, mode: 0o700 });
  await mkdir(resolve(root, 'collection'), { mode: 0o700 });
  await mkdir(resolve(root, 'evidence'), { recursive: true, mode: 0o700 });
  const files = {
    'collection/bruno.json': {version:'1',name:'PGB77 fixed local fixture',type:'collection',ignore:['node_modules','.git']},
    'collection/selected.bru': selected,
    'collection/sentinel.bru': selected.replace('Prepared record','Unselected sentinel').replace('seq: 1','seq: 2').replace('/api/record','/unselected'),
    'query.sql': query, 'seed.sql': seed, 'params.json':['tenant-a',null],
    'response.json':{record_id:'record-001',tenant_id:'tenant-a',state:'ready'},
    'ui.html':ui, 'work.yaml':packet.work, 'facts.yaml':packet.context,
    'output-mapping.json':{step:'E01.S2',output:'record_id',source:'actual selected request response body in the actual Bruno JSON report',json_pointer:'/record_id',parent_exposes:'E01.S1.record_id',instruction:'Inspect actual report shape first; preserve observed value and provenance. Never use expected record ID as output.'},
    'db-context.json':{environment:'test',stage:'pgb77-local',targetIdentityEvidence:'REQUIRED_ACTUAL_RECEIPT_PATH',readOnlyRoleEvidence:'REQUIRED_ACTUAL_ROLE_EVIDENCE_PATH',database:{host:'127.0.0.1',port:null,name:'pgb77_fixture',user:'qa_reader'}},
    'preparation.json':{
      state:'NOT_READY',kind:'synthetic fixed test-only preparation; no acceptance or deployment claim',
      required:['Exact source/installed full commit and manifest hashes','Actual unused HTTP endpoint replaces REQUIRED_PORT in selected/sentinel before freeze','Raw explicitly mock pipeline receipt plus server metadata and normalized matching facts','Actual separately trusted identity/tenant/destination/access evidence','Existing private TLS PostgreSQL cluster and restricted qa_reader (create role before seed.sql); no admin URL given to QA','Actual restricted grants/RLS/TLS/CA/name evidence and matching db-context.json','Actual supported UI surface/browser/default-viewport receipt and retained screenshot reference/dimensions; update full UI step and matching context operation together','Real start validation of full original work.yaml/facts.yaml; freeze all artifacts before helper invocation'],
      runtime_environment_names:['PGB77_DATABASE_URL','QA_DB_CA_FILE','QA_DB_TLS_SERVERNAME'],
      database_owner_setup:'Create qa_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS with private ephemeral password; database pgb77_fixture; apply seed.sql as owner via owned private socket. Hostssl SCRAM loopback only; reject non-TLS. No QA admin access.',
      ui_checkpoints:['start','input','result'],
      negative_preparation:'Use fresh isolated run copies. E02 response.json state pending, ready assertions unchanged. Missing/stale/untrusted receipts, missing selected file, wrong-tenant output/access, unsupported engine, missing UI capability or supplied unresolved child history are separate variants. Do not fabricate operation history or verdicts.',
      cleanup:'Retain sanitized evidence, stop only the owned server/private cluster, remove only this owned run output. Human H01/H02 remain pending.'
    }
  };
  for (const [name,value] of Object.entries(files)) await writeFile(resolve(root,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
  return {runDir:root,preparation:resolve(root,'preparation.json'),ready:false};
}

export async function serveFixture(runDir, {port} = {}) {
  if (!Number.isInteger(port) || port<0 || port>65535) throw Error('Supply an unused loopback port.');
  const root=resolve(runDir), response=JSON.parse(await readFile(resolve(root,'response.json'),'utf8'));
  if (response.record_id!=='record-001'||response.tenant_id!=='tenant-a'||!['ready','pending'].includes(response.state)) throw Error('Invalid fixed fixture response.');
  const html=await readFile(resolve(root,'ui.html'),'utf8');
  const auditFile=resolve(root,'evidence/http-audit.jsonl');
  await writeFile(auditFile,'',{flag:'wx',mode:0o600});
  const server=createServer(async(req,res)=>{
    // Fixed exact routes only; never resolve a request path against disk or proxy it.
    const route=['/api/record','/ui','/unselected','/favicon.ico'].includes(req.url)?req.url:'unrecognized';
    try {
      await appendFile(auditFile,JSON.stringify({at:new Date().toISOString(),method:req.method,path:route})+'\n');
      res.setHeader('Cache-Control','no-store');
      if(req.method!=='GET'){res.writeHead(405);res.end();}
      else if(route==='/api/record'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(response));}
      else if(route==='/ui'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
      else if(route==='/unselected'){res.writeHead(418,{'Content-Type':'application/json'});res.end('{"sentinel":"unselected request executed"}');}
      else if(route==='/favicon.ico'){res.writeHead(204);res.end();}
      else{res.writeHead(404);res.end();}
    }catch{res.writeHead(500);res.end();}
  });
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
  const receipt={kind:'actual local synthetic fixture endpoint; not deployment acceptance',pid:process.pid,host:'127.0.0.1',port:server.address().port,startedAt:new Date().toISOString(),auditFile};
  await writeFile(resolve(root,'server-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  return {server,receipt};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [mode,dir,port,...extra]=process.argv.slice(2);
  try {
    if(!dir||extra.length||!['prepare','serve'].includes(mode)||(mode==='prepare'&&port!==undefined)||(mode==='serve'&&!/^\d+$/.test(port??'')))throw Error('Use prepare RUN_DIR or serve RUN_DIR PORT.');
    if(mode==='prepare')console.log(JSON.stringify(await prepareFixture(dir)));
    else {const {server,receipt}=await serveFixture(dir,{port:Number(port)});console.log(JSON.stringify(receipt));for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close());}
  }catch(error){console.error(error.message);process.exitCode=1;}
}

// PGB-110 source-only fixed publisher preparation. These imports reuse delivered
// prerequisite data; none of these packets execute a skill or transport.
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { parse, stringify } from 'yaml';
import { digestValue, validateHandoff } from '../../lib/contracts/handoff.mjs';
import { partialFixtures, transitiveFixtures, executionProofFixtures, records, targetRecord, changeTarget } from './qa-partial-results.mjs';

const qaSeeds = JSON.parse(readFileSync(new URL('./handoff-chains.json', import.meta.url))).chains;
const qaNotice = 'SUPPLIED/MOCK: fixed synthetic provider and observation data; no live delivery, helper execution or human acceptance.';
const qaHash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const qaBody = record => JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:JSON.stringify(record)}]}]});
const qaRef = (r,c) => ({ticket_id:r.ticket_id,comment_id:c,record_id:r.record_id,digest:digestValue(r)});
function sealQa(e) {
  for(let i=0;i<20;i++) {
    const rows=records(e), hashes=new Map(rows.map(({r})=>[r.record_id,digestValue(r)]));let changed=false;
    const walk=v=>{if(!v||typeof v!=='object')return;if(v.record_id&&Object.hasOwn(v,'digest')&&hashes.has(v.record_id)&&v.digest!==hashes.get(v.record_id)){v.digest=hashes.get(v.record_id);changed=true;}Object.values(v).forEach(walk);};
    walk(e);for(const {c,r} of rows){walk(r);c.body=qaBody(r);}if(!changed)return e;
  }
  throw Error('Fixed publisher references did not converge.');
}
function mixedQa() {
  const e=structuredClone(qaSeeds.mixed),old=e.requirements[0].digest,work=structuredClone(packet.work),facts=structuredClone(packet.context);
  // Bind the publisher's simulated UI history to named prepared mock surfaces;
  // keep the older helper fixture's actual-setup placeholders unchanged.
  const uiStep=work.testing_strategy.cases[0].steps.find(step=>step.skill==='qa-ui');
  uiStep.ui.surface='supplied/mock browser';uiStep.ui.browser='supplied/mock Chromium';
  facts.operations.find(operation=>operation.step===uiStep.id).contract=structuredClone(uiStep);
  work.testing_strategy.human_review.cases=structuredClone(JSON.parse(qaSeeds.mixed.requirements[0].body).testing_strategy.human_review.cases);
  const human=structuredClone(work.testing_strategy.human_review.cases[0]);human.id='HQA-02';human.steps=['Review the visible result wording for the supplied tenant.'];work.testing_strategy.human_review.cases.push(human);
  const finalDigest=digestValue(work);
  facts.subject_key=e.issues[0].key;facts.prerequisite_graph=[{ticket:e.issues[0].key,prerequisites:[]}];
  e.requirements[0]={...e.requirements[0],body:JSON.stringify(work),context_body:JSON.stringify(facts),digest:finalDigest};e.issues[0].requirements_digest=finalDigest;
  for(const {c,r}of records(e)) {r.requirements_digest=finalDigest;if(r.kind==='qa'){r.payload.report.steps.forEach((row,i)=>row.id=work.testing_strategy.cases[0].steps[i].id);r.payload.report.human_pending=work.testing_strategy.human_review.cases.map(x=>x.id);}c.body=qaBody(r);}
  for(const v of e.evidence_receipts)if(v.details.requirements_digest===old)v.details.requirements_digest=finalDigest;
  return sealQa(e);
}
function staticQa() {
  const e=structuredClone(partialFixtures()['human-static']);
  const requirement=e.requirements[0],work=JSON.parse(requirement.body),old=requirement.digest;
  const second=structuredClone(work.testing_strategy.human_review.cases[0]);
  second.id='HQA-02';second.steps=['Review the static document with product expectations.'];
  work.testing_strategy.human_review.cases.push(second);
  const digest=digestValue(work);requirement.body=JSON.stringify(work);requirement.digest=digest;
  e.issues[0].requirements_digest=digest;
  for(const {c,r}of records(e)){
    r.requirements_digest=digest;
    if(r.kind==='qa')r.payload.report.human_pending=['HQA-01','HQA-02'];
    c.body=qaBody(r);
  }
  for(const receipt of e.evidence_receipts)if(receipt.details.requirements_digest===old)receipt.details.requirements_digest=digest;
  return sealQa(e);
}
// Separate instruction copies may add truthful preconditions/reasons. Keep the
// target issue's requirement references coherent without rewriting upstream work.
function qaRebindWork(e, work) {
  const ticket=e.target.ticket_id,requirement=e.requirements.find(x=>x.ticket_id===ticket),old=requirement.digest;
  const facts=JSON.parse(requirement.context_body),digest=digestValue(work);
  facts.operations=work.testing_strategy.cases.flatMap(c=>c.steps.map(step=>{
    const prior=facts.operations.find(x=>x.step===step.id)??facts.operations.find(x=>x.contract.skill===step.skill);
    return {...structuredClone(prior),step:step.id,contract:structuredClone(step)};
  }));
  requirement.body=JSON.stringify(work);requirement.context_body=JSON.stringify(facts);requirement.digest=digest;
  e.issues.find(x=>x.id===ticket).requirements_digest=digest;
  for(const {c,r}of records(e))if(r.ticket_id===ticket){r.requirements_digest=digest;c.body=qaBody(r);}
  for(const receipt of e.evidence_receipts)if(receipt.details.requirements_digest===old&&receipt.pr?.number===targetRecord(e).payload.pr?.number)receipt.details.requirements_digest=digest;
  return sealQa(e);
}
function qaWaitCopy(original,{pure=false}={}) {
  const e=structuredClone(original),work=JSON.parse(e.requirements.find(x=>x.ticket_id===e.target.ticket_id).body);
  work.testing_strategy.cases[0].preconditions.push('The prepared fixture://example/filter resource for this case requires the unresolved EX-3 correction, exact typed request1002/2032, before remaining observations can continue.');
  changeTarget(e,r=>{
    if(pure){r.payload.reason='The prepared current-case filter resource requires unresolved upstream request1002/2032; no local observation executed.';delete r.payload.findings;for(const row of r.payload.qa_report.steps){row.result='NOT_RUN';row.evidence=[];row.finding_ids=[];}}
    for(const row of r.payload.qa_report.steps.filter(x=>x.result==='NOT_RUN'))row.not_run_reason=(pure?'No local observation executed.':row.not_run_reason)+' The current-case prepared filter resource requires unresolved upstream request1002/2032.';
  });
  return qaRebindWork(e,work);
}
function qaInabilityCopy(original){
  const e=structuredClone(original);
  changeTarget(e,r=>{
    const row=r.payload.qa_report.steps.find(x=>x.skill==='qa-ui');
    row.not_run_reason+=' Later scoped browser capability check returned SESSION_UNAVAILABLE; this UI observation was not started.';
  });return e;
}
function qaJoinedCopy(original){
  const e=structuredClone(original),work=JSON.parse(e.requirements.find(x=>x.ticket_id===e.target.ticket_id).body);
  const dbCase=work.testing_strategy.cases.find(c=>c.steps.some(x=>x.skill==='qa-database')),db=dbCase.steps[0];
  dbCase.depends_on=[];db.bindings=[];db.inputs.record_id='fixture-1';db.database.parameters=['example','fixture-1'];db.database.parameter_bindings=[];
  changeTarget(e,r=>{
    const rows=r.payload.qa_report.steps,child=rows.find(x=>x.skill==='qa-bruno');
    const childReceipt=e.evidence_receipts.find(x=>x.kind==='artifact'&&x.uri.includes('TC-01.S2-0'));
    child.result='FAIL';child.evidence=[{label:'Supplied selected saved-filter request returned no result',uri:childReceipt.uri,digest:null}];child.finding_ids=['F1'];child.not_run_reason=null;
    const dbRow=rows.find(x=>x.skill==='qa-database');dbRow.finding_ids=['F2'];
    const ui=rows.find(x=>x.skill==='qa-ui');ui.not_run_reason+=' Later scoped browser check returned SESSION_UNAVAILABLE; UI not started.';
    rows.at(-1).not_run_reason+=' Retain the declared F1/F2 prerequisite union and unavailable browser session.';
  });return qaRebindWork(e,work);
}
const savedFilterPassResponse={status:200,body:{results:[{id:'fixture-1',name:'Monthly',tenant_id:'example'}]}};
const savedFilterFailResponse={status:200,body:{results:[]}};
const savedFilterQuery='SELECT id, name, tenant_id\nFROM synthetic_saved_filters\nWHERE tenant_id = $1 AND id = $2\nLIMIT 1;\n';
function qaOutcomeFacts(id,e,work,report){
  const wait=['H02-wait','Q09-wait','H02-upstream-wait','H02-wait-instruction','Q13-wait-foreign-finding-instruction'].includes(id),inability=['H02-defect-inability','Q11-retained-findings','Q11-joined-inability','H02-defect-inability-instruction','Q11-three-inability','Q11-independent-inability','Q13-partial-pass-inability','Q13-null-pass-instruction','Q13-null-fail-instruction','Q13-null-foreign-artifacts-instruction','Q13-foreign-result-instruction','Q13-null-environment-instruction','Q11-missing-middle-instruction'].includes(id);
  const record=targetRecord(e),actor=work.testing_strategy.actors[0],facts={notice:qaNotice,category:'supplied/mock',audience:'private fixture operator and reviewer',dependency_observations:[],domain_inabilities:[]};
  const affected=report.steps.filter(x=>x.result==='NOT_RUN').map(x=>x.id);
  if(wait){const request=structuredClone(record.payload.requests[0]);facts.dependency_observations.push({
    observed_at:'2026-11-15T09:40:10Z',ticket_id:record.ticket_id,case_id:work.testing_strategy.cases[0].id,affected_steps:affected,
    actor_id:actor.id,tenant:actor.tenant,pr:record.payload.pr,resource:'fixture://example/filter',upstream:{ticket_id:'1002',key:'EX-3',request},
    source:'Fixed original mock current-case fixture readiness response, authored before freezing.',
    original_response:{status:409,body:{ticket_id:record.ticket_id,tenant:actor.tenant,pr:record.payload.pr,resource:'fixture://example/filter',ready:false,reason:'Required upstream correction has not reached this prepared case.',request,resolved:false,case_id:work.testing_strategy.cases[0].id,affected_steps:affected}}
  });}
  if(inability){const step=work.testing_strategy.cases.flatMap(c=>c.steps).find(x=>x.skill==='qa-ui');facts.domain_inabilities.push({
    observed_at:'2026-11-15T09:40:20Z',ticket_id:record.ticket_id,case_id:work.testing_strategy.cases.find(c=>c.steps.some(x=>x.id===step.id)).id,step_id:step.id,
    actor_id:actor.id,tenant:actor.tenant,identity_reference:actor.identity_reference,pr:record.payload.pr,surface:step.ui.surface,
    attempted_capability_check:'Inspect availability of the already prepared browser session before UI observation',
    original_response:{request:{capability:'prepared-browser-session',ticket_id:record.ticket_id,step_id:step.id,actor_id:actor.id,tenant:actor.tenant,surface:step.ui.surface,pr:record.payload.pr},status:503,body:{code:'SESSION_UNAVAILABLE',step_id:step.id,actor_id:actor.id,tenant:actor.tenant,surface:step.ui.surface,session_available:false,observation_started:false}},
    publisher_authority_affected:false,source:'Fixed original mock domain capability response after the retained API observation; not an actual UI execution.'
  });}
  if(['Q11-independent-inability','Q13-partial-pass-inability','Q13-null-pass-instruction'].includes(id)){const step=work.testing_strategy.cases.flatMap(c=>c.steps).find(x=>x.skill==='qa-database');facts.domain_inabilities.push({observed_at:'2026-11-15T09:40:20Z',ticket_id:record.ticket_id,case_id:work.testing_strategy.cases.find(c=>c.steps.some(x=>x.id===step.id)).id,step_id:step.id,actor_id:actor.id,tenant:actor.tenant,identity_reference:actor.identity_reference,pr:record.payload.pr,capability:'prepared PostgreSQL session',original_response:{status:503,body:{code:'SESSION_UNAVAILABLE',session_available:false,observation_started:false}},publisher_authority_affected:false,source:'Fixed original mock database capability failure; no query executed.'});}
  return facts;
}

function qaSavedBinding(work,report){
  const steps=work.testing_strategy.cases.flatMap(c=>c.steps),child=steps.find(x=>x.skill==='qa-bruno'),parent=steps.find(x=>x.skill==='qa-api'),db=steps.find(x=>x.skill==='qa-database');
  if(!db?.bindings.length)return null;
  const childRow=report.steps.find(x=>x.id===child?.id),parentRow=report.steps.find(x=>x.id===parent?.id);
  if(childRow?.result!=='PASS'||parentRow?.result!=='PASS')return null;
  const observed=savedFilterPassResponse.body.results[0].id,pending=report.steps.find(x=>x.id===db.id)?.result==='NOT_RUN';
  return {notice:qaNotice,category:'supplied/mock',
    original_source:{step:child.id,artifact_uri:childRow.evidence[0].uri,json_pointer:'/response/body/results/0/id',value:observed},
    parent_exposure:{step:parent.id,output:'record_id',value:observed,source_step:child.id},
    consumer:{step:db.id,input:'record_id',parameter_index:1,original_parameters:['example',null],bound_parameters:pending?null:['example',observed],...(pending?{pending:true}:{} )},
    provenance:'Fixed supplied selected child response has results[0].id fixture-1; parent exposes only that observed ID.'};
}
function qaSavedObservation(work,report,receipt,{canonicalOnly=false}={}){
  const matches=report.steps.filter(row=>row.evidence.some(ref=>ref.uri===receipt.uri));
  if(!matches.length||receipt.kind!=='artifact'||canonicalOnly)return null;
  const claimed=matches.filter(row=>['PASS','FAIL'].includes(row.result));
  if(!claimed.length)return null;
  if(claimed.some(row=>row.skill!==claimed[0].skill||row.result!==claimed[0].result))throw Error('Incompatible shared fixed observation meanings.');
  const row=claimed[0],step=work.testing_strategy.cases.flatMap(c=>c.steps).find(x=>x.id===row.id);
  if(!step)throw Error('Fixed claimed step has no prescription.');
  const base={notice:qaNotice,category:'supplied/mock',step:row.id,observed_at:'2026-11-15T09:40:03Z',pr:receipt.pr,tenant:'example',source:'Fixed supplied/mock saved-filter history, never a newly executed helper.'};
  if(step.api){
    if(step.api.route!=='/api/filters?name=Monthly'||step.api.request_selector!=='filters/search.bru')throw Error('Unknown fixed saved-filter API prescription.');
    const response=structuredClone(row.result==='FAIL'?savedFilterFailResponse:savedFilterPassResponse);
    return {...base,kind:row.skill==='qa-bruno'?'bruno_response':'api_parent_observation',request:{method:'GET',route:step.api.route,actor_id:step.api.actor,identity_reference:'fixture://example/reader',tenant:'example'},selected_request:step.api.request_selector,prepared_collection_reference:step.prepared_artifact.reference,response,selected_request_count:1,sentinel_request_count:0,
      exposed_output:row.skill==='qa-api'&&response.body.results.length?{record_id:response.body.results[0].id}:{},
      output_provenance:qaSavedBinding(work,report)};
  }
  if(step.database){
    if(step.prepared_artifact.reference!=='fixture://example/reviewed-filter-query.sql')throw Error('Unknown fixed saved-filter SQL reference.');
    const binding=qaSavedBinding(work,report),independent=!step.bindings.length;
    if(!independent&&!binding)throw Error('Saved-filter DB claim lacks observed parent output provenance.');
    return {...base,kind:'postgresql_read_only_observation',query_reference:step.prepared_artifact.reference,query:savedFilterQuery,query_sha256:qaHash(savedFilterQuery),original_parameters:step.database.parameters,bound_parameters:independent?['example','fixture-1']:binding.consumer.bound_parameters,output_binding:binding,
      independent_input:independent?{value:'fixture-1',source:'Explicit independent scoped work input, not an API response'}:null,
      rows:row.result==='FAIL'?[]:[{id:'fixture-1',name:'Monthly',tenant_id:'example'}],row_count:row.result==='FAIL'?0:1,truncated:false,
      identity:{actor_id:'ACTOR-01',role:'qa_reader',tenant:'example',identity_reference:'fixture://example/reader',access_reference:step.database.access_reference,read_only:true,scope:step.database.scope},
      transaction:{begin:'BEGIN READ ONLY',observation_count:1,rollback:'completed',close:'completed'}};
  }
  if(step.ui){
    if(step.ui.entry_route!=='/filters'||step.ui.viewport.width!==1280||step.ui.viewport.height!==800||step.bindings.length)throw Error('Unknown fixed saved-filter UI prescription.');
    return {...base,kind:'ui_observation',entry_route:'/filters',surface:step.ui.surface,browser:step.ui.browser,device:step.ui.device,viewport:step.ui.viewport,input_value:'Monthly',input_source:'Literal prescribed search text; no child-to-UI binding',input_provenance:null,
      checkpoints:[{id:'result',category:'supplied/mock',action:'Enter Monthly in the saved-filter search and inspect the visible result.',observed_at:'2026-11-15T09:40:04Z',visible_text:['SUPPLIED MOCK','Monthly','fixture-1','tenant example'],screenshot:{path:'evidence/filter-result.png',width:1280,height:800,digest:qaHash(mockQaPng('filter-result'))}}]};
  }
  throw Error('Unsupported fixed saved-filter claimed observation.');
}

// Explicit usage, not V/Q prefix inference. Old matrices retain their own bytes.
const qaCanonicalUsage={
 'H02-defect':'H02-defect-instruction','Q08-defect':'H02-defect-instruction',
 'H02-defect-inability':'H02-defect-inability-instruction','Q11-retained-findings':'H02-defect-inability-instruction',
 'H02-wait':'H02-wait-instruction','Q09-wait':'H02-wait-instruction',
 'V03-three':'Q11-three-inability','V03-independent':'Q11-independent-inability','V03-join':'Q11-joined-inability','V03-missing-middle':'Q11-missing-middle-instruction',
 'V04-proof-blocked-exact-fail':'H02-defect-inability-instruction','V04-proof-blocked-exact-pass':'Q13-partial-pass-inability',
 'V04-proof-blocked-null-real-environment':'H02-defect-instruction',
 'V04-proof-blocked-null-pass':'Q13-null-pass-instruction','V04-proof-blocked-null-fail':'Q13-null-fail-instruction',
 'V04-proof-blocked-null-foreign-artifacts':'Q13-null-foreign-artifacts-instruction','V04-proof-blocked-foreign-result':'Q13-foreign-result-instruction',
 'V04-proof-blocked-real-null-environment':'Q13-null-environment-instruction','V04-proof-wait-foreign-finding':'Q13-wait-foreign-finding-instruction'
};
const qaInstructionClock={request:'2026-11-15T10:01:03Z',database:'2026-11-15T10:01:04Z',uiStart:'2026-11-15T10:01:05Z',uiInput:'2026-11-15T10:01:06Z',uiResult:'2026-11-15T10:01:07Z',dependency:'2026-11-15T10:01:10Z',inability:'2026-11-15T10:01:20Z'};
function qaCompletePair(original,{pass=false}={}){
 const e=structuredClone(original);
 changeTarget(e,r=>{
  const report=r.payload.report??r.payload.qa_report,parent=report.steps.find(x=>x.skill==='qa-api'),child=report.steps.find(x=>x.skill==='qa-bruno');
  const evidence=e.evidence_receipts.find(x=>x.kind==='artifact'&&x.uri.includes('TC-01.S2-0'));
  child.result=parent.result=pass?'PASS':'FAIL';child.not_run_reason=parent.not_run_reason=null;
  child.evidence=[{label:'Original selected child response',uri:evidence.uri,digest:null}];
  child.finding_ids=parent.finding_ids=pass?[]:['F1'];
  if(pass){delete r.payload.findings;for(const row of report.steps.filter(x=>x.result==='NOT_RUN')){row.finding_ids=[];row.not_run_reason='Prepared domain capability became unavailable after the completed selected response; observation not started.';}}
 });return e;
}
function qaApplyInstructionClock(artifacts,facts,reference,envelope,checkpoints){
 for(const artifact of artifacts){const body=artifact.body;
  if(body.kind==='api_parent_observation'||body.kind==='bruno_response')body.observed_at=qaInstructionClock.request;
  if(body.kind==='postgresql_read_only_observation')body.observed_at=qaInstructionClock.database;
  if(body.kind==='ui_observation'){
   body.observed_at=qaInstructionClock.uiResult;
   for(const point of body.checkpoints)point.observed_at=point.id==='start'?qaInstructionClock.uiStart:point.id==='input'?qaInstructionClock.uiInput:qaInstructionClock.uiResult;
  }
  artifact.body_sha256=qaHash(JSON.stringify(body));
 }
 for(const point of checkpoints)point.observed_at=point.id==='start'?qaInstructionClock.uiStart:point.id==='input'?qaInstructionClock.uiInput:qaInstructionClock.uiResult;
 for(const fact of facts.dependency_observations)fact.observed_at=qaInstructionClock.dependency;
 for(const fact of facts.domain_inabilities)fact.observed_at=qaInstructionClock.inability;
 if(reference){
  const artifact=artifacts.find(x=>x.uri===reference.uri);artifact.body=structuredClone(facts);artifact.body_sha256=reference.digest=qaHash(JSON.stringify(facts));
  const receipt=envelope.evidence_receipts.find(x=>x.uri===reference.uri);receipt.observed_digest=reference.digest;artifact.original_receipt=structuredClone(receipt);
 }
}

// Fixed mock identity facts for the two existing synthetic fixture families.
// These are prepared test data, never a production grant inferred from work text.
function qaMockAccess(work) {
  const known={
    'fixture://pgb77/tenant-a':{id:'ACTOR-01',role:'reader',tenant:'tenant-a',access_owner:'Fixture operator',identity:'synthetic tenant-a reader'},
    'fixture://example/reader':{id:'ACTOR-01',role:'reader',tenant:'example',access_owner:'Fixture operator',identity:'synthetic example reader'}
  };
  const required=work.testing_strategy.cases.length>0;
  const actors=work.testing_strategy.actors.map(actor=>{
    const fixed=known[actor.identity_reference];
    if(!fixed||['id','role','tenant','access_owner'].some(key=>actor[key]!==fixed[key]))throw Error('Unknown or incoherent fixed QA actor identity.');
    return {...fixed,actor_id:fixed.id,identity_reference:actor.identity_reference,read_only:true,available:true};
  });
  if(required&&!actors.length)throw Error('Fixed runtime prescription has no prepared mock actor.');
  const steps=work.testing_strategy.cases.flatMap(c=>c.steps);
  for(const step of steps.filter(step=>step.api))if(!actors.some(actor=>actor.id===step.api.actor))throw Error('Unprepared fixed API actor.');
  const database_access=steps.filter(step=>step.database).map(step=>{
    const fixed=actors.find(actor=>actor.tenant===step.database.scope.tenant);
    const reference=fixed?.tenant==='tenant-a'?'fixture://pgb77/restricted-access':'fixture://example/restricted-reader-receipt';
    if(!fixed||step.database.access_reference!==reference)throw Error('Incoherent fixed database access identity.');
    return {step:step.id,actor_id:fixed.id,tenant:fixed.tenant,identity_reference:fixed.identity_reference,access_reference:reference,database_role:'qa_reader',read_only:true,scope:structuredClone(step.database.scope)};
  });
  const single=actors.length===1?actors[0]:null;
  return {notice:qaNotice,category:'supplied/mock',runtime_access_required:required,
    identity:single?.identity??null,actor_id:single?.id??null,role:single?.role??null,
    tenant:single?.tenant??null,identity_reference:single?.identity_reference??null,access_owner:single?.access_owner??null,
    actors,database_access,available:required&&actors.every(actor=>actor.available),
    availability:required?'fixed mock access supplied':'no runtime access required',
    proof_scope:'Fixed synthetic identity/access only; no deployment availability or executed observation is established.',
    audience:'private fixture operator and reviewer'};
}
// Real labelled PNG with a tiny built-in bitmap alphabet; no image dependency.
function mockQaPng(checkpoint='result') {
  const glyphs={S:['111','100','111','001','111'],U:['101','101','101','101','111'],P:['110','101','110','100','100'],L:['100','100','100','100','111'],I:['111','010','010','010','111'],E:['111','100','110','100','111'],D:['110','101','101','101','110'],M:['101','111','111','101','101'],O:['111','101','101','101','111'],C:['111','100','100','100','111'],K:['101','101','110','101','101'],R:['110','101','110','101','101'],'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],T:['111','010','010','010','010'],N:['101','111','111','111','101'],A:['010','101','111','101','101'],Y:['101','101','010','010','010'],'-':['000','000','111','000','000'],' ':['000','000','000','000','000']};
  Object.assign(glyphs,{F:['111','100','110','100','100'],H:['101','101','111','101','101'],X:['101','101','010','101','101']});
  const saved=checkpoint==='filter-result',scale=saved?8:4,advance=saved?32:16,left=saved?32:16,top=saved?40:16,lineHeight=saved?96:36;
  const width=saved?1280:440,height=saved?800:130,pixels=Buffer.alloc((width*3+1)*height,255);
  for(let y=0;y<height;y++)pixels[y*(width*3+1)]=0;
  const lines=saved?['SUPPLIED MOCK','SEARCH MONTHLY','FIXTURE-1 MONTHLY','TENANT EXAMPLE']:checkpoint==='start'?['SUPPLIED MOCK','RECORD ID','LOOKUP']:checkpoint==='input'?['SUPPLIED MOCK','RECORD ID RECORD-001','LOOKUP']:['SUPPLIED MOCK','RECORD-001','TENANT-A READY'];
  lines.forEach((line,n)=>[...line].forEach((ch,i)=>(glyphs[ch]??glyphs[' ']).forEach((row,y)=>[...row].forEach((on,x)=>{if(on==='1')for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const p=(top+n*lineHeight+y*scale+dy)*(width*3+1)+1+(left+i*advance+x*scale+dx)*3;pixels[p]=20;pixels[p+1]=60;pixels[p+2]=65;}}))));
  if(['start','input'].includes(checkpoint)){
    // Draw the empty/filled field and Lookup control in the labelled mock UI.
    for(const [left,top,right,bottom]of [[172,48,420,76],[8,84,128,116]]){
      for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
        if(x>left+1&&x<right-1&&y>top+1&&y<bottom-1)continue;
        const offset=y*(width*3+1)+1+x*3;
        pixels[offset]=20;pixels[offset+1]=60;pixels[offset+2]=65;
      }
    }
  }
  const crc=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const t=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,sum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}

export async function prepareQaFixture(runDir,{suite='publication'}={}) {
  if(suite==='dispatch-inputs')return prepareDispatchInputs(runDir);
  if(suite!=='publication')throw Error('Unsupported QA fixture suite.');
  if(typeof runDir!=='string'||!isAbsolute(runDir))throw Error('Supply a fresh absolute private directory.');
  const root=resolve(runDir);await mkdir(root,{mode:0o700}); // Exclusive: no recursive root/old evidence mixing.
  const partial=partialFixtures(),transitive=transitiveFixtures(),proof=executionProofFixtures();
  const fixed={
    'H01-story':mixedQa(),'H01-bug':mixedQa(),
    'H02-defect':structuredClone(qaSeeds.partial),'H02-wait':partial['wait-retained-fail'],
    'H02-inability':partial['blocked-no-environment'],'H02-defect-inability':partial['blocked-retained-fail'],
    'H02-discussion':mixedQa(),'H03-static':staticQa(),'H03-resume':structuredClone(qaSeeds.resume),
    'V03-three':transitive['transitive-blocked-three'],'V03-join':transitive['transitive-blocked-join'],
    'V03-missing-middle':transitive['transitive-blocked-missing-middle'],'V03-independent':transitive['transitive-blocked-independent'],
    ...Object.fromEntries(Object.entries(proof).filter(([k])=>k.startsWith('proof-blocked-')||k==='proof-wait-foreign-finding').map(([k,v])=>['V04-'+k,v]))
  };
  fixed['H02-wait']=qaWaitCopy(fixed['H02-wait']);
  fixed['H02-defect-inability']=qaInabilityCopy(fixed['H02-defect-inability']);
  fixed['H02-upstream-wait']=qaWaitCopy(partial['wait-retained-fail'],{pure:true});
  fixed['Q11-joined-inability']=qaJoinedCopy(transitive['transitive-blocked-join']);
  // Finite independent input faults, selected during preparation, never from a
  // skill's output. These remain input data for the operator's named Q groups.
  const faults={
    'Q03-site':e=>e.issues[0].site='https://foreign.example.invalid',
    'Q03-stream':e=>e.issues[0].stream='stream-2',
    'Q04-missing-row':e=>changeTarget(e,r=>r.payload.report.steps.pop()),
    'Q04-duplicate-row':e=>changeTarget(e,r=>r.payload.report.steps[1]=r.payload.report.steps[0]),
    'Q04-reordered-child':e=>changeTarget(e,r=>r.payload.report.steps.reverse()),
    'Q05-helper-pass-only':e=>changeTarget(e,r=>r.payload.report.steps[0].evidence=[]),
    'Q05-unavailable-artifact':e=>e.evidence_receipts.at(-1).available=false,
    'Q06-source':e=>e.pr_receipts[0].source_revision='f'.repeat(40),
    'Q07-missing-environment':e=>e.evidence_receipts=e.evidence_receipts.filter(x=>x.kind!=='environment'),
    'H03-stale-deployment':e=>e.evidence_receipts.find(x=>x.kind==='environment').pr.source_revision='f'.repeat(40),
    'Q07-wrong-pipeline':e=>e.evidence_receipts.find(x=>x.kind==='environment').actor_id='stranger',
    'Q13-wrong-approval':e=>e.evidence_receipts.find(x=>x.kind==='approval').actor_id='stranger'
  };
  for(const [id,mutate]of Object.entries(faults)){const e=mixedQa();mutate(e);fixed[id]=e;}
  // A pair with identical complete rows and evidence identities. Only bounded
  // evidence-label padding grows; each label remains below schema maxLength2000.
  for(const [id,length]of [['H03-ledger-within-limit',50],['H03-oversized-ledger',1800]]){
    const e=mixedQa();
    changeTarget(e,r=>{
      for(const row of r.payload.report.steps){
        const reference=structuredClone(row.evidence[0]);
        row.evidence=[0,1,2].map(index=>({...reference,label:`${row.id} supplied observation ${index} `+'x'.repeat(length)}));
      }
    });
    fixed[id]=e;
  }
  fixed['H03-changed-requirements']=mixedQa();
  fixed['Q14-append-rejected']=mixedQa();
  fixed['Q08-defect']=structuredClone(qaSeeds.partial);
  fixed['Q09-wait']=structuredClone(fixed['H02-wait']);
  fixed['Q10-inability']=structuredClone(partial['blocked-no-environment']);
  fixed['Q11-retained-findings']=structuredClone(fixed['H02-defect-inability']);
  fixed['Q12-discussion']=mixedQa();
  // Names are fixed, and faults are selected before execution. No output oracle.
  for(const id of ['Q14-append-absent','Q14-append-ambiguous','Q14-stored-timeout','Q15-readback-failed','Q15-wrong-body','Q15-wrong-uuid','Q15-wrong-actor','Q16-chain-pages','Q17-source-drift','Q18-transition-failed','Q19-transition-ambiguous','Q20-transition-stored-timeout','Q21-resume-ambiguous','H03-task','H03-epic','H03-wrong-scope','H03-changed-stage'])fixed[id]=mixedQa();
  fixed['Q21-resume-ambiguous']=structuredClone(qaSeeds.resume);
  const resume=fixed['Q21-resume-ambiguous'],authorization=records(resume).find(x=>x.r.kind==='resume_authorization');
  const other=structuredClone(authorization.c),otherRecord=structuredClone(authorization.r);
  other.id='9999';otherRecord.record_id='93000000-0000-4000-8000-000000000003';other.body=qaBody(otherRecord);
  resume.comment_pages[0].comments.push(other);resume.comment_pages[0].total++;
  fixed['H02-defect-instruction']=qaCompletePair(fixed['H02-defect']);
  fixed['H02-defect-inability-instruction']=qaCompletePair(fixed['H02-defect-inability']);
  fixed['H02-wait-instruction']=qaCompletePair(fixed['H02-wait']);
  fixed['Q11-three-inability']=qaCompletePair(fixed['V03-three']);
  fixed['Q11-independent-inability']=qaCompletePair(fixed['V03-independent']);
  fixed['Q13-partial-pass-inability']=qaCompletePair(fixed['V04-proof-blocked-exact-pass'],{pass:true});
  fixed['Q11-missing-middle-instruction']=changeTarget(structuredClone(fixed['Q11-three-inability']),r=>r.payload.qa_report.steps[2].finding_ids=[]);
  for(const [id,base,fault]of [
   ['Q13-null-pass-instruction','Q13-partial-pass-inability','null'],
   ['Q13-null-fail-instruction','H02-defect-inability-instruction','null'],
   ['Q13-null-foreign-artifacts-instruction','H02-defect-inability-instruction','foreign-null'],
   ['Q13-foreign-result-instruction','H02-defect-inability-instruction','result'],
   ['Q13-null-environment-instruction','H02-defect-inability-instruction','environment'],
   ['Q13-wait-foreign-finding-instruction','H02-wait-instruction','finding']
  ]){
   const e=structuredClone(fixed[base]),r=targetRecord(e),report=r.payload.qa_report;
   if(fault==='finding'){
    const previous=r.payload.findings[0].evidence[0],receipt=structuredClone(e.evidence_receipts.find(x=>x.uri===previous.uri));
    receipt.uri+='-separate-finding';receipt.pr.source_revision='f'.repeat(40);e.evidence_receipts.push(receipt);e.trusted.projects[0].evidence_uris.push(receipt.uri);
    changeTarget(e,x=>x.payload.findings[0].evidence[0].uri=receipt.uri);
   }else for(const receipt of e.evidence_receipts){
    const result=report.steps.some(row=>row.evidence.some(ref=>ref.uri===receipt.uri)),finding=r.payload.findings?.some(f=>f.evidence.some(ref=>ref.uri===receipt.uri));
    if((fault==='null'&&(result||finding||receipt.kind==='environment'))||(fault==='environment'&&receipt.kind==='environment')||(fault==='foreign-null'&&receipt.kind==='environment'))receipt.pr=null;
    if((fault==='foreign-null'&&(result||finding))||(fault==='result'&&receipt.uri===report.steps[0].evidence[0].uri))receipt.pr.source_revision='f'.repeat(40);
   }
   fixed[id]=e;
  }
  for(const [id,e] of Object.entries(fixed))if(!e)throw Error('Missing fixed prerequisite input: '+id);
  const cases={};
  const put=async(name,value)=>{const file=join(root,name);await mkdir(resolve(file,'..'),{recursive:true,mode:0o700});await writeFile(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return file;};
  const png=mockQaPng();
  for(const [id,original]of Object.entries(fixed)) {
    const e=structuredClone(original),terminal=structuredClone(targetRecord(e)),issue=e.issues.find(x=>x.id===terminal.ticket_id),project=e.trusted.projects.find(x=>x.id===issue.project_id);
    issue.stage_id=project.stages.QA;
    const base=`cases/${id}`,input=`${base}/inputs`,operator=`${base}/operator`;
    const candidate=records(e).find(x=>x.r.record_id===terminal.record_id),reviewRef=terminal.payload.review??terminal.payload.basis;
    // Remove only this unattempted synthetic terminal. Keep all upstream, blocked
    // and explicit resume history; the operator never passes a terminal candidate.
    for(const page of e.comment_pages){const before=page.comments.length;page.comments=page.comments.filter(c=>c.id!==candidate.c.id||page.ticket_id!==terminal.ticket_id);page.total-=before-page.comments.length;}
    e.target=reviewRef??qaRef(records(e).find(x=>x.r.ticket_id===terminal.ticket_id&&x.r.kind==='review').r,records(e).find(x=>x.r.ticket_id===terminal.ticket_id&&x.r.kind==='review').c.id);
    const config=parse(readFileSync(new URL('../../config/pigboss.example.yaml',import.meta.url),'utf8'));
    Object.assign(config.defaults,{stages:project.stages,accepted_later_stage_ids:project.accepted_later_stage_ids,actors:project.actors,repositories:project.repositories,worker_prefixes:['stream-'],types:{epic:'21',story:'22',bug:'23'}});
    config.projects=[{id:issue.project_id,key:'EX',board_ids:[],inherit:Object.keys(config.defaults),mappings:{}}];
    const requirement=e.requirements.find(x=>x.ticket_id===terminal.ticket_id),report=terminal.payload.report??terminal.payload.qa_report;
    const assessment={notice:qaNotice,qa_report:report,findings:terminal.payload.findings??[],detailed_evidence:'evidence/observations.json',coverage:{ai_rows:report.steps.length,human_pending:report.human_pending.length,omitted:0},cleanup:{status:'complete',reason:'Supplied read-only synthetic observations; no resources created by publication.'},reuse_basis:report.steps.filter(x=>x.reused_from).map(x=>({id:x.id,original:x.reused_from})),proposed_outcome:terminal.kind,reason:terminal.payload.reason??'Prepared evidence supplied; independently assess it.'};
    const native={notice:qaNotice,id:issue.id,key:issue.key,site:issue.site,project_id:issue.project_id,type_id:id==='H01-bug'||id==='H03-static'?'23':id==='H03-task'?'24':id==='H03-epic'?'21':'22',stage_id:issue.stage_id,labels:['pigboard',issue.stream],pointer:issue.pointer,description:requirement.body};
    if(id==='H03-changed-requirements'){
      const changed=JSON.parse(native.description);
      changed.problem_to_solve+=' Current requirements changed after preparation.';
      native.description=JSON.stringify(changed);
    }
    if(id==='H03-wrong-scope')native.project_id='999';if(id==='H03-changed-stage')native.stage_id=project.stages['In Review'];
    const currentWork=JSON.parse(requirement.body),isMixed=currentWork.testing_strategy.cases.some(c=>c.steps.some(step=>step.id==='E01.S1'));
    const pipelineComments=e.evidence_receipts.filter(receipt=>receipt.kind==='environment').map(receipt=>({
      notice:qaNotice,id:receipt.details.comment_id,provider:'github',
      repository:receipt.pr?.repository??null,pr_number:receipt.pr?.number??null,
      author_id:receipt.details.pipeline_actor_id,update_author_id:receipt.details.pipeline_actor_id,
      created:'2026-11-15T09:30:00Z',updated:'2026-11-15T09:30:00Z',
      uri:receipt.uri,format:'plain',
      body:JSON.stringify({notice:qaNotice,event:'deployment_ready',readiness:'ready',
        source_revision:receipt.pr?.source_revision??null,deployed_revision:receipt.pr?.source_revision??null,
        target_reference:receipt.details.target_reference,target_uri:'https://qa.example.invalid/pgb110',
        repository:receipt.pr?.repository??null,pr_number:receipt.pr?.number??null,target_branch:receipt.pr?.target_branch??null})
    }));
    const outputBinding={notice:qaNotice,category:'supplied/mock',
      original_source:{step:'E01.S2',artifact_uri:report.steps.find(step=>step.id==='E01.S2')?.evidence[0]?.uri??null,json_pointer:'/response/body/record_id',value:'record-001'},
      parent_exposure:{step:'E01.S1',output:'record_id',value:'record-001',source_step:'E01.S2'},
      consumer:{step:'E01.S3',input:'record_id',parameter_index:1,original_parameters:['tenant-a',null],bound_parameters:['tenant-a','record-001']},
      provenance:'Fixed supplied child-response history. The caller observed this value; no output is inferred from an expected assertion.'};
    const uiCheckpoints=['start','input','result'].map((checkpoint,index)=>({
      id:checkpoint,category:'supplied/mock',observed_at:`2026-11-15T09:40:0${index}Z`,
      action:['Opened the supplied mock /ui surface; Record ID field empty and Lookup visible.','Entered the supplied child response record_id record-001 into Record ID.','Activated Lookup once; observed record-001, tenant-a, ready.'][index],
      screenshot:{path:`evidence/ui-${checkpoint}.png`,width:440,height:130,digest:qaHash(mockQaPng(checkpoint))},
      visible_text:checkpoint==='start'?['SUPPLIED MOCK','RECORD ID','LOOKUP']:checkpoint==='input'?['SUPPLIED MOCK','RECORD ID RECORD-001','LOOKUP']:['SUPPLIED MOCK','RECORD-001','TENANT-A READY']
    }));
    const outcomeFacts=qaOutcomeFacts(id,original,currentWork,report),savedBinding=qaSavedBinding(currentWork,report),canonicalOnly=Object.hasOwn(qaCanonicalUsage,id);
    const artifacts=e.evidence_receipts.map(receipt=>{
      const row=report.steps.find(step=>step.evidence.some(ref=>ref.uri===receipt.uri));
      const finding=assessment.findings.find(f=>f.evidence.some(ref=>ref.uri===receipt.uri));
      const body=receipt.kind==='artifact'?{
        notice:qaNotice,pr:receipt.pr,tenant:isMixed?'tenant-a':'example',
        request_observation:row?.result==='FAIL'?{status:200,body:{results:[]},observed:'The prepared saved-filter search returned no Monthly fixture-1 result.'}:row?.result==='PASS'?(isMixed?{status:200,body:{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}}:{status:200,body:{results:[{id:'fixture-1',name:'Monthly',tenant_id:'example'}]}}):null,
        finding_observation:finding?{id:finding.id,observed:'The prepared saved-filter search returned no Monthly fixture-1 result.',summary:finding.summary}:null,
        source:'Fixed supplied/mock observation; not a new helper execution.'
      }:{notice:qaNotice,pr:receipt.pr,kind:receipt.kind,actor_id:receipt.actor_id,details:receipt.details};
      if(isMixed&&row&&receipt.kind==='artifact'){
        delete body.request_observation;delete body.finding_observation;
        body.step=row.id;body.observed_at='2026-11-15T09:40:03Z';
        if(row.skill==='qa-api'||row.skill==='qa-bruno')Object.assign(body,{
          kind:row.skill==='qa-bruno'?'bruno_response':'api_parent_observation',
          selected_request:'selected.bru',request:{method:'GET',route:'/api/record',tenant:'tenant-a'},
          response:{status:200,body:{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}},
          exposed_output:{record_id:'record-001'},output_provenance:outputBinding,
          selected_request_count:1,sentinel_request_count:0
        });
        if(row.skill==='qa-database')Object.assign(body,{
          kind:'postgresql_read_only_observation',query,query_sha256:qaHash(query),
          original_parameters:['tenant-a',null],bound_parameters:['tenant-a','record-001'],output_binding:outputBinding,
          rows:[{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}],row_count:1,truncated:false,
          identity:{role:'qa_reader',tenant:'tenant-a',read_only:true},
          transaction:{begin:'BEGIN READ ONLY',observation_count:1,rollback:'completed',close:'completed'},
          source:'Fixed supplied/mock PostgreSQL observation history; no database was opened by this preparation.'
        });
        if(row.skill==='qa-ui')Object.assign(body,{
          kind:'ui_observation',entry_route:'/ui',surface:'supplied/mock browser',browser:'supplied/mock Chromium',
          viewport:{mode:'supplied_default',width:440,height:130,reference:'fixture://pgb77/actual-viewport',category:'supplied/mock'},
          input_value:'record-001',input_provenance:outputBinding,checkpoints:uiCheckpoints,
          source:'Fixed supplied/mock UI history with three separately inspectable checkpoint images; no browser was opened by preparation.'
        });
      }
      if(!isMixed){const typed=qaSavedObservation(currentWork,report,receipt,{canonicalOnly:id==='V03-join'});if(typed){Object.keys(body).forEach(key=>delete body[key]);Object.assign(body,typed);}}
      return {uri:receipt.uri,available:receipt.available,audience:'private fixture operator and reviewer',category:'supplied/mock',body,body_sha256:qaHash(JSON.stringify(body)),original_receipt:receipt};
    });
    // Give independently authored cause observations a normal approved artifact
    // receipt, so an independently produced record can link the actual proof.
    let outcomeReference=null;
    if(outcomeFacts.dependency_observations.length||outcomeFacts.domain_inabilities.length){
      const uri=`https://evidence.example.invalid/pgb110-${id}-outcome`,body=structuredClone(outcomeFacts),digest=qaHash(JSON.stringify(body));
      const receipt={uri,observed_digest:digest,available:true,actor_id:project.actors.qa[0],pr:terminal.payload.pr,kind:'artifact',details:{}};
      project.evidence_uris.push(uri);e.evidence_receipts.push(receipt);
      const originalProject=original.trusted.projects.find(x=>x.id===issue.project_id);
      originalProject.evidence_uris.push(uri);original.evidence_receipts.push(structuredClone(receipt));
      artifacts.push({uri,available:true,audience:'private fixture operator and reviewer',category:'supplied/mock',body,body_sha256:digest,original_receipt:receipt});
      outcomeReference={label:'Current-case dependency or scoped domain capability observation',uri,digest};
    }
    const legacyContext={scope:'Historical canonical/shape specimen, not an instruction history',work:original.requirements.find(x=>x.ticket_id===terminal.ticket_id),artifacts:structuredClone(artifacts),outcome_facts:structuredClone(outcomeFacts),outcome_facts_reference:structuredClone(outcomeReference)};
    if(!canonicalOnly)qaApplyInstructionClock(artifacts,outcomeFacts,outcomeReference,e,uiCheckpoints);
    if(!Object.hasOwn(qaCanonicalUsage,id)&&id.endsWith('instruction')||['Q11-three-inability','Q11-independent-inability','Q13-partial-pass-inability'].includes(id)){
      const parent=artifacts.find(x=>x.body.kind==='api_parent_observation'&&x.body.step===report.steps.find(r=>r.skill==='qa-api')?.id),child=artifacts.find(x=>x.body.kind==='bruno_response'&&x.body.step===report.steps.find(r=>r.skill==='qa-bruno')?.id);
      if(parent&&child){parent.body.child_source={step:child.body.step,uri:child.uri,response_digest:qaHash(JSON.stringify(child.body.response)),observed_at:child.body.observed_at};parent.body_sha256=qaHash(JSON.stringify(parent.body));}
    }
    const scenario=id.startsWith('Q')?id:'normal';
    if(id==='H02-discussion'||id==='Q12-discussion'){assessment.proposed_outcome='discussion';assessment.reason='Discuss the supplied observations only; no final publication or transition requested.';}
    const cards={notice:qaNotice,scenario,reads:{native,comments:e.comment_pages,pr:e.pr_receipts,evidence:e.evidence_receipts,artifacts,outcome_facts:outcomeFacts,outcome_facts_reference:outcomeReference,access:qaMockAccess(currentWork),pipeline:{author:'pipeline',origin:'supplied/mock PR comment',original_comments:pipelineComments,receipts:e.evidence_receipts.filter(x=>x.kind==='environment')},freshness:{native,pr:e.pr_receipts}},capabilities:{actor_id:project.actors.qa[0],append:true,read_exact:true,direct_transitions:true},transitions:['Human Review','Rework Queued','Blocked'].map((stage,i)=>({id:String(61+i),from:project.stages.QA,to:project.stages[stage],name:stage})),append:{storage:['Q14-append-absent','Q14-append-rejected'].includes(scenario)?'not_stored':scenario==='Q14-append-ambiguous'?'ambiguous':'stored',reply:scenario==='Q14-append-rejected'?{status:403,error:'Simulated append permission denied; request was definitely rejected before storage.',definite_failure:true}:scenario.startsWith('Q14-')?'timeout':{id:'9901'}},readback:{id:'9901',author_id:scenario==='Q15-wrong-actor'?'stranger':project.actors.qa[0],update_author_id:scenario==='Q15-wrong-actor'?'stranger':project.actors.qa[0],created:'2026-11-15T14:00:00Z',updated:'2026-11-15T14:00:00Z',body:'MANUAL_ECHO_ACTUAL_SUBMITTED_TRANSPORT_ONLY',fault:scenario==='Q15-wrong-body'?'replace body with unrelated discussion':scenario==='Q15-wrong-uuid'?'replace observed record UUID with 99000000-0000-4000-8000-000000000099':scenario==='Q15-readback-failed'?'unavailable':scenario==='Q16-chain-pages'?'omit final comment page':null},after_publish:scenario==='Q17-source-drift'?'source revision becomes ffffffffffffffffffffffffffffffffffffffff':'same requirement bytes, assignment, source/target, approval/CI and access; issue updated timestamp may change',transition:{reply:scenario==='Q18-transition-failed'?'definite failure':scenario.includes('transition-')?'timeout':'accepted',resolving_status:scenario==='Q20-transition-stored-timeout'?'requested destination':scenario==='Q19-transition-ambiguous'?'unknown':scenario==='Q18-transition-failed'?'QA':'requested destination'},resume_fault:scenario==='Q21-resume-ambiguous'?'no unique explicit resume authorization':null};
    const rejected=new Set([...Object.keys(faults),'V03-missing-middle','V04-proof-blocked-null-pass','V04-proof-blocked-null-fail','V04-proof-blocked-null-foreign-artifacts','V04-proof-blocked-null-real-environment','V04-proof-blocked-real-null-environment','V04-proof-blocked-foreign-result','V04-proof-wait-foreign-finding','H03-task','H03-epic','H03-wrong-scope','H03-changed-stage','H03-changed-requirements','H03-oversized-ledger','Q21-resume-ambiguous']);
    const discussion=['H02-discussion','Q12-discussion'].includes(id);
    const route=['H02-defect','Q08-defect','H02-defect-instruction'].includes(id)?'Rework Queued':
      ['H02-wait','Q09-wait','H02-upstream-wait','H02-wait-instruction','Q13-wait-foreign-finding-instruction'].includes(id)?'Rework Queued':
      id.startsWith('V03-')||id.startsWith('V04-')||id.startsWith('Q11-')||id.startsWith('Q13-')&&id!=='Q13-wrong-approval'||['H02-inability','H02-defect-inability','Q10-inability','Q11-retained-findings','Q11-joined-inability','H02-defect-inability-instruction'].includes(id)?'Blocked':'Human Review';
    const stopAfterAppend=['Q14-append-rejected','Q14-append-absent','Q14-append-ambiguous','Q15-readback-failed','Q15-wrong-body','Q15-wrong-uuid','Q15-wrong-actor','Q16-chain-pages','Q17-source-drift'].includes(id);
    const expectation={
      notice:qaNotice,independent_operator_only:true,
      native_case:(id.startsWith('H02')||id==='Q11-joined-inability')?'R1-24-H02':id.startsWith('H01')?'R1-24-H01':'R1-24-H03',
      usage:canonicalOnly?'canonical-only':'instruction',counterpart:qaCanonicalUsage[id]??null,destination:canonicalOnly?null:discussion?'QA':rejected.has(id)?null:route,
      required_findings:id==='Q11-joined-inability'?['F1','F2']:['H02-defect','H02-wait','H02-defect-inability','Q08-defect','Q09-wait','Q11-retained-findings','H02-defect-instruction','H02-defect-inability-instruction','H02-wait-instruction','Q11-three-inability','Q11-independent-inability','Q11-missing-middle-instruction','Q13-null-fail-instruction','Q13-null-foreign-artifacts-instruction','Q13-foreign-result-instruction','Q13-null-environment-instruction','Q13-wait-foreign-finding-instruction'].includes(id)?['F1']:[],
      human_pending:report.human_pending,preflight_writes:0,
      append_attempts:canonicalOnly||discussion||rejected.has(id)||id.startsWith('Q13-')&&id.endsWith('-instruction')||id==='Q11-missing-middle-instruction'?0:1,
      transition_attempts:canonicalOnly||discussion||rejected.has(id)||stopAfterAppend||id.startsWith('Q13-')&&id.endsWith('-instruction')||id==='Q11-missing-middle-instruction'?0:1,
      order:canonicalOnly?['record validation','supplied chain validation']:['scope/work/pointer/complete pages','PR/review/CI/evidence','record and predecessor validation','format','freshness','append','exact readback','observed chain validation','freshness','direct transition','status'],
      scenario,negative:rejected.has(id),
      instruction:'Independently validate actual output against accepted requirements and named boundary, retained IDs, route and ordered calls. Echo success is not a passing case. Expectations and validator candidates are withheld.'
    };
    await put(`${input}/work.yaml`,requirement.body);await put(`${input}/facts.yaml`,requirement.context_body);await put(`${input}/scope.yaml`,stringify(config));await put(`${input}/assessment.json`,assessment);await put(`${input}/predecessors.json`,e);
    await put(`${input}/known-requests.json`,terminal.payload.requests??[]);
    await put(`${input}/evidence/mock.png`,png);
    await put(`${input}/evidence/outcome-facts.json`,JSON.stringify(outcomeFacts));
    if(!isMixed&&!canonicalOnly){
      const savedUi=artifacts.find(x=>x.body.kind==='ui_observation');
      const savedDb=artifacts.find(x=>x.body.kind==='postgresql_read_only_observation');
      if(savedUi)await put(`${input}/evidence/filter-result.png`,mockQaPng('filter-result'));
      if(savedDb)await put(`${input}/evidence/saved-filter-query.sql`,savedFilterQuery);
      if(savedBinding)await put(`${input}/evidence/output-binding.json`,savedBinding);
    }
    if(isMixed){
      for(const checkpoint of ['start','input','result'])await put(`${input}/evidence/ui-${checkpoint}.png`,mockQaPng(checkpoint));
      await put(`${input}/evidence/output-binding.json`,outputBinding);
      await put(`${input}/evidence/pipeline-comment.json`,pipelineComments);
    }
    await put(`${input}/evidence/observations.json`,{notice:qaNotice,category:'supplied/mock',audience:'private fixture operator and reviewer',observations:e.evidence_receipts,artifacts,outcome_facts:outcomeFacts,outcome_facts_reference:outcomeReference,pipeline_comments:pipelineComments,output_binding:isMixed?outputBinding:savedBinding,ui_checkpoints:isMixed?uiCheckpoints:(artifacts.find(x=>x.body.kind==='ui_observation')?.body.checkpoints??[]),helper_sample_only_not_imported_report_evidence:{api:{record_id:'record-001',tenant:'tenant-a',state:'ready',source:'fixed synthetic request report'},database:{parameters:['tenant-a','record-001'],rows:[{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}],rollback:'supplied complete'},output_provenance:{value:'record-001',source:'fixed supplied selected request report /record_id',bindings:'E01.S2 exposes E01.S1.record_id to E01.S3'}},screenshot:isMixed?{path:'mock.png',digest:qaHash(png),width:440,height:130,label:'SUPPLIED MOCK RECORD-001 TENANT-A READY'}:artifacts.find(x=>x.body.kind==='ui_observation')?.body.checkpoints[0].screenshot??{path:'mock.png',digest:qaHash(png),width:440,height:130,label:'Unused legacy tenant-a helper sample; not report evidence',unused_sample:true}});
    const causeControls=[];
    if(outcomeFacts.dependency_observations.length){
      for(const fault of ['missing-response','wrong-case','wrong-request','wrong-digest','resolved']){
        const copy=structuredClone(outcomeFacts),fact=copy.dependency_observations[0];
        if(fault==='missing-response')copy.dependency_observations=[];
        if(fault==='wrong-case')fact.original_response.body.case_id='UNRELATED';
        if(fault==='wrong-request')fact.original_response.body.request.comment_id='9999';
        if(fault==='wrong-digest')fact.original_response.body.request.digest='sha256:'+'0'.repeat(64);
        if(fault==='resolved')fact.original_response.body.resolved=true;
        causeControls.push({id:fault,outcome_facts:copy,expected_boundary:'No verified current-case upstream-wait cause; retain existing local defect repair when present. A typed request alone is insufficient.'});
      }
    }
    if(outcomeFacts.domain_inabilities.length){
      for(const fault of ['missing-event','before-observation','wrong-actor','wrong-tenant','wrong-step','success-response']){
        const copy=structuredClone(outcomeFacts),fact=copy.domain_inabilities[0];
        if(fault==='missing-event')copy.domain_inabilities=[];
        if(fault==='before-observation')fact.observed_at='2026-11-15T09:00:00Z';
        if(fault==='wrong-actor')fact.actor_id='OTHER';
        if(fault==='wrong-tenant')fact.tenant='tenant-a';
        if(fault==='wrong-step')fact.step_id='UNRELATED';
        if(fault==='success-response')fact.original_response={status:200,body:{session_available:true,observation_started:false}};
        let boundary='No verified later domain inability; retained local defect remains repair evidence, not fabricated Blocked cause.';
        if(['Q11-independent-inability','Q13-partial-pass-inability','Q13-null-pass-instruction'].includes(id)){
          if(fault!=='missing-event'){
            boundary='The mutated UI observation cannot establish the UI inability. The unchanged TC-01.S3 DB inability remains valid; this control does not establish absence of all later inability. '+
              (id==='Q11-independent-inability'?'Retain the existing F1 local defect repair evidence.':'Preserve the completed PASS rows and empty findings; do not invent a local defect.');
          }else if(id!=='Q11-independent-inability')boundary='No supplied domain-inability observations remain. Preserve the completed PASS rows and empty findings; do not invent a local defect or infer a terminal route from this control.';
          if(id==='Q13-null-pass-instruction')boundary+=' The separate null-proof fault remains; these variants do not isolate a global routing decision, and no valid remaining cause can waive missing runtime proof.';
        }
        causeControls.push({id:fault,outcome_facts:copy,expected_boundary:boundary});
      }
    }
    for(const control of causeControls){
      const variantCards=structuredClone(cards),variantPredecessors=structuredClone(e),bytes=JSON.stringify(control.outcome_facts),digest=qaHash(bytes);
      variantCards.reads.outcome_facts=structuredClone(control.outcome_facts);
      if(outcomeReference){
        variantCards.reads.outcome_facts_reference.digest=digest;
        const artifact=variantCards.reads.artifacts.find(x=>x.uri===outcomeReference.uri);artifact.body=structuredClone(control.outcome_facts);artifact.body_sha256=digest;artifact.original_receipt.observed_digest=digest;
        variantCards.reads.evidence.find(x=>x.uri===outcomeReference.uri).observed_digest=digest;
        variantPredecessors.evidence_receipts.find(x=>x.uri===outcomeReference.uri).observed_digest=digest;
      }
      control.cards=variantCards;control.predecessors=variantPredecessors;control.outcome_file_bytes=bytes;
      control.preparation='Materialize a fresh private variant before dispatch, replacing all cause file/card/receipt views with this fixed copy. Do not edit an observed episode or expose expected_boundary.';
    }
    if(causeControls.length)await put(`${operator}/cause-controls.json`,causeControls);
    if(id==='Q11-three-inability')await put(`${operator}/propagation-controls.json`,[2,3].map(index=>{const copy=structuredClone(assessment);copy.qa_report.steps[index].finding_ids=[];return {id:index===2?'missing-middle-F1':'missing-last-F1',assessment:copy,cards:structuredClone(cards),expected_boundary:'Declared failed/skipped prerequisite finding must be retained; cause and completed pair remain unchanged.'};}));

    await put(`${operator}/cards.json`,cards);await put(`${operator}/expectations.json`,expectation);
    await put(`${operator}/validator-inputs/legacy-context.json`,legacyContext);
    await put(`${operator}/validator-inputs/record.yaml`,stringify(terminal));await put(`${operator}/validator-inputs/published.json`,original);
    if(['H03-changed-requirements','H03-stale-deployment','H03-ledger-within-limit','H03-oversized-ledger','Q14-append-rejected'].includes(id)){
      await put(`${base}/preparation-notes.txt`,({
        'H03-changed-requirements':'Use the unchanged prepared work/context and predecessor chain. The fixed native issue read has only changed problem_to_solve bytes; compare current native requirements with the prepared assignment, retain evidence and do not append or transition.',
        'H03-stale-deployment':'Use the complete prepared assessment. Only the supplied environment receipt names an old source revision; current PR and result evidence stay unchanged. This executed PASS assessment lacks matching deployment proof; reject it before append, preserve it locally and do not relabel PASS rows NOT_RUN.',
        'H03-ledger-within-limit':'Positive control: complete four-row ledger, three uniquely labelled references per row, all within existing schema/record limits. Verify it against the same canonical predecessor chain.',
        'H03-oversized-ledger':'Same complete rows/evidence identities as H03-ledger-within-limit; only each evidence label has1800 padding characters (below field max2000). Full candidate exceeds16KiB. Retain all supplied rows locally and reject before append; do not truncate, split or silently omit.',
        'Q14-append-rejected':'Preflight and candidate facts match H01-story. On the actual first append return only the fixed definite403 rejection; store no body and expose no echoed comment. At most one resolving read may confirm absence. Retain full candidate/evidence and known rejection, stop UNAVAILABLE in QA with no transition, replacement record or retry. Q14-append-absent remains a distinct timeout-then-absence case.'
      })[id]+'\n');
    }
    const claimedSavedUi=artifacts.some(x=>x.body.kind==='ui_observation'&&x.body.entry_route==='/filters'),claimedSavedDb=artifacts.some(x=>x.body.kind==='postgresql_read_only_observation'&&x.body.tenant==='example');
    const linkedFiles=isMixed?['ui-start.png','ui-input.png','ui-result.png','output-binding.json']:[...(claimedSavedDb?['saved-filter-query.sql']:[]),...(savedBinding?['output-binding.json']:[]),...(claimedSavedUi?['filter-result.png']:[])];
    await put(`${base}/evidence-guide.txt`,canonicalOnly?
      'CANONICAL-ONLY: historical shape/record specimen is not a coherent instruction history or caller input. Use '+qaCanonicalUsage[id]+' for the corresponding instruction boundary. No append/transition is promised. Legacy context and terminals stay operator-only.\n':
      'Read inputs/evidence/observations.json and inputs/evidence/outcome-facts.json; cards.reads.artifacts exposes the same report-linked bodies. '+
      (linkedFiles.length?'Claimed evidence files: '+linkedFiles.map(file=>'inputs/evidence/'+file).join(', ')+'. ':'No query or UI checkpoint file is claimed by this report. ')+
      (isMixed?'The three named UI checkpoints are the prescribed evidence. ':'Legacy inputs/evidence/mock.png is an unused tenant-a helper sample, not report-linked evidence. ')+
      'Saved-filter DB bindings exist only where declared; its UI searches literal Monthly and never binds a child output. All observations are supplied/mock history, not live execution.\n');
    await put(`${base}/invocation.txt`,(discussion?'Trusted caller request: discussion only, with no final delivery request. Do not publish or transition. ':'')+(canonicalOnly?'CANONICAL-ONLY; use '+qaCanonicalUsage[id]+' instead; no actor publication/transition is prescribed. ':'')+`Load the bound immutable qa-jira/SKILL.md. All tools in this exercise are supplied/mock. Use mode preflight, then separately final when appropriate. scope: inputs/scope.yaml plus operator-supplied native identity; capabilities: prepared same-release validator root, private output and simulated reads/append/direct transitions; work: original inputs/work.yaml and separately trusted inputs/facts.yaml; assignment: actual native pointer; prepared_assessment: inputs/assessment.json; known_requests: inputs/known-requests.json; retained_delivery: null unless explicit history is supplied. Inspect inputs/evidence/observations.json, inputs/evidence/outcome-facts.json and evidence-guide.txt; follow the linked query/binding/checkpoint files. Never inspect operator/expectations.json or operator/validator-inputs, run domain helpers, contact real providers, or infer actual outcomes from fixture names. Retain actual result, candidate, transport and ordered calls in output/. Operator must bind installed path/commit/hash before execution.\n`);
    await mkdir(join(root,base,'output'),{mode:0o700});cases[id]=join(root,base);
  }
  const manual=`# Manual actual-request transport echo\n\nEvery card is simulated. Freeze source/installed/input hashes and scenario before execution. Keep operator expectations and validator candidates away from the skill.\n\n1. Capture the actual requested append identity, issue, body format, exact HTML bytes or ADF value and original tool-argument serialization. Use the existing extractor to record its actual UUID/digest; retain extraction failure without repair.\n2. Use the preselected stored/not_stored/ambiguous outcome. For stored requests, combine ONLY that unchanged submitted body/format with cards.json's fixed ID, author/editor/timestamps. Append may return only the ID; exact readback returns the echoed body. Do not inject a fixed expected candidate or UUID.\n3. Stored-timeout exposes that exact echo through at most one resolving read. Not-stored returns absence; ambiguous returns insufficient/conflicting facts. Never choose storage after the decision or append again.\n4. Apply only the card's fixed observed-body/UUID/metadata/page corruption; preserve the submitted original separately.\n5. Save an audit linking request ID/path/hash, submitted format/body/UUID/digest, preselected scenario and fixed metadata to derived response bytes/value and observed extracted UUID/digest or extraction error. Build the observed leaf from that actual simulated comment, never validator-inputs.\n6. Independently validate produced record and observed chain, ledger/findings/destination, freshness, ordered calls, mutation counts and actual/unknown status. Echo alone proves no correct decision. Keep actual model/profile, commands, hashes, timestamps, cleanup and human action. No fixture output is live or human acceptance.\n`;
  await put('manual-echo.md',manual);
  const preparation=await put('preparation.json',{suite,state:'NOT_READY',notice:qaNotice,fixture_version:1,source_revision:'BIND_ACTUAL_REVIEWED_COMMIT_AND_INPUT_HASHES',cases,required:['Bind actual immutable installed skill/manifest/payload hashes','Freeze inputs/cards before exercise','Prepare bounded manual echo operator','Keep expectations/candidates withheld','Record actual Sol model/profile and actual output separately'],cleanup:'Retain sanitized evidence first; remove only this owned disposable fixture root. No services/resources were created.',human_acceptance:'R1-24-H01/H02/H03 NOT RUN'});
  return {runDir:root,preparation,cases,ready:false};
}

// One designated historical supplied/mock reuse control. The two completed
// observations precede inability, blocker and explicit authorization. Nothing
// here is a current result or an executed helper.
function dispatchRetainedInput() {
  let e=structuredClone(qaSeeds.resume);
  const terminal=structuredClone(e.target),current=targetRecord(e);
  const blocker=records(e).find(x=>x.r.kind==='blocked');
  e.target=qaRef(blocker.r,blocker.c.id);
  changeTarget(e,r=>{r.payload.qa_report.steps.splice(0,2,...structuredClone(current.payload.report.steps.slice(0,2)));});
  e=qaCompletePair(e,{pass:true});
  const work=JSON.parse(e.requirements[0].body),historical=targetRecord(e),report=historical.payload.qa_report;
  const artifacts=report.steps.slice(0,2).map(row=>{
    const receipt=e.evidence_receipts.find(r=>r.uri===row.evidence[0].uri),body=qaSavedObservation(work,report,receipt);
    body.category='historical supplied/mock';body.observed_at=qaInstructionClock.request;
    return {uri:receipt.uri,available:true,category:'historical supplied/mock',body};
  });
  const [parent,child]=artifacts;
  parent.body.child_source={step:child.body.step,uri:child.uri,response_digest:qaHash(JSON.stringify(child.body.response)),observed_at:child.body.observed_at};
  for(const artifact of artifacts){artifact.body_sha256=qaHash(JSON.stringify(artifact.body));e.evidence_receipts.find(r=>r.uri===artifact.uri).observed_digest=artifact.body_sha256;}
  changeTarget(e,r=>{for(const row of r.payload.qa_report.steps.slice(0,2))row.evidence[0].digest=artifacts.find(a=>a.uri===row.evidence[0].uri).body_sha256;});
  const blocked=records(e).find(x=>x.r.kind==='blocked'),auth=records(e).find(x=>x.r.kind==='resume_authorization');
  blocked.c.created=blocked.c.updated='2026-11-15T10:02:00Z';auth.c.created=auth.c.updated='2026-11-15T10:03:00Z';
  const source=qaRef(blocked.r,blocked.c.id),reuse=[];
  for(const row of report.steps.slice(0,2)){
    const uri=`https://evidence.example.invalid/pgb132-reuse-${row.id}`;
    const receipt={uri,observed_digest:null,available:true,actor_id:'observer',pr:structuredClone(historical.payload.pr),kind:'reuse',details:{case_id:work.testing_strategy.cases.find(c=>c.steps.some(s=>s.id===row.id)).id,step_id:row.id,basis:'This exact historical supplied/mock completed observation remains applicable at the unchanged source revision; no completed action is replayed.',source}};
    e.evidence_receipts.push(receipt);e.trusted.projects[0].evidence_uris.push(uri);reuse.push({label:'Case-specific historical reuse proof',uri,digest:null});
  }
  e.target=terminal;sealQa(e);
  const facts=qaOutcomeFacts('Q13-partial-pass-inability',e,work,report);
  for(const fact of facts.domain_inabilities)fact.observed_at=qaInstructionClock.inability;
  return {envelope:e,historical:{notice:qaNotice,category:'historical supplied/mock',artifacts,reuse,
    blocker:source,authorization:qaRef(auth.r,auth.c.id),domain_inabilities:facts.domain_inabilities,
    new_execution_not_before:'2026-11-15T10:03:01Z'}};
}

// PGB-132 PREP-01: finite source-only input copies, never a dispatcher or result
// producer. Publication specimens and their default export remain untouched.
async function prepareDispatchInputs(runDir) {
  if(typeof runDir!=='string'||!isAbsolute(runDir))throw Error('Supply a fresh absolute private directory.');
  const root=resolve(runDir);await mkdir(root,{mode:0o700});
  const cases={},index=[];
  const put=async(name,value)=>{
    const file=join(root,name);await mkdir(resolve(file,'..'),{recursive:true,mode:0o700});
    const bytes=Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n';
    await writeFile(file,bytes,{flag:'wx',mode:0o600});return {path:name,digest:qaHash(bytes)};
  };
  const partial=partialFixtures(),transitive=transitiveFixtures(),retained=dispatchRetainedInput();
  const fixed={
    'I01-story':mixedQa(),'I01-bug':mixedQa(),
    'I02-child-receipt':mixedQa(),'I02-extraction':mixedQa(),'I02-provenance':mixedQa(),
    'I02-query':mixedQa(),'I02-parameters':mixedQa(),'I02-checkpoint':mixedQa(),
    'I03-pending-ready':mixedQa(),'I03-all-pending':mixedQa(),
    'I04-all-ready':mixedQa(),'I04-one-mismatch':mixedQa(),
    'I05-next-offset':mixedQa(),'I05-deadline':mixedQa(),'I05-missed-offset':mixedQa(),'I05-access-loss':mixedQa(),'I05-missing-bound':mixedQa(),
    'I06-dependent-independent':transitive['transitive-blocked-independent'],
    'I06-chain':transitive['transitive-blocked-three'],'I06-join':qaJoinedCopy(transitive['transitive-blocked-join']),
    'I06-unbound-output':mixedQa(),
    'I07-domain-inability':mixedQa(),'I07-cleanup-inability':mixedQa(),
    'I08-pure-wait':qaWaitCopy(partial['wait-retained-fail'],{pure:true}),
    'I08-fail-wait':qaWaitCopy(partial['wait-retained-fail']),'I08-discussion':mixedQa(),
    'I08-missing-cause':qaWaitCopy(partial['wait-retained-fail'],{pure:true}),
    'I09-static-bug':staticQa(),'I09-task':mixedQa(),'I09-epic':mixedQa(),
    'I10-source-drift':mixedQa(),'I10-requirement-drift':mixedQa(),'I10-stage-drift':mixedQa(),
    'I10-incomplete-pages':mixedQa(),'I10-wrong-scope':mixedQa(),'I10-wrong-actor':mixedQa(),'I10-wrong-tenant':mixedQa(),
    'I11-missing-environment':mixedQa(),'I11-stale-environment':mixedQa(),
    'I11-partial-pass-null-proof':mixedQa(),'I11-partial-fail-null-proof':mixedQa(),
    'I12-append-unknown':mixedQa(),'I12-transition-unknown':mixedQa(),
    'I14-no-model':mixedQa(),'I14-no-clock':mixedQa(),'I14-no-helper':mixedQa(),
    'I14-oversized-ledger':mixedQa(),
    'I13-valid':retained.envelope,'I13-stale':retained.envelope,
    'I13-wrong-tenant':retained.envelope,'I13-untrusted-approval':retained.envelope
  };
  for(const [id,original]of Object.entries(fixed)) {
    for(const {r}of records(original))if(!validateHandoff(JSON.stringify(r),{mode:'record'}).valid)throw Error('Invalid original fixed record: '+id);
    const e=structuredClone(original),terminal=structuredClone(targetRecord(e));
    const issue=e.issues.find(x=>x.id===terminal.ticket_id),project=e.trusted.projects.find(x=>x.id===issue.project_id);
    const requirement=e.requirements.find(x=>x.ticket_id===terminal.ticket_id),work=JSON.parse(requirement.body);
    const facts=JSON.parse(requirement.context_body);let steps=work.testing_strategy.cases.flatMap(c=>c.steps);
    const parent=steps.find(s=>s.skill==='qa-api'),child=steps.find(s=>s.skill==='qa-bruno');
    let db=steps.find(s=>s.skill==='qa-database'),uiStep=steps.find(s=>s.skill==='qa-ui');
    const mixed=parent?.id==='E01.S1',actor=work.testing_strategy.actors[0];
    const review=records(e).filter(x=>x.r.ticket_id===terminal.ticket_id&&x.r.kind==='review').at(-1);
    // Original canonical bytes are inspected before a fixed copy is changed.
    // The synthetic unattempted current result and its report/finding artifacts
    // are never input to a new instruction exercise. Upstream history is kept.
    const preserved=new Set(id.startsWith('I13-')?[...retained.historical.artifacts,...retained.historical.reuse].map(a=>a.uri):[]);
    for(const {r}of records(e).filter(x=>x.r.record_id!==terminal.record_id)){
      const p=r.payload;
      const refs=[p.plan,p.plan_review,p.ci,p.approval,
        ...(p.verification??[]),...(p.prepared_inputs??[]).flatMap(slot=>slot.artifacts),
        ...(p.evidence??[]),...(p.report?.steps??p.qa_report?.steps??[]).flatMap(row=>row.evidence),
        ...(p.findings??[]).flatMap(f=>f.evidence),...(p.report?.uri?[p.report]:[])];
      for(const ref of refs)if(ref?.uri)preserved.add(ref.uri);
    }
    // These four source-seed namespaces and four exact step-artifact identities
    // are fixed here before the work is reshaped. No PR/substr garbage collection.
    const namespaces={
      '00000000-0000-4000-8000-000000000001':'1000-001-1',
      '00000000-0000-4000-8000-000000000005':'1000-005-1',
      '00000000-0000-4000-8000-000000000009':'1000-009-1',
      '00000000-0000-4000-8000-000000000013':'1000-013-1'
    },namespace=namespaces[terminal.assignment.record_id];
    if(!namespace)throw Error('Unknown fixed current-execution namespace.');
    const currentArtifacts=new Set(['TC-01.S1','TC-01.S2','TC-01.S3','TC-01.S4'].map(step=>`https://evidence.example.invalid/${namespace}-${step}-0`));
    if(namespace==='1000-009-1')currentArtifacts.add('https://evidence.example.invalid/finding');
    for(const row of (terminal.payload.report??terminal.payload.qa_report)?.steps??[])for(const ref of row.evidence)currentArtifacts.add(ref.uri);
    for(const finding of terminal.payload.findings??[])for(const ref of finding.evidence)currentArtifacts.add(ref.uri);
    const removed=new Set([...currentArtifacts].filter(uri=>!preserved.has(uri)));
    for(const page of e.comment_pages){const n=page.comments.length;page.comments=page.comments.filter(c=>!(page.ticket_id===terminal.ticket_id&&c.id===e.target.comment_id));page.total-=n-page.comments.length;}
    e.evidence_receipts=e.evidence_receipts.filter(r=>!removed.has(r.uri));
    e.trusted.projects.forEach(p=>p.evidence_uris=p.evidence_uris.filter(uri=>!removed.has(uri)));
    e.target=qaRef(review.r,review.c.id);issue.stage_id=project.stages.QA;
    const asyncCase=/^I0[345]-/.test(id);
    if(asyncCase){
      const c=work.testing_strategy.cases[0];c.steps=[parent,child];
      c.observation={mode:'asynchronous',schedule:[0,30,60],deadline_seconds:90,step:parent.id,completion:id.startsWith('I04-')?'all_observations':'until_expected'};
      work.testing_strategy.dispatch_order=[parent.id];
      work.testing_strategy.testing_types=['api'];
      facts.operations=facts.operations.filter(o=>[parent.id,child.id].includes(o.step));
      facts.operations.forEach(o=>{o.max_duration_seconds=o.step===parent.id?20:5;});
      if(id==='I05-missing-bound')facts.operations.find(o=>o.step===parent.id).max_duration_seconds=null;
      steps=[parent,child];db=undefined;uiStep=undefined;
    }
    // Whole-unit and child bounds are supplied facts, never run by preparation.
    const clock={notice:qaNotice,origin:id.startsWith('I13-')?retained.historical.new_execution_not_before:'2026-11-15T10:00:00Z',offsets:asyncCase?[0,30,60]:[0],deadline_seconds:asyncCase?90:null,
      now_offsets_seconds:id==='I05-missed-offset'?[0,31]:[0,30,60],
      unit_elapsed_seconds:id==='I05-next-offset'?[31]:id==='I05-deadline'?[5,5,31]:[5,5,5],
      whole_unit_bound_seconds:id==='I05-missing-bound'?null:20,child_bound_seconds:5,database_outer_bound_seconds:20};
    if(uiStep&&!id.startsWith('I13-')){uiStep.ui.surface='supplied/mock browser';uiStep.ui.browser='supplied/mock Chromium';}
    // Refresh only fixed copied work references. Original publication bytes and
    // real externally supplied receipts are never rewritten.
    requirement.context_body=JSON.stringify(facts);
    qaRebindWork(e,work);
    const bound=e.requirements.find(x=>x.ticket_id===terminal.ticket_id);
    const boundFacts=JSON.parse(bound.context_body);
    const sourcePr=structuredClone(review.r.payload.pr);
    const native={notice:qaNotice,id:issue.id,key:issue.key,site:issue.site,project_id:issue.project_id,
      type_id:id==='I01-bug'||id==='I09-static-bug'?'23':id==='I09-task'?'24':id==='I09-epic'?'21':'22',
      stage_id:issue.stage_id,labels:['pigboard',issue.stream],pointer:issue.pointer,description:bound.body};
    const access=qaMockAccess(work);
    const capabilities={notice:qaNotice,model_profile:'Grok High',clock:'fixed supplied/mock clock cards',
      helpers:['qa-api','qa-bruno','qa-database','qa-ui'],publisher_reads:true,publisher_append:true,publisher_direct_transition:true};
    const responseBody=mixed?{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}:structuredClone(savedFilterPassResponse.body);
    if(id==='I03-all-pending')responseBody.state='pending';
    if(/^I0[67]-/.test(id)||id==='I08-fail-wait'||id==='I11-partial-fail-null-proof'){
      if(mixed)responseBody.state='pending';else responseBody.results=[];
    }
    const responses=asyncCase?(id==='I03-pending-ready'?[{...responseBody,state:'pending'},responseBody,responseBody]:id==='I04-one-mismatch'?[responseBody,{...responseBody,state:'pending'},responseBody]:[responseBody,responseBody,responseBody]):[responseBody];
    const pipeline=e.evidence_receipts.filter(r=>r.kind==='environment').map(r=>({notice:qaNotice,id:r.details.comment_id,author_id:r.details.pipeline_actor_id,update_author_id:r.details.pipeline_actor_id,created:'2026-11-15T09:30:00Z',updated:'2026-11-15T09:30:00Z',uri:r.uri,repository:r.pr?.repository,pr_number:r.pr?.number,
      body:JSON.stringify({notice:qaNotice,event:'deployment_ready',readiness:'ready',source_revision:r.pr?.source_revision,deployed_revision:r.pr?.source_revision,target_reference:r.details.target_reference,target_uri:'https://qa.example.invalid/pgb132',repository:r.pr?.repository,pr_number:r.pr?.number,target_branch:r.pr?.target_branch})}));
    const report=terminal.payload.report??terminal.payload.qa_report;
    const causeFacts=qaOutcomeFacts(id==='I08-pure-wait'||id==='I08-missing-cause'?'H02-upstream-wait':id==='I08-fail-wait'?'H02-wait-instruction':'',original,work,report);
    if(id==='I08-missing-cause')causeFacts.dependency_observations=[];
    const cards={notice:qaNotice,category:'supplied/mock',
      caller_scope:'Requires independently supplied trusted caller identity and allowed actions; these cards grant no authority.',
      reads:{native,comments:e.comment_pages,pr:e.pr_receipts,evidence:e.evidence_receipts,pipeline:{original_comments:pipeline},access},
      tool_inputs:{api:parent?{step:parent.id,child:child.id,selected_request_count:1,responses:responses.map(body=>({status:200,body}))}:null,
        database:db?{step:db.id,rows:mixed?[{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}]:[{id:'fixture-1',name:'Monthly',tenant_id:'example'}],rollback:'complete',close:'complete'}:null,
        ui:uiStep?{step:uiStep.id,surface:uiStep.ui.surface,browser:uiStep.ui.browser,viewport:mixed?{width:440,height:130}:{width:1280,height:800},route:uiStep.ui.entry_route,checkpoints:uiStep.ui.screenshot_checkpoints.map((checkpoint,i)=>({checkpoint,screenshot:`screens/ui-${i}.png`,width:mixed?440:1280,height:mixed?130:800,digest:qaHash(mockQaPng(mixed?['start','input','result'][i]:'filter-result')),visible_text:mixed?[['SUPPLIED MOCK','RECORD ID','LOOKUP'],['SUPPLIED MOCK','RECORD ID RECORD-001','LOOKUP'],['SUPPLIED MOCK','RECORD-001','TENANT-A READY']][i]:['SUPPLIED MOCK','SEARCH MONTHLY','FIXTURE-1 MONTHLY','TENANT EXAMPLE']}))}:null},
      capability_observations:[],dependency_observations:causeFacts.dependency_observations,
      append:{storage:id==='I12-append-unknown'?'ambiguous':'stored',reply:id==='I12-append-unknown'?'timeout':{id:'9901'}},
      readback:{id:'9901',author_id:project.actors.qa[0],update_author_id:project.actors.qa[0],created:'2026-11-15T14:00:00Z',updated:'2026-11-15T14:00:00Z',body:'ECHO_ONLY_ACTUAL_SUBMITTED_TRANSPORT'},
      capabilities:{actor_id:project.actors.qa[0],append:true,read_exact:true,direct_transitions:true},
      transitions:['Human Review','Rework Queued','Blocked'].map((stage,i)=>({id:String(61+i),from:project.stages.QA,to:project.stages[stage],name:stage})),
      transition:{reply:id==='I12-transition-unknown'?'timeout':'accepted',resolving_status:id==='I12-transition-unknown'?'unknown':'requested destination'}};
    if(id==='I08-discussion')cards.caller_request='Discuss supplied observations only; no final publication or transition requested.';
    let historical=null;
    if(id.startsWith('I13-')){
      historical=structuredClone(retained.historical);
      if(id==='I13-stale')for(const artifact of historical.artifacts)artifact.body.pr.source_revision='f'.repeat(40);
      if(id==='I13-wrong-tenant'){
        const artifact=historical.artifacts.find(a=>a.body.kind==='bruno_response');artifact.body.tenant=artifact.body.request.tenant='foreign';
      }
      for(const artifact of historical.artifacts){artifact.body_sha256=qaHash(JSON.stringify(artifact.body));e.evidence_receipts.find(r=>r.uri===artifact.uri).observed_digest=artifact.body_sha256;}
      if(id==='I13-stale')for(const receipt of e.evidence_receipts.filter(r=>historical.artifacts.some(a=>a.uri===r.uri)))receipt.pr.source_revision='f'.repeat(40);
      if(id==='I13-stale'||id==='I13-wrong-tenant'){
        const reviewTarget=structuredClone(e.target),blocked=records(e).find(x=>x.r.kind==='blocked');
        e.target=qaRef(blocked.r,blocked.c.id);
        changeTarget(e,r=>{for(const row of r.payload.qa_report.steps.slice(0,2))row.evidence[0].digest=historical.artifacts.find(a=>a.uri===row.evidence[0].uri).body_sha256;});
        e.target=reviewTarget;sealQa(e);
        const blocker=records(e).find(x=>x.r.kind==='blocked'),auth=records(e).find(x=>x.r.kind==='resume_authorization');
        historical.blocker=qaRef(blocker.r,blocker.c.id);historical.authorization=qaRef(auth.r,auth.c.id);
      }
      if(id==='I13-untrusted-approval'){
        const auth=records(e).find(x=>x.r.kind==='resume_authorization');auth.c.author_id=auth.c.update_author_id='stranger';
      }
      cards.reads.historical=historical;
    }
    if(id==='I02-child-receipt')cards.tool_inputs.api.child_reply={status:'unavailable',reason:'Fixed lost child response; original operation effects unknown.'};
    if(id==='I02-provenance')cards.tool_inputs.api.responses[0].actor_id='OTHER';
    if(id==='I06-unbound-output')delete cards.tool_inputs.api.responses[0].body.record_id;
    if(id==='I02-checkpoint')cards.tool_inputs.ui.checkpoints.pop();
    if(id==='I05-access-loss'||id==='I07-domain-inability')cards.capability_observations.push({step:uiStep?.id??parent.id,offset_seconds:id==='I05-access-loss'?30:5,status:503,body:{code:'SESSION_UNAVAILABLE',session_available:false,observation_started:false},actor_id:actor.id,tenant:actor.tenant,pr:sourcePr});
    if(id==='I07-cleanup-inability')cards.tool_inputs.database.rollback='unavailable';
    if(id==='I06-join')cards.tool_inputs.database.rows=[];
    if(id==='I10-source-drift')cards.reads.pre_final={pr:{...sourcePr,source_revision:'f'.repeat(40)}};
    if(id==='I10-requirement-drift'){const changed=JSON.parse(bound.body);changed.problem_to_solve+=' Current requirements changed after preparation.';cards.reads.pre_final={native:{...native,description:JSON.stringify(changed)}};}
    if(id==='I10-stage-drift')cards.reads.pre_final={native:{...native,stage_id:project.stages['In Review']}};
    if(id==='I10-incomplete-pages')cards.reads.comments.at(-1).total++;
    if(id==='I10-wrong-scope')native.project_id='999';
    if(id==='I10-wrong-actor')access.actors=[];
    if(id==='I10-wrong-tenant')access.actors.forEach(a=>a.tenant='tenant-b');
    if(id==='I11-missing-environment'){e.evidence_receipts=e.evidence_receipts.filter(r=>r.kind!=='environment');cards.reads.evidence=e.evidence_receipts;pipeline.length=0;}
    if(id==='I11-stale-environment')e.evidence_receipts.filter(r=>r.kind==='environment').forEach(r=>r.pr.source_revision='f'.repeat(40));
    if(id.includes('null-proof'))cards.proof_inputs={tested_pr:null,environment:null,preserve_actual_observations_locally:true};
    if(id==='I14-no-model')capabilities.model_profile=null;
    if(id==='I14-no-clock')capabilities.clock=null;
    if(id==='I14-no-helper')capabilities.helpers=[];
    if(id==='I14-oversized-ledger')cards.evidence_label_inputs=Object.fromEntries(steps.map(s=>[s.id,[0,1,2].map(n=>`${s.id} supplied observation ${n} `+'x'.repeat(1800))]));
    const base=`cases/${id}`,input=`${base}/input`,artifacts=[];
    const emit=async(name,value)=>artifacts.push(await put(`${input}/${name}`,value));
    await emit('work.yaml',bound.body);await emit('facts.yaml',JSON.stringify(boundFacts));
    const config=parse(readFileSync(new URL('../../config/pigboss.example.yaml',import.meta.url),'utf8'));
    Object.assign(config.defaults,{stages:project.stages,accepted_later_stage_ids:project.accepted_later_stage_ids,actors:project.actors,repositories:project.repositories,worker_prefixes:['stream-'],types:{epic:'21',story:'22',bug:'23'}});
    config.projects=[{id:issue.project_id,key:'EX',board_ids:[],inherit:Object.keys(config.defaults),mappings:{}}];
    await emit('scope.yaml',stringify(config));await emit('predecessors.json',e);
    await emit('known-requests.json',terminal.payload.requests??[]);await emit('access.json',access);
    await emit('cards.json',cards);await emit('clock.json',clock);await emit('capabilities.json',capabilities);
    if(historical)await emit('historical.json',historical);
    if(parent){
      const request=mixed?selected.replace('http://127.0.0.1:REQUIRED_PORT','https://qa.example.invalid'): `meta {\n  name: Supplied mock Monthly search\n  type: http\n  seq: 1\n}\nget {\n  url: https://qa.example.invalid/api/filters?name=Monthly\n  body: none\n  auth: none\n}\nassert {\n  res.status: 200\n  res.body.results[0].id: fixture-1\n  res.body.results[0].name: Monthly\n  res.body.results[0].tenant_id: example\n}\n`;
      await emit(`collection/${child.api.request_selector}`,request);
      await emit('collection/bruno.json',{version:'1',name:'Supplied mock prescribed collection',type:'collection',ignore:['node_modules','.git']});
      await emit('extraction.json',id==='I02-extraction'?{step:child.id,output:'record_id',json_pointer:null}:{step:child.id,output:'record_id',json_pointer:mixed?'/response/body/record_id':'/response/body/results/0/id',source:'actual selected request response in retained original Bruno report',parent_exposes:`${parent.id}.record_id`,value:null});
    }
    if(db){if(id!=='I02-query')await emit('query.sql',mixed?query:savedFilterQuery);await emit('parameters.json',id==='I02-parameters'?null:db.database.parameters);
      await emit('database-context.json',{notice:qaNotice,environment:'test',stage:'pgb132-mock',targetIdentityEvidence:'fixture://pgb132/mock-target',readOnlyRoleEvidence:'fixture://pgb132/mock-role',database:{host:'qa.example.invalid',port:5432,name:'pgb132_mock',user:'qa_reader'},tls:{required:true,rejectUnauthorized:true,ca_reference:'fixture://pgb132/mock-ca',servername:'qa.example.invalid'},role:{rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolreplication:false,rolbypassrls:false},scope:db.database.scope,parameter_layout:db.database.parameter_bindings});}
    if(uiStep)for(let i=0;i<cards.tool_inputs.ui.checkpoints.length;i++)await emit(`screens/ui-${i}.png`,mockQaPng(mixed?['start','input','result'][i]??'result':'filter-result'));
    await emit('reference-map.json',{
      fixtures:work.testing_strategy.fixtures.map(f=>({reference:f.reference,consumer:f.id,source:'Fixed supplied/mock data and cards.json; not live readiness.'})),
      artifacts:steps.filter(s=>s.prepared_artifact.reference).map(s=>({reference:s.prepared_artifact.reference,consumer:s.id,path:s.database?'query.sql':'collection/'})),
      access:steps.filter(s=>s.database).map(s=>({reference:s.database.access_reference,consumer:s.id,path:'access.json'})),
      extraction:parent?{consumer:child.id,path:'extraction.json',parent:parent.id,downstream:steps.filter(s=>s.bindings.some(b=>b.from_step===parent.id)).map(s=>s.id)}:null,
      viewport:uiStep?{consumer:uiStep.id,reference:uiStep.ui.viewport.reference,path:'cards.json',pointer:'/tool_inputs/ui/viewport'}:null
    });
    await emit('index.json',{notice:qaNotice,preparation_id:'PREP-01',consumers:steps.map(s=>s.id),artifacts,source_inputs:qaHash(readFileSync(new URL('./handoff-chains.json',import.meta.url))),output:'../output',binding:'Extraction value remains null until original actual helper evidence exists. Bind no expected value.',readiness:'NOT_READY until independently supplied source/installed hashes, caller and chosen exercise capabilities are frozen.'});
    await mkdir(join(root,base,'output'),{mode:0o700});
    await put(`${base}/invocation.txt`,'Use the exact immutable installed qa-api/qa-bruno/qa-database/qa-ui instructions, full input/work.yaml and separately trusted input/facts.yaml. Trusted operator must independently authorize caller qa-entrypoint for top-level units; the API parent alone owns its Bruno child. Supply exact case/step/caller, assignment/current review from input/predecessors.json, input/scope.yaml, access and capabilities. Execute only the prescribed unit with fixed supplied/mock cards returned in response to its actual requested action. Retain original helper results and evidence in output/. Bind only actual named output with original revision/actor/tenant/offset provenance using input/extraction.json. After independent assessment of actual results, invoke immutable qa-jira preflight then final with that actual assessment, current raw work/context, predecessors, known requests and the supplied/mock publisher cards. qa-jira owns publication decisions and unknown-write recovery. Never expose operator files, execute legacy qa-entrypoint, contact live providers or substitute a saved assessment. Source/installed hashes and independent authority are prerequisites, not fixture facts.\n');
    await put(`operator/${id}.json`,{notice:qaNotice,independent_operator_only:true,group:id.slice(0,3),native_cases:['R1-27-H01','R1-27-H02','R1-27-H03'],inspection:'Inspect this fixed input variant at its named boundary against unchanged work expectations; retain actual result and original requested action. No expected final ledger, verdict or destination is supplied.'});
    cases[id]=join(root,base);index.push({id,group:id.slice(0,3),input:join(root,input)});
  }
  const preparation=await put('preparation.json',{suite:'dispatch-inputs',state:'NOT_READY',notice:qaNotice,cases:index,source_module_sha256:qaHash(readFileSync(fileURLToPath(import.meta.url))),
    binding_required:['Actual reviewed full source commit','Immutable installed skills/manifest/payload hashes','Hashes of emitted inputs before exercise','Independent caller/action/actor/tenant scope','Actual selected exercise capabilities; fixed mock facts prove no live engine or deployment'],
    human_acceptance:'R1-27-H01/H02/H03 NOT RUN',cleanup:'Retain sanitized inputs, actual results and audit first; remove only this owned disposable root. No services or live resources created.'});
  return {runDir:root,preparation:join(root,preparation.path),cases,ready:false};
}
