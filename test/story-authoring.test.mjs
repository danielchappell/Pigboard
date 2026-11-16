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
  const drafts=beforeReadConfiguration(JSON.parse(await source('docs/delivery/manager-r1/ticket-drafts.json')),'drafts');
  const metadata=beforeReadConfiguration(JSON.parse(await source('docs/delivery/manager-r1/plan-metadata.json')),'metadata');
  const publication=beforeReadConfiguration(JSON.parse(await source('docs/delivery/manager-r1/publication.json')),'publication');
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
 const load=async name=>JSON.parse(await readFile(new URL('../docs/delivery/manager-r1/'+name,import.meta.url),'utf8'));
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
