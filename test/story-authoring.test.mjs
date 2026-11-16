import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { parseWork, validateWork } from '../lib/contracts/work.mjs';

// Explicit pre81 data access for dated guards only; current checks read current files.
const pre81Digests={
  "ticket-drafts.json": {
    "raw": "9ffe565fa1565be450711f4f7fd87b8da3ec8071a3e9e4701426d658ede34990",
    "json": "eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653",
    "canonical": "9da9ac2fc693db4c2fe90402378bc400c5ce0b8c779fab95c5f8c1f76f29a767"
  },
  "plan-metadata.json": {
    "raw": "a6feff8162b173221522ddc257b6c244a800a17aebeb3e1bfee7404179e643d2",
    "json": "eb58c13c50f7acfe1610b73abe139703b4c92e312f8034c96d897843f41fe1b1",
    "canonical": "11cacaa064a13f4d67f897e65c5e5c2f215b147593e7a91ee73edee869415e02"
  },
  "publication.json": {
    "raw": "d4cf6fe3e07bdc156f29c4792eadc33a18f03392b2e0e07e2e9409398793d65e",
    "json": "8624d22abca43b0f9929c7de5df31edbebc1a3e858269677cdae5b0f6fb907ad",
    "canonical": "c9350ea0c9ad239450642e4e8666ece52114b7061a6c72a92d0f1924593c7611"
  },
  "config/skill-bundle.json": {
    "raw": "6385214b9fa380394b6da33ffbe4eb43015f6bb3c0983d86e58ed61c83f260c2",
    "json": "4fb87e988d1f8c4044cac5181b3df9d6c14ce0bb119b127865e822a0643c1ad8",
    "canonical": "2205195a0e67d68a177f3ae937d512a8c4ab39822f5b0d741116802222e905d1"
  }
};
async function pre81Capture(name){
 assert(Object.hasOwn(pre81Digests,name),'Only the three named catalog files and old bundle may be captured');
 const p=JSON.parse(await readFile(new URL('../docs/delivery/manager-r1/publication.json',import.meta.url),'utf8')),c=p.installed_repair_preview_amendment.historical_source_capture.files[name],expected=pre81Digests[name];
 const sha=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(sha(c.raw),expected.raw,name+' captured raw bytes');
 assert.deepEqual(JSON.parse(c.raw),c.object,name+' captured raw/object equality');
 assert.equal(sha(JSON.stringify(c.object)),expected.json,name+' JSON.stringify digest');
 assert.equal(sha(canonicalize(c.object)),expected.canonical,name+' RFC8785 digest');
 return structuredClone(c.object);
}

// Exact pre-PGB-147 snapshot: four complete JSON objects and two changed text inputs.
const pre147Digests={"publication.json": ["f0a3a38292404fa1d180cfe2ae791f41bef8b5fca84c0e20b4c6737462042a31", "870f438e41a5acb8f4fcd9e087952dea8ea25d6dc7a0b2b636d42575ff4e8710"], "plan-metadata.json": ["e6f6e565292473e1e5060856778e265ebfe85368504f98669b94a95bcdbbb681", "32fb888754fbad25b9c44575fb42d49247fd07c7c8778cd821a417640c7fdc03"], "ticket-drafts.json": ["cbfbe1b2363e67989eec0f3837547627e377b3104f043ef74119502824f0dd3f", "51d888ce1ae1e046b29298d46594bd3fb9216ad7770ac48dfaeb91363a8fd4c3"], "config/skill-bundle.json": ["aa84523d0236fe00eeebe1fdcfafefd5669fd8c64754b666a9a15c07714c72bc", "3c032b634a068017464c7b2b9e2b0b83059678a76cc18a1099a2d18da772632b"], "docs/delivery/manager-r1/README.md": ["8360bb12066e95e230632716eeb1f8c724ab46a4c0e3b8fac84cdc003f3b27f6", null], "docs/manager-preview.md": ["e81605c01a69ef69cb7710742d838852b163dca6266d1448fc1abb8446b0d707", null]};
async function pre147Capture(name){
 assert(Object.hasOwn(pre147Digests,name),'Only six named PGB-81 predecessor inputs may be captured');
 const p=JSON.parse(await readFile(new URL('../docs/delivery/manager-r1/publication.json',import.meta.url),'utf8')),c=p.installed_issue_inspection_amendment.historical_source_capture.files[name],[rawDigest,jsonDigest]=pre147Digests[name];
 const sha=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(sha(c.raw),rawDigest,name+' original raw bytes');
 assert.equal(c.raw_sha256,rawDigest,name+' named raw digest');
 if(jsonDigest){assert.deepEqual(JSON.parse(c.raw),c.object,name+' complete raw/object identity');assert.equal(sha(JSON.stringify(c.object)),jsonDigest,name+' original JSON digest');assert.equal(c.json_stringify_sha256,jsonDigest,name+' named JSON digest');return structuredClone(c.object);}
 assert.equal(c.object,undefined,name+' text has no parsed object');return c.raw;
}

const root = new URL('../', import.meta.url).pathname;
const writer = new URL('../skills/write-pr-sized-stories/', import.meta.url);
const read = relative => readFile(new URL(relative, writer), 'utf8');
const document = await read('references/pigboard-example.md');
// These markers delimit maintained examples, never scheduling fields or user input.
const blocks = [...document.matchAll(/<!-- example:(epic|mixed|human):(work|context) -->\n```yaml\n([\s\S]*?)```/g)];
assert.equal(blocks.length, 6);
const examples = Object.fromEntries(['epic', 'mixed', 'human'].map(name => [name,
  Object.fromEntries(blocks.filter(b => b[1] === name).map(b => [b[2], b[3]]))]));
const start = (work, context) => validateWork(work, { mode: 'start', contextInput: context });
const clone = name => ({ work: JSON.parse(JSON.stringify(parseWork(examples[name].work))), context: examples[name].context });
const reports = result => JSON.stringify(result.diagnostics);

test('full writer templates preserve every approved field and nullable alternative without claiming completeness', async () => {
  for (const kind of ['epic', 'ticket']) {
    const text = await read(`references/${kind}.yaml`);
    const approved = await readFile(path.join(root, `docs/architecture/examples/manager-${kind}.yaml`), 'utf8');
    assert.deepEqual(parseWork(text), parseWork(approved));
    const draft = validateWork(text, { mode: 'draft' });
    assert.equal(draft.valid, true);
    assert.equal(draft.start_semantics_valid, null);
    for (const mode of ['structure', 'start']) {
      const options = { mode, ...(mode === 'start' ? { contextInput: examples.human.context } : {}) };
      const result = validateWork(text, options);
      assert.equal(result.valid, false);
      assert.deepEqual(result.diagnostics, validateWork(approved, options).diagnostics);
      assert(result.diagnostics.some(d => d.path === '/problem_to_solve'));
      if (kind === 'ticket') assert(result.diagnostics.some(d => d.path === '/technical_acceptance_criteria/repository/url'));
      assert.equal(result.readiness, 'not_evaluated');
    }
    const missing = parseWork(text); delete missing.problem_to_solve;
    assert(validateWork(stringify(missing), { mode: 'draft' }).diagnostics.some(d => d.path === '/problem_to_solve'));
  }
});

test('all complete documented work/context pairs pass the raw shared CLI without input changes', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pgb-authoring-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [name, pair] of Object.entries(examples)) {
    // Both work and context pass the same strict YAML parser used by the checker.
    const work = parseWork(pair.work), context = parseWork(pair.context);
    assert.equal(context.schema, 'pigboard-work-validation-context/v1');
    for (const field of ['title', 'type', 'key', 'project', 'parent', 'assignee', 'labels', 'status']) assert(!(field in work));
    const input = path.join(dir, `${name}-work.yaml`), facts = path.join(dir, `${name}-context.yaml`);
    await writeFile(input, pair.work); await writeFile(facts, pair.context);
    for (const mode of ['draft', 'structure', 'start']) {
      const p = spawnSync(process.execPath, [path.join(root, 'scripts/validate-work.mjs'), '--mode', mode, '--input', input, ...(mode === 'start' ? ['--context', facts] : []), '--json'], { cwd: dir, encoding: 'utf8', timeout: 30000 });
      assert.equal(p.status, 0, p.stdout + p.stderr);
      const result = JSON.parse(p.stdout);
      assert.equal(result.valid, true); assert.equal(result.readiness, 'not_evaluated');
      if (mode === 'start' && name !== 'epic') {
        assert.equal(result.ledger_budget.ai_steps, name === 'mixed' ? 4 : 0);
        assert.equal(result.ledger_budget.human_cases, 1);
        assert.equal(result.ledger_budget.omitted_entries, 0);
      }
    }
    assert.equal(await readFile(input, 'utf8'), pair.work);
    assert.equal(await readFile(facts, 'utf8'), pair.context);
  }
  const epic = parseWork(examples.epic.work);
  assert.deepEqual(epic.workstreams, [
    { label: 'AI-Example-1', story_order: ['EX-1'] },
    { label: 'AI-Example-2', story_order: ['EX-2'] }
  ].map(v => Object.assign(Object.create(null), v)));
  const mixed = parseWork(examples.mixed.work).testing_strategy;
  assert.deepEqual(mixed.dispatch_order, ['TC-01.S1', 'TC-01.S3', 'TC-01.S4']);
  assert.equal(mixed.cases[0].steps[1].caller, 'TC-01.S1');
  assert.equal(mixed.cases[0].steps[1].skill, 'qa-bruno');
  const human = parseWork(examples.human.work).testing_strategy;
  for (const key of ['cases', 'dispatch_order', 'testing_types']) assert.deepEqual(human[key], []);
  assert(human.human_review.no_ai_cases_reason);
});

test('a prose-only requirement edit preserves IDs/shape and needs no changed operation authority', () => {
  for (const name of ['mixed', 'human']) {
    const { work, context } = clone(name);
    const ids = work.acceptance_criteria.map(c => c.id);
    work.acceptance_criteria[0].requirement += ' Keep the result clear.';
    const result = start(stringify(work), context);
    assert.equal(result.valid, true, reports(result));
    assert.deepEqual(work.acceptance_criteria.map(c => c.id), ids);
  }
  const { work, context } = clone('mixed');
  work.testing_strategy.cases[0].steps[0].action = 'A different operation prescription.';
  const stale = start(stringify(work), context);
  assert.equal(stale.valid, false);
  assert(stale.diagnostics.some(d => d.code === 'CONTEXT_OPERATION'));
});

test('incomplete authoring stays editable and cannot invent readiness or missing trusted inputs', () => {
  const controls = [
    ['/technical_acceptance_criteria/repository/url', w => { w.technical_acceptance_criteria.repository.url = null; }],
    ['/testing_strategy/cases/0/steps/0/skill', w => { w.testing_strategy.cases[0].steps[0].skill = null; }],
    ['/testing_strategy/cases/0/steps/0/expected', w => { w.testing_strategy.cases[0].steps[0].expected = null; }],
    ['/open_questions', w => { w.open_questions = [{ question: 'Which QA engine is approved?', owner: 'Setup owner' }]; }]
  ];
  for (const [field, mutate] of controls) {
    const { work, context } = clone('mixed'); mutate(work);
    const raw = stringify(work);
    assert.equal(validateWork(raw, { mode: 'draft' }).valid, true);
    const result = start(raw, context);
    assert.equal(result.valid, false);
    assert(result.diagnostics.some(d => d.path === field || d.path.startsWith(field + '/')), reports(result));
    assert.equal(result.readiness, 'not_evaluated');
  }
  const unknown = clone('mixed'); unknown.work.testing_strategy.cases[0].steps[0].skill = 'qa-invented';
  assert.equal(validateWork(stringify(unknown.work), { mode: 'draft' }).valid, false);
  const noContext = validateWork(examples.mixed.work, { mode: 'start' });
  assert.equal(noContext.valid, false); assert(noContext.diagnostics.some(d => d.path === '/context'));
  const unauthorized = clone('mixed'); unauthorized.work.technical_acceptance_criteria.repository.url = 'https://example.invalid/other';
  assert(start(stringify(unauthorized.work), unauthorized.context).diagnostics.some(d => d.code === 'TRUSTED_SCOPE'));
});

test('writer retains owned provenance, shared dependencies and generic Task route with structured implementer and QA composer', async () => {
  const skill = await read('SKILL.md');
  for (const required of ['5bef5cf140bd5ea92e6600f0ff2a0be726e4c7ac', '560be8a00c977eb90e13d05e022855eff4175b0e', '../human-writing/SKILL.md', 'final cutting pass', 'documentation-only', 'less than two human working days', '20 files total', 'one repository', 'Provisional — not ready for delivery']) assert(skill.includes(required), required);
  assert(!skill.includes("contract's fixed field labels"));
  const basic = await read('references/basic-workflow-ticket.md');
  assert(basic.includes('Ticket contract: pigboard-story/v1'));
  assert(skill.includes('[structured implementer](../implementer-entrypoint/SKILL.md)'));
  assert(basic.includes("selected release's QA entrypoint"));
  assert(basic.includes('structured reviewer'));
  assert(!basic.includes('unmigrated implementation'));
  assert(basic.includes('separate [structured implementer route]'));
  for (const relative of ['skills/implementer-entrypoint/SKILL.md','skills/implementer-entrypoint/references/handoff.md']) {
    const current=await readFile(path.join(root,relative),'utf8');
    assert(current.includes('structured reviewer'));assert(!current.includes('unmigrated reviewer/QA'));
  }
  for (const relative of ['skills/implementer-entrypoint/references/handoff.md', 'skills/qa-entrypoint/references/execution-record.md', 'config/cursor/automations.md']) {
    const text = await readFile(path.join(root, relative), 'utf8');
    assert(text.includes('write-pr-sized-stories/references/basic-workflow-ticket.md'), relative);
    if (relative.startsWith('skills/qa-entrypoint/')) {
      assert(text.includes('write-pr-sized-stories/references/pigboard-ticket.md'));
      assert(text.includes('full raw work'));
      assert(text.includes('NOT_RUN'));
    } else if (!relative.startsWith('config/')) assert(!text.includes('write-pr-sized-stories/references/pigboard-ticket.md'));
  }
});


test('writer scopes prose and structured-helper compatibility to the selected installed entrypoint', async () => {
  const skill=await read('SKILL.md'),basic=await read('references/basic-workflow-ticket.md');
  assert(skill.includes('../qa-api/references/structured-steps.md'));
  assert(basic.includes('../../qa-api/references/structured-steps.md'));
  assert(basic.includes('basic/historical orchestration examples'));
  assert(basic.includes('prose examples alone cannot invoke them'));
  assert(basic.replace(/\s+/g,' ').includes('selected installed entrypoint'));
  assert(basic.includes('compatible orchestration and publication'));
  const guide=await readFile(path.join(root,'docs/authoring.md'),'utf8');
  assert(guide.includes('selected installed entrypoint owns its input contract'));
  const readable=guide.replace(/\s+/g,' ');
  assert(readable.includes('Do not infer compatible full-loop delivery from valid authoring'));
  assert(readable.includes('or an isolated helper result'));
  for(const relative of ['skills/implementer-entrypoint/references/handoff.md','skills/pigboard-pr-review/references/jira-handoff.md']){
    const recipe=await readFile(path.join(root,relative),'utf8');
    for(const field of ['prepared_inputs','consumers','SHA256','extraction','tenant','pending'])assert(recipe.includes(field),relative+': '+field);
  }
  // All existing examples and raw trusted start checks above remain authoritative;
  // this change adds no schema, acceptance fields or prose-to-structured adapter.
});


