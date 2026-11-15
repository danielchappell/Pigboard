import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
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
  assert.equal(first.verification.entrypoints, 15);
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
 assert.deepEqual(first.verification.smokeChecks,['pg.Client','bru --version','work-validator epic draft','work-validator ticket draft','handoff-validator admission record','config-validator project scope','manager-preview nonexecuting selection']);
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

test('installed manager preview runs all frozen complete snapshots with real copied dependencies and no input writes',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator');
 const {previewSnapshot}=await import('../lib/manager/decisions.mjs');
 const cases=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-candidates.json'))).cases;
 // Exercise the same native/schema boundary through installed ADF extraction.
 for(const fixture of cases.filter(c=>c.id.startsWith('native-'))){const c=structuredClone(fixture),i=c.snapshot.issues[c.id.startsWith('native-epic-')?0:1];c.id+='-adf';i.format='adf';i.body=JSON.stringify({type:'doc',version:1,content:[{type:'codeBlock',attrs:{language:'yaml'},content:[{type:'text',text:i.body}]}]});cases.push(c);}
 const config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),cli=path.join(validator,'scripts/manager-preview.mjs');
 for(const c of cases){const rawConfig=JSON.stringify(c.config),rawSnapshot=JSON.stringify(c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[cli,'--config',config,'--input',input,'--json',...(c.options?.expectedSnapshotDigest?['--expected-snapshot-digest',c.options.expectedSnapshotDigest]:[])];let output;try{output=execFileSync(process.execPath,args,{cwd:o.app,encoding:'utf8',timeout:30000});}catch(e){assert.equal(e.status,1);output=e.stdout.toString();}const result=JSON.parse(output);assert.deepEqual(result,previewSnapshot(rawConfig,rawSnapshot,c.options),c.id);assert.equal(result.streams.length,c.expected.streams.length);for(const expected of c.expected.streams){const actual=result.streams.find(s=>s.scope.project_id===expected.project_id&&s.scope.label===expected.label);assert.equal(actual.decision,expected.decision,c.id);assert.equal(actual.selected_ticket_id,expected.selected_ticket_id,c.id);assert.equal(actual.return_count,expected.return_count,c.id);if(expected.reason)assert.ok(actual.reasons.some(r=>r.code===expected.reason),c.id);if(c.id.startsWith('membership-')){assert.deepEqual(actual.scope,{site:c.snapshot.site,project_id:expected.project_id,label:expected.label});for(const field of ['occupied_ids','blocked_ids','human_review_ids','counts_complete'])if(Object.hasOwn(expected,field))assert.deepEqual(actual[field],expected[field],c.id+' '+field);for(const code of expected.reasons??[])assert.ok(actual.reasons.some(r=>r.code===code),c.id+' '+code);for(const code of expected.absent_reasons??[])assert.ok(!actual.reasons.some(r=>r.code===code),c.id+' '+code);if(expected.mismatch_path)assert.ok(actual.reasons.some(r=>r.code==='MEMBERSHIP_MISMATCH'&&r.path===expected.mismatch_path),c.id);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);}}assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);}
 // Literal owner/diagnostic oracles supplement source parity on actual copied runtime.
 for(const spec of ownershipCases(cases)){
  const rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);
  const args=[cli,'--config',config,'--input',input],invoke=json=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000});
  const output=invoke(true);assert.equal(output.status,spec.owners||['retained','wrong-declaration'].includes(spec.control)?1:0);assert.equal(output.stderr,'');assertOwnershipResult(JSON.parse(output.stdout),spec);assert.equal(invoke(true).stdout,output.stdout);
  if(spec.readable){const human=invoke(false);assert.equal(human.status,spec.owners||spec.control==='wrong-declaration'?1:0);assert.equal(human.stderr,'');assertOwnershipText(human.stdout,spec);assert.equal(invoke(false).stdout,human.stdout);}
  assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);
 }
 for(const spec of parentCases(cases)){
  const rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[cli,'--config',config,'--input',input],invoke=json=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000}),p=invoke(true);assert.equal(p.status,spec.valid?0:1);assert.equal(p.stderr,'');assertParentResult(JSON.parse(p.stdout),spec);assert.equal(invoke(true).stdout,p.stdout);if(spec.readable){const human=invoke(false);assert.equal(human.status,1);assert.equal(human.stderr,'');assertParentText(human.stdout);assert.equal(invoke(false).stdout,human.stdout);}assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);
 }
 for(const spec of obligationCases(cases)){
  const rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[cli,'--config',config,'--input',input],invoke=json=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000}),p=invoke(true);assert.equal(p.status,spec.decision==='hold'?1:0);assert.equal(p.stderr,'');assertObligationResult(JSON.parse(p.stdout),spec);assert.equal(invoke(true).stdout,p.stdout);if(spec.readable){const human=invoke(false);assert.equal(human.status,1);assert.equal(human.stderr,'');assertObligationText(human.stdout,spec);assert.equal(invoke(false).stdout,human.stdout);}assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);
 }
 const formatDir=await mkdtemp(path.join(os.tmpdir(),'installed-json-format-'));t.after(()=>rm(formatDir,{recursive:true,force:true}));
 const control=cases.find(c=>c.id==='S01'),literal=path.join(formatDir,'--json'),snapshot=path.join(formatDir,'snapshot.json'),hook=path.join(formatDir,'audit-open.mjs');
 await writeFile(literal,JSON.stringify(control.config));await writeFile(snapshot,JSON.stringify(control.snapshot));await writeFile(hook,"import fsp from 'node:fs/promises';import{syncBuiltinESMExports}from'node:module';let calls=0;fsp.open=async()=>{calls++;throw Error('AUDITED_INPUT_OPEN');};syncBuiltinESMExports();process.on('exit',()=>process.stderr.write('OPEN_ATTEMPTS='+calls+'\\n'));\n");
 const before=[await readFile(literal,'utf8'),await readFile(snapshot,'utf8')],invoke=(args,audit=false)=>spawnSync(process.execPath,[...(audit?['--import',hook]:[]),cli,...args],{cwd:formatDir,encoding:'utf8',timeout:5000});
 const malformed=[];for(const flag of ['--config','--input','--expected-site','--expected-snapshot-digest'])malformed.push([flag,'--json'],['--json',flag]);malformed.push(['--unknown','SECRET_INPUT_NEVER_OPENED','--json'],['--json','--json'],['--config',literal,'--config',literal,'--json']);
 for(const args of malformed){const p=invoke(args,true),r=JSON.parse(p.stdout);assert.equal(p.status,2);assert.equal(p.stderr,'OPEN_ATTEMPTS=0\n');assert.equal(r.schema,'pigboard-manager-preview/v1');assert.equal(r.valid,false);assert.equal(r.status,'invalid');assert.equal(r.scope_diagnostics[0].code,'USAGE');assert.deepEqual(r.streams,[]);assert.equal(r.execution_authorized,false);assert.equal(r.writes,0);assert.ok(!p.stdout.includes('SECRET_INPUT'));assert.ok(!p.stdout.includes(formatDir));const normal=invoke(args);assert.equal(normal.stdout,p.stdout);assert.equal(normal.stderr,'');}
 for(const flag of ['--config','--input','--expected-site','--expected-snapshot-digest']){const p=invoke([flag],true);assert.equal(p.status,2);assert.equal(p.stderr,'OPEN_ATTEMPTS=0\n');assert.match(p.stdout,/USAGE/);assert.ok(!p.stdout.startsWith('{'));}
 for(const file of ['./--json',literal]){const args=['--config',file,'--input',snapshot],human=invoke(args),json=invoke([...args,'--json']);assert.equal(human.status,0);assert.match(human.stdout,/selected EX-2/);assert.ok(!human.stdout.startsWith('{'));assert.equal(human.stderr,'');assert.equal(json.status,0);assert.deepEqual(JSON.parse(json.stdout),previewSnapshot(JSON.stringify(control.config),JSON.stringify(control.snapshot)));}
 for(const args of [['--help'],['--help','--json']]){const p=invoke(args,true);assert.equal(p.status,0);assert.equal(p.stderr,'OPEN_ATTEMPTS=0\n');if(args.includes('--json'))assert.match(JSON.parse(p.stdout).help,/Preview ready work/);else assert.match(p.stdout,/Preview ready work/);}
 const observed=invoke(['--config',literal,'--input',snapshot,'--json'],true);assert.equal(observed.status,2);assert.equal(observed.stderr,'OPEN_ATTEMPTS=1\n');assert.equal(JSON.parse(observed.stdout).scope_diagnostics[0].code,'INPUT');assert.deepEqual([await readFile(literal,'utf8'),await readFile(snapshot,'utf8')],before);
 assert.deepEqual((await readdir(o.app)).sort(),['config.json','snapshot.json']);
 for(const mutate of [async dir=>rm(path.join(dir,'lib/manager/availability.mjs')),async dir=>writeFile(path.join(dir,'lib/manager/snapshot.mjs'),'throw Error("corrupt preview runtime")'),async dir=>writeFile(path.join(dir,'scripts/manager-preview.mjs'),'process.exit(0);')]){await assert.rejects(installCursorSkills(o,async dir=>{await fakeInstall(dir);if(path.basename(dir)==='work-validator')await mutate(dir);}));assert.equal(await realpath(installed.stableSkills),installed.skills);}
 // Committed wrong-result sources pass source hashing, so actual smoke semantics
 // (rather than tamper detection alone) must reject them before stable selection.
 for(const badSource of ['process.exit(0);', 'console.log(JSON.stringify({schema:"pigboard-manager-preview/v1",valid:true,status:"complete",execution_authorized:true,writes:0,streams:[]}));']){
  await writeFile(path.join(o.source,'scripts/manager-preview.mjs'),badSource);git(o.source,'add','.');git(o.source,'commit','-m','wrong preview smoke fixture');
  await assert.rejects(installCursorSkills(o,fakeInstall),/Manager preview nonexecuting smoke check failed/);assert.equal(await realpath(installed.stableSkills),installed.skills);
 }
 const manifest=JSON.parse(await readFile(installed.manifest));for(const relative of ['scripts/manager-preview.mjs','lib/manager/snapshot.mjs','lib/manager/availability.mjs','lib/manager/decisions.mjs','docs/manager-preview.md','test/fixtures/manager-candidates.json'])assert.ok(manifest.sourceFiles['work-validator/'+relative]);
 const guide=await readFile(path.join(validator,'docs/manager-preview.md'),'utf8');for(const match of guide.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){if(/^(?:https?:|<)/.test(match[1]))continue;await readFile(path.resolve(path.dirname(path.join(validator,'docs/manager-preview.md')),match[1]));}
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

