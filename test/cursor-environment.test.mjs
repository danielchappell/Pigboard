import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installCursorSkills } from '../scripts/install-cursor-skills.mjs';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
const bundle = JSON.parse(await readFile(new URL('../config/skill-bundle.json', import.meta.url)));
async function fixture(t) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'pigboard-env-'));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const source = path.join(tmp, 'source'), app = path.join(tmp, 'app'), root = path.join(tmp, 'installed');
  await mkdir(source); await mkdir(app);
  git(source, 'init', '-b', 'main');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  for (const name of bundle.skills) await cp(new URL(`../skills/${name}`, import.meta.url), path.join(source, 'skills', name), { recursive: true, filter: file => !file.includes('node_modules') });
  for (const relative of bundle.validatorPayload.sources) {
    const target = path.join(source, relative); await mkdir(path.dirname(target), { recursive:true });
    await cp(new URL('../' + relative, import.meta.url), target);
  }
  git(source, 'add', '.'); git(source, 'commit', '-m', 'fixture');
  return { source, app, root, ref: 'main' };
}
async function fakeInstall(dir) {
  if (path.basename(dir) === 'work-validator') { await cp(new URL('../node_modules', import.meta.url), path.join(dir,'node_modules'), { recursive:true }); return; }
  const declared = JSON.parse(await readFile(path.join(dir, 'package.json'))).dependencies;
  for (const [name, version] of Object.entries(declared)) {
    const module = path.join(dir, 'node_modules', name);
    await mkdir(module, { recursive: true });
    await writeFile(path.join(module, 'package.json'), JSON.stringify({ name, version, main: 'index.cjs', bin: { bru: 'cli.cjs' } }));
    await writeFile(path.join(module, 'index.cjs'), 'exports.Client = class Client {};');
    await writeFile(path.join(module, 'cli.cjs'), `console.log(${JSON.stringify(version)});`);
  }
}
test('install and refresh expose verified skills without changing app or older release', async t => {
  const o = await fixture(t);
  const first = await installCursorSkills(o, fakeInstall);
  assert.equal(await realpath(first.stableSkills), first.skills);
  assert.equal(first.verification.entrypoints, 20);
  for (const relative of ['write-pr-sized-stories/SKILL.md', 'write-pr-sized-stories/references/pigboard-ticket.md', 'write-pr-sized-stories/references/pigboard-example.md']) {
    assert.equal(await readFile(path.join(first.stableSkills, relative), 'utf8'), await readFile(path.join(o.source, 'skills', relative), 'utf8'));
  }
  const previous = await readFile(path.join(first.skills, 'qa-api/SKILL.md'), 'utf8');
  await writeFile(path.join(o.source, 'skills/qa-api/SKILL.md'), previous + '\nUpdated fixture.\n');
  git(o.source, 'add', '.'); git(o.source, 'commit', '-m', 'refresh');
  const next = await installCursorSkills(o, fakeInstall);
  assert.notEqual(first.commit, next.commit);
  assert.equal(await realpath(first.stableSkills), next.skills);
  assert.equal(await readFile(path.join(first.skills, 'qa-api/SKILL.md'), 'utf8'), previous);
  assert.deepEqual(await readdir(o.app), []);
});
test('failed fetch, dependency smoke check and changed source preserve previous binding', async t => {
  const o = await fixture(t);
  const first = await installCursorSkills(o, fakeInstall);
  await assert.rejects(installCursorSkills({ ...o, ref: 'missing' }, fakeInstall));
  await assert.rejects(installCursorSkills(o, async dir => {
    await fakeInstall(dir);
    if (dir.includes('qa-bruno')) await writeFile(path.join(dir, 'node_modules/@usebruno/cli/cli.cjs'), 'process.exit(1);');
  }), /smoke check/);
  await assert.rejects(installCursorSkills(o, async dir => {
    await fakeInstall(dir);
    await writeFile(path.join(dir, '../SKILL.md'), 'unexpected modification');
  }), /hash mismatch/);
  assert.equal(await realpath(first.stableSkills), first.skills);
  assert.deepEqual((await readdir(o.root)).sort(), ['releases', 'skills']);
});
test('unsafe roots and unmanaged destinations are rejected before preparation', async t => {
  const o = await fixture(t);
  await assert.rejects(installCursorSkills({ ...o, root: path.parse(o.app).root }, fakeInstall), /separate/);
  await assert.rejects(installCursorSkills({ ...o, root: path.join(o.app, 'unsafe') }, fakeInstall), /separate/);
  await assert.rejects(installCursorSkills({ ...o, root: path.dirname(o.app) }, fakeInstall), /separate/);
  await assert.rejects(installCursorSkills({ ...o, root: path.join(o.source, 'unsafe') }, fakeInstall), /Git checkout/);
  await symlink(o.app, o.root);
  await assert.rejects(installCursorSkills(o, fakeInstall), /symlink/);
  await rm(o.root); await mkdir(o.root); await mkdir(path.join(o.root, 'skills'));
  await assert.rejects(installCursorSkills(o, fakeInstall), /unmanaged/);
  await rm(path.join(o.root, 'skills'), { recursive: true });
  await symlink(o.app, path.join(o.root, 'skills'));
  await assert.rejects(installCursorSkills(o, fakeInstall), /unmanaged/);
  assert.deepEqual(await readdir(o.root), ['skills']);
});
test('real installed validator runs outside checkout and failed runtime variants preserve stable link',async t=>{
 const o=await fixture(t), first=await installCursorSkills(o,fakeInstall);
 assert.deepEqual(first.verification.smokeChecks,['pg.Client','bru --version','work-validator epic draft','work-validator ticket draft','handoff-validator admission record','config-validator project scope']);
 const validator=path.join(first.stableSkills,'work-validator');
 const pair=JSON.parse(await readFile(new URL('./fixtures/work-semantics.json',import.meta.url),'utf8')).mixed;
 const workFile=path.join(o.app,'work.json'),contextFile=path.join(o.app,'facts.json');
 await writeFile(workFile,JSON.stringify(pair.work));await writeFile(contextFile,JSON.stringify(pair.context));
 const start=()=>execFileSync(process.execPath,[path.join(validator,'scripts/validate-work.mjs'),'--mode','start','--input',workFile,'--context',contextFile,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000});
 assert.equal(JSON.parse(start()).valid,true);
 const originalRepository=pair.work.technical_acceptance_criteria.repository.url;
 for(const repository of ['https://example.invalid/a%20b','https://example.invalid/raw space']){
  pair.work.technical_acceptance_criteria.repository.url=repository;pair.context.repositories[0].url=repository;
  const input=JSON.stringify(pair.work),facts=JSON.stringify(pair.context);await writeFile(workFile,input);await writeFile(contextFile,facts);
  if(repository.includes('%20'))assert.equal(JSON.parse(start()).valid,true);
  else assert.throws(start,error=>{assert.equal(error.status,1);const r=JSON.parse(error.stdout);assert(r.diagnostics.some(d=>d.code==='LEDGER_FIELD'&&d.path==='/technical_acceptance_criteria/repository/url'));assert.equal(r.ledger_budget.ai_steps,4);assert.equal(r.ledger_budget.human_cases,1);assert.equal(r.ledger_budget.omitted_entries,0);return true;});
  assert.equal(await readFile(workFile,'utf8'),input);assert.equal(await readFile(contextFile,'utf8'),facts);
 }
 pair.work.technical_acceptance_criteria.repository.url=originalRepository;pair.context.repositories[0].url=originalRepository;await writeFile(workFile,JSON.stringify(pair.work));await writeFile(contextFile,JSON.stringify(pair.context));
 pair.context.operations[0].contract.action='Stale reviewed prescription.';await writeFile(contextFile,JSON.stringify(pair.context));
 assert.throws(start,error=>{assert.equal(error.status,2);assert(JSON.parse(error.stdout).diagnostics.some(d=>d.code==='CONTEXT_OPERATION'));return true;});
 assert.equal(await realpath(first.stableSkills),first.skills);
 await rm(workFile);await rm(contextFile);
 for(const mode of ['draft','structure']) {
  const output=execFileSync(process.execPath,[path.join(validator,'scripts/validate-work.mjs'),'--mode',mode,'--input',path.join(validator,'docs/architecture/examples/manager-ticket-populated.yaml'),'--json'],{cwd:o.app,encoding:'utf8',timeout:30000});assert.equal(JSON.parse(output).valid,true);
 }
 for(const mutate of [
  async dir=>rm(path.join(dir,'node_modules/yaml'),{recursive:true}),
  async dir=>rm(path.join(dir,'node_modules/ajv-formats'),{recursive:true}),
  async dir=>writeFile(path.join(dir,'node_modules/ajv-formats/package.json'),'{"version":"0.0.0"}'),
  async dir=>writeFile(path.join(dir,'node_modules/ajv-formats/dist/index.js'),'throw Error("corrupt formats runtime");'),
  async dir=>rm(path.join(dir,'lib/contracts/work-semantics.mjs')),
  async dir=>writeFile(path.join(dir,'lib/contracts/case-graph.mjs'),'throw Error("corrupt semantics");'),
  async dir=>rm(path.join(dir,'contracts/work-validation-context-v1.schema.json')),
  async dir=>writeFile(path.join(dir,'config/skill-bundle.json'),'{}'),
  async dir=>writeFile(path.join(dir,'node_modules/yaml/package.json'),'{"version":"0.0.0"}'),
  async dir=>writeFile(path.join(dir,'node_modules/yaml/dist/index.js'),'throw Error("corrupt runtime");'),
  async dir=>writeFile(path.join(dir,'scripts/validate-work.mjs'),'process.exit(0);'),
  async dir=>{const p=JSON.parse(await readFile(path.join(dir,'package.json')));p.dependencies.yaml='^2.9.1';await writeFile(path.join(dir,'package.json'),JSON.stringify(p));},
 ]) {
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));
  assert.equal(await realpath(first.stableSkills),first.skills);
 }
 assert.deepEqual(await readdir(o.app),[]);
 const refreshed=await installCursorSkills(o,fakeInstall);assert.equal(await realpath(refreshed.stableSkills),refreshed.skills);
 assert.equal(JSON.parse(execFileSync(process.execPath,[path.join(first.skills,'work-validator/scripts/validate-work.mjs'),'--mode','draft','--input',path.join(first.skills,'work-validator/docs/architecture/examples/manager-epic.yaml'),'--json'],{encoding:'utf8',timeout:30000})).valid,true);
});

