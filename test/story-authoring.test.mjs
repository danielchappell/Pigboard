import { createHash } from 'node:crypto';
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

// Reverse only the asserted PGB-145 additive amendment for dated historical guards.
function beforeReadConfiguration(value,kind) {
 const prior=structuredClone(value);
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
 const drafts=await load('ticket-drafts.json'),metadata=await load('plan-metadata.json'),p=await load('publication.json'),a=p.read_configuration_amendment;
 assert.equal(drafts.length,30);assert.equal(new Set(drafts.map(x=>x.id)).size,30);assert.deepEqual(drafts.map(x=>x.id),metadata.map(x=>x.id));assert.equal(drafts[drafts.findIndex(x=>x.id==='R1-21')+1].id,'R1-31');
 assert.equal(readConfigHash(drafts),'2346cacf0b501580a2f9284d49068a82926c0b04ee9f5e74e0c1bc50104f8f62');assert.equal(a.current_drafts_sha256,readConfigHash(drafts));
 const story=drafts.find(x=>x.id==='R1-31'),plan=metadata.find(x=>x.id==='R1-31'),contract=story.contract;
 assert.equal(readConfigHash(story),'c8edf2b1a30c246b6010c8427c5253f66dcd2b43579509f17e758e3b6cf17a81');assert.equal(a.source_contract_sha256,readConfigHash(story));assert.deepEqual(contract.prerequisites,[{ticket:'R1-21',required_outcome:'ai_qa_complete'}]);assert.deepEqual(plan.dependencies,['R1-21']);
 assert.equal(contract.acceptance_criteria.length,6);assert.equal(contract.technical_acceptance_criteria.constraints.length,7);assert.equal(contract.testing_strategy.human_review.cases.length,4);assert.deepEqual(contract.testing_strategy.cases,[]);assert.deepEqual(plan.hours,{min:12.25,max:15.25});assert.equal(plan.files.length,20);assert.equal(new Set(plan.files).size,20);assert.equal(plan.days,1.90625);assert.equal(Number(metadata.reduce((n,x)=>n+x.days,0).toFixed(5)),50.1475);
 assert.deepEqual([p.story_count,p.case_count,p.requirement_count,p.scenario_count],[30,132,53,41]);assert.equal(drafts.reduce((n,x)=>n+x.contract.testing_strategy.cases.length+x.contract.testing_strategy.human_review.cases.length,0),132);assert.equal(Object.keys(p.stories).length,30);assert.equal(new Set(Object.values(p.stories)).size,30);assert.equal(p.stories['R1-31'],'PGB-145');assert(!drafts.some(x=>['R1-29','R1-32'].includes(x.id)));assert.deepEqual(p.current_source_scope.pending_source_amendments,['PGB-137']);assert.deepEqual([p.current_source_scope.native_snapshot.story_count,p.current_source_scope.native_snapshot.case_count],[31,134]);
 assert.equal(a.native_id,'10605');assert.equal(a.parent,'PGB-66');assert.equal(a.native_publication_verified,true);assert.equal(a.human_acceptance,'NOT_RUN');assert.equal(a.activation_authorized,false);assert.equal(a.original82_body_preserved_except_prerequisite,true);assert.equal(a.original82_cases,4);
 assert.deepEqual(a.dependency_links,[{id:'10728',type_id:'10000',from:'PGB-99',to:'PGB-145'},{id:'10729',type_id:'10000',from:'PGB-145',to:'PGB-82'}]);for(const edge of a.dependency_links)assert(p.dependency_links.some(x=>JSON.stringify(x)===JSON.stringify(edge)));
 assert.equal(a.description_sha256.body,'365029d6439052f74217db9f4b56bfdb535234cb20901fc785a55891027fe483');assert.equal(a.description_sha256.original82_before,'d5357e7018361264d0d730b56b8dedf419efcba0c42202463ba035aef399c1de');assert.equal(a.description_sha256.original82_after,'682017a9f3efa4c70bdc4f903edcd5c77c3587c65b72bd1f18ff891e57003c7b');
 const old=beforeReadConfiguration(drafts,'drafts').find(x=>x.id==='R1-12').contract;assert.equal(readConfigHash(old),'b33f93b3b47fa68e023c06e2e340047219090ee365712633823d19deab9d7813');assert.equal(old.acceptance_criteria.length,5);assert.equal(old.technical_acceptance_criteria.constraints.length,3);assert.equal(old.testing_strategy.human_review.cases.length,4);
 const result=validateWork(JSON.stringify(contract),{mode:'structure'});assert.equal(result.valid,true,JSON.stringify(result.diagnostics));assert.equal(result.readiness,'not_evaluated');
 for(const f of ['docs/product/coverage.md','docs/delivery/manager-r1/coverage.md']){const text=await readFile(new URL('../'+f,import.meta.url),'utf8');for(const [id,cases]of Object.entries({O03:['H01','H02','H03'],O09:['H02','H04'],A12:['H02','H04'],O13:['H01'],M14:['H04']}))for(const c of cases)assert(text.split('\n').find(l=>l.startsWith('| '+id+' |')).includes('R1-31-'+c));}
 const stories=await readFile(new URL('../docs/delivery/manager-r1/stories.md',import.meta.url),'utf8');assert(stories.indexOf('## R1-21:')<stories.indexOf('## R1-31:'));assert(stories.indexOf('## R1-31:')<stories.indexOf('## R1-05:'));assert(stories.includes(JSON.stringify(contract,null,2)));
});