test('installed structured QA helpers retain full sibling closure and validate fixed packet outside source', async t => {
  // Dependency mocks here test installation only; the actual validator runtime is
  // copied above. Actual Bruno/PostgreSQL instruction execution is separate QA.
  const o=await fixture(t), installed=await installCursorSkills(o,fakeInstall);
  const {prepareFixture}=await import('./fixtures/qa-helper-case.mjs');
  const run=path.join(o.app,'fixed-helper-input');await prepareFixture(run);
  const common=path.join(installed.skills,'qa-api/references/structured-steps.md');
  assert.equal(await readFile(common,'utf8'),await readFile(new URL('../skills/qa-api/references/structured-steps.md',import.meta.url),'utf8'));
  for(const name of ['qa-api','qa-bruno','qa-database','qa-ui','qa-entrypoint']){
    async function inspect(relative=''){
      for(const entry of await readdir(path.join(o.source,'skills',name,relative),{withFileTypes:true})){
        const file=path.join(relative,entry.name);if(entry.isDirectory()){await inspect(file);continue;}
        const source=await readFile(path.join(o.source,'skills',name,file)),target=path.join(installed.skills,name,file);
        assert.deepEqual(await readFile(target),source,`${name}/${file}`);
        if(!file.endsWith('.md'))continue;
        for(const match of source.toString().matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
          const [link]=match[1].split('#');if(!link||/^[a-z][a-z0-9+.-]*:/i.test(link))continue;
          const resolved=path.resolve(path.dirname(target),decodeURIComponent(link));assert(resolved.startsWith(installed.skills+path.sep));await readFile(resolved);
        }
      }
    }
    await inspect();
  }
  for(const guide of ['authoring.md','handoffs.md']){
    const fromCommon=path.resolve(path.dirname(common),'../../work-validator/docs',guide);
    assert.equal(await readFile(fromCommon,'utf8'),await readFile(new URL('../docs/'+guide,import.meta.url),'utf8'));
  }
  const args=['--mode','start','--input',path.join(run,'work.yaml'),'--context',path.join(run,'facts.yaml'),'--json'];
  const cli=path.join(installed.skills,'work-validator/scripts/validate-work.mjs');
  const actual=execFileSync(process.execPath,[cli,...args],{cwd:o.app,encoding:'utf8',timeout:30000});
  const source=execFileSync(process.execPath,[new URL('../scripts/validate-work.mjs',import.meta.url).pathname,...args],{cwd:o.app,encoding:'utf8',timeout:30000});
  assert.equal(actual,source);assert.equal(JSON.parse(actual).valid,true);
  assert.equal(installed.verification.entrypoints,15);assert.equal(installed.verification.dependencies,'verified');
  await assert.rejects(readFile(path.join(installed.skills,'test/fixtures/qa-helper-case.mjs')));
});