test('PGB-138 mirrors the additive native prerequisite without changing release coverage or earlier bodies',async()=>{
  const source=async file=>readFile(path.join(root,file),'utf8');
  const drafts=beforeReadConfiguration(await pre81Capture('ticket-drafts.json'),'drafts');
  const metadata=beforeReadConfiguration(await pre81Capture('plan-metadata.json'),'metadata');
  const publication=beforeReadConfiguration(await pre81Capture('publication.json'),'publication');
  const story=id=>drafts.find(d=>d.id===id),plan=id=>metadata.find(d=>d.id===id),amendment=publication.qa_input_controls_amendment;
  const controls=story('R1-30').contract;
  assert.equal(drafts.length,29);assert.equal(publication.story_count,drafts.length);
  const total=drafts.reduce((n,d)=>n+d.contract.testing_strategy.cases.length+d.contract.testing_strategy.human_review.cases.length,0);
  assert.equal(total,128);assert.equal(publication.case_count,total);
  assert.equal(publication.requirement_count,53);assert.equal(publication.scenario_count,41);
  assert.deepEqual(publication.current_source_scope.pending_source_amendments,['PGB-137']);
  const historical138=publication.history.find(h=>h.story_count===28&&h.case_count===122&&h.scope?.startsWith('PGB-138 source-mapping checkpoint'));
  assert(historical138);assert.equal(historical138.current_source_scope.story_count,28);assert.equal(historical138.current_source_scope.case_count,122);
  assert.deepEqual(historical138.current_source_scope.pending_source_amendments,['PGB-136','PGB-137']);
  assert.equal(publication.current_source_scope.native_snapshot.story_count,30);assert.equal(publication.current_source_scope.native_snapshot.case_count,130);
  assert.equal(publication.stories['R1-30'],'PGB-138');assert.equal(amendment.native_id,'10598');assert(amendment.native_publication_verified);
  assert.equal(amendment.plan_sha256,'54e057ca2bdc36bc0cfb9ba4663b436a834429d7d1cfe02b5811026d315bc593');
  assert.equal(amendment.description_sha256.prerequisite,'0a78de20124a8eecca08dc1a8c39f3434951f60a7b453822964f34b557b79cb0');
  assert.equal(amendment.description_sha256.preparation_before,'42b2b5e0334cc2c520e802b83bb4f6dcf1afa58a59f1650ad13b60fddfbc3ca5');
  assert.equal(amendment.description_sha256.preparation_after,'5284ae68d9f54e809409ed8dd966fa4494c813f57b70ef3c6038a84bdfcbb38a');
  assert(amendment.original_preparation_body_preserved_except_prerequisite);assert.equal(amendment.human_acceptance,'NOT_RUN');assert.equal(amendment.activation_authorized,false);
  const upstream=['R1-04','R1-06','R1-07','PGB-108','R1-24'];assert.deepEqual(plan('R1-30').dependencies,upstream);
  assert.deepEqual(controls.prerequisites,upstream.map(ticket=>({ticket,required_outcome:'ai_qa_complete'})));
  assert.equal(controls.acceptance_criteria.length,3);assert.equal(controls.technical_acceptance_criteria.constraints.length,3);
  assert.deepEqual(controls.testing_strategy.human_review.cases.map(c=>c.id),['R1-30-H01','R1-30-H02','R1-30-H03']);
  for(const field of ['testing_types','cases','dispatch_order'])assert.deepEqual(controls.testing_strategy[field],[]);
  assert(controls.testing_strategy.human_review.no_ai_cases_reason);
  assert.deepEqual(plan('R1-30').hours,{min:8.5,max:12.5});assert.equal(plan('R1-30').files.length,18);assert.equal(plan('R1-27').files.length,12);
  assert.equal(new Set(plan('R1-30').files).size,18);assert(plan('R1-30').files.includes('test/story-authoring.test.mjs'));
  const guides=['docs/authoring.md','skills/implementer-entrypoint/references/handoff.md','skills/pigboard-pr-review/references/jira-handoff.md','skills/qa-api/references/structured-steps.md','skills/write-pr-sized-stories/SKILL.md','skills/write-pr-sized-stories/references/basic-workflow-ticket.md'];
  assert.deepEqual(plan('R1-30').files.filter(f=>!plan('R1-27').files.includes(f)).sort(),guides.sort());
  for(const file of guides){const guide=await source(file);assert(!/full.?51|remaining.?48|I01–I14/.test(guide),file+' must route to selected catalogue');}
  for(const id of ['R1-30','R1-27']){const result=validateWork(JSON.stringify(story(id).contract),{mode:'structure'});assert(result.valid,reports(result));assert.equal(result.readiness,'not_evaluated');}
  const edges=[['PGB-74','PGB-138'],['PGB-76','PGB-138'],['PGB-77','PGB-138'],['PGB-108','PGB-138'],['PGB-110','PGB-138'],['PGB-138','PGB-132']];
  assert.deepEqual(amendment.dependency_links,edges.map(([from,to],i)=>({id:String(10719+i),type_id:'10000',from,to})));
  for(const [from,to]of edges)assert(publication.dependency_links.some(e=>e.from===from&&e.to===to));
  assert(publication.history.some(h=>h.story_count===26&&h.case_count===116));assert(publication.history.some(h=>h.story_count===27&&h.case_count===119));
  const stories=await source('docs/delivery/manager-r1/stories.md');
  assert(stories.indexOf('## R1-24:')<stories.indexOf('## R1-30:'));assert(stories.indexOf('## R1-30:')<stories.indexOf('## R1-27:'));assert(stories.indexOf('## R1-27:')<stories.indexOf('## R1-08:'));
  for(const id of ['R1-30','R1-27'])assert(stories.includes(JSON.stringify(story(id).contract,null,2)));
  const support={H01:['A06','A07','W03','W06','W07'],H02:['A06','A07','W03','W07','W08'],H03:['A08','W06','W08','W11','W12']};
  for(const file of ['docs/product/coverage.md','docs/delivery/manager-r1/coverage.md']){
    const text=await source(file),rows=text.split('\n');
    const requirements=new Set(rows.filter(r=>/^\| [AWMO]\d{2}/.test(r)).flatMap(r=>r.split('|')[1].match(/[AWMO]\d{2}/g)??[]));assert.equal(requirements.size,53,file);
    for(const [human,ids]of Object.entries(support))for(const id of ids)assert(rows.find(r=>r.startsWith('| '+id+' |')).includes('R1-30-'+human),file+': '+id+' '+human);
  }
  const using=await source('docs/using-pigboard.md');for(const variant of ['I01-story','I02-parameters','I11-stale-environment'])assert(using.includes(variant));
  assert(using.includes('DATABASE_PARAMETERS'));assert(using.includes('R1-30-H01/H02/H03'));
});

const readConfigHash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

// Reconcile only the reviewed runtime/catalog split. Every predecessor is a complete object.
const catalogStateKeys=['source_repair_preview_amendment','machine_repair_preview_amendment','current_pr_repair_amendment','duplicate_qa_repair_amendment','readable_repair_preview_amendment','readable_repair_integration_amendment'];
const catalogSourceKeys=['native_source_issue_inspection_amendment','native_observation_repair_amendment','native_target_identity_repair_amendment'];
const catalogReceiptLinks=[{from:'PGB-145',to:'PGB-150',id:'10744',preserved:true},{from:'PGB-150',to:'PGB-147',id:'10745',preserved:true},{from:'PGB-152',to:'PGB-150',id:'10748',preserved:true},{from:'PGB-154',to:'PGB-150',id:'10751',preserved:true},{from:'PGB-145',to:'PGB-155',id:'10752',preserved:false},{from:'PGB-155',to:'PGB-150',id:'10753',preserved:false}];
// Reverse only the named PGB-156 final runtime rebind before the reviewed catalog layers.
function beforeFinalRuntimeRebind(value,kind){
 const prior=structuredClone(value);
 if(kind==='drafts'){
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  assert.equal(prior.length,31);assert(!prior.some(x=>x.id==='R1-41'||x.id==='R1-42'));return prior;
 }
 const expectedBoundary='ad6e348269539dc109e048e9ec1adaf7c2d02b99cfb341c3a604d92257b148d5';
 if(kind==='metadata'){
  assert.equal(readConfigHash(prior),'eb58c13c50f7acfe1610b73abe139703b4c92e312f8034c96d897843f41fe1b1');
  const rows=prior.filter(x=>x.id==='R1-36');assert.equal(rows.length,1);const r=rows[0],a=r.source_catalog_integration;assert(a);
  assert.equal(readConfigHash(a),'9100bfd70281c9b6c1351d7995300aa11a5b1f2d803fc96cfdbf41ab0e328dc3');
  assert.deepEqual(r.hours,{min:9.95,max:14.3});assert.equal(r.days,1.7875);
  assert.equal(a.runtime.commit,'fd5b04eaa2cd7265f4528a8be37beb75ff463254');assert.equal(a.runtime.tree,'879a3382edafc52989446a67d93508a16e44bec5');
  assert.deepEqual(a.runtime.parents,['23bb352b4d9f945f65e34d3d15d28dced51d9b80','0c61e80151ffcc7cb4d319f6048d46357dc650dd']);
  assert.deepEqual(a.whole_hours,{runtime:{min:9.95,max:14.3},catalog:{min:5.45,max:8.65},boundary_repair:{min:5.55,max:9.4}});
  assert.deepEqual(a.source_forecast_days,{min:48.26625,max:51.935});assert.deepEqual(a.source_plus_catalog_days,{min:48.9475,max:53.01625});
  assert.deepEqual(a.known_repair_total_days,{min:49.76,max:54.40375});assert.deepEqual(a.including_boundary_repair_days,{min:50.45375,max:55.57875});
  assert.equal(readConfigHash(a.native_boundary_repair),expectedBoundary);assert.equal(a.native_boundary_repair.native_key,'PGB-156');
  assert.equal(a.native_boundary_repair.receipt_sha256,'05c33a85cbc7f4e3d381fbc354df15b4f4c2324105de863a0a51ec8e4cf1e908');
  assert.deepEqual(a.native_boundary_repair.links.map(x=>[x.id,x.from,x.to]),[['10754','PGB-145','PGB-156'],['10755','PGB-156','PGB-150']]);
  assert.equal(Object.keys(a.native_boundary_repair.changed_artifacts_sha256).length,5);assert.equal(readConfigHash(a.historical23bb),'40770768832a0205576b59ae0fce850c17c9a32ad5e14a7f736ee7f8631c49c0');
  const h=a.historical23bb;r.hours=h.hours;r.days=h.days;r.delivery_state=h.delivery_state;
  a.runtime=h.runtime;a.whole_hours=h.whole_hours;a.source_forecast_days=h.source_forecast_days;a.source_plus_catalog_days=h.source_plus_catalog_days;a.known_repair_total_days=h.known_repair_total_days;
  delete a.including_boundary_repair_days;delete a.native_boundary_repair;delete a.historical23bb;
  assert.equal(readConfigHash(prior),'af020bceb570fb00c5b7632c3262cd048f7c6ea2b72cfa48141d47f80bd92c4d');return prior;
 }
 assert.equal(kind,'publication');assert.equal(readConfigHash(prior),'8624d22abca43b0f9929c7de5df31edbebc1a3e858269677cdae5b0f6fb907ad');
 const a=prior.source_inspection_catalog_integration_amendment;assert(a);assert.equal(readConfigHash(a),'92b3753b354125107f6c62bc56f784aa8b1669a2e28b764c6f967efa94a3fe62');
 assert.equal(readConfigHash(a.native_boundary_repair),expectedBoundary);assert.equal(a.native_boundary_repair.receipt_sha256,'05c33a85cbc7f4e3d381fbc354df15b4f4c2324105de863a0a51ec8e4cf1e908');
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);assert.equal(prior.stories['R1-36'],'PGB-150');assert(!Object.hasOwn(prior.stories,'R1-42'));
 assert.deepEqual(prior.current_source_scope.pending_source_amendments.at(-1),'PGB-156');assert.equal(prior.current_source_scope.pending_source_dependencies.at(-1).native_link_id,'10755');
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.26625,max:51.935});assert.deepEqual(a.including_boundary_repair_days,{min:50.45375,max:55.57875});
 assert.deepEqual(a.whole_hours,{runtime:{min:9.95,max:14.3},catalog:{min:5.45,max:8.65},boundary_repair:{min:5.55,max:9.4}});
 assert.equal(readConfigHash(a.historical23bb),'4624d7d8e719b2ddb8e40b69101d013080455569fb2ce78759ff6d427ddf31ca');
 const h=a.historical23bb;prior.status=h.status;prior.current_source_scope=h.current_source_scope;
 a.runtime=h.runtime;a.current_source_status=h.status;a.source_forecast_days=h.source_forecast_days;a.source_plus_catalog_days=h.source_plus_catalog_days;a.known_repair_total_days=h.known_repair_total_days;a.whole_hours=h.whole_hours;a.human=h.human;a.pending_source_dependencies=h.pending_source_dependencies;
 delete a.including_boundary_repair_days;delete a.native_boundary_repair;delete a.historical23bb;
 assert.equal(readConfigHash(prior),'a5d3adc6dc53cf4640b8887b2955fff11e88142ef3e1f9a5597dfee0efe9bddd');return prior;
}