test('installed writer ships full hashed folders and validates its own templates/examples outside the checkout', async t => {
  const o = await fixture(t), installed = await installCursorSkills(o, fakeInstall);
  const { createHash } = await import('node:crypto');
  async function inventory(dir, prefix = '') {
    const result = {};
    for (const entry of await readdir(path.join(dir, prefix), { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) Object.assign(result, await inventory(dir, relative));
      else {
        assert(entry.isFile(), relative);
        result[relative] = createHash('sha256').update(await readFile(path.join(dir, relative))).digest('hex');
      }
    }
    return result;
  }
  for (const name of ['write-pr-sized-stories', 'human-writing', 'implementer-entrypoint', 'implementer-job', 'implementer-jira']) {
    const target = path.join(installed.skills, name);
    const sourceFiles = await inventory(path.join(o.source, 'skills', name));
    assert.deepEqual(await inventory(target), sourceFiles);
    // Validate all local Markdown links in these complete installed folders.
    for (const relative of Object.keys(sourceFiles).filter(p => p.endsWith('.md'))) {
      const markdown = await readFile(path.join(target, relative), 'utf8');
      for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const [link, anchor] = match[1].split('#');
        if (/^[a-z][a-z0-9+.-]*:/i.test(link)) continue;
        const resolved = link ? path.resolve(target, path.dirname(relative), decodeURIComponent(link)) : path.join(target, relative);
        assert(resolved.startsWith(installed.skills + path.sep), `${relative}: ${link} escapes bundle`);
        const linked = await readFile(resolved, 'utf8');
        if (anchor) assert(linked.split('\n').some(line => line.startsWith('#') && line.replace(/^#+ /, '').toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-') === anchor), `${relative}: missing ${anchor}`);
      }
    }
  }
  // Follow the actual help guide copied into work-validator, not an independently
  // constructed writer path. Each column explicitly applies to one layout only.
  const guidePath = path.join(installed.skills, 'work-validator/docs/authoring.md');
  const guide = await readFile(guidePath, 'utf8');
  assert.equal(guide, await readFile(new URL('../docs/authoring.md', import.meta.url), 'utf8'));
  const routes = [...guide.matchAll(/^\| ([^|]+) \| \[Source [^\]]+\]\(([^)]+)\) \| \[Installed [^\]]+\]\(([^)]+)\) \|$/gm)];
  assert.equal(routes.length, 5, 'all five source/installed help routes must be explicit');
  const installedRoutes = {};
  for (const [, label, sourceLink, installedLink] of routes) {
    const sourcePath = new URL('../docs/' + sourceLink, import.meta.url);
    const installedPath = path.resolve(path.dirname(guidePath), installedLink);
    assert(installedPath.startsWith(installed.skills + path.sep), label);
    assert(!installedPath.startsWith(path.join(installed.skills, 'work-validator') + path.sep), label);
    assert.equal(await readFile(installedPath, 'utf8'), await readFile(sourcePath, 'utf8'), label);
    installedRoutes[label.trim()] = installedPath;
  }
  const writer = path.dirname(installedRoutes['Writer entrypoint']);
  assert.equal(writer, path.join(installed.skills, 'write-pr-sized-stories'));
  const expectedReferences = ['basic-workflow-ticket.md', 'epic.yaml', 'ticket.yaml', 'pigboard-epic.md', 'pigboard-ticket.md', 'pigboard-example.md'];
  const references = await readdir(path.join(writer, 'references'));
  for (const name of expectedReferences) assert(references.includes(name), name);
  const cli = path.join(installed.skills, 'work-validator/scripts/validate-work.mjs');
  function run(mode, input, context, expected = 0) {
    try {
      const result = JSON.parse(execFileSync(process.execPath, [cli, '--mode', mode, '--input', input, ...(context ? ['--context', context] : []), '--json'], { cwd: o.app, encoding: 'utf8', timeout: 30000 }));
      assert.equal(expected, 0); assert.equal(result.valid, true); assert.equal(result.readiness, 'not_evaluated');
      return result;
    } catch (error) {
      if (error.status !== expected) throw error;
      const result = JSON.parse(error.stdout); assert.equal(result.valid, false);
      return result;
    }
  }
  for (const kind of ['epic', 'ticket']) {
    const input = installedRoutes[kind === 'epic' ? 'Epic template' : 'Ticket template'], before = await readFile(input, 'utf8');
    run('draft', input);
    const incomplete = run('structure', input, null, 1);
    assert(incomplete.diagnostics.some(d => d.path === '/problem_to_solve'));
    assert.equal(await readFile(input, 'utf8'), before);
  }
  const example = await readFile(installedRoutes['Complete briefs, work and contexts'], 'utf8');
  const blocks = [...example.matchAll(/<!-- example:(epic|mixed|human):(work|context) -->\n```yaml\n([\s\S]*?)```/g)];
  assert.equal(blocks.length, 6);
  const files = {};
  for (const [, name, kind, text] of blocks) {
    const file = path.join(o.app, `${name}-${kind}.yaml`);
    await writeFile(file, text); files[`${name}-${kind}`] = { file, text };
  }
  for (const name of ['epic', 'mixed', 'human']) {
    const { file } = files[`${name}-work`], context = files[`${name}-context`].file;
    run('draft', file); run('structure', file);
    const result = run('start', file, context);
    if (name !== 'epic') {
      assert.equal(result.ledger_budget.ai_steps, name === 'mixed' ? 4 : 0);
      assert.equal(result.ledger_budget.human_cases, 1);
      assert.equal(result.ledger_budget.omitted_entries, 0);
    }
  }
  for (const { file, text } of Object.values(files)) assert.equal(await readFile(file, 'utf8'), text);
  for (const name of ['write-pr-sized-stories', 'human-writing', 'implementer-entrypoint', 'implementer-job', 'implementer-jira']) assert.deepEqual(await inventory(path.join(installed.skills, name)), await inventory(path.join(o.source, 'skills', name)));
});