// This existing installation fixture simulates QA-helper packages, while copying
// real locked validator dependencies. Genuine default installer acceptance is a
// separate candidate receipt; neither test establishes agent/provider behavior.
test('human rework folder/siblings survive installation and real canonical CLIs match source from an unrelated cwd',async t=>{
 const o=await fixture(t),first=await installCursorSkills(o,fakeInstall);
 const {packet}=await import('./fixtures/human-rework.mjs');
 const {extractHandoff}=await import('../lib/contracts/handoff.mjs');
 const {stringify}=await import('yaml');
 const {createHash}=await import('node:crypto');
 assert.equal(first.verification.entrypoints,15);
 const manifest=JSON.parse(await readFile(first.manifest,'utf8'));
 const actualManifest=Object.keys(manifest.sourceFiles);
 for(const name of ['request-rework','human-writing']) {
  async function compare(relative='') {
   for(const entry of await readdir(path.join(o.source,'skills',name,relative),{withFileTypes:true})) {
    const sub=path.join(relative,entry.name);
    if(entry.isDirectory())await compare(sub);
    else {
     const expected=await readFile(path.join(o.source,'skills',name,sub));
     assert.deepEqual(await readFile(path.join(first.skills,name,sub)),expected);
     const key=actualManifest.find(k=>k.endsWith(`${name}/${sub}`));assert(key,`${name}/${sub} manifest`);
     assert.equal(manifest.sourceFiles[key],createHash('sha256').update(expected).digest('hex'));
    }
   }
  }
  await compare();
 }
 const skill=await readFile(path.join(first.skills,'request-rework/SKILL.md'),'utf8');
 assert.equal(await readFile(path.resolve(first.skills,'request-rework/../human-writing/SKILL.md'),'utf8'),await readFile(path.join(o.source,'skills/human-writing/SKILL.md'),'utf8'));
 assert(skill.includes('../human-writing/SKILL.md'));
 const referencePath=path.join(first.skills,'request-rework/references/example.md'),example=await readFile(referencePath,'utf8');
 assert.equal(await readFile(path.resolve(path.dirname(referencePath),'../../human-writing/SKILL.md'),'utf8'),await readFile(path.join(o.source,'skills/human-writing/SKILL.md'),'utf8'));
 const route=[...example.matchAll(/^\| Canonical handoff \| \[Source handoff\]\(([^)]+)\) \| \[Installed handoff\]\(([^)]+)\) \|$/gm)];
 assert.equal(route.length,1);
 const sourceHelp=new URL('../skills/request-rework/references/'+route[0][1],import.meta.url);
 assert.equal(await readFile(path.resolve(path.dirname(referencePath),route[0][2]),'utf8'),await readFile(sourceHelp,'utf8'));
 const p=packet(),files={
  'record.yaml':stringify(p.record),'summary.txt':p.summary,
  'work.yaml':p.preflight.requirements[0].body,'facts.yaml':p.preflight.requirements[0].context_body,
  'preflight.json':JSON.stringify(p.preflight),'published.json':JSON.stringify(p.published)
 };
 for(const [name,text]of Object.entries(files))await writeFile(path.join(o.app,name),text);
 const cases=[
  ['validate-work.mjs',['--mode','start','--input',path.join(o.app,'work.yaml'),'--context',path.join(o.app,'facts.yaml'),'--json']],
  ['validate-handoff.mjs',['--mode','record','--input',path.join(o.app,'record.yaml'),'--format','yaml','--json']],
  ...['preflight','published'].map(name=>['validate-handoff.mjs',['--mode','chain','--input',path.join(o.app,name+'.json'),'--json']]),
  ...['html','adf'].map(format=>['prepare-handoff.mjs',['--input',path.join(o.app,'record.yaml'),'--summary',path.join(o.app,'summary.txt'),'--format',format]])
 ];
 for(const [script,args]of cases) {
  const run=cli=>execFileSync(process.execPath,[cli,...args],{cwd:o.app,encoding:'utf8',timeout:30000});
  const installed=run(path.join(first.skills,'work-validator/scripts',script));
  assert.equal(installed,run(new URL('../scripts/'+script,import.meta.url).pathname));
  const result=JSON.parse(installed);
  if(script==='prepare-handoff.mjs')assert.deepEqual(JSON.parse(JSON.stringify(extractHandoff(result.format==='html'?result.body:JSON.stringify(result.body),{format:result.format}).value)),p.record);
  else assert.equal(result.valid,true);
 }
 for(const [name,text]of Object.entries(files))assert.equal(await readFile(path.join(o.app,name),'utf8'),text);
 for(const relative of ['request-rework/SKILL.md','request-rework/references/example.md']) {
  await assert.rejects(installCursorSkills(o,async dir=>{
   await fakeInstall(dir);if(path.basename(dir)==='work-validator')await writeFile(path.join(dir,'..',relative),'changed new skill');
  }),/hash mismatch/);
  assert.equal(await realpath(first.stableSkills),first.skills);
 }
});