const catalogCurrentKeys=["date","epic","grooming","status","stories","operational_tasks","story_count","case_count","requirement_count","scenario_count","dependency_links","baseline_publication","follow_on_tasks","health_precedence_correction","baseline_design_commit","reviewed_design_artifacts","startup_alarm_correction","history","qa_split","repeated_parent_amendment","current_source_scope","baseline_before_amendments","current_proof_conflict_amendment","qa_input_preparation_amendment","qa_input_controls_amendment","own_ticket_selection_amendment","read_configuration_amendment","native_source_issue_inspection_amendment","native_observation_repair_amendment","native_target_identity_repair_amendment","source_repair_preview_amendment","machine_repair_preview_amendment","current_pr_repair_amendment","duplicate_qa_repair_amendment","readable_repair_preview_amendment","readable_repair_integration_amendment","source_inspection_catalog_integration_amendment"];
function beforeCatalogIntegration(value,kind){
 const prior=structuredClone(value);
 if(kind==='drafts'){
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  assert.equal(prior.length,31);assert(!prior.some(x=>x.id==='R1-41'));return prior;
 }
 if(kind==='metadata'){
  assert.equal(readConfigHash(prior),'af020bceb570fb00c5b7632c3262cd048f7c6ea2b72cfa48141d47f80bd92c4d');
  const rows=prior.filter(x=>x.id==='R1-36');assert.equal(rows.length,1);const r=rows[0],a=r.source_catalog_integration;assert(a);
  assert.deepEqual(r.hours,{min:9.7,max:13.85});assert.equal(r.days,1.73125);
  assert.equal(a.plan_sha256,'64089b7feb21d36a4ed2fce8d2923c98d2475c6b27d433d92833dc1ee5ccd9e1');
  assert.deepEqual(a.whole_hours,{runtime:{min:9.7,max:13.85},catalog:{min:5,max:7.85}});
  assert.deepEqual(a.source_forecast_days,{min:48.235,max:51.87875});assert.deepEqual(a.source_plus_catalog_days,{min:48.86,max:52.86});
  assert.deepEqual(a.known_repair_total_days,{min:49.6725,max:54.2475});
  assert.deepEqual(a.native_catalog.source_id,'R1-41');assert.deepEqual(a.native_catalog.native_key,'PGB-155');
  assert.equal(a.native_catalog.receipt_sha256,'bb881eb154977a84b49b758fe6d4b42d109831dc153a14bc6bdd416e6cda2dd2');
  assert.deepEqual(a.native_catalog.links,catalogReceiptLinks);assert.equal(a.native_catalog.source_composed,false);
  assert.equal(a.runtime_paths.length,8);assert.equal(a.catalog_paths.length,10);assert.equal(a.final_parent_union_paths.length,18);
  assert.deepEqual([...new Set([...a.runtime_paths,...a.catalog_paths])].sort(),[...r.files].sort());
  assert.deepEqual(a.historical449.hours,{min:11.25,max:15.7});assert.equal(a.historical449.days,1.9625);
  r.hours=a.historical449.hours;r.days=a.historical449.days;r.delivery_state=a.historical449.delivery_state;delete r.source_catalog_integration;
  assert.equal(readConfigHash(prior),'163c5a517dfa878043db4db2e209e7e69e7da37a0015d87574bf06a45e14e54c');return prior;
 }
 assert.equal(kind,'publication');assert.equal(readConfigHash(prior),'a5d3adc6dc53cf4640b8887b2955fff11e88142ef3e1f9a5597dfee0efe9bddd');
 assert.deepEqual(Object.keys(prior),catalogCurrentKeys);const a=prior.source_inspection_catalog_integration_amendment;assert(a);
 assert.equal(readConfigHash(a),'3be54e0d258212aa0dea0bda8fb46092a15efb008bd622f787121ef0db3b6541');
 assert.equal(a.plan_sha256,'64089b7feb21d36a4ed2fce8d2923c98d2475c6b27d433d92833dc1ee5ccd9e1');
 assert.deepEqual([a.runtime.commit,a.runtime.actual_state_main,a.runtime.actual_state_main_tree,a.runtime.same_tree],['23bb352b4d9f945f65e34d3d15d28dced51d9b80','a17841ee3e9e1a08a0ad3c322ae98fbff1cb41a9','de9fbb160b016fefcac70424761fa9905520cb58',true]);
 assert.equal(a.runtime.tree,'8ba753f6ab12405e87d03ce5eda30bcd4876535f');
 assert.equal(a.predecessor_publications.source449.json_sha256,'5919293a6640bd5952577f3a21793089fba7087fcbe80d4e4a5aa4dffbdad116');
 assert.equal(a.predecessor_publications.state_main.json_sha256,'549c5f4913e4be75a72c16e0f985dcc534b01c7b1cc40901d744f61f9af8c8a6');
 assert.deepEqual(Object.keys(a.amendment_hashes.source),catalogSourceKeys);assert.deepEqual(Object.keys(a.amendment_hashes.state),catalogStateKeys);
 for(const k of catalogSourceKeys)assert.equal(readConfigHash(prior[k]),a.amendment_hashes.source[k],k);
 for(const k of catalogStateKeys)assert.equal(readConfigHash(prior[k]),a.amendment_hashes.state[k].json_sha256,k);
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);
 assert.equal(prior.status,a.current_source_status);assert.equal(prior.current_source_scope.status,a.current_source_status);
 assert.deepEqual(a.counts,{stories:31,human_groups:136,requirements:53,scenarios:41});
 assert.deepEqual(prior.current_source_scope.pending_source_amendments,['PGB-137','PGB-146','PGB-147','PGB-148','PGB-149','PGB-152','PGB-154','PGB-151','PGB-153','PGB-155']);
 assert.deepEqual(prior.current_source_scope.pending_source_dependencies.at(-1),a.pending_source_dependencies[0]);
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.235,max:51.87875});
 assert.deepEqual(a.source_plus_catalog_days,{min:48.86,max:52.86});assert.deepEqual(a.known_repair_total_days,{min:49.6725,max:54.2475});
 assert.deepEqual(a.catalog.links,catalogReceiptLinks);assert.deepEqual(a.packet,{variants:35,controls:8,private_projection:1});assert.equal(a.paths.runtime.length,8);assert.equal(a.paths.catalog.length,10);assert.equal(a.paths.final_parent_union.length,18);
 assert.equal(new Set([...a.paths.runtime,...a.paths.catalog]).size,18);
 assert.deepEqual([a.human.p150,a.human.p152,a.human.p154,a.human.p155],Array(4).fill('NOT_RUN (0/4)').map((x,i)=>['NOT_RUN (0/4)','NOT_RUN (0/2)','NOT_RUN (0/1)','NOT_RUN (0/1)'][i]));
 assert.equal(a.verification.activation_authorized,false);
 for(const k of catalogStateKeys)delete prior[k];delete prior.source_inspection_catalog_integration_amendment;
 prior.status=a.historical449.status;prior.story_count=a.historical449.story_count;prior.case_count=a.historical449.case_count;
 prior.current_source_scope=a.historical449.current_source_scope;
 assert.equal(readConfigHash(prior),'5919293a6640bd5952577f3a21793089fba7087fcbe80d4e4a5aa4dffbdad116');return prior;
}
function stateCheckpoint(value,kind){
 const state=kind==='publication'?Object.fromEntries(catalogStateKeys.map(k=>[k,structuredClone(value[k])])):null;
 const prior=beforeSourceIssueInspection(value,kind);
 if(kind==='publication'){
  for(const k of catalogStateKeys)prior[k]=state[k];
  assert.equal(readConfigHash(prior),'549c5f4913e4be75a72c16e0f985dcc534b01c7b1cc40901d744f61f9af8c8a6');
  assert.equal(createHash('sha256').update(canonicalize(prior)).digest('hex'),'7e999933eba22d8c7109df7a23aaae4715a60a97fc9abb6ea96ef6f53f887a7b');
 }else assert.equal(readConfigHash(prior),kind==='drafts'?'2346cacf0b501580a2f9284d49068a82926c0b04ee9f5e74e0c1bc50104f8f62':'47ee11ec184c11874371e80cfe78653ac933c963d62199b88ae002a0c2d5a088');
 return prior;
}

// Assert and reverse only the verified native-only R1-40 repair before the unchanged R1-38 and source-history guards.
function beforeNativeTargetIdentityRepair(value,kind) {
 const prior=beforeCatalogIntegration(beforeFinalRuntimeRebind(value,kind),kind);
 if(kind==='drafts') {
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  assert(!prior.some(x=>x.id==='R1-40'));return prior;
 }
 if(kind==='metadata') {
  assert.equal(readConfigHash(prior),'163c5a517dfa878043db4db2e209e7e69e7da37a0015d87574bf06a45e14e54c');
  const rows=prior.filter(x=>x.id==='R1-36');assert.equal(rows.length,1);const story=rows[0],a=story.native_target_identity_repair;assert(a);
  assert.equal(readConfigHash(a),'7bbac5ed143e0e846c9d607736298754bd3632385902eb35b63a1eebbf2a9f22');
  assert.deepEqual([a.source_id,a.native_key,a.native_id,a.parent,a.source_composed],['R1-40','PGB-154','10614','PGB-66',false]);
  assert.equal(a.reviewed_plan_sha256,'a479bb57472cabb565e34133fdecdc9923396223c1ba7db909c267b58f68bf8b');
  assert.equal(a.receipt_sha256,'be2202f8398ef5f511a11afd4209f2ae083cbed4121d3e35f619c84521867d8a');
  assert.deepEqual([a.native_prerequisite.link_id,a.native_child_to_feature.link_id],['10750','10751']);
  assert.deepEqual(a.verified_parent_body_sha256,{before:'5aa49be36a16b0bc8077796aa62033c6a1793018a830653e9e077f249d252ea9',after:'758552ba1ff16df8570e751ca7ef303e247cb5598d0835adb3c89ccc7646937b'});
  assert.deepEqual([a.pinned_feature_revision,a.pinned_feature_tree],['1524127c6d9ffbad8481cf7ce86bcc19cb712f52','b35fa3cb57dbdd133d61f76f6b6d1ba19ebb43a2']);
  assert.deepEqual(a.changed_files,['lib/jira/read.mjs','test/jira-read.test.mjs','docs/manager-preview.md','docs/delivery/manager-r1/README.md','docs/delivery/manager-r1/plan-metadata.json','docs/delivery/manager-r1/publication.json','test/story-authoring.test.mjs','test/qa-helper-contract.test.mjs']);
  assert.equal(a.changed_file_count,8);assert.equal(new Set(a.changed_files).size,8);assert.deepEqual(a.child_hours,{min:3,max:5.1});assert.deepEqual(a.child_days,{min:0.375,max:0.6375});
  assert.deepEqual(a.child_human_groups,{count:1,status:'NOT_RUN'});assert.deepEqual(a.source_counts,{stories:31,human_groups:136,requirements:53,scenarios:41});
  assert.deepEqual(a.source_forecast_days,{min:48.42875,max:52.11});assert.deepEqual(a.historical152_delivery_forecast_days,{min:48.86625,max:52.86});assert.deepEqual(a.current_delivery_forecast_days,{min:49.24125,max:53.4975});
  assert.equal(readConfigHash(story.delivery_state),'814d9fe0a1b515e87a978ef16d3ae80c443baff732d85f5738e4c065e67eec9c');
  assert.equal(readConfigHash(a.historical_parent.delivery_state),'ae47ae3d15c37da54fc083efac4df17e72dd26b06ffb3231a8717d87dcc32e6e');
  assert.equal(readConfigHash(story.native_observation_repair),'683a1a5ff5cdcd8f5ac3eef9ace2f61ed080496b3b213f27708cdd7b8fb62012');
  story.delivery_state=a.historical_parent.delivery_state;delete story.native_target_identity_repair;
  assert.equal(readConfigHash(prior),'349721b5858c1fbb3494371c3c41ac8a464e3a463c435245558f7636759c9c67');return prior;
 }
 assert.equal(kind,'publication');assert.equal(readConfigHash(prior),'5919293a6640bd5952577f3a21793089fba7087fcbe80d4e4a5aa4dffbdad116');
 assert.equal(readConfigHash(prior.status),'958477720aa43c0814539a4158e6e207673c698280cada83296e260fb36e0487');
 assert.equal(readConfigHash(prior.current_source_scope.status),'958477720aa43c0814539a4158e6e207673c698280cada83296e260fb36e0487');
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);assert(!Object.hasOwn(prior.stories,'R1-40'));
 const a=prior.native_target_identity_repair_amendment;assert(a);assert.equal(readConfigHash(a),'841ed253700348ceb1a572ec7a5a379f9ded8e15a04ebcdc238af421e8dfdb48');
 assert.deepEqual([a.source_id,a.native_key,a.native_id,a.parent],['R1-40','PGB-154','10614','PGB-66']);assert.deepEqual(a.source_composed,[]);assert.deepEqual(a.source_counts,{stories:31,human_groups:136,requirements:53,scenarios:41});
 assert.equal(a.reviewed_plan_sha256,'a479bb57472cabb565e34133fdecdc9923396223c1ba7db909c267b58f68bf8b');assert.equal(a.receipt_sha256,'be2202f8398ef5f511a11afd4209f2ae083cbed4121d3e35f619c84521867d8a');
 assert.deepEqual(a.parent_body_sha256,{before:'5aa49be36a16b0bc8077796aa62033c6a1793018a830653e9e077f249d252ea9',after:'758552ba1ff16df8570e751ca7ef303e247cb5598d0835adb3c89ccc7646937b'});assert.equal(a.parent_contract_preserved_except_child_prerequisite,true);
 assert.deepEqual(a.native_links.map(x=>[x.from,x.to,x.id]),[['PGB-145','PGB-150','10744'],['PGB-150','PGB-147','10745'],['PGB-152','PGB-150','10748'],['PGB-145','PGB-154','10750'],['PGB-154','PGB-150','10751']]);
 assert.deepEqual(a.child_hours,{min:3,max:5.1});assert.deepEqual(a.child_days,{min:0.375,max:0.6375});assert.equal(a.child_changed_files.length,8);assert.deepEqual(a.child_human_groups,{count:1,status:'NOT_RUN'});
 const pending={source_id:'R1-36',native_key:'PGB-150',prerequisite_source_id:'R1-40',prerequisite_native_key:'PGB-154',required_outcome:'ai_qa_complete',native_link_id:'10751',status:'native_verified_source_pending'};
 assert.deepEqual(prior.current_source_scope.pending_source_amendments,['PGB-137','PGB-146','PGB-147','PGB-148','PGB-149','PGB-152','PGB-154']);
 assert.deepEqual(prior.current_source_scope.pending_source_dependencies.at(-1),pending);assert.equal(prior.current_source_scope.pending_source_dependencies.length,4);assert.deepEqual(a.pending_source_dependency,pending);
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.42875,max:52.11});assert.deepEqual(a.source_forecast_days,prior.current_source_scope.forecast_days);
 assert.deepEqual(a.historical152_delivery_forecast_days,{min:48.86625,max:52.86});assert.deepEqual(a.current_delivery_forecast_days,{min:49.24125,max:53.4975});
 assert.equal(Number((48.42875+3.5/8+3/8).toFixed(5)),49.24125);assert.equal(Number((52.11+6/8+5.1/8).toFixed(5)),53.4975);
 assert.equal(readConfigHash(a.historical_parent.status),'6818d30efc77711a9a30184178c893391c6e09cadc03ae56c00b1d2236f80f5b');
 assert.equal(readConfigHash(a.historical_parent.current_source_scope_status),'6818d30efc77711a9a30184178c893391c6e09cadc03ae56c00b1d2236f80f5b');
 assert.equal(readConfigHash(prior.native_observation_repair_amendment),'de763f9470c3feb256bfb07acbe89395b83b81b2c8c731b2807937b7c7803cd9');
 prior.current_source_scope.pending_source_amendments.pop();prior.current_source_scope.pending_source_dependencies.pop();prior.status=a.historical_parent.status;prior.current_source_scope.status=a.historical_parent.current_source_scope_status;delete prior.native_target_identity_repair_amendment;
 assert.equal(readConfigHash(prior),'803a89019366f32951d2be2e34fb237c5977a3526f6101daeb6a1f4bc7584081');return prior;
}

