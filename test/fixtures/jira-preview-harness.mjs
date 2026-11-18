// Test-process HTTPS redirection only. Production has no fixture transport option.
import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import tlsTransport from 'node:tls';
import dgram from 'node:dgram';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const here=path.dirname(fileURLToPath(import.meta.url));
export const fixtureCases=JSON.parse(fs.readFileSync(path.join(here,'jira-preview-cases.json'),'utf8'));
const tls=JSON.parse(fs.readFileSync(path.join(here,'jira-preview-tls.json'),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
const fixedPrefix='/ex/jira/00000000-0000-0000-0000-000000000001';
const jiraSourcePaths=['lib/jira/read.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json'];
const inventoryPacketPath = 'test/fixtures/jira-inventory-cases.json';
const scopedInventoryPacketPath = 'test/fixtures/jira-scoped-inventory-cases.mjs';
const inventoryModulePath = 'lib/jira/inventory.mjs';
const inventorySelectors = new Map([
 ['R1-34-H01', ['complete-domain', 'unrelated-history', 'retained-incomplete']],
 ['R1-34-H02', [
  'seed-page-missing', 'child-page-missing', 'label-page-missing', 'token-repeat',
  'token-missing', 'search-duplicate', 'fresh-membership-change', 'malformed-seed',
  'malformed-record', 'reference-missing', 'reference-digest-change', 'reference-cycle',
  'epic-limit', 'stream-limit', 'page-size', 'closure-target-limit'
 ]],
 ['R1-34-H03', [
  'two-projects', 'cross-project-prerequisite', 'renamed-alias', 'old-ownership',
  'denied-project', 'isolated-conflict', 'out-of-scope-reference'
 ]],
 ['R1-34-H04', ['guide-and-install', 'missing-retained-input', 'no-effects']]
]);

function inventorySelection(caseId, variant) {
 if (!inventorySelectors.get(caseId)?.includes(variant)) return null;
 const guide = caseId === 'R1-34-H04' && variant === 'guide-and-install';
 return {
  case: caseId,
  variant,
  fixtureCase: guide ? 'R1-45-H01' : 'R1-45-' + caseId.split('-').at(-1),
  fixtureVariant: guide ? 'complete-domain' : variant
 };
}

async function withRequiredSetup(action) {
 try {
  return await action();
 } catch (error) {
  if (!['ENOENT', 'ERR_MODULE_NOT_FOUND'].includes(error?.code)) throw error;
  throw Object.assign(new Error('Required fixture material is missing.'), {code:'FIXTURE_SETUP_MISSING'});
 }
}

async function readInventoryFixture(selection, root) {
 const packet = await withRequiredSetup(() => fsp.readFile(path.join(root, inventoryPacketPath)));
 const matches = JSON.parse(packet).variants.filter(row =>
  row.case === selection.fixtureCase && row.variant === selection.fixtureVariant
 );
 assert.equal(matches.length, 1);
 const overlayPath = path.join(root, scopedInventoryPacketPath);
 const overlay = await withRequiredSetup(() => fsp.readFile(overlayPath));
 const { applyScopedInventoryCase } = await withRequiredSetup(() => import(pathToFileURL(overlayPath).href));
 return { authored: applyScopedInventoryCase(matches[0]), packetHash: digest(packet), overlayHash: digest(overlay) };
}

// These tuples come from the retained selector, Jira search/issue rows, the Epic
// declaration and story prerequisites, and the one assignment pointer. Native
// acquisition adds project IDs and retains repeated evidence when both stages agree.
const completeDomainProvenance = [
 // ticket, source, source ticket, project, label
 ['103', 'retained', null, '10001', 'AI-Daniel-1'],
 ['100', 'retained', '103', '10001', 'AI-Daniel-1'],
 ['100', 'seed', null, null, null],
 ['100', 'retained', '103', '10001', 'AI-Daniel-1'],
 ['101', 'child', '100', null, null],
 ['103', 'declared', '100', '10001', 'AI-Daniel-1'],
 ['101', 'child', '100', '10001', null],
 ['100', 'prerequisite', '101', null, null],
 ['104', 'prerequisite', '101', null, null],
 ['103', 'retained', null, '10001', 'AI-Daniel-1'],
 ['105', 'typed_reference', '103', null, null],
 ['104', 'prerequisite', '101', '10002', null],
 ['105', 'typed_reference', '103', '10001', null],
 ['101', 'label', null, '10001', 'AI-Daniel-1'],
 ['102', 'label', null, '10001', 'AI-Daniel-1'],
 ['103', 'label', null, '10001', 'AI-Daniel-1'],
 ['102', 'label', null, '10001', 'AI-Daniel-1']
];

function compareProvenance(provenance) {
 const fields = ['ticket_id', 'source', 'source_ticket_id', 'project_id', 'label'];
 const canonical = tuples => tuples.map(tuple => JSON.stringify(tuple)).sort();
 const actual = canonical(provenance.map(row => {
  assert(Object.keys(row).length === fields.length && fields.every(field => Object.hasOwn(row, field)),
   'Private provenance fields differ from the contract.');
  return fields.map(field => row[field]);
 }));
 const expected = canonical(completeDomainProvenance);
 assert(JSON.stringify(actual) === JSON.stringify(expected), 'Private provenance differs from the literal oracle.');
 return {
  algorithm:'sha256',
  actual_sha256:digest(JSON.stringify(actual)),
  expected_sha256:digest(JSON.stringify(expected)),
  matched:true
 };
}

function mountHistory(fixture, hasHistory) {
 const issues = fixture.unrelated_issues ?? [];
 const comments = fixture.unrelated_comments ?? [];
 assert.equal(issues.length, hasHistory ? 65 : 0);
 assert.equal(comments.length, hasHistory ? 512 : 0);
 assert.equal(new Set(issues.map(issue => issue.id)).size, issues.length);
 assert.equal(new Set(comments.map(comment => comment.id)).size, comments.length);

 const rows = issues.map(issue => ({issue, comments: []}));
 for (const [index, comment] of comments.entries()) rows[index % rows.length].comments.push(comment);
 const byName = new Map(rows.flatMap(row => [[row.issue.id, row], [row.issue.key, row]]));
 assert.equal(byName.size, 2 * issues.length);

 return {
  rows,
  issueCount: issues.length,
  commentCount: comments.length,
  route(operation) {
   const match = /^\/rest\/api\/3\/issue\/([^/?]+)(?:\/([^?]+))?(?:\?(.*))?$/.exec(operation);
   const row = match && byName.get(match[1]);
   if (!row) return null;
   const [, , resource, query] = match;
   if (resource === undefined) return {body: row.issue};
   if (resource === 'properties') return {body: {keys: []}};
   if (resource === 'comment') {
    const params = new URLSearchParams(query);
    const startAt = Number(params.get('startAt') ?? 0);
    const maxResults = Number(params.get('maxResults') ?? row.comments.length);
    return {body: {
     startAt, maxResults, total: row.comments.length,
     comments: row.comments.slice(startAt, startAt + maxResults)
    }};
   }
   const comment = row.comments.find(comment => resource === 'comment/' + comment.id);
   return {body: comment ?? null};
  }
 };
}
function oracleCheck(report,oracle,trace){assert.equal(report.status,oracle.status);if(oracle.code)assert(report.diagnostics.some(d=>d.code===oracle.code),JSON.stringify(report));else assert.deepEqual(report.diagnostics,[]);assert.equal(report.counters.requests_attempted,oracle.calls);assert.equal(trace.length,oracle.calls);if(oracle.trace)assert.deepEqual(trace,oracle.trace);if(oracle.counters)for(const [k,value]of Object.entries(oracle.counters))assert.equal(report.counters[k],value,k);if(oracle.diagnostic)assert(report.diagnostics.some(d=>Object.entries(oracle.diagnostic).every(([k,value])=>d[k]===value)));if(oracle.cleanup_resolver)assert.equal(report.cleanup.resolver,oracle.cleanup_resolver);assert.equal(report.inspection_scope,oracle.inspection_scope??'requested_issues');assert.equal(report.domain_complete,oracle.domain_complete??false);if(oracle.scopes)assert.deepEqual(report.scopes,oracle.scopes);if(Object.hasOwn(oracle,'retained_complete'))assert.equal(report.retained_complete,oracle.retained_complete);assert.equal(report.admission,'not_evaluated');assert.equal(report.receipt_proof,'not_evaluated');}

async function runtimeSources(root, inventory=false){
 const manifest=JSON.parse(await fsp.readFile(path.join(root,'config/skill-bundle.json'),'utf8'));
 return [...new Set([...manifest.validatorPayload.sources,...jiraSourcePaths,...(inventory?[inventoryModulePath,inventoryPacketPath]:[])])];
}
async function runtimeSnapshot(root, missing = [], inventory=false) {
 const entries=[];
 for(const relative of await runtimeSources(root,inventory)){
  try{assert((await fsp.lstat(path.join(root,relative))).isFile());entries.push([relative,digest(await fsp.readFile(path.join(root,relative)))]);}
  catch(error){if(!missing.includes(relative)||error.code!=='ENOENT')throw error;entries.push([relative,null]);}
 }
 async function walk(relative){for(const entry of await fsp.readdir(path.join(root,relative),{withFileTypes:true})){const file=relative+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(entry.isFile())entries.push([file,digest(await fsp.readFile(path.join(root,file)))]);else assert(entry.isSymbolicLink());}}
 await walk('node_modules');return Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b)));
}
const inputSnapshot=v=>Object.fromEntries(['config','request','script'].map(k=>[k,digest(JSON.stringify(v[k]))]));