test('installed receipt validator runs a complete repaired stack with real copied dependencies',async t=>{
 const o=await fixture(t), first=await installCursorSkills(o,fakeInstall),validator=path.join(first.stableSkills,'work-validator'),input=path.join(o.app,'receipts.json');
 const envelope=JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json',import.meta.url),'utf8')).chains.stack,raw=JSON.stringify(envelope);await writeFile(input,raw);
 const result=JSON.parse(execFileSync(process.execPath,[path.join(validator,'scripts/validate-handoff.mjs'),'--mode','chain','--input',input,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000}));
 assert.equal(result.valid,true);assert.equal(result.completion_established,true);assert.deepEqual(result.validated_leaf,envelope.target);assert.equal(result.ai_steps,0);assert.equal(result.human_pending.length,1);assert.equal(await readFile(input,'utf8'),raw);await rm(input);
 assert.equal(await readFile(path.join(validator,'docs/handoffs.md'),'utf8'),await readFile(new URL('../docs/handoffs.md',import.meta.url),'utf8'));
 for(const mutate of [
  async dir=>rm(path.join(dir,'node_modules/canonicalize'),{recursive:true}),
  async dir=>writeFile(path.join(dir,'node_modules/canonicalize/lib/canonicalize.js'),'export default () => "wrong";'),
  async dir=>rm(path.join(dir,'node_modules/parse5'),{recursive:true}),
  async dir=>writeFile(path.join(dir,'node_modules/parse5/dist/index.js'),'throw Error("corrupt parser");'),
  async dir=>rm(path.join(dir,'contracts/handoff-v1.schema.json')),
  async dir=>rm(path.join(dir,'contracts/work-pointer-v1.schema.json')),
  async dir=>writeFile(path.join(dir,'lib/contracts/receipts.mjs'),'throw Error("corrupt chain");'),
  async dir=>writeFile(path.join(dir,'scripts/validate-handoff.mjs'),'process.exit(0);'),
 ]){
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));
  assert.equal(await realpath(first.stableSkills),first.skills);
 }
 assert.deepEqual(await readdir(o.app),[]);
});