// Assert and reverse the verified native-only R1-38 repair before the unchanged source/history guards.
function beforeNativeObservationRepair(value,kind) {
 const prior=beforeNativeTargetIdentityRepair(value,kind);
 if(kind==='drafts') {
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  assert(!prior.some(x=>x.id==='R1-38'));return prior;
 }
 if(kind==='metadata') {
  assert.equal(readConfigHash(prior),'349721b5858c1fbb3494371c3c41ac8a464e3a463c435245558f7636759c9c67');
  const r=prior.filter(x=>x.id==='R1-36');assert.equal(r.length,1);const story=r[0],a=story.native_observation_repair;assert(a);
  assert.equal(readConfigHash(a),'683a1a5ff5cdcd8f5ac3eef9ace2f61ed080496b3b213f27708cdd7b8fb62012');
  assert.deepEqual([a.source_id,a.native_key,a.native_id,a.parent,a.source_composed],['R1-38','PGB-152','10612','PGB-66',false]);
  assert.deepEqual([a.native_prerequisite.link_id,a.native_child_to_feature.link_id],['10747','10748']);
  assert.deepEqual(a.verified_parent_body_sha256,{before:'afdea52dc57999eea105106f57fc540ba10f25c6318832237aba9d5ed9450c94',after:'5aa49be36a16b0bc8077796aa62033c6a1793018a830653e9e077f249d252ea9'});
  assert.equal(a.reviewed_plan_sha256,'53ed8317173824d822e2c55f3030837f1ac1e02785228d4470e0bff4b26a789c');assert.equal(a.receipt_sha256,'4879f236fe516d8d5fe31e93da48d7be6f3ea1f522301bd3b26e6cd6b4a2b8ae');
  assert.deepEqual(a.changed_files,['lib/jira/read.mjs','test/jira-read.test.mjs','docs/manager-preview.md','docs/delivery/manager-r1/README.md','docs/delivery/manager-r1/plan-metadata.json','docs/delivery/manager-r1/publication.json','test/story-authoring.test.mjs','test/qa-helper-contract.test.mjs']);
  assert.equal(a.changed_file_count,8);assert.equal(new Set(a.changed_files).size,8);assert.deepEqual(a.child_hours,{min:3.5,max:6});assert.deepEqual(a.child_days,{min:0.4375,max:0.75});
  assert.deepEqual(story.hours,{min:11.25,max:15.7});assert.equal(story.days,1.9625);assert.equal(readConfigHash(story.delivery_state),'ae47ae3d15c37da54fc083efac4df17e72dd26b06ffb3231a8717d87dcc32e6e');
  assert.deepEqual(a.current_source_forecast_days,{min:48.42875,max:52.11});assert.deepEqual(a.current_delivery_forecast_days,{min:48.86625,max:52.86});
  assert.equal(a.historical95.revision,'95c711999b90b20842dfd172f7966f73c8cfde34');assert.equal(a.historical95.tree,'63632cbb9b184c0cc7af3b833d35ce043190b185');
  assert.deepEqual(a.historical95.hours,{min:10.85,max:15});assert.equal(a.historical95.days,1.875);assert.equal(readConfigHash(a.historical95.delivery_state),'2c71d86620a6393593857ff8e9c64813ced56b3e20757eaf50ab6e4941b5fef5');
  assert.deepEqual(a.historical95.source_forecast_days,{min:48.37875,max:52.0225});assert.deepEqual(a.historical95.native_source_forecast_days,{base_min:47.0225,base_max:50.1475,added_min:1.35625,added_max:1.875,current_min:48.37875,current_max:52.0225});
  assert.deepEqual(story.dependencies,['R1-31']);assert.equal(story.files.length,18);assert.equal(story.plan_sha256,'5f94612e3ae7d77210daba67361cef2ef3e8cb3fcf662156d74d825b648c1e47');
  story.hours=a.historical95.hours;story.days=a.historical95.days;story.delivery_state=a.historical95.delivery_state;delete story.native_observation_repair;
  assert.equal(readConfigHash(prior),'c0acb72e06de6270229fe4e3d534a89166bd142f854b216c0992e0402b292c20');return prior;
 }
 assert.equal(kind,'publication');assert.equal(readConfigHash(prior),'803a89019366f32951d2be2e34fb237c5977a3526f6101daeb6a1f4bc7584081');
 assert.equal(readConfigHash(prior.status),'6818d30efc77711a9a30184178c893391c6e09cadc03ae56c00b1d2236f80f5b');
 assert.equal(readConfigHash(prior.current_source_scope.status),'6818d30efc77711a9a30184178c893391c6e09cadc03ae56c00b1d2236f80f5b');
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);assert.equal(prior.stories['R1-36'],'PGB-150');assert(!Object.hasOwn(prior.stories,'R1-38'));
 const a=prior.native_observation_repair_amendment;assert(a);assert.equal(readConfigHash(a),'de763f9470c3feb256bfb07acbe89395b83b81b2c8c731b2807937b7c7803cd9');
 assert.equal(readConfigHash(a.historical95.status),'a07a1b9bc0d41b8c55e0992fb7515e311538d35f3149ecea3a70ec1b7f15b750');
 assert.equal(readConfigHash(a.historical95.current_source_scope_status),'a07a1b9bc0d41b8c55e0992fb7515e311538d35f3149ecea3a70ec1b7f15b750');
 assert.deepEqual([a.source_id,a.native_key,a.native_id,a.parent],['R1-38','PGB-152','10612','PGB-66']);assert.deepEqual(a.source_composed,[]);assert.deepEqual(a.source_counts,{stories:31,human_groups:136,requirements:53,scenarios:41});
 assert.equal(a.reviewed_plan_sha256,'53ed8317173824d822e2c55f3030837f1ac1e02785228d4470e0bff4b26a789c');assert.equal(a.receipt_sha256,'4879f236fe516d8d5fe31e93da48d7be6f3ea1f522301bd3b26e6cd6b4a2b8ae');
 assert.deepEqual(a.parent_body_sha256,{before:'afdea52dc57999eea105106f57fc540ba10f25c6318832237aba9d5ed9450c94',after:'5aa49be36a16b0bc8077796aa62033c6a1793018a830653e9e077f249d252ea9'});
 assert.deepEqual(a.native_links.map(x=>[x.from,x.to,x.id]),[['PGB-145','PGB-150','10744'],['PGB-150','PGB-147','10745'],['PGB-145','PGB-152','10747'],['PGB-152','PGB-150','10748']]);
 assert.deepEqual(a.child_hours,{min:3.5,max:6});assert.deepEqual(a.child_days,{min:0.4375,max:0.75});assert.equal(a.child_changed_files.length,8);assert.deepEqual(a.child_human_groups,{count:2,status:'NOT_RUN'});
 const pending={source_id:'R1-36',native_key:'PGB-150',prerequisite_source_id:'R1-38',prerequisite_native_key:'PGB-152',required_outcome:'ai_qa_complete',native_link_id:'10748',status:'native_verified_source_pending'};
 assert.deepEqual(prior.current_source_scope.pending_source_amendments,['PGB-137','PGB-146','PGB-147','PGB-148','PGB-149','PGB-152']);
 assert.deepEqual(prior.current_source_scope.pending_source_dependencies.at(-1),pending);assert.equal(prior.current_source_scope.pending_source_dependencies.length,3);assert.deepEqual(a.pending_source_dependency,pending);
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.42875,max:52.11});assert.deepEqual(prior.native_source_issue_inspection_amendment.forecast_days,{base_min:47.0225,base_max:50.1475,added_min:1.40625,added_max:1.9625,current_min:48.42875,current_max:52.11});
 assert.deepEqual(a.source_forecast_days,prior.current_source_scope.forecast_days);assert.deepEqual(a.current_delivery_forecast_days,{min:48.86625,max:52.86});
 assert.equal(Number((47.0225+11.25/8).toFixed(5)),48.42875);assert.equal(Number((50.1475+15.7/8).toFixed(5)),52.11);assert.equal(Number((48.42875+3.5/8).toFixed(5)),48.86625);assert.equal(Number((52.11+6/8).toFixed(5)),52.86);
 assert.deepEqual(a.historical95.metadata.hours,{min:10.85,max:15});assert.equal(a.historical95.metadata.days,1.875);assert.equal(readConfigHash(a.historical95.metadata.delivery_state),'2c71d86620a6393593857ff8e9c64813ced56b3e20757eaf50ab6e4941b5fef5');
 assert.deepEqual(a.historical95.source_forecast_days,{min:48.37875,max:52.0225});assert.deepEqual(a.historical95.native_source_forecast_days,{base_min:47.0225,base_max:50.1475,added_min:1.35625,added_max:1.875,current_min:48.37875,current_max:52.0225});
 prior.current_source_scope.pending_source_amendments.pop();prior.current_source_scope.pending_source_dependencies.pop();prior.current_source_scope.forecast_days=a.historical95.source_forecast_days;prior.native_source_issue_inspection_amendment.forecast_days=a.historical95.native_source_forecast_days;prior.status=a.historical95.status;prior.current_source_scope.status=a.historical95.current_source_scope_status;delete prior.native_observation_repair_amendment;
 assert.equal(readConfigHash(prior),'2905e297fb57297a652f9fbc1eee8a4a4b319b74430adab5e01e319a6e2072b7');return prior;
}

// Assert and reverse only R1-36 before exercising the unchanged historical guards.
function beforeSourceIssueInspection(value,kind) {
 const prior=beforeNativeObservationRepair(value,kind);
 if(kind==='drafts') {
  assert.equal(readConfigHash(prior),'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
  const added=prior.filter(x=>x.id==='R1-36');assert.equal(added.length,1);
  assert.equal(readConfigHash(added[0]),'edd0ee2f2be6bcee256fddff8b8f39de729115a88684c69990fa42ec643c94ed');
  assert.equal(readConfigHash(added[0].contract),'8694885ffd4d05bd7aec9a7f951aa99a4bf3d9ab4d2465a6081a20f2a6e839e3');
  assert.deepEqual(added[0].contract.prerequisites,[{ticket:'R1-31',required_outcome:'ai_qa_complete'}]);
  assert.deepEqual([added[0].contract.acceptance_criteria.length,added[0].contract.technical_acceptance_criteria.constraints.length,added[0].contract.testing_strategy.human_review.cases.length,added[0].contract.testing_strategy.cases.length],[5,4,4,0]);
  assert.deepEqual(added[0].contract.testing_strategy.human_review.cases.map(x=>x.id),['R1-36-H01','R1-36-H02','R1-36-H03','R1-36-H04']);
  assert.equal(prior[prior.findIndex(x=>x.id==='R1-31')+1].id,'R1-36');
  const result=prior.filter(x=>x.id!=='R1-36');assert.equal(readConfigHash(result),'2346cacf0b501580a2f9284d49068a82926c0b04ee9f5e74e0c1bc50104f8f62');return result;
 }
 if(kind==='metadata') {
  assert.equal(readConfigHash(prior),'c0acb72e06de6270229fe4e3d534a89166bd142f854b216c0992e0402b292c20');
  const added=prior.filter(x=>x.id==='R1-36');assert.equal(added.length,1);
  assert.deepEqual(added[0].dependencies,['R1-31']);assert.deepEqual(added[0].hours,{min:10.85,max:15});assert.equal(added[0].days,1.875);
  assert.deepEqual(added[0].files,['lib/jira/read.mjs','test/jira-read.test.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json','docs/manager-preview.md','README.md','ARCHITECTURE.md','docs/delivery/manager-r1/stories.md','docs/delivery/manager-r1/README.md','docs/delivery/manager-r1/coverage.md','docs/delivery/manager-r1/plan-metadata.json','docs/delivery/manager-r1/publication.json','docs/delivery/manager-r1/ticket-drafts.json','docs/product/README.md','docs/product/coverage.md','test/story-authoring.test.mjs','test/qa-helper-contract.test.mjs']);
  assert.equal(added[0].files.length,18);assert.equal(new Set(added[0].files).size,18);assert.equal(prior[prior.findIndex(x=>x.id==='R1-31')+1].id,'R1-36');
  const result=prior.filter(x=>x.id!=='R1-36');assert.equal(readConfigHash(result),'47ee11ec184c11874371e80cfe78653ac933c963d62199b88ae002a0c2d5a088');return result;
 }
 assert.equal(readConfigHash(prior),'2905e297fb57297a652f9fbc1eee8a4a4b319b74430adab5e01e319a6e2072b7');
 assert.deepEqual([prior.story_count,prior.case_count,prior.requirement_count,prior.scenario_count],[31,136,53,41]);
 assert.equal(prior.stories['R1-36'],'PGB-150');assert.equal(Object.keys(prior.stories).length,31);
 const a=prior.native_source_issue_inspection_amendment;assert(a);assert.deepEqual(a.source_composed,['R1-36']);
 assert.deepEqual([a.native_id,a.parent,a.receipt_sha256,a.plan_sha256],['10610','PGB-66','93029aad4c561c70072d96eb542780a72540bd69ba172650325885149f0b226a','5f94612e3ae7d77210daba67361cef2ef3e8cb3fcf662156d74d825b648c1e47']);
 assert.equal(a.source_contract_sha256,'edd0ee2f2be6bcee256fddff8b8f39de729115a88684c69990fa42ec643c94ed');assert.equal(a.current_drafts_sha256,'eb14a9bbd25c649d209e2743e869ed613745f84db6e5629252b4d3abea92d653');
 assert.deepEqual(a.description_sha256,{source:'afdea52dc57999eea105106f57fc540ba10f25c6318832237aba9d5ed9450c94',amended147:'1b1f744f9ba73466a814315896bcb68d64bf10495edfc4d623408828ea0e8ee6'});
 assert.deepEqual(a.dependency_links.map(x=>[x.id,x.from,x.to]),[['10735','PGB-145','PGB-147'],['10736','PGB-147','PGB-148'],['10737','PGB-148','PGB-82'],['10744','PGB-145','PGB-150'],['10745','PGB-150','PGB-147']]);
 assert.deepEqual(prior.dependency_links.filter(x=>x.id==='10744'),[{id:'10744',type_id:'10000',from:'PGB-145',to:'PGB-150'}]);
 assert.deepEqual(prior.current_source_scope.pending_source_amendments,['PGB-137','PGB-146','PGB-147','PGB-148','PGB-149']);
 assert.deepEqual(prior.current_source_scope.pending_source_dependencies,[{source_id:'R1-33',native_key:'PGB-147',prerequisite_source_id:'R1-36',prerequisite_native_key:'PGB-150',required_outcome:'ai_qa_complete',native_link_id:'10745',status:'native_verified_source_pending'},{source_id:'R1-12',native_key:'PGB-82',prerequisite_source_id:'R1-34',prerequisite_native_key:'PGB-148',required_outcome:'ai_qa_complete',native_link_id:'10737',status:'native_verified_source_pending'}]);
 assert.deepEqual(prior.current_source_scope.forecast_days,{min:48.37875,max:52.0225});
 assert.equal(Number((47.0225+10.85/8).toFixed(5)),48.37875);assert.equal(Number((50.1475+15/8).toFixed(5)),52.0225);
 assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);assert.equal(a.original82_source_unchanged,true);assert.equal(a.original82_cases,4);
 assert.deepEqual(a.historical_native_snapshots.map(x=>[x.story_count,x.case_count]),[[31,134],[34,144]]);
 assert.equal(prior.current_source_scope.prior_source_scope.story_count,30);assert.equal(prior.current_source_scope.prior_source_scope.case_count,132);
 prior.status=prior.current_source_scope.prior_source_scope.status;prior.current_source_scope=prior.current_source_scope.prior_source_scope;
 delete prior.native_source_issue_inspection_amendment;delete prior.stories['R1-36'];prior.story_count=30;prior.case_count=132;
 prior.dependency_links=prior.dependency_links.filter(x=>x.id!=='10744');
 assert.equal(readConfigHash(prior),'edf9a584ffb7e9bdbc6fe1fa494aa7883bf6834af21d5427aab683af8f2ba132');return prior;
}