// Literal ownership oracles use unchanged frozen snapshots; derived controls are local copies.
function ownershipCases(fixtures){
 const fresh=id=>structuredClone(fixtures.find(c=>c.id===id));
 const frozen=[{c:fresh('S30'),project:'100',owners:[['900',0],['901',2]],readable:true},{c:fresh('H03-B-conflict'),project:'200',owners:[['10900',7],['11901',9]],readable:true}];
 const cases=[...frozen];
 for(const id of ['S01','S02','S40','S18','H03-A-full'])cases.push({c:fresh(id),control:id});
 // Preserve the old contradictory facts as negatives; give each positive its own native child.
 for(const mode of ['paused','not-opted']){
  const wrong=fresh('S30');wrong.id=`second-${mode}-wrong-declaration`;if(mode==='paused')wrong.snapshot.issues[2].status_id='1';else wrong.snapshot.issues[2].labels=[];cases.push({c:wrong,control:'wrong-declaration',readable:true});
  const c=structuredClone(wrong);c.id=`second-${mode}-correct-parent`;const child=structuredClone(c.snapshot.issues[1]);child.id='1002';child.key='EX-3';child.parent_id='901';child.context_body=child.context_body.replaceAll('EX-2','EX-3');c.snapshot.issues.push(child);const ep=c.snapshot.issues[2],w=JSON.parse(ep.body),ctx=JSON.parse(ep.context_body);w.workstreams[0].story_order=['EX-3'];ctx.prerequisite_graph=ctx.prerequisite_graph.map(n=>n.ticket==='EX-2'?{...n,ticket:'EX-3'}:n);ep.body=JSON.stringify(w);ep.context_body=JSON.stringify(ctx);cases.push({c,control:'unique',readable:true});
 }
 const reordered=fresh('S30');reordered.id+='-reordered';reordered.snapshot.issues.reverse();cases.push({c:reordered,project:'100',owners:[['900',2],['901',0]],readable:true});
 const independent=fresh('S30'),other=fresh('S18');independent.id+='-independent';
 for(const i of other.snapshot.issues.filter(i=>['901','1002'].includes(i.id))){if(i.id==='901'){i.id='902';i.key='EX-92';i.context_body=i.context_body.replaceAll('EX-91','EX-92');}else{i.parent_id='902';i.status_id='1';}independent.snapshot.issues.push(i);}
 independent.snapshot.stream_checks.push(other.snapshot.stream_checks[1]);cases.push({c:independent,project:'100',owners:[['900',0],['901',2]],independent:true});
 const sentinel=fresh('S30');sentinel.id+='-sentinel';for(const i of sentinel.snapshot.issues.filter(i=>i.type_id==='21')){const w=JSON.parse(i.body),ctx=JSON.parse(i.context_body);w.problem_to_solve+=' PRIVATE_EPIC_NARRATIVE_SENTINEL';ctx.references.push('PRIVATE_EPIC_CONTEXT_SENTINEL');i.body=JSON.stringify(w);i.context_body=JSON.stringify(ctx);}cases.push({c:sentinel,project:'100',owners:[['900',0],['901',2]],readable:true});
 const invalid=fresh('S30');invalid.id+='-invalid-claimant';const invalidWork=JSON.parse(invalid.snapshot.issues[2].body);invalidWork.problem_to_solve=null;invalid.snapshot.issues[2].body=JSON.stringify(invalidWork);cases.push({c:invalid,project:'100',owners:[['900',0],['901',2]],invalid:true});
 cases.push({c:fresh('membership-retained-conflict'),control:'retained'});
 return cases;
}
const conflictMessage=id=>`Active opted-in Epic ID ${id} conflicts with another active opted-in Epic for this stream. Reconcile competing Epic ownership before choosing work.`;
function assertOwnershipResult(result,{c,project,owners,control,independent,invalid}){
 assert.equal(result.valid,true,c.id);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);
 const serialized=JSON.stringify(result);assert.ok(!serialized.includes('PRIVATE_EPIC_'),c.id);for(const i of c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!serialized.includes(JSON.stringify(raw)),c.id+' raw document');
 if(owners){
  const scope={site:c.snapshot.site,project_id:project,label:'stream-1'},s=result.streams.find(s=>s.scope.project_id===project&&s.scope.label==='stream-1');
  assert.deepEqual(s.scope,scope);assert.equal(s.decision,'hold');assert.equal(s.epic_id,null);assert.deepEqual(s.candidates,[]);assert.equal(s.selected_ticket_id,null);assert.equal(s.selected_key,null);
  const expected=owners.map(([id,index])=>({code:'OWNERSHIP_CONFLICT',path:`/issues/${index}/id`,message:conflictMessage(id)})).sort((a,b)=>a.path.localeCompare(b.path));
  assert.deepEqual(s.reasons.filter(r=>r.code==='OWNERSHIP_CONFLICT'),expected,c.id);
  assert.deepEqual(result.scope_diagnostics.filter(d=>d.code==='OWNERSHIP_CONFLICT'),expected.map(r=>({...r,scope})),c.id);
  for(const [id,index]of owners)assert.equal(c.snapshot.issues[index].id,id);
  assert.ok(!s.reasons.some(r=>['NO_OPT_IN','EPIC_PAUSED'].includes(r.code)));
  for(const field of ['occupied_ids','blocked_ids','human_review_ids'])assert.deepEqual(s[field],[]);
  assert.equal(s.counts_complete,true);assert.equal(s.return_count,1);
  if(project==='200'){const a=result.streams.find(s=>s.scope.project_id==='100');assert.equal(a.decision,'wait');assert.equal(a.epic_id,'900');assert.equal(a.return_count,6);assert.deepEqual(a.human_review_ids,['2000','2001','2002','2003','2004']);assert.ok(a.reasons.some(r=>r.code==='HUMAN_REVIEW_CAP'));assert.ok(!a.reasons.some(r=>r.code==='OWNERSHIP_CONFLICT'));}
  if(independent){const other=result.streams.find(s=>s.scope.label==='stream-2');assert.equal(result.status,'partial');assert.equal(other.decision,'select');assert.equal(other.epic_id,'902');assert.equal(other.selected_ticket_id,'1002');assert.ok(!other.reasons.some(r=>r.code==='OWNERSHIP_CONFLICT'));}
  if(invalid)assert.ok(s.reasons.some(r=>r.code==='INVALID_WORK'));
 }else{
  const conflicts=result.streams.flatMap(s=>s.reasons).filter(r=>r.code==='OWNERSHIP_CONFLICT');
  if(control==='retained'){assert.ok(conflicts.length);assert.ok(conflicts.every(r=>r.path==='/retained_members'&&r.message==='Reconcile competing Epic or retained ownership before choosing work.'));assert.ok(result.streams.every(s=>s.decision==='hold'));return;}
  assert.deepEqual(conflicts,[]);
  if(control==='wrong-declaration'){assertParentResult(result,{c});assert.ok(!result.streams[0].reasons.some(r=>['NO_OPT_IN','EPIC_PAUSED'].includes(r.code)));return;}
  if(control==='unique'||control==='S01'){const s=result.streams[0];assert.ok(!s.reasons.some(r=>r.code==='MEMBERSHIP_MISMATCH'));assert.deepEqual(s.scope,{site:c.snapshot.site,project_id:'100',label:'stream-1'});assert.equal(s.counts_complete,true);assert.equal(s.return_count,1);for(const field of ['occupied_ids','blocked_ids','human_review_ids'])assert.deepEqual(s[field],[]);assert.equal(s.epic_id,'900');assert.equal(s.decision,'select');assert.equal(s.selected_ticket_id,'1001');assert.ok(s.candidates.some(x=>x.ticket_id==='1001'&&x.eligible));}
  if(control==='S02'){assert.equal(result.streams[0].decision,'wait');assert.ok(result.streams[0].reasons.some(r=>r.code==='NO_OPT_IN'));}
  if(control==='S40'){assert.equal(result.streams[0].decision,'wait');assert.ok(result.streams[0].reasons.some(r=>r.code==='EPIC_PAUSED'));assert.ok(!result.streams[0].reasons.some(r=>r.code==='NO_OPT_IN'));}
  if(control==='S18')assert.deepEqual(result.streams.filter(s=>s.decision==='select').map(s=>s.selected_ticket_id),['1001']);
  if(control==='H03-A-full'){assert.equal(result.streams.find(s=>s.scope.project_id==='200').selected_ticket_id,'11001');assert.equal(result.streams.find(s=>s.scope.project_id==='100').return_count,6);}
 }
}
function assertOwnershipText(text,{c,owners,control}){
 if(control==='wrong-declaration')assertParentText(text);if(control==='unique')assert.ok(!text.includes('MEMBERSHIP_MISMATCH'));
 for(const [id,index]of owners??[])assert.ok(text.includes(`OWNERSHIP_CONFLICT /issues/${index}/id: ${conflictMessage(id)}`),c.id);
 assert.ok(!text.includes('PRIVATE_EPIC_'));assert.ok(!text.includes('OWNERSHIP_CONFLICT /issues:'));
 for(const i of c.snapshot.issues){if(i.body)assert.ok(!text.includes(i.body));if(i.context_body)assert.ok(!text.includes(i.context_body));}
}