test('installed config checker validates and previews outside checkout; corrupt config runtime preserves binding',async t=>{
 const o=await fixture(t),first=await installCursorSkills(o,fakeInstall),validator=path.join(first.skills,'work-validator');
 const config=JSON.parse(await readFile(new URL('./fixtures/project-configs.json',import.meta.url),'utf8')).two_project;
 const input=path.join(o.app,'scope.json'),previous=path.join(o.app,'previous.json');
 await writeFile(previous,JSON.stringify(config));config.projects[0].key='RENAMED';await writeFile(input,JSON.stringify(config));
 const run=args=>execFileSync(process.execPath,[path.join(validator,'scripts/check-config.mjs'),'--input',input,...args,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000});
 const checked=JSON.parse(run(['--label','AI-Daniel-1']));assert.equal(checked.valid,true);assert.equal(checked.resolved_scope.projects.length,2);assert.notEqual(checked.streams[0].key,checked.streams[1].key);
 const preview=JSON.parse(run(['--previous',previous]));assert.equal(preview.preview.status,'review_required');assert.equal(preview.preview.display_changed.length,1);assert.deepEqual(preview.preview.state_actions,[]);
 await writeFile(input,'token: SECRET-INSTALLED');assert.throws(()=>run([]),error=>error.status===1&&!error.stdout.toString().includes('SECRET-INSTALLED'));
 for(const mutate of [async dir=>rm(path.join(dir,'lib/config/projects.mjs')),async dir=>writeFile(path.join(dir,'lib/config/parse.mjs'),'throw Error("corrupt config")'),async dir=>rm(path.join(dir,'contracts/config-v1.schema.json')),async dir=>writeFile(path.join(dir,'scripts/check-config.mjs'),'process.exit(0);')]){
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));assert.equal(await realpath(first.stableSkills),first.skills);
 }
 assert.equal(await readFile(input,'utf8'),'token: SECRET-INSTALLED');assert.equal(await readFile(previous,'utf8'),JSON.stringify(JSON.parse(await readFile(new URL('./fixtures/project-configs.json',import.meta.url),'utf8')).two_project));
});