// Reverse only the asserted PGB-145 additive amendment for dated historical guards.
function beforeReadConfiguration(value,kind) {
 const prior=beforeSourceIssueInspection(value,kind);
 if(kind==='drafts') {
  const added=prior.filter(x=>x.id==='R1-31');assert.equal(added.length,1);
  assert.equal(readConfigHash(added[0]),'c8edf2b1a30c246b6010c8427c5253f66dcd2b43579509f17e758e3b6cf17a81');
  const dependent=prior.find(x=>x.id==='R1-12').contract;
  assert.deepEqual(dependent.prerequisites,[{ticket:'R1-11',required_outcome:'ai_qa_complete'},{ticket:'R1-21',required_outcome:'ai_qa_complete'},{ticket:'R1-31',required_outcome:'ai_qa_complete'}]);
  dependent.prerequisites.pop();return prior.filter(x=>x.id!=='R1-31');
 }
 if(kind==='metadata') {
  assert.equal(prior.filter(x=>x.id==='R1-31').length,1);
  const dependent=prior.find(x=>x.id==='R1-12');assert.deepEqual(dependent.dependencies,['R1-11','R1-21','R1-31']);dependent.dependencies.pop();return prior.filter(x=>x.id!=='R1-31');
 }
 assert.equal(prior.stories['R1-31'],'PGB-145');assert.deepEqual([prior.story_count,prior.case_count],[30,132]);
 const dated=prior.history.find(x=>x.scope==='Pre-PGB-145 e54 dated partial source checkpoint');assert(dated);assert.deepEqual([dated.story_count,dated.case_count],[29,128]);
 delete prior.stories['R1-31'];prior.story_count=dated.story_count;prior.case_count=dated.case_count;prior.current_source_scope=dated.current_source_scope;return prior;
}

test('PGB-145 current source independently binds the complete published amendment and retained original82 contract',async()=>{
 const load=async name=>pre81Capture(name);
 const drafts=beforeSourceIssueInspection(await load('ticket-drafts.json'),'drafts'),metadata=beforeSourceIssueInspection(await load('plan-metadata.json'),'metadata'),p=beforeSourceIssueInspection(await load('publication.json'),'publication'),a=p.read_configuration_amendment;
 assert.equal(drafts.length,30);assert.equal(new Set(drafts.map(x=>x.id)).size,30);assert.deepEqual(drafts.map(x=>x.id),metadata.map(x=>x.id));assert.equal(drafts[drafts.findIndex(x=>x.id==='R1-21')+1].id,'R1-31');
 assert.equal(readConfigHash(drafts),'2346cacf0b501580a2f9284d49068a82926c0b04ee9f5e74e0c1bc50104f8f62');assert.equal(a.current_drafts_sha256,readConfigHash(drafts));
 const story=drafts.find(x=>x.id==='R1-31'),plan=metadata.find(x=>x.id==='R1-31'),contract=story.contract;
 assert.equal(readConfigHash(story),'c8edf2b1a30c246b6010c8427c5253f66dcd2b43579509f17e758e3b6cf17a81');assert.equal(a.source_contract_sha256,readConfigHash(story));assert.deepEqual(contract.prerequisites,[{ticket:'R1-21',required_outcome:'ai_qa_complete'}]);assert.deepEqual(plan.dependencies,['R1-21']);
 assert.equal(contract.acceptance_criteria.length,6);assert.equal(contract.technical_acceptance_criteria.constraints.length,7);assert.equal(contract.testing_strategy.human_review.cases.length,4);assert.deepEqual(contract.testing_strategy.cases,[]);assert.deepEqual(plan.hours,{min:12.25,max:15.25});assert.equal(plan.files.length,20);assert.equal(new Set(plan.files).size,20);assert.equal(plan.days,1.90625);assert.equal(Number(metadata.reduce((n,x)=>n+x.days,0).toFixed(5)),50.1475);
 assert.deepEqual([p.story_count,p.case_count,p.requirement_count,p.scenario_count],[30,132,53,41]);assert.equal(drafts.reduce((n,x)=>n+x.contract.testing_strategy.cases.length+x.contract.testing_strategy.human_review.cases.length,0),132);assert.equal(Object.keys(p.stories).length,30);assert.equal(new Set(Object.values(p.stories)).size,30);assert.equal(p.stories['R1-31'],'PGB-145');assert(!drafts.some(x=>['R1-29','R1-32'].includes(x.id)));assert.deepEqual(p.current_source_scope.pending_source_amendments,['PGB-137']);assert.deepEqual([p.current_source_scope.native_snapshot.story_count,p.current_source_scope.native_snapshot.case_count],[31,134]);
 assert.equal(a.native_id,'10605');assert.equal(a.parent,'PGB-66');assert.equal(a.native_publication_verified,true);assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);assert.equal(a.original82_body_preserved_except_prerequisite,true);assert.equal(a.original82_cases,4);
 assert.deepEqual(a.dependency_links,[{id:'10728',type_id:'10000',from:'PGB-99',to:'PGB-145'},{id:'10729',type_id:'10000',from:'PGB-145',to:'PGB-82'}]);for(const edge of a.dependency_links)assert(p.dependency_links.some(x=>JSON.stringify(x)===JSON.stringify(edge)));
 assert.equal(a.description_sha256.body,'365029d6439052f74217db9f4b56bfdb535234cb20901fc785a55891027fe483');assert.equal(a.description_sha256.original82_before,'d5357e7018361264d0d730b56b8dedf419efcba0c42202463ba035aef399c1de');assert.equal(a.description_sha256.original82_after,'682017a9f3efa4c70bdc4f903edcd5c77c3587c65b72bd1f18ff891e57003c7b');
 const old=beforeReadConfiguration(await load('ticket-drafts.json'),'drafts').find(x=>x.id==='R1-12').contract;assert.equal(readConfigHash(old),'b33f93b3b47fa68e023c06e2e340047219090ee365712633823d19deab9d7813');assert.equal(old.acceptance_criteria.length,5);assert.equal(old.technical_acceptance_criteria.constraints.length,3);assert.equal(old.testing_strategy.human_review.cases.length,4);
 const result=validateWork(JSON.stringify(contract),{mode:'structure'});assert.equal(result.valid,true,JSON.stringify(result.diagnostics));assert.equal(result.readiness,'not_evaluated');
 for(const f of ['docs/product/coverage.md','docs/delivery/manager-r1/coverage.md']){const text=await readFile(new URL('../'+f,import.meta.url),'utf8');for(const [id,cases]of Object.entries({O03:['H01','H02','H03'],O09:['H02','H04'],A12:['H02','H04'],O13:['H01'],M14:['H04']}))for(const c of cases)assert(text.split('\n').find(l=>l.startsWith('| '+id+' |')).includes('R1-31-'+c));}
 const stories=await readFile(new URL('../docs/delivery/manager-r1/stories.md',import.meta.url),'utf8');assert(stories.indexOf('## R1-21:')<stories.indexOf('## R1-31:'));assert(stories.indexOf('## R1-31:')<stories.indexOf('## R1-05:'));assert(stories.includes(JSON.stringify(contract,null,2)));
});