function parentCases(fixtures){
 const fresh=id=>structuredClone(fixtures.find(c=>c.id===id)),cases=[];
 for(const id of ['declared-null-native-parent','declared-other-native-parent']){
  const c=fresh(id);cases.push({c,readable:true});
  for(const stage of ['9','10']){const c=fresh(id);c.id+='-'+stage;c.snapshot.issues[1].status_id=stage;cases.push({c});}
 }
 const alternative=fresh('declared-null-native-parent'),child=structuredClone(alternative.snapshot.issues[1]);alternative.id+='-valid-alternative';child.id='1002';child.key='EX-3';child.parent_id='900';child.context_body=child.context_body.replaceAll('EX-2','EX-3');alternative.snapshot.issues.push(child);const ep=alternative.snapshot.issues[0],w=JSON.parse(ep.body),ctx=JSON.parse(ep.context_body);w.workstreams[0].story_order.push('EX-3');ctx.prerequisite_graph.push({ticket:'EX-3',prerequisites:[]});ep.body=JSON.stringify(w);ep.context_body=JSON.stringify(ctx);cases.push({c:alternative,alternative:true});
 const independent=fresh('S18');independent.id='parent-mismatch-independent-stream';independent.snapshot.issues[3].status_id='1';independent.snapshot.issues[1].parent_id=null;cases.push({c:independent,otherStream:true});
 const project=fresh('H03-A-full');project.id='parent-mismatch-independent-project';project.snapshot.issues[1].parent_id=null;cases.push({c:project,otherProject:true});
 for(const id of ['S01','S04','S33','membership-safe-removal-9','membership-safe-removal-1','membership-safe-removal-10'])cases.push({c:fresh(id),valid:true,invalidWork:id==='S04'});
 return cases;
}
const parentMessage='Reconcile original and current project, parent, full label and Epic membership without dropping retained work.';
function assertParentResult(result,{c,valid,invalidWork,alternative,otherStream,otherProject}){
 assert.equal(result.valid,true,c.id);assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);
 const s=result.streams.find(s=>s.scope.project_id==='100'&&s.scope.label==='stream-1');assert.deepEqual(s.scope,{site:c.snapshot.site,project_id:'100',label:'stream-1'});
 if(valid){assert.equal(s.selected_ticket_id,'1001');assert.equal(s.decision,'select');assert.ok(!result.scope_diagnostics.some(d=>d.code==='MEMBERSHIP_MISMATCH'&&d.path.endsWith('/parent_id')));if(invalidWork)assert.ok(s.candidates.some(c=>c.reasons.some(r=>r.code==='INVALID_WORK')));return;}
 const mismatch={code:'MEMBERSHIP_MISMATCH',path:'/issues/1/parent_id',message:parentMessage};
 assert.equal(s.decision,'hold');assert.equal(s.epic_id,'900');assert.equal(s.selected_ticket_id,null);assert.equal(s.selected_key,null);assert.ok(s.reasons.some(r=>JSON.stringify(r)===JSON.stringify(mismatch)),c.id);assert.ok(result.scope_diagnostics.some(d=>d.code===mismatch.code&&d.path===mismatch.path&&d.message===mismatch.message&&JSON.stringify(d.scope)===JSON.stringify(s.scope)),c.id);
 assert.deepEqual(s.occupied_ids,[]);assert.deepEqual(s.blocked_ids,[]);assert.equal(s.counts_complete,true);assert.deepEqual(s.human_review_ids,otherProject?['2000','2001','2002','2003','2004']:[]);assert.equal(s.return_count,otherProject?6:1);assert.ok(!s.reasons.some(r=>r.code==='INVALID_WORK'));
 if(alternative)assert.ok(s.candidates.some(c=>c.ticket_id==='1002'&&c.eligible));
 if(c.id.startsWith('declared-other-native-parent')){const other=result.streams.find(s=>s.scope.label==='stream-2');assert.equal(other.decision,'wait');assert.deepEqual(other.occupied_ids,['1002']);assert.equal(other.return_count,1);assert.ok(other.reasons.some(r=>r.code==='OCCUPIED'));assert.ok(!other.reasons.some(r=>r.path.endsWith('/parent_id')));}
 if(otherStream||otherProject){const other=result.streams.find(s=>otherProject?s.scope.project_id==='200':s.scope.label==='stream-2');assert.equal(result.status,'partial');assert.equal(other.decision,'select');assert.equal(other.selected_ticket_id,otherProject?'11001':'1002');assert.ok(!other.reasons.some(r=>r.code==='MEMBERSHIP_MISMATCH'));}
 const serialized=JSON.stringify(result);for(const i of c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!serialized.includes(JSON.stringify(raw)),c.id+' raw document');
}
function assertParentText(text){assert.ok(text.includes(`MEMBERSHIP_MISMATCH /issues/1/parent_id: ${parentMessage}`));}

