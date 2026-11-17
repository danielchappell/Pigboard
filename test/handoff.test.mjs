import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stringify, Alias, Document, Scalar, YAMLMap, YAMLSeq, Pair } from 'yaml';
import { extractHandoffCandidate, validateHandoff, extractHandoff, digestValue, checkURLs } from '../lib/contracts/handoff.mjs';
import { parseContract } from '../lib/contracts/work.mjs';

const hash = text => 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ref = n => ({ ticket_id: '1', comment_id: String(n), record_id: uuid(n), digest: 'sha256:' + 'a'.repeat(64) });
const pr = () => ({ provider: 'github', repository: 'https://example.invalid/repo', number: '1', source_revision: 'a'.repeat(40), target_branch: 'main' });
const evidence = () => ({ label: 'Supplied evidence', uri: 'https://example.invalid/evidence', digest: null });
const report = () => ({ steps: [], human_pending: ['H01'], no_ai_cases_reason: 'A person verifies this outcome.' });
function record(kind = 'admission') {
  const base = { schema: 'pigboard-handoff/v1', record_id: uuid(1), operation_id: uuid(1), ticket_id: '1', requirements_digest: 'sha256:' + 'b'.repeat(64), assignment: ref(1), role: 'implementer', kind, from_stage: 'In Progress', to_stage: 'In Review', payload: {}, resume_authorization: null };
  const variants = {
    admission: { role: 'manager', assignment: null, from_stage: 'Ready to Work', to_stage: 'In Progress', payload: { project_id: '100', stream: 'stream-1', mode: 'new_work', previous_assignment: null, requests: [], existing_pr: null } },
    implementation: { payload: { pr: pr(), stack_parent: null, consumed_requests: [], plan: evidence(), plan_review: evidence(), ci: evidence(), verification: [evidence()], prepared_inputs: [] } },
    review: { role: 'reviewer', from_stage: 'In Review', to_stage: 'QA', payload: { implementation: ref(2), pr: pr(), approval: evidence(), report: evidence() } },
    qa: { role: 'qa', from_stage: 'QA', to_stage: 'Human Review', payload: { review: ref(3), pr: pr(), report: report() } },
    repair_request: { role: 'qa', from_stage: 'QA', to_stage: 'Rework Queued', payload: { basis: ref(3), pr: pr(), findings: [{ id: 'F01', summary: 'Confirmed defect.', evidence: [evidence()] }], qa_report: report() } },
    stack_update_request: { role: 'manager', from_stage: 'Human Review', to_stage: 'Rework Queued', payload: { child_completion: ref(4), child_pr: pr(), roots: [ref(5)], parent_completion: { ...ref(6), ticket_id: '2' }, parent_pr: { ...pr(), number: '2' }, required_parent_revision: 'c'.repeat(40), reason: 'The recorded parent changed.' } },
    dependency_wait: { to_stage: 'Rework Queued', payload: { pr: null, requests: [ref(5)], reason: 'Await the supplied request.', qa_report: null } },
    blocked: { to_stage: 'Blocked', payload: { pr: null, basis: null, reason: 'access', detail: 'Prepared access is missing.', human_action: 'Supply access.', evidence: [], qa_report: null } },
    resume_authorization: { role: 'human_request', from_stage: 'Blocked', to_stage: 'In Progress', payload: { blocked_result: ref(7), pr: null, reason: 'Access restored.' } },
  };
  return Object.assign(base, variants[kind]);
}
const raw = value => stringify(value);
const adf = text => JSON.stringify({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Supplied result.' }] }, { type: 'codeBlock', attrs: { language: 'yaml' }, content: [{ type: 'text', text: text.slice(0, 20) }, { type: 'text', text: text.slice(20) }] }] });
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const html = text => `<p>Supplied result.</p><pre><code class="language-yaml">${escape(text)}</code></pre>`;
function rejects(input, code, options, expectedPath) {
  const result = validateHandoff(input, options);
  assert.equal(result.valid, false);
  assert(result.diagnostics.some(d => d.code === code && (expectedPath === undefined || d.path === expectedPath)), JSON.stringify(result));
  assert.equal(result.completion_established, false);
  assert.equal(result.record_digest, null);
}

test('all nine complete kinds are record-valid without claiming authority or completion', () => {
  for (const kind of ['admission', 'implementation', 'review', 'qa', 'repair_request', 'stack_update_request', 'dependency_wait', 'blocked', 'resume_authorization']) {
    const result = validateHandoff(raw(record(kind)));
    assert.equal(result.valid, true, kind + JSON.stringify(result.diagnostics));
    assert.equal(result.mode, 'record'); assert.equal(result.validation_scope, 'record');
    assert.equal(result.live_freshness, 'not_evaluated'); assert.equal(result.outcome, kind);
    assert.equal(result.completion_established, false); assert.equal(result.target, null);
    assert.equal(result.ai_steps, null); assert.equal(result.human_pending, null);
    assert.match(result.record_digest, /^sha256:[0-9a-f]{64}$/);
  }
});
test('JCS known bytes cover recursive and numeric-looking keys, UTF-16 sort, escaping and Unicode composition', () => {
  const vectors = [
    [{ z: { b: 1, a: null }, a: [true, false, 'x'] }, '{"a":[true,false,"x"],"z":{"a":null,"b":1}}'],
    [{ 2: 'two', 10: 'ten' }, '{"10":"ten","2":"two"}'],
    [{ '\ufb33': 'Hebrew', '😀': 'emoji', '\u20ac': 'Euro', '\u000d': 'CR', '1': 'one', '\u0080': 'control', 'ö': 'Latin' }, '{"\\r":"CR","1":"one","\u0080":"control","ö":"Latin","€":"Euro","😀":"emoji","דּ":"Hebrew"}'],
    [{ text: '\u000f\n"\\/' }, '{"text":"\\u000f\\n\\"\\\\/"}'],
    [{ a: -0, b: [333333333.3333333, 4.5, 0.002, 1e-27, 0.000001, 1e-7] }, '{"a":0,"b":[333333333.3333333,4.5,0.002,1e-27,0.000001,1e-7]}'],
  ];
  for (const [value, canonical] of vectors) assert.equal(digestValue(value), hash(canonical));
  assert.notEqual(digestValue({ text: 'é' }), digestValue({ text: 'e\u0301' }));
  assert.notEqual(digestValue([1, 2]), digestValue([2, 1]));
  assert.throws(() => digestValue({ number: 1e20 }), error => error.diagnostic.code === 'NUMBER');
  assert.throws(() => digestValue({ number: 9007199254740992 }), error => error.diagnostic.code === 'NUMBER');
  for (const value of [undefined, NaN, Infinity, 1n, new Date(), { get value() { throw new Error('must not execute'); } }, Object.assign([1], { extra: 2 })]) assert.throws(() => digestValue(value));
  const cycle = {}; cycle.self = cycle; assert.throws(() => digestValue(cycle));
});
test('YAML, split ADF text and entity-encoded HTML preserve identical records and digest', () => {
  const value = record(); value.payload.stream = 'stream-1 café & "quoted"';
  const text = raw(value), expected = validateHandoff(text);
  for (const [format, input] of [['adf', adf(text)], ['html', html(text)]]) {
    const before = input, result = validateHandoff(input, { format });
    assert.equal(result.valid, true, JSON.stringify(result)); assert.equal(result.record_digest, expected.record_digest); assert.equal(input, before);
    assert.deepEqual(JSON.parse(JSON.stringify(extractHandoff(input, { format }).value)), value);
  }
  value.payload.stream += '!'; assert.notEqual(validateHandoff(raw(value)).record_digest, expected.record_digest);
});
test('structural, format and YAML domain errors reject before a digest exists', () => {
  for (const [mutate, path] of [
    [r => delete r.resume_authorization, '/resume_authorization'], [r => r.extra = true, ''],
    [r => r.schema = 'pigboard-handoff/v2', '/schema'], [r => r.record_id = 'not-a-uuid', '/record_id'],
    [r => r.payload.project_id = null, '/payload/project_id'], [r => r.assignment = ref(2), '/assignment'],
  ]) { const value = record(); mutate(value); const result = validateHandoff(raw(value)); assert.equal(result.valid, false); assert(result.diagnostics.some(d => d.path === path), JSON.stringify(result)); }
  const text = raw(record());
  for (const [input, code] of [[text + '\n---\n' + text, 'DOCUMENT_COUNT'], [text + '\nschema: pigboard-handoff/v1\n', 'DUPLICATE_KEY'], [text.replace('stream-1', '&item value') + '\nalias: *item\n', 'ALIAS'], [text.replace('stream-1', '!Custom value'), 'YAML_SYNTAX'], [text.replace('stream-1', '.inf'), 'NUMBER'], [text.replace('stream-1', '9007199254740992'), 'NUMBER'], ['? [a,b]\n: c\n', 'KEY_TYPE'], [Buffer.from([0xff]), 'UTF8'], [text + '\n#\ud800', 'UNICODE']]) rejects(input, code);
  const skeleton = readFileSync(new URL('../docs/architecture/examples/handoffs/admission.yaml', import.meta.url), 'utf8');
  assert.equal(validateHandoff(skeleton).valid, false);
});
test('all nested PR and evidence URLs reject userinfo without echoing credentials', () => {
  const locations = [
    ['implementation', r => r.payload.pr, '/payload/pr/repository', 'repository'],
    ['implementation', r => r.payload.stack_parent = { ticket_id: '2', pr: pr(), incorporated_revision: 'a'.repeat(40), completion: ref(5) }, '/payload/stack_parent/pr/repository', 'parent'],
    ['implementation', r => r.payload.plan, '/payload/plan/uri', 'uri'],
    ['stack_update_request', r => r.payload.parent_pr, '/payload/parent_pr/repository', 'repository'],
    ['stack_update_request', r => r.payload.child_pr, '/payload/child_pr/repository', 'repository'],
    ['blocked', r => r.payload.pr = pr(), '/payload/pr/repository', 'repository'],
    ['resume_authorization', r => r.payload.pr = pr(), '/payload/pr/repository', 'repository'],
  ];
  for (const [kind, select, expectedPath, key] of locations) for (const userinfo of ['user@', 'user:password@', '@']) {
    const value = record(kind), target = select(value), url = `https://${userinfo}example.invalid/repo`;
    if (key === 'parent') target.pr.repository = url; else target[key] = url;
    rejects(raw(value), 'FORMAT', undefined, expectedPath);
    assert(!JSON.stringify(validateHandoff(raw(value))).includes(url));
  }
  const repair = record(); repair.from_stage = 'Rework Queued'; Object.assign(repair.payload, { mode: 'repair', previous_assignment: ref(8), requests: [ref(9)], existing_pr: pr() });
  assert(validateHandoff(raw(repair)).valid); repair.payload.existing_pr.repository = 'https://user@example.invalid/repo'; rejects(raw(repair), 'FORMAT', undefined, '/payload/existing_pr/repository');
  for (const url of ['https://example.invalid/raw space', 'https://example.invalid/%GG', 'https://example.invalid/%2', 'https://exa[mple.invalid/repo', 'https://[::1/repo', 'https://café.invalid/repo', 'https://example.invalid/café']) {
    const value = record('implementation'); value.payload.pr.repository = url; rejects(raw(value), 'FORMAT', undefined, '/payload/pr/repository');
  }
  const allowlists = { trusted: { repositories: ['https://user@example.invalid/repo'], evidence_uris: ['https://user:password@example.invalid/evidence'] } };
  assert.deepEqual(checkURLs(allowlists).map(d => d.path), ['/trusted/evidence_uris/0', '/trusted/repositories/0']);
});
test('ADF and HTML reject ambiguous, unsupported, malformed and truncated wrappers', () => {
  const text = raw(record()), doc = JSON.parse(adf(text));
  doc.content.push(structuredClone(doc.content[1])); rejects(JSON.stringify(doc), 'HANDOFF_BLOCK_COUNT', { format: 'adf' });
  const wrong = JSON.parse(adf(text)); wrong.version = 2; rejects(JSON.stringify(wrong), 'ADF_SHAPE', { format: 'adf' });
  wrong.version = 1; wrong.content[1].attrs.language = 'json'; rejects(JSON.stringify(wrong), 'ADF_BLOCK', { format: 'adf' });
  assert.throws(() => extractHandoffCandidate(JSON.stringify(wrong)), error => error.diagnostic.code === 'ADF_BLOCK');
  wrong.content[1].attrs.language = 'yaml'; wrong.content[1].content[0].content = []; rejects(JSON.stringify(wrong), 'ADF_BLOCK', { format: 'adf' });
  assert.throws(() => extractHandoffCandidate(JSON.stringify(wrong)), error => error.diagnostic.code === 'ADF_BLOCK');
  rejects(JSON.stringify({ type: 'doc', version: 1, content: [{ type: 'text', text: 'bad\0text' }] }), 'ADF_SHAPE', { format: 'adf' });
  rejects('{"type":"doc","type":"doc","version":1,"content":[]}', 'DUPLICATE_KEY', { format: 'adf' });
  for (const [input, code] of [[html(text) + html(text), 'HANDOFF_BLOCK_COUNT'], ['<p>```yaml\n' + escape(text) + '\n```</p>', 'HANDOFF_BLOCK_COUNT'], [html(text).replace('</code>', ''), 'HTML_BLOCK'], [html(text).replace('</pre>', ''), 'HTML_BLOCK'], [html(text).replace('schema:', '<em>schema:</em>'), 'HTML_BLOCK'], [html(text).replace('schema:', '&bogus;schema:'), 'HTML_PARSE'], [html(text).replace('schema:', '&#0;schema:'), 'HTML_PARSE'], [html(text).replace('schema:', '\0schema:'), 'PARSE']]) rejects(input, code, { format: 'html' });
  assert(validateHandoff('<script>throw Error("never run")</script>' + html(text), { format: 'html' }).valid);
  for (const [format, input] of [['adf', JSON.stringify({ type: 'doc', version: 1, content: [] })], ['html', '<p>Ordinary comment.</p>']]) assert.throws(() => extractHandoff(input, { format }), error => error.diagnostic.code === 'HANDOFF_BLOCK_COUNT' && error.diagnostic.blocks === 0);
});
test('byte, container, array and wrapper bounds reject at the boundary without truncation', () => {
  const text = raw(record()), padding = 16384 - Buffer.byteLength(text) - 2, exact = text + '#' + 'x'.repeat(padding) + '\n';
  assert.equal(extractHandoffCandidate(adf(exact)).record_digest, validateHandoff(exact).record_digest);
  assert.throws(() => extractHandoffCandidate(adf(exact + 'x')), error => error.diagnostic.code === 'BYTE_LIMIT');
  assert.equal(Buffer.byteLength(exact), 16384); assert(validateHandoff(exact).valid); rejects(exact + 'x', 'BYTE_LIMIT');
  const recordValue = record(); recordValue.from_stage = 'Rework Queued'; Object.assign(recordValue.payload, { mode: 'repair', previous_assignment: ref(1), requests: Array.from({ length: 100 }, (_, i) => ref(i + 2)) });
  const evidenceBound = record('blocked'); evidenceBound.payload.evidence = Array.from({ length: 100 }, (_, index) => ({ ...evidence(), label: String(index) }));
  assert(validateHandoff(raw(evidenceBound)).valid);
  assert(extractHandoffCandidate(adf(raw(evidenceBound))));
  const duplicate = structuredClone(evidenceBound); duplicate.payload.evidence[99] = { digest: duplicate.payload.evidence[0].digest, uri: duplicate.payload.evidence[0].uri, label: duplicate.payload.evidence[0].label }; rejects(raw(duplicate), 'STRUCTURE');
  const maliciousKey = structuredClone(evidenceBound); maliciousKey.payload.evidence[0].valueOf = 'ordinary JSON data'; rejects(raw(maliciousKey), 'STRUCTURE');
  evidenceBound.payload.evidence.push({ ...evidence(), label: '101' }); rejects(raw(evidenceBound), 'LIST_LIMIT');
  assert.throws(() => extractHandoffCandidate(adf(raw(evidenceBound))), error => error.diagnostic.code === 'LIST_LIMIT');
  // A full 100-reference handoff exceeds the 16 KiB record bound first. Exercise
  // the reachable array limit through the shared parser, never label it record-valid.
  assert.throws(() => extractHandoffCandidate(adf(raw(recordValue))), error => error.diagnostic.code === 'BYTE_LIMIT');
  assert(Buffer.byteLength(raw(recordValue)) > 16384); rejects(raw(recordValue), 'BYTE_LIMIT');
  assert.equal(parseContract('{"items":[' + Array(100).fill('0').join(',') + ']}', { bytes: 16384, depth: 16, list: 100 }).items.length, 100);
  assert.throws(() => parseContract('{"items":[' + Array(101).fill('0').join(',') + ']}', { bytes: 16384, depth: 16, list: 100 }), error => error.diagnostic.code === 'LIST_LIMIT');
  const nested = n => '{"value":'.repeat(n) + 'null' + '}'.repeat(n);
  assert(parseContract(nested(16), { bytes: 16384, depth: 16, list: 100 }));
  assert.throws(() => parseContract(nested(17), { bytes: 16384, depth: 16, list: 100 }), error => error.diagnostic.code === 'DEPTH_LIMIT');
  for (const n of [16, 17]) assert.throws(() => extractHandoffCandidate(adf(nested(n).replace('{', '{\"schema\":\"pigboard-handoff/v1\",'))), error => error.diagnostic.code === (n === 16 ? 'STRUCTURE' : 'DEPTH_LIMIT'));
  for (const format of ['adf', 'html']) {
    const base = format === 'adf' ? adf(text) : html(text);
    const exactWrapper = base + ' '.repeat(65536 - Buffer.byteLength(base));
    if (format === 'adf') { assert(extractHandoffCandidate(exactWrapper)); assert.throws(() => extractHandoffCandidate(exactWrapper + ' '), error => error.diagnostic.code === 'BYTE_LIMIT'); }
    assert(validateHandoff(exactWrapper, { format }).valid); rejects(exactWrapper + ' ', 'BYTE_LIMIT', { format });
  }
  assert(validateHandoff('<div>'.repeat(28) + html(text) + '</div>'.repeat(28), { format: 'html' }).valid);
  rejects('x'.repeat(65537), 'BYTE_LIMIT', { format: 'html' });
  rejects('<div>'.repeat(33) + html(text) + '</div>'.repeat(33), 'DEPTH_LIMIT', { format: 'html' });
  rejects('<p>' + '<span>x</span>'.repeat(101) + '</p>' + html(text), 'LIST_LIMIT', { format: 'html' });
  const wrapper = { type: 'doc', version: 1, content: [{ type: 'codeBlock', attrs: { language: 'yaml' }, content: [{ type: 'text', text }] }, ...Array.from({ length: 10 }, (_, index) => ({ type: 'paragraph', content: Array.from({ length: index === 9 ? 87 : 100 }, () => ({ type: 'text', text: 'x' })) }))] };
  assert(extractHandoffCandidate(JSON.stringify(wrapper)));
  assert(validateHandoff(JSON.stringify(wrapper), { format: 'adf' }).valid);
  wrapper.content.at(-1).content.push({ type: 'text', text: 'x' }); rejects(JSON.stringify(wrapper), 'NODE_LIMIT', { format: 'adf' });
  assert.throws(() => extractHandoffCandidate(JSON.stringify(wrapper)), error => error.diagnostic.code === 'NODE_LIMIT');
  const ordinary = JSON.stringify({type:'doc',version:1,content:[{type:'paragraph',content:[{type:'text',text:'ordinary'}]}]});
  const ordinaryExact = ordinary + ' '.repeat(262144 - Buffer.byteLength(ordinary));
  assert.equal(extractHandoffCandidate(ordinaryExact), null);
  assert.throws(() => extractHandoffCandidate(ordinaryExact + ' '), error => error.diagnostic.code === 'BYTE_LIMIT');
  const hundred = JSON.parse(adf(text)); hundred.content.push(...Array.from({length:98}, () => ({type:'paragraph'})));
  assert(extractHandoffCandidate(JSON.stringify(hundred))); hundred.content.push({type:'paragraph'});
  assert.throws(() => extractHandoffCandidate(JSON.stringify(hundred)), error => error.diagnostic.code === 'LIST_LIMIT');
  const deep = n => JSON.stringify({type:'doc',version:1,content:[],extra: JSON.parse(nested(n))});
  assert.equal(extractHandoffCandidate(deep(31)), null);
  assert.throws(() => extractHandoffCandidate(deep(32)), error => error.diagnostic.code === 'DEPTH_LIMIT');
  const candidateDeep = n => { const value=JSON.parse(adf(text)); value.extra=JSON.parse(nested(n)); return JSON.stringify(value); };
  assert(extractHandoffCandidate(candidateDeep(31)));
  assert.throws(() => extractHandoffCandidate(candidateDeep(32)), error => error.diagnostic.code === 'DEPTH_LIMIT');
  const ordinaryList = n => JSON.stringify({type:'doc',version:1,content:[],extra:Array(n).fill(null)});
  assert.equal(extractHandoffCandidate(ordinaryList(1000)),null);
  assert.throws(() => extractHandoffCandidate(ordinaryList(1001)), error => error.diagnostic.code === 'LIST_LIMIT');
  for (const bounds of [{ bytes: 0 }, { depth: Infinity }, { list: -1 }, { list: 1.5 }]) assert.throws(() => parseContract('{}', bounds), error => error.diagnostic.code === 'USAGE');
});
test('CLI exposes read-only record behavior and sanitized usage/input failures', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'handoff-cli-'));
  const cli = new URL('../scripts/validate-handoff.mjs', import.meta.url).pathname;
  try {
    const file = path.join(directory, 'record.yaml'); await writeFile(file, raw(record()));
    const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: directory });
    const passed = run(['--mode', 'record', '--format', 'yaml', '--input', file, '--json']); assert.equal(passed.status, 0, passed.stderr + passed.stdout); assert.equal(JSON.parse(passed.stdout).completion_established, false);
    const help = run(['--help']); assert.equal(help.status, 0); assert(help.stdout.includes('Installed:')); assert(help.stdout.includes('--mode'));
    for (const args of [['--mode', 'record', '--input', file, '--input', file, '--json'], ['--mode', 'record', '--input', directory, '--json'], ['--mode', 'record', '--input', path.join(directory, 'missing'), '--json'], ['--mode', 'record', '--input', file, '--output', 'write', '--json']]) {
      const result = run(args); assert.equal(result.status, 2); assert.equal(JSON.parse(result.stdout).valid, false); assert(!result.stdout.includes(directory));
    }
    const invalid = path.join(directory, 'invalid.yaml'); await writeFile(invalid, raw({ ...record(), schema: 'unknown' })); assert.equal(run(['--mode', 'record', '--input', invalid, '--format', 'yaml', '--json']).status, 1);
    assert.equal(readFileSync(file, 'utf8'), raw(record()));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('undeclared property diagnostics retain safe containers without reproducing schema/parser/wrapper/URL-scan keys',async t=>{
 const cli=new URL('../scripts/validate-handoff.mjs',import.meta.url).pathname;
 const dir=await mkdtemp(path.join(os.tmpdir(),'record-safe-path-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const secret='https://user:FICTITIOUS-SECRET@example.invalid/private-report',key=JSON.stringify(secret),r=record('admission'),raw=JSON.stringify(r),cases=[];
 cases.push([JSON.stringify({...r,[secret]:true}),'yaml','']);
 cases.push([JSON.stringify({...r,payload:{...r.payload,[secret]:{uri:'https://user:FICTITIOUS-SECRET@example.invalid'}}}),'yaml','/payload']);
 cases.push([raw.replace('"schema":"pigboard-handoff/v1"',`"schema":"pigboard-handoff/v1",${key}:0,${key}:1`),'yaml','']);
 cases.push([raw.replace('"schema":"pigboard-handoff/v1"',`"schema":"pigboard-handoff/v1",${key}:9007199254740993`),'yaml','']);
 const doc={type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml',[secret]:'MARK'},content:[{type:'text',text:raw}]}]};cases.push([JSON.stringify(doc).replace('"MARK"','9007199254740993'),'adf','/content/0/attrs']);
 for(const [i,[input,format,safePath]]of cases.entries()){const result=validateHandoff(input,{format});assert.equal(result.valid,false);assert(result.diagnostics.some(d=>d.path===safePath),JSON.stringify(result.diagnostics));assert(!JSON.stringify(result).includes('FICTITIOUS-SECRET'));assert(!JSON.stringify(result).includes('private-report'));const file=path.join(dir,'record-'+i);await writeFile(file,input);for(const json of [false,true]){const p=spawnSync(process.execPath,[cli,'--mode','record','--input',file,'--format',format,...(json?['--json']:[])],{encoding:'utf8'});assert.equal(p.status,1,p.stdout+p.stderr);assert(!p.stdout.includes('FICTITIOUS-SECRET'));assert(!p.stdout.includes('private-report'));assert(!p.stderr);}}
 const urls=checkURLs({payload:{[secret]:{uri:'https://user:FICTITIOUS-SECRET@example.invalid'}}});assert.equal(urls[0].path,'/payload');assert(!JSON.stringify(urls).includes('FICTITIOUS-SECRET'));
});

test('QA-only blocked/wait findings are optional, bounded and closed without changing old digests', () => {
  for (const kind of ['blocked', 'dependency_wait']) {
    const old = record(kind), before = raw(old), oldDigest = digestValue(old);
    assert.equal(validateHandoff(before).record_digest, oldDigest);
    assert(!Object.hasOwn(extractHandoff(before).value.payload, 'findings'));
    const qa = structuredClone(old); qa.role = 'qa'; qa.from_stage = 'QA'; qa.payload.qa_report = report();
    qa.payload.findings = record('repair_request').payload.findings;
    assert.equal(validateHandoff(raw(qa)).valid, true);
    for (const [role, stage] of [['implementer', 'In Progress'], ['reviewer', 'In Review']]) {
      const other = structuredClone(qa); other.role = role; other.from_stage = stage; other.payload.qa_report = null;
      rejects(raw(other), 'STRUCTURE');
      delete other.payload.findings; assert.equal(validateHandoff(raw(other)).valid, true);
    }
    for (const mutate of [r => r.payload.findings = [], r => r.payload.findings = null, r => r.payload.findings[0].evidence = [], r => r.payload.findings[0].extra = true, r => r.payload.findings.push(structuredClone(r.payload.findings[0]))]) {
      const bad = structuredClone(qa); mutate(bad); rejects(raw(bad), 'STRUCTURE');
    }
    const tooMany = structuredClone(qa); tooMany.payload.findings = Array(101).fill(qa.payload.findings[0]); rejects(raw(tooMany), 'LIST_LIMIT');
    assert.equal(raw(old), before); assert.equal(validateHandoff(before).record_digest, oldDigest);
  }
});

const candidateCases = [
  {
    "id": "P01",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"python\"},\"content\":[{\"type\":\"text\",\"text\":\"print(\\\"ordinary\\\")\\n\"}]}]}",
    "input_sha256": "a0c8ab6a3a4af1e561be1745c30eb4fad8c88e0ac33a5e9eaa0c9d60cd462b08",
    "expected": null
  },
  {
    "id": "P02",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"schema: unrelated/v1\\npayload: pigboard-handoff/v1\\n\"}]}]}",
    "input_sha256": "b9dfb098b68c5f8956519b2f4a3e45941f53ae0db3a130569e904d2faba71871",
    "expected": null
  },
  {
    "id": "P03",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"python\"},\"content\":[{\"type\":\"text\",\"text\":\"print(\\\"ordinary\\\")\\n\"}]},{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1\\\",\\\"requirements_digest\\\":\\\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\\\",\\\"assignment\\\":null,\\\"role\\\":\\\"manager\\\",\\\"kind\\\":\\\"admission\\\",\\\"from_stage\\\":\\\"Ready to Work\\\",\\\"to_stage\\\":\\\"In Progress\\\",\\\"payload\\\":{\\\"project_id\\\":\\\"100\\\",\\\"stream\\\":\\\"stream-1\\\",\\\"mode\\\":\\\"new_work\\\",\\\"previous_assignment\\\":null,\\\"requests\\\":[],\\\"existing_pr\\\":null},\\\"resume_authorization\\\":null}\"}]}]}",
    "input_sha256": "52de5621e4aab0f8f03a09c77a6c8790dfd083e7e7f84fca2e01aa1cb79eeeaa",
    "expected": {
      "value": {
        "schema": "pigboard-handoff/v1",
        "record_id": "00000000-0000-4000-8000-000000000001",
        "operation_id": "00000000-0000-4000-8000-000000000001",
        "ticket_id": "1",
        "requirements_digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "assignment": null,
        "role": "manager",
        "kind": "admission",
        "from_stage": "Ready to Work",
        "to_stage": "In Progress",
        "payload": {
          "project_id": "100",
          "stream": "stream-1",
          "mode": "new_work",
          "previous_assignment": null,
          "requests": [],
          "existing_pr": null
        },
        "resume_authorization": null
      },
      "record_digest": "sha256:87b713f187502f9a81591171ab1252d8f8a614044ebcaa660598d42e7923fc11"
    }
  },
  {
    "id": "P04",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1\\\",\\\"requirements_digest\\\":\\\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\\\",\\\"assignment\\\":null,\\\"role\\\":\\\"manager\\\",\\\"kind\\\":\\\"admission\\\",\\\"from_stage\\\":\\\"Ready to Work\\\",\\\"to_stage\\\":\\\"In Progress\\\",\\\"payload\\\":{\\\"project_id\\\":\\\"100\\\",\\\"stream\\\":\\\"stream-1\\\",\\\"mode\\\":\\\"new_work\\\",\\\"previous_assignment\\\":null,\\\"requests\\\":[],\\\"existing_pr\\\":null},\\\"resume_authorization\\\":null}\"}]},{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1\\\",\\\"requirements_digest\\\":\\\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\\\",\\\"assignment\\\":null,\\\"role\\\":\\\"manager\\\",\\\"kind\\\":\\\"admission\\\",\\\"from_stage\\\":\\\"Ready to Work\\\",\\\"to_stage\\\":\\\"In Progress\\\",\\\"payload\\\":{\\\"project_id\\\":\\\"100\\\",\\\"stream\\\":\\\"stream-1\\\",\\\"mode\\\":\\\"new_work\\\",\\\"previous_assignment\\\":null,\\\"requests\\\":[],\\\"existing_pr\\\":null},\\\"resume_authorization\\\":null}\"}]}]}",
    "input_sha256": "3480c5cac3377ec71659f8d32065aab1692ad1d8d0b7857041ea192111f1fa57",
    "expected": {
      "diagnostic": "HANDOFF_BLOCK_COUNT"
    }
  },
  {
    "id": "P05",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v1\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1\\\",\\\"requirements_digest\\\":\\\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\\\",\\\"assignment\\\":null,\\\"role\\\":\\\"manager\\\",\\\"kind\\\":\\\"admission\\\",\\\"from_stage\\\":\\\"Ready to Work\\\",\\\"to_stage\\\":\\\"In Progress\\\",\\\"payload\\\":{\\\"project_id\\\":\\\"100\\\",\\\"stream\\\":\\\"stream-1\\\",\\\"mode\\\":\\\"new_work\\\",\\\"previous_assignment\\\":null,\\\"requests\\\":[],\\\"existing_pr\\\":null},\\\"resume_authorization\\\":null,\\\"schema\\\":\\\"pigboard-handoff/v1\\\"}\"}]}]}",
    "input_sha256": "ea747828bca398188d6fb8dc1570bfa7b3e35cc7ccc9958064ec20c875e849b5",
    "expected": {
      "diagnostic": "DUPLICATE_KEY"
    }
  },
  {
    "id": "P06",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"{\\\"schema\\\":\\\"pigboard-handoff/v2\\\",\\\"record_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"operation_id\\\":\\\"00000000-0000-4000-8000-000000000001\\\",\\\"ticket_id\\\":\\\"1\\\",\\\"requirements_digest\\\":\\\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\\\",\\\"assignment\\\":null,\\\"role\\\":\\\"manager\\\",\\\"kind\\\":\\\"admission\\\",\\\"from_stage\\\":\\\"Ready to Work\\\",\\\"to_stage\\\":\\\"In Progress\\\",\\\"payload\\\":{\\\"project_id\\\":\\\"100\\\",\\\"stream\\\":\\\"stream-1\\\",\\\"mode\\\":\\\"new_work\\\",\\\"previous_assignment\\\":null,\\\"requests\\\":[],\\\"existing_pr\\\":null},\\\"resume_authorization\\\":null}\"}]}]}",
    "input_sha256": "dea4b95322193e4329267ce00404814f5d50fa6b6df1a39a7547a8bfa0f04029",
    "expected": {
      "diagnostic": "STRUCTURE"
    }
  },
  {
    "id": "P07",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"schema: {value: pigboard-handoff/v1}\\n\"}]}]}",
    "input_sha256": "e7ed1aceeb0234ffa0e4b17dc49ff12775692c2d855074829bd6040deabd63d9",
    "expected": {
      "diagnostic": "STRUCTURE"
    }
  },
  {
    "id": "P08",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"anchor: &ordinary ordinary/v1\\nschema: [*ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary, *ordinary]\\nunrelated: pigboard-handoff/v1\\n\"}]}]}",
    "input_sha256": "6c611268c65357605e82f9247d1878fbff7ce9ff233616941506f78405af5178",
    "expected": null
  },
  {
    "id": "P09",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"old: &target ordinary/v1\\nmarker: &target pigboard-handoff/v1\\ncontainer: &container {value: *target}\\nchain: &chain [*container]\\nschema: *chain\\n\"}]}]}",
    "input_sha256": "47ea2e4c6c77752cae1f209e08c37cfb3bcc829d51b34c4ef27ccab31e2f1894",
    "expected": {
      "diagnostic": "ALIAS"
    }
  },
  {
    "id": "P10",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"schema: &self [*self, pigboard-handoff/v1]\\n\"}]}]}",
    "input_sha256": "72c69938510b33d16f288a3df72a4aed99d2f5f1c190643a102c74199771a9fa",
    "expected": {
      "diagnostic": "ALIAS"
    }
  },
  {
    "id": "P11",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"schema: [*missing, *later]\\nlater: &later pigboard-handoff/v1\\n\"}]}]}",
    "input_sha256": "3c62db04191b64de3565326bf2abab3ad821e621eda3fbf7a93db6ac8aa4dafb",
    "expected": null
  },
  {
    "id": "P12",
    "input": "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":\"yaml\"},\"content\":[{\"type\":\"text\",\"text\":\"schema: [*missing, pigboard-handoff/v1]\\n\"}]}]}",
    "input_sha256": "5a098be39fd7d794c03ec77ec938ebdf59daa47391ca6d145247dd2259c9c8bd",
    "expected": {
      "diagnostic": "ALIAS"
    }
  }
];
test('PGB-172 candidate smoke', () => {
  for (const id of ['P01', 'P03', 'P07']) {
    const item = candidateCases.find(item => item.id === id);
    if (item.expected?.diagnostic) assert.throws(() => extractHandoffCandidate(item.input), error => error.diagnostic?.code === item.expected.diagnostic, id);
    else if (item.expected === null) {
      assert.equal(extractHandoffCandidate(item.input), null, id);
    } else {
      const expectedValue = Object.assign(Object.create(null), item.expected.value);
      expectedValue.payload = Object.assign(Object.create(null), item.expected.value.payload);
      assert.deepEqual(extractHandoffCandidate(item.input), {
        value: expectedValue,
        record_digest: item.expected.record_digest,
      }, id);
    }
  }
});

test('PGB-172 candidate recognition', () => {
  assert.throws(() => extractHandoff(candidateCases.find(item => item.id === 'P03').input, {format:'adf'}), error => error.diagnostic.code === 'HANDOFF_BLOCK_COUNT');
  const guards = [];
  try {
    // Recognition must not invoke document scans or conversion expansion.
    for (const prototype of [Alias.prototype, Document.prototype, Scalar.prototype, YAMLMap.prototype, YAMLSeq.prototype, Pair.prototype]) {
      for (const name of ['resolve', 'toJS', 'toJSON']) if (typeof prototype[name] === 'function' && Object.hasOwn(prototype, name)) {
        guards.push([prototype, name, prototype[name]]);
        prototype[name] = () => { throw Error('YAML conversion must not run during recognition'); };
      }
    }
    const item = candidateCases.find(item => item.id === 'P08');
    assert.equal(extractHandoffCandidate(item.input), null);
  } finally { for (const [prototype, name, value] of guards) prototype[name] = value; }
  for (const item of candidateCases.filter(item => !['P01', 'P03', 'P07', 'P08'].includes(item.id))) {
    assert.equal(createHash('sha256').update(item.input).digest('hex'), item.input_sha256, item.id + ' literal input');
    const before = item.input;
    if (item.expected?.diagnostic) assert.throws(() => extractHandoffCandidate(item.input), error => error.diagnostic?.code === item.expected.diagnostic, item.id);
    else assert.equal(extractHandoffCandidate(item.input), null, item.id);
    assert.equal(item.input, before);
  }
});

test("PGB-172 malformed selected-block language returns a safe diagnostic", () => {
  const input = "{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"codeBlock\",\"attrs\":{\"language\":{\"toLowerCase\":\"x\"}},\"content\":[{\"type\":\"text\",\"text\":\"schema: pigboard-handoff/v1\\n\"}]}]}";
  const before = input;
  const expected = {"code": "ADF_BLOCK", "path": "/content/0", "message": "Use a YAML code block containing only text children."};
  for (const invoke of [() => extractHandoffCandidate(input), () => extractHandoff(input, {format:'adf'})]) {
    assert.throws(invoke, error => {
      assert(error instanceof Error); assert(!(error instanceof TypeError));
      assert.deepEqual(error.diagnostic, expected); assert.deepEqual(error.diagnostics, [expected]);
      return true;
    });
  }
  assert.equal(input, before);
});

test('recorded CLI rejects mixed purposes and unsafe setup before reading input',async t=>{
 const {mkdir,copyFile}=await import('node:fs/promises'),dir=await mkdtemp(path.join(os.tmpdir(),'recorded-cli-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const cli=new URL('../scripts/validate-handoff.mjs',import.meta.url).pathname,run=(script,args)=>spawnSync(process.execPath,[script,...args,'--json'],{cwd:dir,encoding:'utf8',timeout:30000});
 const helper=path.join(dir,'isolated','scripts');await mkdir(helper,{recursive:true});await copyFile(cli,path.join(helper,'validate-handoff.mjs'));
 for(const mode of ['recorded-history','recorded-completion'])for(const [script,args,code]of [
  [cli,['--mode',mode,'--input',path.join(dir,'MISSING_SECRET_CANARY'),'--format','yaml'],'USAGE'],
  [cli,['--mode',mode,'--input',path.join(dir,'MISSING_SECRET_CANARY')],'INPUT'],
  [cli,['--mode',mode,'--input',dir],'INPUT'],
  [path.join(helper,'validate-handoff.mjs'),['--mode',mode,'--input',path.join(dir,'MISSING_SECRET_CANARY')],'SETUP'],
 ]){const child=run(script,args);assert.equal(child.status,2,child.stdout+child.stderr);assert.equal(child.stderr,'');assert(!child.stdout.includes('SECRET_CANARY'));const result=JSON.parse(child.stdout),v=result.validation??result;assert.equal(v.schema,'pigboard-recorded-handoff-validation/v1');assert.equal(v.mode,mode);assert.equal(v.purpose,mode);assert.equal(v.validation_scope,'authenticated_recorded_handoffs');assert.equal(v.basis,'authenticated_jira_handoff');assert.equal(v.metadata_continuity,'supplied_prior_tuples_only');assert.deepEqual(v.trust_limitations,['Current authentication does not guarantee comparison against an earlier metadata observation. Supplied prior tuples must match.','Supplied provider facts are not cryptographic proof of live provider origin; role accounts may overlap and do not establish exclusive execution.']);assert.equal(v.valid,false);assert.equal(v.recorded_completion_established,false);assert.equal(v.execution_authorized,false);assert.equal(v.external_freshness,'not_evaluated');assert.equal(v.target,null);assert.equal(v.diagnostics[0].code,code);assert.deepEqual(result.bindings,[]);if(mode==='recorded-completion'){assert.equal(Object.hasOwn(result,'schema'),false);for(const field of ['record_digest','outcome','validated_leaf','qa_report','ai_steps','human_pending','no_ai_cases_reason'])assert.equal(v[field],null);}else{assert.equal(Object.hasOwn(result,'validation'),false);assert.deepEqual(v.records,[]);assert.deepEqual(v.coverage_segments,[]);}}
 const help=run(cli,['--help']);assert.equal(help.status,0);const message=JSON.parse(help.stdout).help;for(const mode of ['record','chain','recorded-history','recorded-completion'])assert(message.includes('--mode '+mode));assert.match(message,/pigboard-manager-handoff-input\/v1/);
});

const ordinaryPacket=JSON.parse(readFileSync(new URL('./fixtures/handoff-chains.json',import.meta.url))).worker_current;
for(const row of ordinaryPacket.artifacts.filter(r=>r.group===8))test('ordinary unpublished record and original readback: '+row.id,()=>{
 const raw=JSON.stringify(row.input),v=validateHandoff(raw,{format:'yaml'});assert(v.valid,JSON.stringify(v.diagnostics));assert.equal(v.record_digest,row.original_digest);assert.equal(row.input.record_id,row.original_record_id);assert.equal(v.validation_scope,'record');assert.equal(v.completion_established,false);
 const preflight=ordinaryPacket.artifacts.find(r=>r.file===row.preflight).input;assert.equal(Object.hasOwn(preflight,'candidate'),false);
 const readback=ordinaryPacket.artifacts.find(r=>r.file===row.simulated_native_readback).input,c=readback.comment_pages.flatMap(p=>p.comments).find(c=>c.id===readback.target.comment_id),record=extractHandoff(c.body,{format:c.format});
 assert.equal(digestValue(record.value),digestValue(row.input));assert.equal(JSON.stringify(record.value),JSON.stringify(row.input));assert.equal(record.record_digest,row.original_digest);assert.equal(readback.target.record_id,row.original_record_id);
 for(const changed of ordinaryPacket.artifacts.filter(r=>r.id.startsWith(row.id+'-'))){assert.notEqual(digestValue(changed.input),row.original_digest);assert.notDeepEqual(changed.input,record.value);if(changed.id.endsWith('UUID'))assert.notEqual(changed.input.record_id,row.original_record_id);}
});
test('ordinary publication protocol retains unknown effects without simulated success',()=>{
 const p=ordinaryPacket.artifacts.find(r=>r.id==='publication-protocol').input;for(const c of p.controls){assert.equal(c.unknown_append.known_native_reference,null);assert.equal(c.unknown_append.expected,'hold original identity; no second append or transition replay');assert.equal(c.mismatched_readback.expected,'no transition');assert.match(c.provider_execution,/NOT_RUN/);}
 const guide=readFileSync(new URL('../docs/handoffs.md',import.meta.url),'utf8').split('## Ordinary worker release boundary')[1];for(const text of ['independently compare','complete role-specific semantics','canonical record/digest/UUID','append once','no replacement append, second append or transition replay'])assert(guide.includes(text),text);
});