// Expected contracts/cases come from the immutable native freeze, never candidate drafts.
const installed81NativeExpected={
  "contracts": {
    "PGB-71": "f51b72d9983b1ca2d44b5de4fd3196ec484f78eddc13f48ec905cebd957523f7",
    "PGB-72": "f593a4c5c01d89c56170da4e18cf31bf01dd4db58dfc68fcf8c7a324534dbe2a",
    "PGB-73": "e5b49fb052ea84536834d7e39f5b2c6a9d3c052e1774d0e580ed0dcab9dcd579",
    "PGB-74": "cd005fd77b2146c53e5dc657cae8ee8a0059e167ad12553fab77abe87a8ca52b",
    "PGB-75": "9b23e24bde583d75d1a956ba79310b7d25eb1199397dd57a994186bc25c8ee0e",
    "PGB-76": "b7852b345b9a3ee36f89f2b847143977a915318db3b4dc696c93125c1b5e8d12",
    "PGB-77": "6356e9609cab7b1b55f3dd92cd982749390549d27865e2859325eea86501499d",
    "PGB-78": "6001af1669f9fcda9ea568ca06601a704f65d5f79fd58edbddd3bcb6b69c32a0",
    "PGB-79": "40deed85e34faf13d5237d6e04fa803479ea37dce9ffb49221f46d9f66100ba3",
    "PGB-80": "bfcc531c39f4f5000be0b80a85ace47d61d65984802a90eafba00f1b7ad97520",
    "PGB-81": "5514508fe0c18a500dbe4a3939bcd0e193fbf123eb09b1299e26612d779fff5f",
    "PGB-82": "5ee332ec46521dc62ed86d1a85c0bbfec771db0b54d74d3e111ea33192f16327",
    "PGB-83": "5593dfe55708317f226bbf55e6ac78ae70b194c4959d9870b25570c1e7583724",
    "PGB-84": "2afe3d6298d1489042caeb2f658ed2d68de6a3632cc7e584ff4107d3d75ee7e4",
    "PGB-85": "3b18caf2cca1c4b4f3e0f31904c8f3ae8c467a7445bcba2962ae920fcbedf45d",
    "PGB-86": "4dff64575f90c37f69215c8dc74288dc73c74028ee3d8f1bcaac9c6e70d5537b",
    "PGB-87": "1101e101d2b09497286531a7cac82a4753cec209dde5896e3da69c8c95d10d0f",
    "PGB-88": "90a1ed2a5609cce9aae2fe5df58d5c3d1086c223d0cd4c8e5bb68d2a3db5ce45",
    "PGB-89": "a128a188e0c2e57e772a7dad238bc1fd42742511773d5050ddc28d7ef252e080",
    "PGB-90": "674842332c6d1f31faae15f72b16ef4a3bc5a651cca9922518f59a56b9b71348",
    "PGB-99": "08ad1b5c45d6eee953b8aaab7d810eca703fb62e2d9a868e2e8c005dc497a3c0",
    "PGB-100": "c31782694e973da9eb9288ab1e1e95cfa3bc0a8a8b7ef16b9630d8390f23a9d1",
    "PGB-101": "b92a1a1b8f649e0366db4cdf6a461bd3250bec1dc8724c15db653e710d846ede",
    "PGB-110": "65a9d9ed12e18bda8bc9de1e3898eef8cc664192a0d423c5653d8bbaf5d5d823",
    "PGB-113": "ac3b25432e45c1c89cb2e1222ba6442fc6b9b2ec12b66da0181563e1d676edf4",
    "PGB-129": "d293bc48cba396244989e23eb8f6dd936e9cdeb218283a558889a3cd33ef5ed6",
    "PGB-132": "5e2896f4c64a6a1ee7c1f46cbe36cca7d929a15cce2ff33921483e337ff94f09",
    "PGB-136": "3800a418211822a8110af368301206500830a48d475eb6efac4b91a5724fea21",
    "PGB-137": "cddac0d6e37ae86ce41332efc16fc34376175292c63fbb4660508bdaa4cb6642",
    "PGB-138": "33446740e0d6bb4d35b3f0d48475a3ced8e639cc3d49a9df3b39ac55e6cf2820",
    "PGB-145": "32709463d8557f625d622e4a2f6a0a2833f2a9f9d5771ac85b6c6f5014b80ef0",
    "PGB-146": "1d7bc7075c214b6eed4d4d9280c30f39fee35454a2efd1ce075860cc9afa6fcc",
    "PGB-147": "0f10effc236e82c69c1852d7ea754e99a29fc84a6da1f0b1280ea32d61157234",
    "PGB-148": "d0cca84d58ead387cb5041fbc0515eef8b5814ca50c3e5f9ee9601b0d63ee766",
    "PGB-149": "4576fdfe550451e5ecbd671cdf1c8a7a76bd62dff407a1fd5ed091d21cc46f39",
    "PGB-150": "935daecd35a906802e7d40aaacfe1d79e8ef4374ed5aa3858454f174a0ceb3cd",
    "PGB-151": "da6a1977ecb12d1e43f0ce89bcc2fabd6d4c483edf2442f1fdb8d7feb788c3e2",
    "PGB-152": "a9d881d2ce1bd607bc7030aa6e1678000027f1706d1fcdeeea2892a84b8731d6",
    "PGB-153": "0b9c78b511db03f49c14dff20ad9e16d7094a8bf10786429efd94ba3f4a5d56e",
    "PGB-154": "a01a3d0cbc96ae4cb2f0f38f9805bfaff895720c1016e023cd01c2652f2ec061",
    "PGB-155": "5a6d1866be6ed301e21cb1016ccb4e5e52f84a373660f0e84bf34fdf3ee693e5",
    "PGB-156": "43ec301bd8082c83ad4b461d8b13a82a9ae5ea348d7d7cd95d61905e8aef569c"
  },
  "descriptions": {
    "PGB-71": "cc9b75c2195dcf7f302a103d95adf1eaa9ec47039e689cf929170f546d41ad47",
    "PGB-72": "25ae09a61bb53dc4ed762dc7bafa07f30cec4b43b5c88b461743698871dc2e4a",
    "PGB-73": "be4336490b3a227a57a5493f74c4be64211dbfe99cc27ad5b0eb0068eced01d3",
    "PGB-74": "ba7286b71b28709c2eafb8a1ad1d7ed6ff4db533ddbcb71c0dcb0041e04723a1",
    "PGB-75": "4f2481f8b22ee7dadeda3626ecb98e587041f279f76e2ef9176eba6c9ee780f3",
    "PGB-76": "0fa12a0cec8111de01141eb1deed02764547b9d53368e41be80fd49bd79ffd90",
    "PGB-77": "a78ca725b4dedcbd07581a7c3d4269c657ed0c6bef16c4def4bba9d9657a5553",
    "PGB-78": "6a553206c0768143f0b478fc787c98140a233cc937189b6818cb83a5db02c97a",
    "PGB-79": "e61b836dbf4a5e92767b92c58119c69282f2426c56ca7b2ee82f3f67c73e55a6",
    "PGB-80": "71dc29fd094d1952a5ec4b4ad763584edac9b62d006bfd054db968f5306f263a",
    "PGB-81": "2fc67b655eb29893408d9dfca2ca7b7c567e05740c75b2e417a3a143333d1c17",
    "PGB-82": "20a92b8ac2f6c0bf811395ac1115aed67bdefb0ed59b5de95560f49121f41517",
    "PGB-83": "efb5eef852a6dcc0af396a953ba3b00d475cea69fe7e601e85b3c328a351a3a5",
    "PGB-84": "c445f415b458a25bb7e73ea2ee3c9d91812a37e4c60784201b5d5893e616fd65",
    "PGB-85": "5f0c4dc7e7fa3294ea60518b693353f858179d4ff2bbcd36d1f62593a02253bf",
    "PGB-86": "ac95b1b23e0f6a906f3ed08ca2d49a4684f78e15e2673bb3fc683c431265578f",
    "PGB-87": "ac9f9a6a493d90d505ff6ae63e6b92063cfddad3fbde62a31f20ef2b25687cd5",
    "PGB-88": "6622b1d25263059a9fe5a3875031c08ffaab7dce88f36f734e154109e9230e09",
    "PGB-89": "f7519a39449fb3dc97e3dd7f70eb341777b5e44ada1d633cd5b7be4c7c05042c",
    "PGB-90": "077d6d2d55a261f741a6d266e9b52ba0a2a5f151cde96fc8754ec234f1b07b01",
    "PGB-99": "4c9213d90d439b61709bc3ff9272c9245b780fceaa01906ec39ecb72dadb8af8",
    "PGB-100": "33879c2037c33faac8d41e6f45dc0ec7904d60e81f1d7a7fd1cd4a0a877c81cb",
    "PGB-101": "ea145542ccf8b8973d4cc86c7ec4fe587b2e0c6202835b9c0855cbc2e6e6f704",
    "PGB-110": "7f4ddc8cc6ff72ad8e45c91f659dd7e9e2cd4311fb7d196149627c28996895fb",
    "PGB-113": "c987a76d937e7d162dec793c4f840079206342460d2c406d28a8a27caf02acd8",
    "PGB-129": "b6bacbb594b7008dfeba4722fd686b5379bd7336834cbcfa811d07187ce255b5",
    "PGB-132": "5284ae68d9f54e809409ed8dd966fa4494c813f57b70ef3c6038a84bdfcbb38a",
    "PGB-136": "905166bacbffd705eed56e3ee4c018ded0ccb047a23a8d3b37cdcb51809a71b7",
    "PGB-137": "19a52058b9c25ad7b054a5d8fadd16b7457a7a445290376e77572433777a5978",
    "PGB-138": "0a78de20124a8eecca08dc1a8c39f3434951f60a7b453822964f34b557b79cb0",
    "PGB-145": "365029d6439052f74217db9f4b56bfdb535234cb20901fc785a55891027fe483",
    "PGB-146": "45932a2a2b29fca7ff67dc235a7c3f6b29bd8b3609fad26a9c1c755d9bb5af6d",
    "PGB-147": "07e3ae06dab84ce9593fed88fbb69b9ac1eb2378e1da36cad8bcffab3c322f3a",
    "PGB-148": "ff23e1fc122e6da6137585b9555b6216a25af4f83602e67d2d877bb905a537f1",
    "PGB-149": "04045bdb1015f5ac75ecb6c65afaf260a3de75c459579bda129fa452031b387c",
    "PGB-150": "8fe2512a12fbbaf8f1a9ded99d1529c1d3dc01d460ba9dbf73e68e91388f0324",
    "PGB-151": "756707e48cbe4aab24dd51748f637cd90d72d5c799a9f29bcda9f12995e15a3c",
    "PGB-152": "910a0d4cb508902c789d1209251402d5853cfbde43d5717efe38e76f57e79917",
    "PGB-153": "59c2b5fe721c26d22d666087d3c88459c3f5e7ec04e1464fd35ad63b9c4710e4",
    "PGB-154": "38d5dc2eab7d775218c94e07e72d86b8645ecaceac9301456c8a783c2d217612",
    "PGB-155": "0833c522f975fd5732908589e4391195e53e340fc3234f15a64381185942cf9b",
    "PGB-156": "bb65b27b2e2d7a1172135a9846654e4533c39c1b882cb509faf4c96f9c96d23a"
  },
  "cases": {
    "R1-01-H01": "92f92c020e67ce57d97b232b80bc843f788ecaae61ff6f3cecba64416dfc28ef",
    "R1-01-H02": "9728f468cb90486eaa881a7c0b3615c4c67ee2172dc7c181c78d0c0cfe3304fe",
    "R1-02-H01": "edf2605dfdecbd80e0b0415c1d9cf10d67bd72388190ed9f84b492b81b756ead",
    "R1-02-H02": "579a99bd9bde6a817147172f43fab161a62766e440ba98c3e8be5ffd3baa9c31",
    "R1-02-H03": "656cf3f2c00c6d3c3555e108cb12a7609d26055f5bd1e18661cb3edfe4195e7e",
    "R1-03-H01": "d7e539aa873723ba45890e33479894e7885340510e00d58e1c62fadce888e51e",
    "R1-03-H02": "8e3e28146a15dfaaa844ec205c47ebef2cf344b75f889a8799329ef57260622b",
    "R1-04-H01": "7b193d7e0217ba44f4bff1fdff7541fb0abee8e4372d2e052149047e62679118",
    "R1-04-H02": "bdb5eabd3abdec70308e8b959472a293538d523fd5fc6bf9b887da433376a736",
    "R1-04-H03": "122acb54e32c8967dcfcbd1af8e703da704ed65a8135eb81034f771d314a7dff",
    "R1-04-H04": "83abe35b7d7c8aea5e6b4b5bd3ad65b366646a5b9aa4bc860554e1623aadb120",
    "R1-05-H01": "29c95768e56a28dcd44568e2e8da0a7816f4e146f89d8f075d5140c79101610f",
    "R1-05-H02": "86c2c28e2a9c6f17183b9d288afd09d36dc608dfbb288eb031f403cad03433a9",
    "R1-06-H01": "29eeb3e017ff5a6079ba76d818a7cc82656ecb36ef6c71cb244411ad243a03fa",
    "R1-06-H02": "a0daf99436edaacdb624f70711313d52a584a624537ebbd94096ea5d0e52d68b",
    "R1-07-H01": "0334eae4fdca231dbe5f0bd56c8b14655d2cfbca19f6e3b66438566793d5a3d0",
    "R1-07-H02": "acd1131dded8c718321e5458da0fedcc02060e1f9af049a025b27e842b5ea5b2",
    "R1-08-H01": "7476b2718d38a81f3df80ea3a5418ff61ad5a43766639bcf22e9ee4904e130d0",
    "R1-08-H02": "3d67192f9b726e2bd3da734696cc9c69febf7ee283ac144fed7a9dbfeee91ed9",
    "R1-08-H03": "ab15e782fc441c95d1027812226f32a807fa30a3b3136c1e330fa23bd35ee63b",
    "R1-09-H01": "5451971287852d15314b4afb4e1628eb6700cd65e56b6db9dd292b5d2f07ae47",
    "R1-09-H02": "b41734b342c48286f77d3de9baa11deb61f0db8833115c8a0b3be36c3996f108",
    "R1-10-H01": "f04650f2fd5c679bab377aaf127c3a610f52278664e7b8cc1edfe20090f23b7f",
    "R1-10-H02": "4a15c92bb4910ebe0acf06b5138cd6ce5962fe063afc80925600771aa9707437",
    "R1-10-H03": "903c6870ae068c90122719109e6ce056fa8ce9a03dd8a63943636b090bd25a9e",
    "R1-11-S01": "2fbafca839910f54f2220fe085bcaee9525e6fd6c7a0faba474cf429a80934f6",
    "R1-11-S02": "1ed6d4950e0ac7ed12337eab6eba9d4918a7dddd23d70563de3547d3baa1d692",
    "R1-11-S03": "539dedac2336c72454002705f11345cfb74c475fb5ac1a6bb93057bfa373b166",
    "R1-11-S04": "888d8dedf5d8ae237051271828a63acc144da84433035282a56f299cc0324430",
    "R1-11-S05": "c3e846f07964f3f424128e68fb711f35946ff0cfe0cf8c581f2aba58a041b53a",
    "R1-11-S06": "f536feb761e2c8a5ce610268313cd7a5fd90f5b191779b199c02724202ba3896",
    "R1-11-S07": "997129db4bda17efd499d67a329e680ee8fdac674d8335a042826e572b7b2c32",
    "R1-11-S08": "6f44132ac102dec4314d2dbfe014284cd8dcd74b3893f5ef462d6d8613ca14b7",
    "R1-11-S09": "bf2beb5e99ea181b3f498b4f699754ceb590159b241254507d547c5e31b87ba9",
    "R1-11-S10": "7d6744b706bc4755b48dfe8b2a063b3983d7fe6fedbff94b5fe271c77a20f387",
    "R1-11-S11": "eeef7f11ee7b87883bb5fcc8e4e8147eb8d4ebcb4684e12ce8b661ebf136cc1a",
    "R1-11-S12": "6e657eff21305fa68d14fdaa7646f80eaa987958ec97c29e2c4d47e3b6f09761",
    "R1-11-S13": "90854282c1417711dd4721ed288d578e3bc59e55258969210b5c75a362889a95",
    "R1-11-S14": "798e08742309eac17b8881b0f2eef769a7a4340bf9298de50eda6163291257da",
    "R1-11-S15": "cddf58a77c8b31eb2499ca1d9bed0533c6126e43af14771f405e057e29d99a18",
    "R1-11-S16": "cf94fffd72fdcf405370f0bc00bc05c2b05b3656da42d4381a47d848a24db152",
    "R1-11-S17": "0de0c8cdc9371fb01ab965cad31f5d5fbd2c9ac2fabee6df2231da26e529dfbf",
    "R1-11-S18": "2abd8b2ecf565534f3953d9a9e40d4647d87f1af70c790e31f67a26ff2b59da7",
    "R1-11-S19": "1d09e0f8c48f4ce483dec3bb79061fd3778d6ef0e348dbe4e4873b497617321a",
    "R1-11-S20": "f849f96a84088890667b7e6a9b22f027196caa5dc14480569225b805c1094f8c",
    "R1-11-S21": "b262c4643710ee9d59f5c5cebf85e945684f27f6fc96a02e37972596bafc5997",
    "R1-11-S22": "9f6a45bb3ba17bbc91cd6663d30ae219191cb5acdc21040077da9d50d15b24e9",
    "R1-11-S23": "8554b01a9e964d926fbfbe1291e38d7a38d8180b45a02df976372ee530a74b9e",
    "R1-11-S24": "8d4787f5da83374cd963378012182fb94e10ea5877feef9501644c7397ab5723",
    "R1-11-S25": "1da9d6f5d7f6956fcd521fc49bcc78dd3d0e860b47abbe96b41534b30efee744",
    "R1-11-S26": "9360a2870ea7b9e407629f6dde76095c8c9553be66b1c7e56e31b9ec790031fe",
    "R1-11-S27": "1c9fdb036b8708fc9b1281907eb03031c6ba3474e23d03f7a387cfa8068310cb",
    "R1-11-S28": "47ec50a695e9b7c50bb45dd10f28e3f10c1dc0545b3fd14285050dedb9c734fe",
    "R1-11-S29": "fc04245752947fa70be098f3d8dca280a4bee6157a53a2a1804d5f76f9ad4c5f",
    "R1-11-S30": "2e255d04c772b0c4b59aa445b985eb70676f8c0729a78109a1d188a88e36a98a",
    "R1-11-S31": "bfdbe9115d18b22f25809beb2b6308c10381771dd08c8f25e86c705b6401ef19",
    "R1-11-S32": "2f6d529a2ea8368156f2bb0a0bc698e045c02a4bc1df1d4c0efa299a6a31f814",
    "R1-11-S33": "a24d9c031d3f46280fd59ed4e9666a579487d71503f309bf0a114b9bbeb3cd30",
    "R1-11-S34": "11cf8140786e3ad8c149c192fba904c9ad56e1f94953c18ad4d9c52f8d3c8f81",
    "R1-11-S35": "7be853daff304b878a2a13d2045b40e45d8348295555b57acc0492eaa2633979",
    "R1-11-S36": "19e6ba0997f977403e6961f686dcf9c2bbbef571f5be8521556caad546e8c025",
    "R1-11-S37": "f75a315e2567a4457944b5fb796ba2920463797996977c47fbe5a9371e62b3a0",
    "R1-11-S38": "c8ef9d445ea0f6036041dd02f6c5e63f83e721e68ca86a319bef55469d235d46",
    "R1-11-S39": "19ad9dc662eed6671ae9cf6b57cda78bb29760d4593c82f211b6f94430e7af01",
    "R1-11-S40": "cf179af09bc31e2a3cb243ebe3292077211a4efad10c1c05be12a0f56575002c",
    "R1-11-S41": "d3b6a64526f43a08eda883243e1e7c3852e8f033ecd4fe5a1179d7aaa1ec0b93",
    "R1-11-H02": "b537f13d4bdffb7887afc286b233ae026c9546443263955a6954b1c191c1ceb5",
    "R1-12-H01": "1cb49fd91c8564617972767822d498226715d40421ecaaa819cfffa6e9227de1",
    "R1-12-H02": "16a0845bc4667747dfb943094dbe0e29db00bff9a50cea473f45f2576c81469c",
    "R1-12-H03": "6bdf4da8ac988f1cc188dcc1ae0606abdd616ace010e0a8f796b95045e0deca9",
    "R1-12-H04": "626d476b4cda472e88c95320d7eb841fc74a43597aabdef972fce95b47cf3fb3",
    "R1-12-H05": "4e75fa6cec28030363d62c413ee989f1934ff521a70f0937b0f895fb043d55d7",
    "R1-13-H01": "71be8aee5f6a53945461e914224113dacfb088100c3b19d103a184014d3d4fbc",
    "R1-13-H02": "4b0c1d659fea3f54a2edbfa9247602d1b69b3f445c914380b92f6aa3a5f466eb",
    "R1-14-H01": "05780853656f0f2028217a0ef71a3491d6b178c77beb8c3e225bd2f8bdc3ab53",
    "R1-14-H02": "70bdfd05f8fff94e8500e1c14e0bf7c45ab57ffd9f9419d916760eba78caa06a",
    "R1-14-H03": "acc8a8b9d4f1efbcebe3b92f0fe86dd7d3e5c7221754b0faba84bf1a03cc84e1",
    "R1-15-H01": "2bc4e0ea0a8f18fb74734d68074c340fab145cc0a48037bdaf05a808d5edd3ac",
    "R1-15-H02": "e498721ce0812e80397b7f87169486e88520ce69abc12481a920d700ffc98544",
    "R1-16-H01": "d624ea2b0ab35c31dd5993dda07374d41d0562b2bc2f78eb77431aaff1525aff",
    "R1-16-H02": "07d5fc4ba86cab3da279d4451f6e6e4ad9a4868a8f82c21da219de80d9a33860",
    "R1-17-H01": "33612942270b581154f807cfe59460d5a55ea01a463eb8c74961864e982924ce",
    "R1-17-H02": "516fbc5d4a479c88bc8ef224629511a236474a1d6eea4c7a425a59225b9344e5",
    "R1-17-H03": "c5d738e9808c92322218a10f60e8cca186c1fc086a85c5d8d237082795506744",
    "R1-18-H01": "63b97863812a40d2f622880abb76b018db7d93b8c22bc944413de658d5a8e836",
    "R1-18-H02": "d3df7cab6de70e64333e08fc413baa60e6e4dbb60a8a7adca566232842689291",
    "R1-18-H03": "1ce4cc763dafbc75eca8be119158ccc03f0f78f11997b231be1879fd3ffc3dcf",
    "R1-19-H01": "7b19d13fcd43180b41f39db239375337cf2e488abb9d3419cf44e42c71b97381",
    "R1-19-H02": "8bd055e9141e7410739433f498d96c3043f0198377c21aea63b790dfd43e82e3",
    "R1-19-H03": "51d382b5a44c1c5d8eec3f2e952ea20acfc2c605ca8d8c948c72862b9d943147",
    "R1-20-H01": "d5a1cf0d35f1cda84cd7aab9c6033955302bdc8b553fa8d2cd5cee99121d0511",
    "R1-20-H02": "55c0fd5cc53a43576d209d85380a364e4d5a51a20d62c0bc57ac3856558be3e0",
    "R1-20-H03": "797f2163242549b378d8b08f9b1a64f6b5947fd4ebc1a514b9c6b11a8664bad7",
    "R1-20-H04": "2474326afd8ed0f827dcf01890e4e36a9b19049d41816f95300a399824dd56e2",
    "R1-21-H01": "f4c47e27d41a92c7de2bdfc31b9054c7d55d06b1294f0e30f8aad1beb3a3b5dc",
    "R1-21-H02": "8769edc20d2763dd3b8e2bf250c704aae84c4c90fb8a25f3c7e78e29388436f0",
    "R1-21-H03": "acd2b2becea5f5d6918627ba869d0377e0976b7129725abdaeeab60ea96b697e",
    "R1-22-H01": "ba6fb52c99371e023c956e39160524e6c65eb744b2838a7e089102864eddda50",
    "R1-22-H02": "d416c963b9768e1aa408f2d1ce3800d28e01bede11f3c42bce32a479308a42e9",
    "R1-22-H03": "54f1c678c0cd11a43d97c66a645a320168e26ff3c6bca423a6e7fd4c08a01e39",
    "R1-22-H04": "261347fd5f5f9756424cf6975bef80759ccfc080abaea65317ad9a83ab24cc95",
    "R1-23-H01": "e97c4a0df892cf0883cd5c8f14639fb425edc5972f9eeba0ebb07696168c7aad",
    "R1-23-H02": "1aa51e22634a4d31f02555af4fe629295c03d25d4174ee44882bd52afed6de7c",
    "R1-23-H03": "eb7c4e70da339feb6d01877a30a8de649adff8ccbfea5c374755826f26331cff",
    "R1-23-H04": "4d94bc2f94c959ece706a4800053b298d9fb7f8c3438e373e0ad01b06d59e56a",
    "R1-24-H01": "43643111d7f05e63880d8c952e727fd1aae4df75c87ade31c52b1935b7d5377d",
    "R1-24-H02": "1df0287441ce026737d373d04bc7ddae79b6cef44d3a843e119bd2ce6f070b8f",
    "R1-24-H03": "d1d395917f4a4db44a6cf6dc73d351ab911cbd0a6a4fb6371aa5b70ce9247796",
    "R1-25-C01": "fe04e473881d474b110f4ce6f34168027ad870902d7b1bfd162ab5555287bf9f",
    "R1-25-C02": "42f103d041afb6197064b906b1f0f58414e308561474cd544eeb2b4174897bff",
    "R1-25-C03": "eddcfc10d1ebf2d6648e4e70d1d82461f2f7c5f9d4065bb1439ec0749f9e61df",
    "R1-26-PC01": "245535e0f7963f09fb17e647a0df62db09efc2390048d2edc433e0d7f5453588",
    "R1-26-PC02": "418d3472e1605a321337364602c13f9dabf2c2dd26b66d542600a227a067de41",
    "R1-26-PC03": "987ec7bc61aab9afb5c0ec972706ec958cbecd7862e46b77d81a5ab2f346a993",
    "R1-26-PC04": "25e030ad7834db148573a75b83991f4b74b298a11d464d12e54140459f2b24bc",
    "R1-26-PC05": "d6289623cbb13e15cc621a78cbfb0c0b59fb2cfee34a0d77b55f7bb4d10cadd2",
    "R1-26-PC06": "d5442b69a70d595229795857b22cfb9f874e0a769b19fcdb654928599146d253",
    "R1-27-H01": "afba7221e15f3fcd7250ae6fe4dfa2d1a45f87d284ec2ef2cbe59f6c2303f5d4",
    "R1-27-H02": "0038e49ffa0cb7acfc6cec365d4e9d2961952771448e0ad57749f518373dacd6",
    "R1-27-H03": "82676afbf24966d3dcd016af2c5ee03faf080c1a625248c7d876fe8bbb666c52",
    "R1-28-OC01": "3cec2da085eda956c56d3809531bc38ba135db1080e224d443cd3d27f56f558c",
    "R1-28-OC02": "273041e53b5e54b463d1f9a14cd53269867aa5c5d3dba8213b4535c7ff97e637",
    "R1-28-OC03": "b4e4751047568051a5e8698fa9c696af0ef477cc5f06284e07bf81e2b93c34eb",
    "R1-28-OC04": "bee20f90e7a895158a64d8ad17fea512fcbadbb4ca308d70d8751179c3647abf",
    "R1-28-OC05": "950853b8ce71142998c74fafe495fdbec22a7a8586cc0d244864c759c77b2516",
    "R1-28-OC06": "c4356988a708b9e41db46ffd7f020b053296fdb89c20a7005203fb0effea386c",
    "R1-29-H01": "a80e641cc7f4afb95d37803433fb1e91a9452e300a16b6fe7018b7a6bf93f83a",
    "R1-29-H02": "2ea8a579039d85f1ef3062e4fc0af082c5855d1dc164a19fcc7929e8f13757c1",
    "R1-30-H01": "23b6945093ae600680cb601734857412ccb6631f52c309f342af25e4e3093024",
    "R1-30-H02": "5e06e5cf56ed45ebf4a413a1644591b3d5da96437a0c097e1230ead524f9526a",
    "R1-30-H03": "2810c33e99994078563b425a05582911b7497686eecc3b22dfed3fad4aafd18f",
    "R1-31-H01": "fab8abffdeb162b0d4f1d8395e56433e4904201d789176e223fe8d38a31f643e",
    "R1-31-H02": "82ba12438d33322d42a778b3ff745dc9379762486445bda3a38ff105fda95671",
    "R1-31-H03": "4d23833ac32a032fb1a54f3ba1845cf2f10fb8e82bd1b7156d81ff07261e1082",
    "R1-31-H04": "43996698e584fce7abc7ae0366e9a15abff4bad99abdd4571001368c623a2316",
    "R1-32-H01": "eae26476aeb1eabb39fb25a5f08824bd1704635814e7a771d15afe02bb89e127",
    "R1-32-H02": "23f459d1b95fa984c107eed10f23a3342ae4d26fd6dd4e3e4e6b04386541d2bb",
    "R1-33-H01": "6de8e247af9cf4998a4950ee14fb3b37beb6869f79277c1a04eb8f3c6a8e4bf7",
    "R1-33-H02": "b19ff8afb563f90a8c11e50c782e0bdcb60a76d677392b5c4ba28a042a95ea94",
    "R1-33-H03": "9a0e6b14ddc53e3ff4b96f4fcb0d027a9ce3e9f4b682eb8b967e91bfa13cd576",
    "R1-33-H04": "7d9d4ec8f5874f061f7afc74b89be72277d8d48587387c1805fb3bbaff214bf9",
    "R1-34-H01": "985058f64d9cee1103cba98b65e611e92509825d2b44f81b17d4f8c4563e1c31",
    "R1-34-H02": "e9a91a8010b24e0ec8c99c6ab39fe1a66bbcb935c00125df8d00b0b14a680f93",
    "R1-34-H03": "b0732e8e38813867ecbe527639fe827c2ebe618e3efac916f067f6f3bfb50e7a",
    "R1-34-H04": "3dfaed8c28fe2b7202d827b0fccc828ff2a4eaae3cc667f0e231eb92168ae94a",
    "R1-35-H01": "7ba944cb9abb614d8d1dcc5ccaaa619d88fc3d9ce8c09f24e5d10438467b1f64",
    "R1-35-H02": "248f91d47cb2bf8b77f96a79b11b3273b632a31990bd3ea36c5e4beb3c192a1f",
    "R1-36-H01": "c13b888db3ee8999c3a26e0cd17d5c03db2cd6a3eea7b676b05021c8592d9327",
    "R1-36-H02": "2c9a62cf95f9438753d836b6d25c4a46511607b0a114df4ab674493bdcef6877",
    "R1-36-H03": "ac3d6cc195915dfcfaa87f653d20e55d5eefaafc447b3bbfaefbba378824a6fb",
    "R1-36-H04": "f1d643bc576d23719341516134a8f7224adb25f5e46411c85c8ee33cf50c6c71",
    "R1-37-D1": "f5b868626ced1a416fb046b4d3b4c2232f827a048a9c0569ac3f009cc4f5f0cb",
    "R1-37-D2": "8936790c95d293eac96ed195bce85f60ec7ba4debb02eccb31f3227efc96ac67",
    "R1-37-D3": "f39279c0f4dc1b1ccbee63350bfc61f3c3d4e6c4246701d83d391eab590b6bd3",
    "R1-37-D4": "31f6fc65c208f8535e7e2039a7b1e86996815e3438e18a573e47f5c7d6b447c4",
    "R1-37-D5": "25d1863ddc6b3f56ba2cbb6dccd83f3721fd15f6e99feeb8d5af8b9066a0a53a",
    "R1-38-H01": "c5d4f953d40ead865a238677239dd339dacfb29fc41c480db0b67a80e3547d3a",
    "R1-38-H02": "e9532ff9688ea97d0924175e68f4bcbf67ac759e35b8153bb8a4b53b6b1474d6",
    "R1-39-H01": "4b2f0216907d08117b9fb8c2dd5f4926ca805ab259b8ae8f98c7d26dbfc6b44c",
    "R1-39-H02": "51bc717228a0cf0d149ae52b02e4500e696b6ea17b68bd311c612b739d54592a",
    "R1-40-H01": "e625f56a7634fcdb2064e403c6a4a54ca1abdbc95ee7db9c6988d81b5805f27e",
    "R1-41-H01": "3fa0f8c906e99851f99184ada897d23c2a2938789de34eaef89d7a0527a00236",
    "R1-42-H01": "de087beab674ac145fef77dc28eafed32ff3503e9cb1e440298ab7532fd6d825",
    "R1-42-H02": "757a9ba5e51f8a42dafc1a72f9d35fb1f6958ec232b1ac21d303b5b4c946fe34",
    "R1-42-H03": "49dca9352e2f84c1befee518c683ff79aa5583333710f789cfd4af36c8200ccc",
    "R1-42-H04": "28c5a525b4bd6f027eacae4e1fb31f9393ad93607d7f153e955627ad23502d0f"
  },
  "order": [
    {
      "key": "PGB-71",
      "id": "R1-01"
    },
    {
      "key": "PGB-72",
      "id": "R1-02"
    },
    {
      "key": "PGB-73",
      "id": "R1-03"
    },
    {
      "key": "PGB-74",
      "id": "R1-04"
    },
    {
      "key": "PGB-99",
      "id": "R1-21"
    },
    {
      "key": "PGB-145",
      "id": "R1-31"
    },
    {
      "key": "PGB-152",
      "id": "R1-38"
    },
    {
      "key": "PGB-154",
      "id": "R1-40"
    },
    {
      "key": "PGB-155",
      "id": "R1-41"
    },
    {
      "key": "PGB-156",
      "id": "R1-42"
    },
    {
      "key": "PGB-150",
      "id": "R1-36"
    },
    {
      "key": "PGB-75",
      "id": "R1-05"
    },
    {
      "key": "PGB-76",
      "id": "R1-06"
    },
    {
      "key": "PGB-77",
      "id": "R1-07"
    },
    {
      "key": "PGB-110",
      "id": "R1-24"
    },
    {
      "key": "PGB-138",
      "id": "R1-30"
    },
    {
      "key": "PGB-132",
      "id": "R1-27"
    },
    {
      "key": "PGB-78",
      "id": "R1-08"
    },
    {
      "key": "PGB-79",
      "id": "R1-09"
    },
    {
      "key": "PGB-80",
      "id": "R1-10"
    },
    {
      "key": "PGB-113",
      "id": "R1-25"
    },
    {
      "key": "PGB-129",
      "id": "R1-26"
    },
    {
      "key": "PGB-136",
      "id": "R1-28"
    },
    {
      "key": "PGB-151",
      "id": "R1-37"
    },
    {
      "key": "PGB-153",
      "id": "R1-39"
    },
    {
      "key": "PGB-149",
      "id": "R1-35"
    },
    {
      "key": "PGB-146",
      "id": "R1-32"
    },
    {
      "key": "PGB-81",
      "id": "R1-11"
    },
    {
      "key": "PGB-147",
      "id": "R1-33"
    },
    {
      "key": "PGB-148",
      "id": "R1-34"
    },
    {
      "key": "PGB-82",
      "id": "R1-12"
    },
    {
      "key": "PGB-83",
      "id": "R1-13"
    },
    {
      "key": "PGB-84",
      "id": "R1-14"
    },
    {
      "key": "PGB-137",
      "id": "R1-29"
    },
    {
      "key": "PGB-85",
      "id": "R1-15"
    },
    {
      "key": "PGB-86",
      "id": "R1-16"
    },
    {
      "key": "PGB-100",
      "id": "R1-22"
    },
    {
      "key": "PGB-101",
      "id": "R1-23"
    },
    {
      "key": "PGB-87",
      "id": "R1-17"
    },
    {
      "key": "PGB-88",
      "id": "R1-18"
    },
    {
      "key": "PGB-89",
      "id": "R1-19"
    },
    {
      "key": "PGB-90",
      "id": "R1-20"
    }
  ],
  "external": [
    "PGB-108",
    "PGB-162",
    "PGB-163"
  ],
  "nativeAudit": "65584ef58c81941df65e275e557e80f8921d72f8b6c09d83d5c3ae21edb00c55",
  "scopeOrder": "82919c5bc4bce860cccd7091c462d3c5a40bed4dd99786063640c98bc56e6254",
  "links": "f3b9eaa5a88ce8b6d657d9db9ee150278f7e6b6c1ee81eed0c4e27288f0bec22",
  "prerequisites": "e51e8e5fa20524e38c547912fb1b03194c877338e08630d45683d48e96e9e594",
  "nonScope": "6b658810a9d86d0e885bfda6871d69c4893126e931f6e0b909b09eb924a0fb58",
  "page": "544e2b4dfc91c2ee4262f7e0c4747df346ce9e02474997b25d087c7890c9859f",
  "epic": "efeaf7b1a5f7ad9fc474efa8c99b994231ce0a36b2ba3a6e96eb9a693b2d30da",
  "manifest": "00a9464fea46ad184cccffba760bc8f77113b6b16cca7d67104d5f5f66bbd6db"
};
test('PGB-81 scoped current source matches every frozen native contract and complete rendered Story',async()=>{
 const readCurrent=async name=>JSON.parse(await readFile(new URL('../docs/delivery/manager-r1/'+name,import.meta.url),'utf8'));
 const drafts=await readCurrent('ticket-drafts.json'),metadata=await readCurrent('plan-metadata.json'),p=await readCurrent('publication.json'),a=p.installed_repair_preview_amendment,e=installed81NativeExpected;
 const sha=value=>createHash('sha256').update(value).digest('hex'),canonical=value=>sha(canonicalize(value));
 assert.equal(canonical(a.native_reconciliation),e.nativeAudit);assert.equal(canonical(a.scope_order),e.scopeOrder);
 for(const [field,digest]of [['page',e.page],['epic',e.epic],['manifest',e.manifest]])assert.equal(sha(a.native_capture[field+'_raw']),digest,field+' exact frozen bytes');
 const nodes=JSON.parse(a.native_capture.page_raw).structuredContent.issues.nodes;assert.equal(nodes.length,57);assert.equal(nodes.filter(n=>n.fields.issuetype.name==='Story').length,50);assert.equal(nodes.filter(n=>n.fields.issuetype.name==='Task').length,7);
 const {parse}=await import('yaml'),mapping=Object.fromEntries(e.order.map(r=>[r.id,r.key])),ids=e.order.map(r=>r.id);
 assert.deepEqual(drafts.map(r=>r.id),ids);assert.deepEqual(metadata.map(r=>r.id),ids);assert.deepEqual(p.stories,mapping);assert.equal(new Set(Object.values(mapping)).size,42);
 assert.deepEqual([p.story_count,p.case_count,p.requirement_count,p.scenario_count],[42,166,53,41]);
 const stories=await readFile(new URL('../docs/delivery/manager-r1/stories.md',import.meta.url),'utf8'),seen=new Set(),external=new Set();let human=0,previous=-1;
 for(const row of drafts){
  const key=mapping[row.id],raw=nodes.find(n=>n.key===key);assert(raw);assert.equal(sha(raw.fields.description),e.descriptions[key]);
  const match=raw.fields.description.match(/```(?:yaml|json)[^\n]*\n([\s\S]*?)```/);assert(match,key);const native=parse(match[1]);assert.equal(canonical(native),e.contracts[key]);
  const normalized=structuredClone(row.contract);for(const dep of normalized.prerequisites)dep.ticket=mapping[dep.ticket]??dep.ticket;assert.deepEqual(normalized,native,key+' complete normalized contract');
  assert.deepEqual(metadata.find(m=>m.id===row.id).dependencies,row.contract.prerequisites.map(d=>d.ticket));
  const valid=validateWork(JSON.stringify(row.contract),{mode:'structure'});assert.equal(valid.valid,true,JSON.stringify(valid.diagnostics));assert.equal(valid.readiness,'not_evaluated');
  assert.deepEqual(row.contract.testing_strategy.cases,[]);
  for(const c of row.contract.testing_strategy.human_review.cases){assert(!seen.has(c.id));seen.add(c.id);assert.equal(canonical(c),e.cases[c.id],c.id+' full human object');human++;}
  const start=stories.indexOf('## '+row.id+':');assert(start>previous,row.id+' rendered order');previous=start;const next=stories.indexOf('\n## R1-',start+1),section=stories.slice(start,next<0?undefined:next);assert(section.includes(JSON.stringify(row.contract,null,2)),row.id+' complete current render');assert(section.includes('https://scubapig.atlassian.net/browse/'+key));
  for(const dep of row.contract.prerequisites){if(mapping[dep.ticket])assert(ids.indexOf(dep.ticket)<ids.indexOf(row.id),row.id+' included prerequisite order');else external.add(dep.ticket);}
 }
 assert.equal(human,166);assert.equal(seen.size,166);assert.deepEqual([...external].sort(),e.external);
 const edges=new Map();for(const n of nodes)for(const l of n.fields.issuelinks??[]){const v={id:l.id,type_id:l.type.id,type_name:l.type.name,inward_label:l.type.inward,outward_label:l.type.outward,from:l.inwardIssue?.key??n.key,to:l.outwardIssue?.key??n.key};if(edges.has(v.id))assert.deepEqual(edges.get(v.id),v);else edges.set(v.id,v);}
 assert.equal(edges.size,127);assert.equal(canonical([...edges.values()]),e.links);assert.deepEqual(p.dependency_links,[...edges.values()]);
 const dependencies=drafts.flatMap(row=>row.contract.prerequisites.map(dep=>{const from=mapping[dep.ticket]??dep.ticket,to=mapping[row.id],matches=[...edges.values()].filter(l=>l.from===from&&l.to===to&&l.type_id==='10000'&&l.type_name==='Blocks');assert.equal(matches.length,1);return{from,to,required_outcome:dep.required_outcome,link_id:matches[0].id,scope:mapping[dep.ticket]?'included':'external_native_key_retained'};}));
 assert.equal(dependencies.length,107);assert.equal(canonical([...dependencies].sort((x,y)=>x.link_id.localeCompare(y.link_id))),canonical([...a.native_reconciliation.scoped_prerequisites].sort((x,y)=>x.link_id.localeCompare(y.link_id))));assert.equal(canonical(a.native_reconciliation.scoped_prerequisites),e.prerequisites);
 assert.equal(canonical(a.native_reconciliation.non_scope),e.nonScope);for(const row of a.native_reconciliation.non_scope){const raw=nodes.find(n=>n.key===row.key);assert(raw);assert.equal(raw.id,row.id);assert.equal(raw.fields.summary,row.summary);assert.equal(raw.fields.status.name,row.status);assert.equal(sha(raw.fields.description??''),row.description_sha256);assert(!Object.values(mapping).includes(row.key));assert(!stories.includes('https://scubapig.atlassian.net/browse/'+row.key));}
 const original81=drafts.find(r=>r.id==='R1-11').contract,fixture=JSON.parse(await readFile(new URL('../test/fixtures/manager-repairs.json',import.meta.url),'utf8'));assert.deepEqual(original81.testing_strategy.human_review.cases,fixture.native_cases);assert.equal(original81.acceptance_criteria.length,4);assert.equal(original81.technical_acceptance_criteria.constraints.length,2);
 assert.equal(canonical(original81.testing_strategy),"91053d460bea8b41774a5aa6bf11ea56e2b8f8439f3444e0c8f0f3a67f685b9c");
});