// Real copied validator and manifest, simulated unrelated QA-helper packages.
// This checks release closure/parity, not default installer or provider acceptance.
test('installed receipt validator preserves incomplete QA outcomes and old input bytes from unrelated cwd', async t => {
 const o = await fixture(t), installed = await installCursorSkills(o, fakeInstall);
 const { preparePartialFixtures } = await import('./fixtures/qa-partial-results.mjs');
 const { createHash } = await import('node:crypto');
 const inputRoot = path.join(o.app, 'partial-inputs'), hashes = await preparePartialFixtures(inputRoot);
 const validator = path.join(installed.skills, 'work-validator'), manifest = JSON.parse(await readFile(installed.manifest));
 assert.equal(manifest.commit, installed.commit);
 for (const relative of ['contracts/handoff-v1.schema.json', 'lib/contracts/receipts.mjs', 'docs/handoffs.md']) {
  const key = 'work-validator/' + relative;
  assert.equal(manifest.sourceFiles[key], createHash('sha256').update(await readFile(new URL('../' + relative, import.meta.url))).digest('hex'));
  assert.deepEqual(await readFile(path.join(validator, relative)), await readFile(new URL('../' + relative, import.meta.url)));
 }
 assert(!Object.keys(manifest.sourceFiles).some(k => k.includes('qa-partial-results')));
 const { spawnSync } = await import('node:child_process');
 const { targetRecord } = await import('./fixtures/qa-partial-results.mjs');
 const validTransitive = new Set(['three', 'four', 'join', 'independent', 'ownership', 'binding', 'pass']);
 const invalidTransitive = { 'missing-middle': '/steps/2/finding_ids', 'missing-last': '/steps/3/finding_ids', 'unknown-last': '/steps/3/finding_ids', 'four-missing-last': '/steps/4/finding_ids', 'join-missing-F1': '/steps/4/finding_ids', 'join-missing-F2': '/steps/4/finding_ids' };
 let transitiveChains = 0, transitiveValid = 0, transitiveRecords = 0, proofChains = 0, proofValid = 0, proofRecords = 0;
 for (const [file, hash] of Object.entries(hashes)) {
  const mode = file.endsWith('.json') ? 'chain' : 'record', input = path.join(inputRoot, file);
  const args = ['--mode', mode, '--input', input, ...(mode === 'record' ? ['--format', 'yaml'] : []), '--json'];
  const run = cli => spawnSync(process.execPath, [cli, ...args], { cwd: o.app, encoding: 'utf8', timeout: 30000 });
  const source = run(new URL('../scripts/validate-handoff.mjs', import.meta.url).pathname), actual = run(path.join(validator, 'scripts/validate-handoff.mjs'));
  assert.equal(actual.status, source.status, file + actual.stderr); assert.equal(actual.stdout, source.stdout, file); assert.equal(actual.stderr, '', file);
  const result = JSON.parse(actual.stdout);
  const transitive = /^transitive-(repair|blocked|wait)-(.+)\.(json|yaml)$/.exec(file);
  const proof = file.startsWith('proof-') || file === 'human-static.json';
  if (proof) {
   const name = file.replace(/\.(json|yaml)$/, '');
   const expectedValid = mode === 'record' || /-exact-(pass|fail)$|-not-run$/.test(name) || name === 'human-static';
   assert.equal(source.status, expectedValid ? 0 : 1, file + source.stdout);
   assert.equal(actual.status, expectedValid ? 0 : 1, file + actual.stdout);
   assert.equal(result.valid, expectedValid, file + actual.stdout);
   assert.equal(result.completion_established, mode === 'chain' && name === 'human-static', file);
   if (mode === 'chain') {
    proofChains++;
    if (expectedValid) {
     proofValid++;
     const target = targetRecord(JSON.parse(await readFile(input, 'utf8')));
     assert.deepEqual(result.qa_report, target.payload.qa_report ?? target.payload.report, file);
     assert.deepEqual(result.human_pending, ['HQA-01'], file);
     if (name === 'human-static') { assert.equal(result.ai_steps, 0); assert.deepEqual(result.qa_report.steps, []); }
    } else {
     const base = '/comment_pages/0/comments/3/body/payload/';
     const [code, field] = name.endsWith('-real-null-environment') ? ['EVIDENCE', 'qa_report/environment'] : name.endsWith('-foreign-result') ? ['EVIDENCE', 'qa_report/steps/0/evidence/0'] : name.endsWith('-foreign-finding') ? ['EVIDENCE', 'findings/0/evidence/0'] : ['PR', 'pr'];
     assert(result.diagnostics.some(x => x.code === code && x.path === base + field), file + actual.stdout);
    }
    t.diagnostic(JSON.stringify({ file, input_sha256: hash, source: { status: source.status, output: JSON.parse(source.stdout) }, installed: { status: actual.status, output: result } }));
   } else proofRecords++;
  } else if (transitive) {
   const [, kind, variant] = transitive;
   const shapeInvalid = kind === 'repair' && ['empty', 'empty-array'].includes(variant);
   const expectedValid = mode === 'record' ? !shapeInvalid : validTransitive.has(variant) || (variant === 'empty' && kind !== 'repair');
   assert.equal(result.valid, expectedValid, file + actual.stdout);
   assert.equal(result.completion_established, false, file);
   if (mode === 'chain') {
    transitiveChains++;
    if (expectedValid) {
     transitiveValid++;
     const envelope = JSON.parse(await readFile(input, 'utf8')), target = targetRecord(envelope);
     assert.deepEqual(result.qa_report, target.payload.qa_report, file);
     assert.deepEqual(result.human_pending, target.payload.qa_report.human_pending, file);
     assert.deepEqual(result.human_pending, ['HQA-01'], file);
    } else {
     const suffix = invalidTransitive[variant], code = shapeInvalid ? 'STRUCTURE' : 'LEDGER';
     const expectedPath = '/comment_pages/0/comments/3/body/payload/' + (shapeInvalid ? 'findings' : 'qa_report' + suffix);
     assert(result.diagnostics.some(x => x.code === code && x.path === expectedPath), file + actual.stdout);
    }
   } else transitiveRecords++;
  } else if (['blocked-no-environment.json', 'blocked-retained-fail.json', 'wait-retained-fail.json', 'old-blocked.json', 'old-wait.json', 'human-static.json'].includes(file)) {
   assert.equal(result.valid, true, file); assert.equal(result.completion_established, file === 'human-static.json');
  } else if (mode === 'chain') { assert.equal(result.valid, false, file); assert.equal(result.completion_established, false); }
  assert.equal(createHash('sha256').update(await readFile(input)).digest('hex'), hash, file);
 }
 assert.equal(transitiveChains, 43); assert.equal(transitiveValid, 23); assert.equal(transitiveRecords, 43);
 assert.equal(proofChains, 19); assert.equal(proofValid, 7); assert.equal(proofRecords, 18);
 assert.equal(await realpath(installed.stableSkills), installed.skills);
});