test('installed composed implementer retains complete links and runs source-identical publication helper outside app', async t => {
 const o = await fixture(t), first = await installCursorSkills(o, fakeInstall);
 const { extractHandoff } = await import('../lib/contracts/handoff.mjs');
 const { createHash } = await import('node:crypto');
 const envelope = JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json', import.meta.url), 'utf8')).chains.human;
 const comment = envelope.comment_pages[0].comments.find(c => extractHandoff(c.body, {format:c.format}).value.kind === 'implementation');
 const record = extractHandoff(comment.body, {format:comment.format}).value;
 const input = path.join(o.app, 'record.yaml'), summary = path.join(o.app, 'summary.txt');
 const before = JSON.stringify(record), prose = `Ready <literal> &amp; 🐷`;
 await writeFile(input, before); await writeFile(summary, prose);
 const sourceCLI = new URL('../scripts/prepare-handoff.mjs', import.meta.url).pathname;
 const helper = path.join(first.skills, 'work-validator/scripts/prepare-handoff.mjs');
 const manifest = JSON.parse(await readFile(first.manifest, 'utf8'));
 assert(manifest.sourceFiles['work-validator/scripts/prepare-handoff.mjs'] || Object.keys(manifest.sourceFiles).some(k=>k.endsWith('scripts/prepare-handoff.mjs')));
 for (const format of ['html','adf']) {
  const args = ['--input', input, '--summary', summary, '--format', format];
  const installed = execFileSync(process.execPath, [helper, ...args], {cwd:o.app,encoding:'utf8',timeout:30000});
  const source = execFileSync(process.execPath, [sourceCLI, ...args], {cwd:o.app,encoding:'utf8',timeout:30000});
  assert.equal(installed, source);
  const result = JSON.parse(installed);
  const extracted = extractHandoff(format === 'html' ? result.body : JSON.stringify(result.body), {format});
  assert.equal(extracted.record_digest, result.record_digest);
  assert.deepEqual(JSON.parse(JSON.stringify(extracted.value)), JSON.parse(JSON.stringify(record)));
  // Use the actual prepared transport as the exact observed comment in a complete
  // supplied receipt chain; no synthetic provider success or agent run is inferred.
  const supplied = structuredClone(envelope);
  const actual = supplied.comment_pages[0].comments.find(c => c.id === comment.id);
  actual.format = format; actual.body = format === 'html' ? result.body : JSON.stringify(result.body);
  supplied.target = {ticket_id:record.ticket_id,comment_id:comment.id,record_id:record.record_id,digest:result.record_digest};
  supplied.issues[0].stage_id = supplied.trusted.projects[0].stages['In Progress'];
  const receiptInput = path.join(o.app,'receipts.json'); await writeFile(receiptInput,JSON.stringify(supplied));
  const validated = JSON.parse(execFileSync(process.execPath,[path.join(first.skills,'work-validator/scripts/validate-handoff.mjs'),'--mode','chain','--input',receiptInput,'--json'],{cwd:o.app,encoding:'utf8',timeout:30000}));
  assert.equal(validated.valid,true);assert.deepEqual(validated.validated_leaf,supplied.target);assert.equal(validated.qa_report,null);assert.equal(validated.completion_established,false);
  await rm(receiptInput);
 }
 assert.equal(await readFile(input,'utf8'), before);assert.equal(await readFile(summary,'utf8'), prose);
 await rm(input);await rm(summary);
 const original = await readFile(path.join(o.source,'scripts/prepare-handoff.mjs'));
 assert.equal(createHash('sha256').update(await readFile(helper)).digest('hex'),createHash('sha256').update(original).digest('hex'));
 for (const mutate of [
  async dir => rm(path.join(dir,'scripts/prepare-handoff.mjs')),
  async dir => writeFile(path.join(dir,'scripts/prepare-handoff.mjs'),'process.exit(0);'),
  async dir => rm(path.join(dir,'../implementer-job/SKILL.md')),
  async dir => writeFile(path.join(dir,'../implementer-jira/SKILL.md'),'corrupt sibling'),
 ]) {
  await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));
  assert.equal(await realpath(first.stableSkills),first.skills);
 }
 assert.deepEqual(await readdir(o.app),[]);
});

