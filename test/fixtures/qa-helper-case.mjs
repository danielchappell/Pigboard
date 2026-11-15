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