// These local copies preserve the eight sealed triage inputs, including raw packet bytes.
function obligationCases(fixtures){
 const fresh=id=>structuredClone(fixtures.find(c=>c.id===id));
 const base=fresh('S18');base.snapshot.issues[2].body="{\"schema\": \"pigboard-epic/v1\", \"problem_to_solve\": \"Choose complete work.\", \"outcome\": \"One usable proposal.\", \"scope\": {\"included\": [\"Offline preview.\"], \"excluded\": [\"Execution.\"]}, \"workstreams\": [{\"label\": \"stream-3\", \"story_order\": [\"EX-3\"]}], \"accepted_decisions\": [], \"open_questions\": []}";
 for(const i of base.snapshot.issues.filter(i=>['901','1002'].includes(i.id)))i.labels=i.labels.map(l=>l==='stream-2'?'stream-3':l);
 base.snapshot.issues[3].status_id='1';base.snapshot.stream_checks[1].label='stream-3';
 const cases=[],add=(id,c,decision,selected,reason=null,path='',extra={})=>{c.id='obligation-'+id;const spec={id,c,decision,selected,reason,path,...extra};cases.push(spec);return spec;};
 for(const [id,mode]of [['P1','wrong-label'],['P2','wrong-project'],['P3','correct-scope'],['P4','no-intent']]){
  const c=structuredClone(base);let claimed=null;
  if(mode!=='no-intent'){claimed=mode==='wrong-project'?['200','stream-1']:['100',mode==='wrong-label'?'stream-2':'stream-1'];c.snapshot.pending_intents=[{project_id:claimed[0],label:claimed[1],ticket_id:'1001',attempt_id:'intent-'+(mode==='correct-scope'?'correct':mode)}];}
  if(mode==='wrong-label')c.snapshot.stream_checks.push({...c.snapshot.stream_checks[0],label:'stream-2'});
  if(mode==='wrong-project'){const h=fresh('H03-A-full');c.config=h.config;c.snapshot.projects=h.snapshot.projects;c.snapshot.issues.push(...h.snapshot.issues.filter(i=>i.project_id==='200'));c.snapshot.stream_checks.push(...h.snapshot.stream_checks.filter(s=>s.project_id==='200'));}
  add(id,c,claimed?'hold':'select',claimed?null:'1001',claimed?'PENDING_INTENT':null,'/pending_intents',{claimed,seal:['pending-intent',mode],readable:['P1','P2'].includes(id)});
 }
 const reference={ticket_id:'1001',comment_id:'2023',record_id:'00000000-0000-4000-8000-000000000023',digest:'sha256:'+'1'.repeat(64)};
 for(const [id,mode,wrong,native]of [['R1','wrong-label',true,false],['R2','correct-scope-unbound-native-reference',false,false],['R3','wrong-label-native-reference-present',true,true],['R4','correct-scope-native-reference-present',false,true]]){
  const c=structuredClone(base),claimed=['100',wrong?'stream-2':'stream-1'];c.snapshot.required_repairs=[{project_id:'100',label:claimed[1],ticket_id:'1001',reason:'required_request',references:[structuredClone(reference)]}];if(native)c.snapshot.issues[1].required_requests=[structuredClone(reference)];if(wrong)c.snapshot.stream_checks.push({...c.snapshot.stream_checks[0],label:'stream-2'});
  add(id,c,wrong?'hold':'wait',null,wrong?'MEMBERSHIP_MISMATCH':'REPAIR_POLICY_PENDING',wrong?'/required_repairs/0':'',{claimed,seal:['required-repair-scope',mode],readable:wrong});
 }
 const proof=fresh('repair-independent-complete'),target=proof.snapshot.issues.find(i=>i.id==='1000');proof.snapshot.required_repairs=[{project_id:'100',label:'stream-1',ticket_id:'1000',reason:'required_request',references:structuredClone(target.required_requests)}];proof.snapshot.issues.push(...structuredClone(base.snapshot.issues.filter(i=>['901','1002'].includes(i.id))));proof.snapshot.stream_checks.push(structuredClone(base.snapshot.stream_checks[1]));add('R5',proof,'select','1100','REPAIR_ACCOUNTED_FOR','/issues/2',{accounted:true});
 for(const [id,kind,native]of [['B1','pending',false],['B2-absent','repair',false],['B2-present','repair',true],['B3','none',false]]){
  const c=structuredClone(base),child=c.snapshot.issues[1],alternative=structuredClone(child);child.labels=[];alternative.id='1003';alternative.key='EX-4';alternative.context_body=alternative.context_body.replaceAll('EX-2','EX-4');c.snapshot.issues.push(alternative);const ep=c.snapshot.issues[0],w=JSON.parse(ep.body),ctx=JSON.parse(ep.context_body);w.workstreams[0].story_order=['EX-4'];ctx.prerequisite_graph=ctx.prerequisite_graph.map(n=>n.ticket==='EX-2'?{...n,ticket:'EX-4'}:n);ep.body=JSON.stringify(w);ep.context_body=JSON.stringify(ctx);
  if(kind==='pending')c.snapshot.pending_intents=[{project_id:'100',label:'stream-2',ticket_id:'1001',attempt_id:'unpublished-intent'}];
  if(kind==='repair'){c.snapshot.required_repairs=[{project_id:'100',label:'stream-2',ticket_id:'1001',reason:'required_request',references:[structuredClone(reference)]}];if(native)child.required_requests=[structuredClone(reference)];}
  if(kind!=='none')c.snapshot.stream_checks.push({...c.snapshot.stream_checks[0],label:'stream-2'});
  add(id,c,kind==='none'?'select':'hold',kind==='none'?'1003':null,kind==='pending'?'PENDING_INTENT':kind==='repair'?'MEMBERSHIP_MISMATCH':null,kind==='pending'?'/pending_intents':kind==='repair'?'/required_repairs/0':'',{claimed:kind==='none'?null:['100','stream-2'],removal:true});
 }
 // Isolate the native-request guard: no intent, side row or orphan claimed check.
 const nativeOnly=structuredClone(cases.find(s=>s.id==='B3').c);nativeOnly.snapshot.issues[1].required_requests=[structuredClone(reference)];add('B4',nativeOnly,'hold',null,'MEMBERSHIP_MISMATCH','/issues/1',{claimed:null,removal:true,nativeOnly:true,readable:true});
 return cases;
}
function assertObligationResult(result,spec){
 const {c,decision,selected,reason,path,claimed,accounted,removal,nativeOnly}=spec;
 assert.equal(result.valid,true,'HARNESS_INVALID_SNAPSHOT '+c.id+' '+JSON.stringify(result.scope_diagnostics));assert.equal(result.writes,0);assert.equal(result.execution_authorized,false);
 const find=([project_id,label])=>result.streams.find(s=>s.scope.project_id===project_id&&s.scope.label===label),native=find(['100','stream-1']),independent=find(['100','stream-3']);
 assert.deepEqual(native.scope,{site:c.snapshot.site,project_id:'100',label:'stream-1'});assert.equal(native.decision,decision,c.id);assert.equal(native.selected_ticket_id,selected,c.id);assert.equal(native.selected_key,selected==='1001'?'EX-2':selected==='1003'?'EX-4':selected==='1100'?'EX-20':null,c.id);
 const has=(s,code,path)=>s.reasons.some(r=>r.code===code&&r.path===path);
 if(reason)assert.ok(has(native,reason,path),c.id+' native '+reason+' '+path);
 if(claimed){const target=find(claimed);assert.equal(target.decision,decision==='wait'?'wait':'hold',c.id+' claimed');assert.equal(target.selected_ticket_id,null);assert.deepEqual(target.scope,{site:c.snapshot.site,project_id:claimed[0],label:claimed[1]});if(reason==='PENDING_INTENT')assert.ok(has(target,'PENDING_INTENT','/pending_intents'));if(reason==='MEMBERSHIP_MISMATCH')for(const s of [native,target]){assert.ok(has(s,reason,path));assert.ok(result.scope_diagnostics.some(d=>d.code===reason&&d.path===path&&JSON.stringify(d.scope)===JSON.stringify(s.scope)));}}
 if(decision==='wait'||accounted)assert.ok(!result.scope_diagnostics.some(d=>d.code==='MEMBERSHIP_MISMATCH'&&d.path.startsWith('/required_repairs/')),c.id);
 assert.deepEqual(independent.scope,{site:c.snapshot.site,project_id:'100',label:'stream-3'});assert.equal(independent.decision,'select');assert.equal(independent.selected_ticket_id,'1002');assert.deepEqual(independent.reasons,[]);
 for(const s of result.streams){assert.equal(s.counts_complete,true,c.id);assert.deepEqual(s.occupied_ids,[]);assert.deepEqual(s.blocked_ids,[]);assert.deepEqual(s.human_review_ids,accounted&&s===native?['1000']:[]);assert.equal(s.return_count,accounted&&s===native?2:1,c.id);}
 if(removal)assert.ok(native.candidates.some(c=>c.ticket_id==='1003'&&c.eligible));
 if(removal&&decision==='select'){assert.ok(!native.reasons.some(r=>r.code==='MEMBERSHIP_MISMATCH'));assert.ok(!native.candidates.some(c=>c.ticket_id==='1001'));}
 if(nativeOnly){assert.deepEqual(c.snapshot.pending_intents,[]);assert.deepEqual(c.snapshot.required_repairs,[]);assert.equal(c.snapshot.issues[1].required_requests.length,1);assert.ok(has(native,'REPAIR_POLICY_PENDING',''));assert.deepEqual(result.streams.map(s=>s.scope),[native.scope,independent.scope]);assert.ok(result.scope_diagnostics.some(d=>d.code==='MEMBERSHIP_MISMATCH'&&d.path==='/issues/1'&&JSON.stringify(d.scope)===JSON.stringify(native.scope)));assert.ok(!result.scope_diagnostics.some(d=>d.path.startsWith('/required_repairs/')||d.path==='/pending_intents'));}
 assert.equal(result.status,decision==='hold'?'partial':'complete');
 const serialized=JSON.stringify(result);for(const i of c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!serialized.includes(JSON.stringify(raw)),c.id+' raw document');
}
function assertObligationText(text,spec){
 assert.ok(text.includes(`${spec.reason} ${spec.path}:`),spec.c.id);assert.ok(text.includes('selected EX-3.'),spec.c.id);assert.ok(!text.includes('selected EX-2.'),spec.c.id);for(const i of spec.c.snapshot.issues)for(const raw of [i.body,i.context_body])if(raw)assert.ok(!text.includes(raw));
}