// Closure/encoding evidence only; instruction decisions are independently exercised.
test('reviewer sibling installation preserves complete folders and real formatter output from unrelated cwd',async t=>{
 const o=await fixture(t),first=await installCursorSkills(o,fakeInstall);
 for(const name of ['pigboard-pr-review','reviewer-jira','implementer-entrypoint']){
  async function compare(relative=''){
   for(const entry of await readdir(path.join(o.source,'skills',name,relative),{withFileTypes:true})){
    const sub=path.join(relative,entry.name);
    if(entry.isDirectory())await compare(sub);
    else assert.deepEqual(await readFile(path.join(first.skills,name,sub)),await readFile(path.join(o.source,'skills',name,sub)));
   }
  }
  await compare();
 }
 const guide=await readFile(path.join(first.skills,'work-validator/docs/handoffs.md'),'utf8');
 assert(guide.includes('[Installed reviewer](../../pigboard-pr-review/references/jira-handoff.md)'));
 assert.equal(await readFile(path.resolve(first.skills,'work-validator/docs/../../pigboard-pr-review/references/jira-handoff.md'),'utf8'),await readFile(path.join(o.source,'skills/pigboard-pr-review/references/jira-handoff.md'),'utf8'));
 const wrapper=await readFile(path.join(first.skills,'pigboard-pr-review/SKILL.md'),'utf8');
 assert(wrapper.includes('../reviewer-jira/SKILL.md'));
 for(const relative of ['implementer-entrypoint/SKILL.md','implementer-entrypoint/references/handoff.md']){
  const text=await readFile(path.join(first.skills,relative),'utf8');assert(text.includes('structured reviewer'));
 }
 const seeds=JSON.parse(await readFile(new URL('./fixtures/handoff-chains.json',import.meta.url))).chains;
 const {extractHandoff,digestValue}=await import('../lib/contracts/handoff.mjs');
 const record=seeds.human.comment_pages.flatMap(p=>p.comments).map(c=>extractHandoff(c.body,{format:c.format}).value).find(r=>r.kind==='review');
 const input=path.join(o.app,'review.json'),summary=path.join(o.app,'summary.txt');
 await writeFile(input,JSON.stringify(record));await writeFile(summary,'Complete review <literal> & exact implementation.');
 for(const format of ['html','adf']){
  const args=['--input',input,'--summary',summary,'--format',format];
  const installed=execFileSync(process.execPath,[path.join(first.skills,'work-validator/scripts/prepare-handoff.mjs'),...args],{cwd:o.app,encoding:'utf8'});
  const source=execFileSync(process.execPath,[new URL('../scripts/prepare-handoff.mjs',import.meta.url).pathname,...args],{cwd:o.app,encoding:'utf8'});
  assert.equal(installed,source);assert.equal(JSON.parse(installed).record_digest,digestValue(record));
 }
 await assert.rejects(installCursorSkills(o,async dir=>{
  await fakeInstall(dir);
  if(path.basename(dir)==='work-validator')await writeFile(path.join(dir,'../reviewer-jira/SKILL.md'),'corrupted reviewer sibling');
 }),/hash mismatch/);
 assert.equal(await realpath(first.stableSkills),first.skills);
 await rm(path.join(o.source,'skills/reviewer-jira'),{recursive:true});
 git(o.source,'add','.');git(o.source,'commit','-m','missing reviewer sibling');
 await assert.rejects(installCursorSkills(o,fakeInstall));
 assert.equal(await realpath(first.stableSkills),first.skills);
});
