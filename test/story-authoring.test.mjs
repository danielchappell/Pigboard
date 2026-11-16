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


// Dated catalogue/forecast reconstruction guards are withdrawn by the reduced
// release boundary. Authoring, raw schema and invocation-authority checks above remain.

test('ordinary implementer and reviewer share explicit worker proof and retained publication safety',async()=>{
 for(const name of ['implementer-entrypoint/SKILL.md','implementer-entrypoint/references/handoff.md','implementer-jira/SKILL.md','pigboard-pr-review/references/jira-handoff.md','reviewer-jira/SKILL.md']){
  const s=await readFile(new URL('../skills/'+name,import.meta.url),'utf8');for(const text of ['worker-current','Required repair','no mutation','Current own/required-parent/action proof','original canonical bytes/digest/UUID','without replay','No\nmanager completion grant'])assert(s.includes(text),name+': '+text);
 }
});