// Target the native-only removal guard without rerunning the complete installed matrix.
test('installed B4 native-request removal stays held without a side row',async t=>{
 const o=await fixture(t),installed=await installCursorSkills(o,fakeInstall),validator=path.join(installed.skills,'work-validator'),cases=JSON.parse(await readFile(path.join(validator,'test/fixtures/manager-candidates.json'))).cases,spec=obligationCases(cases).find(s=>s.id==='B4');
 const config=path.join(o.app,'config.json'),input=path.join(o.app,'snapshot.json'),rawConfig=JSON.stringify(spec.c.config),rawSnapshot=JSON.stringify(spec.c.snapshot);await writeFile(config,rawConfig);await writeFile(input,rawSnapshot);const args=[path.join(validator,'scripts/manager-preview.mjs'),'--config',config,'--input',input];
 for(const json of [false,true]){const invoke=()=>spawnSync(process.execPath,[...args,...(json?['--json']:[])],{cwd:o.app,encoding:'utf8',timeout:5000}),p=invoke();assert.equal(p.status,1);assert.equal(p.stderr,'');assert.equal(invoke().stdout,p.stdout);if(json)assertObligationResult(JSON.parse(p.stdout),spec);else assertObligationText(p.stdout,spec);}
 assert.equal(await readFile(config,'utf8'),rawConfig);assert.equal(await readFile(input,'utf8'),rawSnapshot);assert.deepEqual((await readdir(o.app)).sort(),['config.json','snapshot.json']);
});
