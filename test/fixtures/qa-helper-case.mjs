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
import { digestValue } from '../../lib/contracts/handoff.mjs';
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
// Real labelled PNG with a tiny built-in bitmap alphabet; no image dependency.
function mockQaPng() {
  const glyphs={S:['111','100','111','001','111'],U:['101','101','101','101','111'],P:['110','101','110','100','100'],L:['100','100','100','100','111'],I:['111','010','010','010','111'],E:['111','100','110','100','111'],D:['110','101','101','101','110'],M:['101','111','111','101','101'],O:['111','101','101','101','111'],C:['111','100','100','100','111'],K:['101','101','110','101','101'],R:['110','101','110','101','101'],'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],T:['111','010','010','010','010'],N:['101','111','111','111','101'],A:['010','101','111','101','101'],Y:['101','101','010','010','010'],'-':['000','000','111','000','000'],' ':['000','000','000','000','000']};
  const width=440,height=130,pixels=Buffer.alloc((width*3+1)*height,255);
  for(let y=0;y<height;y++)pixels[y*(width*3+1)]=0;
  const lines=['SUPPLIED MOCK','RECORD-001','TENANT-A READY'];
  lines.forEach((line,n)=>[...line].forEach((ch,i)=>(glyphs[ch]??glyphs[' ']).forEach((row,y)=>[...row].forEach((on,x)=>{if(on==='1')for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){const p=(16+n*36+y*4+dy)*(width*3+1)+1+(16+i*16+x*4+dx)*3;pixels[p]=20;pixels[p+1]=60;pixels[p+2]=65;}}))));
  const crc=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const t=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,sum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}