export async function runFixture(caseId,variant,runtime,{control=false,privateProjection=false,authoredFixture=null}={}) {
 const selection = inventorySelection(caseId, variant);
 if (caseId.startsWith('R1-34-') && !selection) throw Error('Use a prescribed case and variant.');
 const root = path.resolve(runtime);
 const selected = selection ? await readInventoryFixture(selection, root) : null;
 return executeFixture(caseId, variant, root, {
  control, privateProjection, authoredFixture, selection, selected
 });
}

async function executeFixture(caseId, variant, root, {control=false,privateProjection=false,authoredFixture=null,selection,selected}={}) {
 const inventory = !!selection || caseId.startsWith('R1-45-');
 const packetPath = selection ? path.join(root, inventoryPacketPath) : path.join(here,'jira-inventory-cases.json');
 const authored = selected?.authored ?? authoredFixture ??
  (inventory ? JSON.parse(fs.readFileSync(packetPath,'utf8')) : fixtureCases).variants.find(v => v.case === caseId && v.variant === variant);
 if (authoredFixture) assert(authoredFixture.case === caseId && authoredFixture.variant === variant);
 if (!authored) throw Error('Use a prescribed case and variant.');
 const v=structuredClone(authored),trace=[],serverTrace=[],seedPages=[];let disposable=null;
 if(control){assert(v.control);if(v.control.bound)v.config.jira.read_bounds[v.control.bound]=v.control.value;if(v.control.immediate){delete v.resolver_delay_ms;for(const step of v.script){delete step.header_delay_ms;delete step.body_delay_ms;}}v.oracle=v.control.oracle;if(v.control.script)v.script=v.control.script;}
 for(const entry of fixtureCases.variants)for(const [i,step]of entry.script.entries())if(Object.hasOwn(step,'wire_prefix')){if(entry.variant==='total-byte-limit'){assert.equal(i,0);assert.equal(step.wire_prefix,' '.repeat(256));}else{assert.equal(entry.case,'R1-42-H02');assert(['exact-wire-stop','exact-two-issue-control'].includes(entry.variant));assert.equal(i,3);assert.equal(step.wire_prefix,' '.repeat(600));}}
 if(privateProjection){assert(v.private_projection);if(v.private_projection.omit_wire_prefix)delete v.script[0].wire_prefix;v.config.jira.read_bounds.max_total_response_bytes=v.private_projection.bound;v.oracle=v.private_projection.oracle;}
 const before={cases:digest(fs.readFileSync(path.join(here,'jira-preview-cases.json'))),tls:digest(fs.readFileSync(path.join(here,'jira-preview-tls.json'))),...(inventory?{inventory:selected?.packetHash??digest(fs.readFileSync(packetPath))}:{})};
 if (selection) before.scoped_inventory = selected.overlayHash;
 const inputBefore=inputSnapshot(v);let moduleRoot=root,missing=[];
 if(variant==='damaged-copy'){
  const original=await runtimeSnapshot(root),sources=await runtimeSources(root);
  disposable=await fsp.mkdtemp(path.join(os.tmpdir(),'pigboard-jira-damaged-'));
  for(const relative of sources){const target=path.join(disposable,relative);await fsp.mkdir(path.dirname(target),{recursive:true});await fsp.cp(path.join(root,relative),target);}
  await fsp.cp(path.join(root,'node_modules'),path.join(disposable,'node_modules'),{recursive:true});assert.deepEqual(await runtimeSnapshot(disposable),original);
  await fsp.rm(path.join(disposable,'lib/config/projects.mjs'));moduleRoot=disposable;missing=['lib/config/projects.mjs'];
 }
 const snapshot = () => runtimeSnapshot(moduleRoot, missing, inventory);
 const runtimeBefore = selection ? await withRequiredSetup(snapshot) : await snapshot();
 let inspect;
 if (!selection) try{if(inventory)({inspectJiraInventory:inspect}=await import(pathToFileURL(path.join(moduleRoot,inventoryModulePath)).href));else({inspectJiraIssues:inspect}=await import(pathToFileURL(path.join(moduleRoot,'lib/jira/read.mjs')).href));}
 catch{
  const runtimeAfter=await runtimeSnapshot(moduleRoot,missing,inventory),inputAfter=inputSnapshot(v);assert.deepEqual(runtimeAfter,runtimeBefore);assert.deepEqual(inputAfter,inputBefore);
  if(disposable)await fsp.rm(disposable,{recursive:true,force:true});
  const report={status:'setup_failed',inspection_scope:'requested_issues',diagnostics:[{code:'SETUP_MISSING',message:'Prepare the complete copied validator; no source fallback or dependency repair was attempted.'}],counters:{requests_attempted:0},domain_complete:false,admission:'not_evaluated',receipt_proof:'not_evaluated'};oracleCheck(report,v.oracle,trace);
  return {report,trace,server_trace:[],fixture_hashes:before,input_hashes:{before:inputBefore,after:inputAfter},runtime_hashes:{before:runtimeBefore,after:runtimeAfter},effects:0,resolver_calls:0,cleanup_complete:true,oracle_matched:true};
 }
 if(disposable){await fsp.rm(disposable,{recursive:true,force:true});throw Error('Damaged copy unexpectedly imported.');}
 const history = selection ? mountHistory(v, variant === 'unrelated-history') : null;
 const snapshotServer = () => digest(JSON.stringify({script:v.script, history:history.rows}));
 const serverBefore = history ? snapshotServer() : null;
 let historyAccesses = 0;
 const sockets=new Set(),timers=new Set();let scriptIndex=0,serverError=null,redirectRequests=0;
 const redirect=https.createServer({key:tls.key,cert:tls.cert},(req,res)=>{redirectRequests++;res.end('{}');});
 await new Promise(resolve=>redirect.listen(0,'127.0.0.1',resolve));
 const server=https.createServer({key:v.tls==='future-certificate'?tls.future.key:tls.key,cert:v.tls==='future-certificate'?tls.future.cert:tls.cert},async(req,res)=>{
  let requestBody='';for await(const chunk of req)requestBody+=chunk.toString('utf8');
  serverTrace.push({method:req.method,path:req.url});
  const historical = history?.route(req.url);
  if (historical) {
   historyAccesses++;
   serverError = 'Unexpected unrelated history read.';
   const allowed = req.method === 'GET' && req.headers.authorization === 'Bearer ' + fixtureCases.token;
   res.writeHead(allowed ? (historical.body === null ? 404 : 200) : 500, {'content-type':'application/json'});
   res.end(JSON.stringify(allowed ? historical.body : {}));
   return;
  }
  const step=v.script[scriptIndex++];
  if(!step||step.path!==req.url||req.method!==(step.method??'GET')||(step.request_body&&requestBody!==JSON.stringify(step.request_body))||req.headers.authorization!=='Bearer '+fixtureCases.token){serverError='Unexpected fixture operation.';res.writeHead(500);res.end('{}');return;}
  if (v.oracle.seed_pages && req.method === 'POST' && req.url === '/rest/api/3/search/jql') {
   const submitted = JSON.parse(requestBody);
   if (submitted.jql === 'project = "10001" AND labels = "pigboard" ORDER BY id ASC') {
    seedPages.push({
     request_max_results: submitted.maxResults, request_token: submitted.nextPageToken ?? null,
     response_status: step.status, issue_ids: step.body.issues?.map(row => row.id) ?? [],
     is_last: step.body.isLast ?? null, next_token: step.body.nextPageToken ?? null
    });
   }
  }
  const later=(fn,delay)=>{if(delay){const t=setTimeout(()=>{timers.delete(t);fn();},delay);timers.add(t);}else fn();};
  later(()=>{if(res.destroyed)return;res.writeHead(step.status,{'content-type':'application/json',...(step.encoding?{'content-encoding':step.encoding}:{}),...(step.status===302?{location:`https://localhost:${redirect.address().port}/leak`}:{})});if(step.body_delay_ms)res.flushHeaders();later(()=>{if(!res.destroyed)res.end((step.wire_prefix??'')+JSON.stringify(step.body));},step.body_delay_ms);},step.header_delay_ms);
 });server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));if(v.tls==='connection-reset-control')socket.destroy();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const originalRequest=https.request,restore=[];let effects=0,resolverCalls=0,resolverTimer=null,lateResolve=null,lateAck=null,lateSignal=null,lateDelivered=0,lateSettled=0,lateEvidence=null,mutations=0,getterCalls=0,tlsObservation=null;
 let fixtureConnectPort = null;
 const callerRequest=structuredClone(v.request);
 const callerRequestBefore = selection ? digest(JSON.stringify(callerRequest)) : null;
 const deny=()=>{effects++;throw Error('Disallowed fixture effect.');};
 const replace = (api, name, replacement) => {
  const original = api[name];
  restore.push(() => { api[name] = original; });
  api[name] = replacement;
 };
 const isFixtureConnect = options => fixtureConnectPort !== null &&
  options?.host === '127.0.0.1' && Number(options.port) === fixtureConnectPort && !options.path;
 const redirectRequest=(url,options,callback)=>{
  let operation;
  try {
   assert.equal(url.origin,'https://api.atlassian.com');assert(url.pathname.startsWith(fixedPrefix+'/rest/api/3/issue/')||(inventory&&url.pathname===fixedPrefix+'/rest/api/3/search/jql'));assert.equal(options.method,v.script[trace.length]?.method??'GET');assert.equal(options.agent,false);assert.equal(options.rejectUnauthorized,true);assert.equal(options.headers['Accept-Encoding'],'identity');assert.equal(options.headers.Authorization,'Bearer '+fixtureCases.token);
   operation=url.pathname.slice(fixedPrefix.length)+url.search;
   // Known extra history is addressable only on loopback. The server counts
   // any access before processing the script and the literal oracle fails it.
   if (!history?.route(operation)) assert.equal(operation,v.script[trace.length]?.path??(selection?null:operation));
  } catch (error) {
   if (selection) effects++;
   throw error;
  }
  trace.push({method:options.method,path:operation});
  const local=new URL('https://localhost:'+server.address().port+operation);
  const tlsOptions = selection ? {
   method: options.method, agent: false, rejectUnauthorized: true, headers: options.headers
  } : options;
  let client;
  // Node's one-use HTTPS agent opens its TLS and TCP sockets synchronously.
  // Only that audited request can reach the loopback fixture through these APIs.
  fixtureConnectPort = selection ? server.address().port : null;
  try {
   client=originalRequest(local,{...tlsOptions,hostname:'127.0.0.1',servername:v.tls==='wrong-host'?'wrong.example.invalid':'localhost',...(v.tls==='untrusted-ca'?{}:{ca:v.tls==='future-certificate'?tls.future.ca:tls.ca})},callback);
  } finally {
   fixtureConnectPort = null;
  }
  if(v.case==='R1-42-H04'){
   assert.equal(tlsObservation,null);
   tlsObservation={socket_observed:false,request_error_observed:false,secure_connect_observed:false,authorized:null,authorization_error_present:null};
   client.on('socket',socket=>{tlsObservation.socket_observed=true;socket.on('secureConnect',()=>{tlsObservation.secure_connect_observed=true;});});
   client.on('error',()=>{tlsObservation.request_error_observed=true;const socket=client.socket;if(socket){tlsObservation.authorized=typeof socket.authorized==='boolean'?socket.authorized:null;tlsObservation.authorization_error_present=typeof socket.authorizationError==='string'&&socket.authorizationError.length>0;}});
  }
  return client;
 };
 let acquired;
 async function acknowledgeLate(check){
  const snapshot=check?JSON.stringify({report:acquired.report,observations:acquired.observations}):null,requestsBefore=trace.length;
  if(check){assert(lateSignal.aborted);assert.equal(lateDelivered,0);assert.equal(lateSettled,0);assert.equal(requestsBefore,0);}
  if(lateDelivered===0){lateDelivered++;lateResolve(fixtureCases.token);}
  await lateAck;await new Promise(resolve=>setImmediate(resolve));
  if(check){assert.equal(JSON.stringify({report:acquired.report,observations:acquired.observations}),snapshot);lateEvidence={delivered:lateDelivered,settled:lateSettled,signal_aborted:lateSignal.aborted,requests_before:requestsBefore,requests_after:trace.length};assert.deepEqual(lateEvidence,{delivered:1,settled:1,signal_aborted:true,requests_before:0,requests_after:0});assert.equal(acquired.report.cleanup.resolver,'cancel_unconfirmed');}
 }
 try{
  const fileMutations = ['writeFile','appendFile','mkdir','rm','rmdir','unlink','rename','copyFile','cp','symlink','link','chmod','chown','truncate','write','writev','createWriteStream'];
  if (selection) fileMutations.push('fchmod','fchown','ftruncate','futimes','lchmod','lchown','lutimes','mkdtemp','utimes');
  for (const api of [fs, fsp]) for (const name of fileMutations) {
   for (const key of [name, name + 'Sync']) if (typeof api[key] === 'function') replace(api, key, deny);
  }
  for (const name of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork']) replace(cp, name, deny);
  replace(http, 'request', deny);
  replace(http, 'get', deny);
  replace(globalThis, 'fetch', deny);
  // Transport is available during fixture collection only, after the import passes the guard.
  replace(https, 'request', selection ? deny : redirectRequest);
  if (selection) {
   replace(https, 'get', deny);
   replace(net, 'connect', deny);
   replace(net, 'createConnection', deny);
   const originalSocketConnect = net.Socket.prototype.connect;
   replace(net.Socket.prototype, 'connect', function (options, ...args) {
    if (!(this instanceof tlsTransport.TLSSocket) || !isFixtureConnect(options)) deny();
    return originalSocketConnect.call(this, options, ...args);
   });
   const originalTlsConnect = tlsTransport.connect;
   replace(tlsTransport, 'connect', function (options, ...args) {
    if (!isFixtureConnect(options)) deny();
    return originalTlsConnect.call(this, options, ...args);
   });
   replace(dgram, 'createSocket', deny);
   for (const name of ['connect', 'send', 'sendto']) replace(dgram.Socket.prototype, name, deny);
   const { O_WRONLY, O_RDWR, O_CREAT, O_TRUNC, O_APPEND } = fs.constants;
   const writeFlags = O_WRONLY | O_RDWR | O_CREAT | O_TRUNC | O_APPEND;
   const checkOpenFlags = flags => {
    if (flags == null || typeof flags === 'function') return;
    if (typeof flags === 'number' ? (flags & writeFlags) !== 0 : !['r', 'rs', 'sr'].includes(flags)) deny();
   };
   for (const name of ['open', 'openSync']) {
    const original = fs[name];
    replace(fs, name, function (file, flags, ...args) {
     checkOpenFlags(flags);
     return original.call(this, file, flags, ...args);
    });
   }
   const originalOpen = fsp.open;
   replace(fsp, 'open', async function (file, flags, ...args) {
    checkOpenFlags(flags);
    const handle = await originalOpen.call(this, file, flags, ...args);
    for (const name of ['appendFile','chmod','chown','createWriteStream','truncate','utimes','write','writeFile','writev']) handle[name] = deny;
    return handle;
   });
  }
  syncBuiltinESMExports();
  if (selection) {
   const moduleUrl = pathToFileURL(path.join(moduleRoot, inventoryModulePath)).href;
   ({ inspectJiraInventory: inspect } = await withRequiredSetup(() => import(moduleUrl)));
   assert.equal(effects, 0, 'Unexpected fixture effects.');
   assert.equal(typeof inspect, 'function');
   https.request = redirectRequest;
   syncBuiltinESMExports();
  }
  acquired=await inspect(JSON.stringify(v.config),callerRequest,{resolveSecret(reference,signal){resolverCalls++;assert.equal(reference,v.config.jira.connection.secret_reference);if(v.resolver==='mutate-values'||v.resolver==='replace-accessors')return Promise.resolve().then(()=>{mutations++;if(v.resolver==='mutate-values'){callerRequest.issue_ids[0]='1001';callerRequest.comment_targets[0].ticket_id='1001';callerRequest.comment_targets[0].comment_id='2002';}else for(const name of ['issue_ids','comment_targets'])Object.defineProperty(callerRequest,name,{get(){getterCalls++;throw Error('ERROR-CANARY');}});return fixtureCases.token;});if(v.resolver==='reject')throw Error('ERROR-CANARY '+fixtureCases.token);if(v.resolver==='abort')return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('ERROR-CANARY')),{once:true}));if(v.resolver==='late'){lateSignal=signal;const deferred=new Promise(resolve=>{lateResolve=resolve;});lateAck=deferred.then(()=>{lateSettled++;});return deferred;}if(v.resolver_delay_ms)return new Promise(resolve=>{resolverTimer=setTimeout(()=>resolve(fixtureCases.token),v.resolver_delay_ms);});return fixtureCases.token;}});
  if(v.resolver==='late')await acknowledgeLate(true);
 }finally{
  try{if(lateResolve&&lateDelivered===0)await acknowledgeLate(false);}finally{
  for (const undo of restore.reverse()) undo();
  syncBuiltinESMExports();
  clearTimeout(resolverTimer);for(const timer of timers)clearTimeout(timer);const closing=[...sockets].map(socket=>new Promise(resolve=>socket.once('close',resolve)));for(const socket of sockets)socket.destroy();await Promise.all([...closing,new Promise(resolve=>server.close(resolve)),new Promise(resolve=>redirect.close(resolve))]);
  }
 }
 assert.equal(effects, 0, 'Unexpected fixture effects.');
 assert.equal(sockets.size,0);const report=acquired.report;oracleCheck(report,v.oracle,trace);if(v.oracle.issue_rows)assert.deepEqual(report.issues,v.oracle.issue_rows);let privateComparison=null;if(v.oracle.issue_ids)assert.deepEqual(acquired.observations.issues.map(v=>v.id).sort(),v.oracle.issue_ids);if(v.oracle.pointers)for(const [id,pointer]of Object.entries(v.oracle.pointers))assert.deepEqual(acquired.observations.issues.find(v=>v.id===id)?.pointer,pointer);if(v.oracle.reference_count!==undefined)assert.equal(acquired.observations.references.length,v.oracle.reference_count);if(v.oracle.raw_bodies)for(const [id,body]of Object.entries(v.oracle.raw_bodies))assert.equal(acquired.observations.issues.find(v=>v.id===id)?.body,body);if(v.oracle.acquisition){assert.deepEqual(acquired.observations,v.oracle.acquisition);privateComparison={algorithm:'sha256',actual_sha256:digest(JSON.stringify(acquired.observations)),expected_sha256:digest(JSON.stringify(v.oracle.acquisition)),matched:true};}assert.equal(effects,0);assert.equal(redirectRequests,0);assert.equal(serverError,null);assert.equal(report.counters.requests_completed+report.counters.requests_failed,report.counters.requests_attempted);assert.equal(JSON.stringify(acquired),JSON.stringify({report}));
 for(const canary of [fixtureCases.token,'ERROR-CANARY',v.config.jira.connection.secret_reference])assert(!JSON.stringify(acquired).includes(canary));
 assert.equal(digest(fs.readFileSync(path.join(here,'jira-preview-cases.json'))),before.cases);assert.equal(digest(fs.readFileSync(path.join(here,'jira-preview-tls.json'))),before.tls);
 if(inventory)assert.equal(digest(fs.readFileSync(packetPath)),before.inventory);
 if (selection) assert.equal(digest(fs.readFileSync(path.join(root, scopedInventoryPacketPath))), before.scoped_inventory);
 const inputAfter=inputSnapshot(v),runtimeAfter=await runtimeSnapshot(moduleRoot,missing,inventory);assert.deepEqual(inputAfter,inputBefore);assert.deepEqual(runtimeAfter,runtimeBefore);
 const inventoryEvidence = {};
 if (selection) {
  const callerRequestAfter = digest(JSON.stringify(callerRequest));
  const serverAfter = snapshotServer();
  assert.equal(callerRequestAfter, callerRequestBefore);
  assert.equal(serverAfter, serverBefore);
  assert.equal(historyAccesses, 0);
  assert.deepEqual(serverTrace, v.oracle.trace);
  if (v.oracle.diagnostic_reach) {
   const key = ({ code, scope }) => JSON.stringify([code, scope?.project_id ?? null, scope?.label ?? null]);
   const normalize = entries => entries.map(({ code, scope }) => ({ code, scope }))
    .sort((a, b) => key(a).localeCompare(key(b)));
   assert.deepEqual(normalize(report.diagnostics), normalize(v.oracle.diagnostic_reach),
    'Diagnostic code and scope differ from the literal oracle.');
  }
  if (v.oracle.seed_pages) {
   assert.deepEqual(seedPages, v.oracle.seed_pages);
   inventoryEvidence.seed_pages = seedPages;
  }
  if (variant === 'missing-retained-input') {
   assert.equal(resolverCalls, 0);
   assert.deepEqual(serverTrace, []);
  }
  const completeOracle = selection.fixtureCase === 'R1-45-H01' &&
   ['complete-domain', 'unrelated-history'].includes(selection.fixtureVariant);
  inventoryEvidence.caller_request_hashes = {before: callerRequestBefore, after: callerRequestAfter};
  inventoryEvidence.server_audit = {
   unrelated_issue_count:history.issueCount, unrelated_comment_count:history.commentCount,
   unrelated_access_count:historyAccesses, before_sha256:serverBefore, after_sha256:serverAfter
  };
  inventoryEvidence.provenance_comparison = completeOracle ? compareProvenance(acquired.observations.provenance) : null;
 }
 return {report,trace,server_trace:serverTrace,...inventoryEvidence,fixture_hashes:before,input_hashes:{before:inputBefore,after:inputAfter},runtime_hashes:{before:runtimeBefore,after:runtimeAfter},private_comparison:privateComparison,tls_observation:tlsObservation,...(lateEvidence?{late_resolver:lateEvidence}:{}),effects,resolver_calls:resolverCalls,mutations,getter_calls:getterCalls,cleanup_complete:sockets.size===0,oracle_matched:true};
}