test('PGB-147 installed inspection keeps the complete PGB-81 predecessor and current scoped contract',async()=>{
 const sha=value=>createHash('sha256').update(value).digest('hex');
 const files=Object.keys(pre147Digests);for(const name of files)await pre147Capture(name);
 const publication=JSON.parse(await readFile(new URL('../docs/delivery/manager-r1/publication.json',import.meta.url),'utf8'));
 const prior=await pre147Capture('publication.json'),a=publication.installed_issue_inspection_amendment;
 assert.equal(Object.keys(prior).length,38);assert.equal(Object.keys(publication).length,39);
 assert.deepEqual([a.story_id,a.native_key,a.plan_sha256,a.predecessor.commit,a.predecessor.tree],['R1-33','PGB-147','66e0c419a7cdd87106b1f1fc194a0464a68c6d6077899d65ebe6920610a8529b','850e0127c4f2105d7cb564efa868c70dd600b521','857ac885534b41d4c3ae640b9b1f2b280a55c23c']);
 assert.equal(a.predecessor.status,prior.status);assert.deepEqual(a.predecessor.verification,prior.installed_repair_preview_amendment.verification);
 const expectedStatus='42-Story scoped source checkpoint with installed named-issue inspection; acceptance, current-head checks and release are recorded separately.';
 assert.equal(publication.status,expectedStatus);assert.equal(publication.current_source_scope.status,expectedStatus);assert.deepEqual(publication.current_source_scope.forecast_days,{min:58.45875,max:64.97125});
 assert.deepEqual([publication.story_count,publication.case_count,publication.requirement_count,publication.scenario_count],[42,166,53,41]);
 const restored=structuredClone(publication);restored.status=prior.status;restored.current_source_scope.status=prior.current_source_scope.status;restored.current_source_scope.forecast_days=prior.current_source_scope.forecast_days;delete restored.installed_issue_inspection_amendment;assert.deepEqual(restored,prior,'all predecessor publication fields and amendments retained');
 const metadata=JSON.parse(await readFile(new URL('../docs/delivery/manager-r1/plan-metadata.json',import.meta.url),'utf8')),oldMetadata=await pre147Capture('plan-metadata.json');const row=metadata.find(r=>r.id==='R1-33'),oldRow=oldMetadata.find(r=>r.id==='R1-33');assert(row&&oldRow);
 assert.deepEqual(row.files,['ARCHITECTURE.md','README.md','config/skill-bundle.json','docs/delivery/manager-r1/README.md','docs/delivery/manager-r1/plan-metadata.json','docs/delivery/manager-r1/publication.json','docs/manager-preview.md','docs/product/README.md','test/fixtures/jira-preview-harness.mjs','test/qa-helper-contract.test.mjs','test/skill-distribution.test.mjs','test/story-authoring.test.mjs']);
 assert.deepEqual(row.hours,{min:8.55,max:11.9});assert.equal(row.days,1.4875);assert.deepEqual(row.forecast_provenance,{...oldRow.forecast_provenance,min_days:'1.06875',max_days:'1.48750',plan_sha256:a.plan_sha256});assert(row.delivery_state.includes('Human acceptance NOT_RUN (0/4)'));
 const oldify=structuredClone(metadata);oldify[metadata.findIndex(r=>r.id==='R1-33')]=oldRow;assert.deepEqual(oldify,oldMetadata,'only R1-33 metadata changed');
 const drafts=JSON.parse(await readFile(new URL('../docs/delivery/manager-r1/ticket-drafts.json',import.meta.url),'utf8'));assert.deepEqual(drafts,await pre147Capture('ticket-drafts.json'));const native=drafts.find(r=>r.id==='R1-33').contract;assert.deepEqual([native.acceptance_criteria.length,native.technical_acceptance_criteria.constraints.length,native.testing_strategy.human_review.cases.length],[5,4,4]);
 const bundle=JSON.parse(await readFile(new URL('../config/skill-bundle.json',import.meta.url),'utf8')),oldBundle=await pre147Capture('config/skill-bundle.json'),added=['lib/jira/read.mjs','test/fixtures/jira-preview-harness.mjs','test/fixtures/jira-preview-cases.json','test/fixtures/jira-preview-tls.json'];assert.deepEqual(bundle.validatorPayload.sources,[...oldBundle.validatorPayload.sources,...added]);assert.deepEqual({...bundle,validatorPayload:{...bundle.validatorPayload,sources:oldBundle.validatorPayload.sources}},oldBundle);assert.deepEqual(a.payload.sources,bundle.validatorPayload.sources);assert.equal(bundle.validatorPayload.sources.length,41);assert.equal(bundle.skills.length,22);assert.equal(bundle.dependencyDirectories.length,3);
 const runtime=bundle.validatorPayload.sources.filter(f=>f.endsWith('.mjs')||f.endsWith('.schema.json')||['package.json','package-lock.json'].includes(f)).sort();assert.deepEqual(a.runtime.paths,runtime);assert.equal(runtime.length,27);assert.deepEqual(a.runtime.preserved_predecessor25_artifacts_sha256,prior.installed_repair_preview_amendment.source_runtime_revision.artifacts_sha256);assert.equal(Object.keys(a.runtime.preserved_predecessor25_artifacts_sha256).length,25);
 for(const file of bundle.validatorPayload.sources){const actual=sha(await readFile(new URL('../'+file,import.meta.url)));assert.equal(a.payload.artifacts_sha256[file],actual,file+' current payload');}for(const file of runtime)assert.equal(a.runtime.artifacts_sha256[file],sha(await readFile(new URL('../'+file,import.meta.url))),file+' current runtime');for(const [file,digest]of Object.entries(a.runtime.preserved_predecessor25_artifacts_sha256))assert.equal(sha(await readFile(new URL('../'+file,import.meta.url))),digest,file+' still live');
 assert.equal(a.literal_packet.cases_sha256,sha(await readFile(new URL('../test/fixtures/jira-preview-cases.json',import.meta.url))));assert.equal(a.literal_packet.tls_sha256,sha(await readFile(new URL('../test/fixtures/jira-preview-tls.json',import.meta.url))));assert.deepEqual([a.literal_packet.variants,a.literal_packet.controls,a.literal_packet.private_projection],[35,8,1]);
 const oldDelivery=await pre147Capture('docs/delivery/manager-r1/README.md'),oldGuide=await pre147Capture('docs/manager-preview.md');assert(oldDelivery.includes('58.33375–64.76500 days'));assert(oldGuide.includes('source checkout provides'));const delivery=await readFile(new URL('../docs/delivery/manager-r1/README.md',import.meta.url),'utf8'),product=await readFile(new URL('../docs/product/README.md',import.meta.url),'utf8');assert(delivery.includes('58.45875–64.97125 days'));assert(delivery.includes('5845875/6497125'));assert(product.includes('58.45875–64.97125-day forecast'));assert(product.includes('NOT_RUN (0/4)'));
 assert.equal(a.verification.activation_authorized,false);assert.equal(a.verification.human_acceptance,'NOT_RUN (0/4)');
});