export async function prepareQaFixture(runDir,{suite='publication'}={}) {
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
    'Q07-wrong-pipeline':e=>e.evidence_receipts.find(x=>x.kind==='environment').actor_id='stranger',
    'Q13-wrong-approval':e=>e.evidence_receipts.find(x=>x.kind==='approval').actor_id='stranger'
  };
  for(const [id,mutate]of Object.entries(faults)){const e=mixedQa();mutate(e);fixed[id]=e;}
  fixed['Q08-defect']=structuredClone(qaSeeds.partial);
  fixed['Q09-wait']=structuredClone(partial['wait-retained-fail']);
  fixed['Q10-inability']=structuredClone(partial['blocked-no-environment']);
  fixed['Q11-retained-findings']=structuredClone(partial['blocked-retained-fail']);
  fixed['Q12-discussion']=mixedQa();
  // Names are fixed, and faults are selected before execution. No output oracle.
  for(const id of ['Q14-append-absent','Q14-append-ambiguous','Q14-stored-timeout','Q15-readback-failed','Q15-wrong-body','Q15-wrong-uuid','Q15-wrong-actor','Q16-chain-pages','Q17-source-drift','Q18-transition-failed','Q19-transition-ambiguous','Q20-transition-stored-timeout','Q21-resume-ambiguous','H03-task','H03-epic','H03-wrong-scope','H03-changed-stage'])fixed[id]=mixedQa();
  fixed['Q21-resume-ambiguous']=structuredClone(qaSeeds.resume);
  const resume=fixed['Q21-resume-ambiguous'],authorization=records(resume).find(x=>x.r.kind==='resume_authorization');
  const other=structuredClone(authorization.c),otherRecord=structuredClone(authorization.r);
  other.id='9999';otherRecord.record_id='93000000-0000-4000-8000-000000000003';other.body=qaBody(otherRecord);
  resume.comment_pages[0].comments.push(other);resume.comment_pages[0].total++;
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
    if(id==='H03-wrong-scope')native.project_id='999';if(id==='H03-changed-stage')native.stage_id=project.stages['In Review'];
    const currentWork=JSON.parse(requirement.body),isMixed=currentWork.testing_strategy.cases.some(c=>c.steps.some(step=>step.id==='E01.S1'));
    const artifacts=e.evidence_receipts.map(receipt=>{
      const row=report.steps.find(step=>step.evidence.some(ref=>ref.uri===receipt.uri));
      const finding=assessment.findings.find(f=>f.evidence.some(ref=>ref.uri===receipt.uri));
      const body=receipt.kind==='artifact'?{
        notice:qaNotice,pr:receipt.pr,tenant:isMixed?'tenant-a':'example',
        request_observation:row?.result==='FAIL'?{status:200,body:{results:[]},observed:'The prepared saved-filter search returned no Monthly fixture-1 result.'}:row?.result==='PASS'?(isMixed?{status:200,body:{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}}:{status:200,body:{results:[{id:'fixture-1',name:'Monthly',tenant_id:'example'}]}}):null,
        finding_observation:finding?{id:finding.id,observed:'The prepared saved-filter search returned no Monthly fixture-1 result.',summary:finding.summary}:null,
        source:'Fixed supplied/mock observation; not a new helper execution.'
      }:{notice:qaNotice,pr:receipt.pr,kind:receipt.kind,actor_id:receipt.actor_id,details:receipt.details};
      return {uri:receipt.uri,available:receipt.available,audience:'private fixture operator and reviewer',category:'supplied/mock',body,body_sha256:qaHash(JSON.stringify(body)),original_receipt:receipt};
    });
    const scenario=id.startsWith('Q')?id:'normal';
    if(id==='H02-discussion'||id==='Q12-discussion'){assessment.proposed_outcome='discussion';assessment.reason='Discuss the supplied observations only; no final publication or transition requested.';}
    const cards={notice:qaNotice,scenario,reads:{native,comments:e.comment_pages,pr:e.pr_receipts,evidence:e.evidence_receipts,artifacts,access:{identity:'synthetic qa-reader',tenant:'tenant-a',audience:'private fixture operator and reviewer',available:true},pipeline:{author:'pipeline',origin:'supplied/mock PR comment',receipts:e.evidence_receipts.filter(x=>x.kind==='environment')},freshness:{native,pr:e.pr_receipts}},capabilities:{actor_id:project.actors.qa[0],append:true,read_exact:true,direct_transitions:true},transitions:['Human Review','Rework Queued','Blocked'].map((stage,i)=>({id:String(61+i),from:project.stages.QA,to:project.stages[stage],name:stage})),append:{storage:scenario==='Q14-append-absent'?'not_stored':scenario==='Q14-append-ambiguous'?'ambiguous':'stored',reply:scenario.startsWith('Q14-')?'timeout':{id:'9901'}},readback:{id:'9901',author_id:scenario==='Q15-wrong-actor'?'stranger':project.actors.qa[0],update_author_id:scenario==='Q15-wrong-actor'?'stranger':project.actors.qa[0],created:'2026-11-15T14:00:00Z',updated:'2026-11-15T14:00:00Z',body:'MANUAL_ECHO_ACTUAL_SUBMITTED_TRANSPORT_ONLY',fault:scenario==='Q15-wrong-body'?'replace body with unrelated discussion':scenario==='Q15-wrong-uuid'?'replace observed record UUID with 99000000-0000-4000-8000-000000000099':scenario==='Q15-readback-failed'?'unavailable':scenario==='Q16-chain-pages'?'omit final comment page':null},after_publish:scenario==='Q17-source-drift'?'source revision becomes ffffffffffffffffffffffffffffffffffffffff':'same requirement bytes, assignment, source/target, approval/CI and access; issue updated timestamp may change',transition:{reply:scenario==='Q18-transition-failed'?'definite failure':scenario.includes('transition-')?'timeout':'accepted',resolving_status:scenario==='Q20-transition-stored-timeout'?'requested destination':scenario==='Q19-transition-ambiguous'?'unknown':scenario==='Q18-transition-failed'?'QA':'requested destination'},resume_fault:scenario==='Q21-resume-ambiguous'?'no unique explicit resume authorization':null};
    const rejected=new Set([...Object.keys(faults),'V03-missing-middle','V04-proof-blocked-null-pass','V04-proof-blocked-null-fail','V04-proof-blocked-null-foreign-artifacts','V04-proof-blocked-null-real-environment','V04-proof-blocked-real-null-environment','V04-proof-blocked-foreign-result','V04-proof-wait-foreign-finding','H03-task','H03-epic','H03-wrong-scope','H03-changed-stage','Q21-resume-ambiguous']);
    const discussion=['H02-discussion','Q12-discussion'].includes(id);
    const route=['H02-defect','Q08-defect'].includes(id)?'Rework Queued':
      ['H02-wait','Q09-wait'].includes(id)?'Rework Queued':
      id.startsWith('V03-')||id.startsWith('V04-')||['H02-inability','H02-defect-inability','Q10-inability','Q11-retained-findings'].includes(id)?'Blocked':'Human Review';
    const stopAfterAppend=['Q14-append-absent','Q14-append-ambiguous','Q15-readback-failed','Q15-wrong-body','Q15-wrong-uuid','Q15-wrong-actor','Q16-chain-pages','Q17-source-drift'].includes(id);
    const expectation={
      notice:qaNotice,independent_operator_only:true,
      native_case:id.startsWith('H02')?'R1-24-H02':id.startsWith('H01')?'R1-24-H01':'R1-24-H03',
      destination:discussion?'QA':rejected.has(id)?null:route,
      required_findings:['H02-defect','H02-wait','H02-defect-inability','Q08-defect','Q09-wait','Q11-retained-findings'].includes(id)?['F1']:[],
      human_pending:report.human_pending,preflight_writes:0,
      append_attempts:discussion||rejected.has(id)?0:1,
      transition_attempts:discussion||rejected.has(id)||stopAfterAppend?0:1,
      order:['scope/work/pointer/complete pages','PR/review/CI/evidence','record and predecessor validation','format','freshness','append','exact readback','observed chain validation','freshness','direct transition','status'],
      scenario,negative:rejected.has(id),
      instruction:'Independently validate actual output against accepted requirements and named boundary, retained IDs, route and ordered calls. Echo success is not a passing case. Expectations and validator candidates are withheld.'
    };
    await put(`${input}/work.yaml`,requirement.body);await put(`${input}/facts.yaml`,requirement.context_body);await put(`${input}/scope.yaml`,stringify(config));await put(`${input}/assessment.json`,assessment);await put(`${input}/predecessors.json`,e);
    await put(`${input}/known-requests.json`,terminal.payload.requests??[]);
    await put(`${input}/evidence/mock.png`,png);
    await put(`${input}/evidence/observations.json`,{notice:qaNotice,category:'supplied/mock',audience:'private fixture operator and reviewer',observations:e.evidence_receipts,artifacts,helper_sample_only_not_imported_report_evidence:{api:{record_id:'record-001',tenant:'tenant-a',state:'ready',source:'fixed synthetic request report'},database:{parameters:['tenant-a','record-001'],rows:[{record_id:'record-001',tenant_id:'tenant-a',state:'ready'}],rollback:'supplied complete'},output_provenance:{value:'record-001',source:'fixed supplied selected request report /record_id',bindings:'E01.S2 exposes E01.S1.record_id to E01.S3'}},screenshot:{path:'mock.png',digest:qaHash(png),width:440,height:130,label:'SUPPLIED MOCK RECORD-001 TENANT-A READY'}});
    await put(`${operator}/cards.json`,cards);await put(`${operator}/expectations.json`,expectation);
    await put(`${operator}/validator-inputs/record.yaml`,stringify(terminal));await put(`${operator}/validator-inputs/published.json`,original);
    await put(`${base}/invocation.txt`,`Load the bound immutable qa-jira/SKILL.md. All tools in this exercise are supplied/mock. Use mode preflight, then separately final when appropriate. scope: inputs/scope.yaml plus operator-supplied native identity; capabilities: prepared same-release validator root, private output and simulated reads/append/direct transitions; work: original inputs/work.yaml and separately trusted inputs/facts.yaml; assignment: actual native pointer; prepared_assessment: inputs/assessment.json; known_requests: inputs/known-requests.json; retained_delivery: null unless explicit history is supplied. Inspect inputs/evidence/observations.json and mock.png. Never inspect operator/expectations.json or operator/validator-inputs, run domain helpers, contact real providers, or infer actual outcomes from fixture names. Retain actual result, candidate, transport and ordered calls in output/. Operator must bind installed path/commit/hash before execution.\n`);
    await mkdir(join(root,base,'output'),{mode:0o700});cases[id]=join(root,base);
  }
  const manual=`# Manual actual-request transport echo\n\nEvery card is simulated. Freeze source/installed/input hashes and scenario before execution. Keep operator expectations and validator candidates away from the skill.\n\n1. Capture the actual requested append identity, issue, body format, exact HTML bytes or ADF value and original tool-argument serialization. Use the existing extractor to record its actual UUID/digest; retain extraction failure without repair.\n2. Use the preselected stored/not_stored/ambiguous outcome. For stored requests, combine ONLY that unchanged submitted body/format with cards.json's fixed ID, author/editor/timestamps. Append may return only the ID; exact readback returns the echoed body. Do not inject a fixed expected candidate or UUID.\n3. Stored-timeout exposes that exact echo through at most one resolving read. Not-stored returns absence; ambiguous returns insufficient/conflicting facts. Never choose storage after the decision or append again.\n4. Apply only the card's fixed observed-body/UUID/metadata/page corruption; preserve the submitted original separately.\n5. Save an audit linking request ID/path/hash, submitted format/body/UUID/digest, preselected scenario and fixed metadata to derived response bytes/value and observed extracted UUID/digest or extraction error. Build the observed leaf from that actual simulated comment, never validator-inputs.\n6. Independently validate produced record and observed chain, ledger/findings/destination, freshness, ordered calls, mutation counts and actual/unknown status. Echo alone proves no correct decision. Keep actual model/profile, commands, hashes, timestamps, cleanup and human action. No fixture output is live or human acceptance.\n`;
  await put('manual-echo.md',manual);
  const preparation=await put('preparation.json',{suite,state:'NOT_READY',notice:qaNotice,fixture_version:1,source_revision:'BIND_ACTUAL_REVIEWED_COMMIT_AND_INPUT_HASHES',cases,required:['Bind actual immutable installed skill/manifest/payload hashes','Freeze inputs/cards before exercise','Prepare bounded manual echo operator','Keep expectations/candidates withheld','Record actual Sol model/profile and actual output separately'],cleanup:'Retain sanitized evidence first; remove only this owned disposable fixture root. No services/resources were created.',human_acceptance:'R1-24-H01/H02/H03 NOT RUN'});
  return {runDir:root,preparation,cases,ready:false};
}