// Dedicated local fixture command. Importing runFixture never starts a read.
let isMain=false;
if(process.argv[1]){
 try{isMain=fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url));}
 catch{/* An imported harness need not have a resolvable host entry. */}
}
if(isMain){
 let json=false,selected=null,failedRole=null;
 const runs=[],runRoles=[];
 try{
  const args=process.argv.slice(2),values={};
  for(let i=0;i<args.length;i++){
   if(args[i]==='--json'){json=true;continue;}
   if(!['--case','--variant','--runtime'].includes(args[i])||values[args[i]]||!args[i+1])throw Error('Invalid fixture selection.');
   values[args[i]]=args[++i];
  }
  if(Object.keys(values).length!==3)throw Error('Invalid fixture selection.');
  const caseId = values['--case'], variant = values['--variant'], root = path.resolve(values['--runtime']);
  const selection = inventorySelection(caseId, variant);
  let prepared, authored;
  if (caseId.startsWith('R1-34-')) {
   if (!selection) throw Error('Invalid fixture selection.');
   selected = selection;
   failedRole = 'main';
   prepared = await readInventoryFixture(selection, root);
   authored = prepared.authored;
  } else {
   const packet = caseId.startsWith('R1-45-') ?
    JSON.parse(fs.readFileSync(path.join(here,'jira-inventory-cases.json'),'utf8')) : fixtureCases;
   authored = packet.variants.find(row => row.case === caseId && row.variant === variant);
   if (!authored) throw Error('Invalid fixture selection.');
   selected = authored;
  }
  for(const [role,options]of [['main',{}],...(authored.control?[['control',{control:true}]]:[]),...(authored.private_projection?[['private_projection',{privateProjection:true}]]:[])]){
   failedRole=role;
   const run = await executeFixture(caseId, variant, root, {...options, authoredFixture:selection ? null : authored, selection, selected:prepared});
   runs.push(run);runRoles.push(role);failedRole=null;
  }
  if(json)console.log(JSON.stringify({case:selected.case,variant:selected.variant,runs}));
  else{console.log(selected.case+' / '+selected.variant+': literal oracle matched. Human acceptance remains a separate review.');for(const run of runs)console.log(JSON.stringify(run.report,null,2));}
 }catch(error){
  const selectionFailed = !selected;
  const selectedInventory = selected?.case.startsWith('R1-34-');
  const setupFailed = !selectionFailed && (selected.case.startsWith('R1-34-') ?
   error?.code === 'FIXTURE_SETUP_MISSING' : ['ENOENT','ERR_MODULE_NOT_FOUND'].includes(error?.code));
  const status=selectionFailed?'selection_failed':setupFailed?'setup_failed':'fixture_failed';
  const diagnostic=selectionFailed
   ?{code:'FIXTURE_SELECTION_INVALID',message:'Use --case CASE --variant NAME --runtime ROOT [--json] with a prescribed case and variant; no fixture run was started.'}
   :setupFailed
    ?{code:'SETUP_MISSING',message:'A required runtime file or module is unavailable. Prepare the complete explicit runtime; no fallback or repair was attempted. Completed runs are retained.'}
    :{code:'FIXTURE_RUN_FAILED',message:'The fixture run did not verify. Retain completed runs and inspect the prescribed check; do not treat this as missing setup or a passing observation.'};
  console.log(JSON.stringify({status,inspection_scope:selectedInventory?'configured_inventory':'requested_issues',diagnostics:[diagnostic],case:selected?.case??null,variant:selected?.variant??null,runs,run_roles:runRoles,failed_run:failedRole?{role:failedRole,observations:'unavailable',cleanup:'not_reported'}:null,domain_complete:false,admission:'not_evaluated',receipt_proof:'not_evaluated'}));
  process.exitCode=2;
 }
}
