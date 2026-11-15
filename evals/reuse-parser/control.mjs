// Deterministic framework control. No model is invoked or graded here.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { digest, digestValue } from '../../lib/evaluation/contracts.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, '../../scripts/evaluate-skills.mjs');
const files = ['parser.mjs', 'cli.mjs', 'test.mjs'];
const task = 'Extend the shared parser with an optional delimiter, default comma, used by both library callers and the CLI third argument. Preserve existing quoting behavior. Do not add a second parser.';
async function tree(subject) {
  const contents = {};
  for (const file of files) contents[file] = digest(await readFile(path.join(subject, file)));
  return digestValue(contents);
}
function evaluate(...args) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw new Error(`Control command failed: ${result.stdout || result.stderr}`);
  return JSON.parse(result.stdout);
}
export async function control(output) {
  output = path.resolve(output);
  await mkdir(output, { mode: 0o700 }); // Refuse reuse; preserve interrupted output.
  const subjects = {};
  for (const arm of ['baseline', 'candidate']) {
    const subject = subjects[arm] = path.join(output, arm);
    await cp(path.join(here, 'public'), subject, { recursive: true });
    await writeFile(path.join(subject, 'TASK.md'), task + '\n');
  }
  const parser = path.join(subjects.candidate, 'parser.mjs');
  await writeFile(parser, (await readFile(parser, 'utf8'))
    .replace('parseRows(text)', "parseRows(text, delimiter = ',')")
    .replace("ch === ','", 'ch === delimiter'));
  const command = path.join(subjects.candidate, 'cli.mjs');
  await writeFile(command, (await readFile(command, 'utf8'))
    .replace('INPUT_FILE', 'INPUT_FILE [DELIMITER]')
    .replace("process.argv[2], 'utf8'))", "process.argv[2], 'utf8'), process.argv[3])"));
  const graderFile = path.join(here, 'private/grade.mjs');
  const baseline = await tree(subjects.baseline), candidate = await tree(subjects.candidate);
  const campaign = {
    schema: 'pigboard-evaluation-campaign/v1', kind: 'synthetic_control', unit: 'system',
    description: 'Real parser checks with reference edits; no model effectiveness measured.',
    baseline: { revision: baseline, digest: baseline }, candidate: { revision: candidate, digest: candidate },
    profile: { digest: digest('no-model-control/v1'), description: 'No model. Deterministic reference edits.' },
    environment: { digest: digest(`${process.version}/${process.platform}/${process.arch}`), description: `Node ${process.version}, ${process.platform}/${process.arch}` },
    limits: { wall_ms: 60000, tokens: 1 },
    cases: [{ id: 'reuse_parser', split: 'smoke', fixture: baseline, task: digest(task), grader: digest(await readFile(graderFile)),
      rubric: digest('default compatibility, library delimiter, CLI delimiter; actual values must match'),
      expected_outcome: 'COMPLETED_CHANGE', repetitions: 1, min_successes: 1, graders_required: 1,
      assertions: ['default_compatible', 'library_delimiter', 'cli_delimiter'].map(id => ({ id, kind: 'behavior', must_pass: false })), dimensions: [] }],
  };
  const campaignFile = path.join(output, 'campaign-input.json');
  await writeFile(campaignFile, JSON.stringify(campaign, null, 2));
  const store = path.join(output, 'comparison');
  evaluate('prepare', campaignFile, store);
  const packets = {};
  for (const arm of ['baseline', 'candidate']) {
    const start = performance.now();
    const publicTests = spawnSync(process.execPath, ['--test', path.join(subjects[arm], 'test.mjs')], { encoding: 'utf8', timeout: 10000 });
    if (publicTests.status !== 0) throw new Error('Public fixture contract failed.');
    const probe = spawnSync(process.execPath, [graderFile, subjects[arm]], { encoding: 'utf8', timeout: 10000 });
    if (![0, 1].includes(probe.status)) throw new Error('Private grader did not complete.');
    const grade = JSON.parse(probe.stdout);
    if (arm === 'baseline' && !grade.assertions.some(a => a.result === 'FAIL')) throw new Error('Negative control failed to detect the missing feature.');
    if (arm === 'candidate' && grade.assertions.some(a => a.result !== 'PASS')) throw new Error('Reference correction failed.');
    const packetRoot = path.join(output, `packet-${arm}`); await mkdir(packetRoot);
    const evidence = [];
    async function retain(id, bytes) {
      await writeFile(path.join(packetRoot, `${id}.txt`), bytes);
      evidence.push({ id, path: `${id}.txt`, digest: digest(bytes) });
    }
    await retain('grade', probe.stdout);
    await retain('public_tests', publicTests.stdout);
    await retain('host', JSON.stringify({ kind: 'synthetic_control', model: null, timeout_ms: 10000,
      public_exit: publicTests.status, grader_exit: probe.status, grader: graderFile, subject: subjects[arm] }));
    for (const file of files) await retain(file.replace('.', '_'), await readFile(path.join(subjects[arm], file)));
    const c = campaign.cases[0];
    const packet = { schema: 'pigboard-evaluation-packet/v1', campaign: digestValue(campaign), run_id: randomUUID(),
      case: c.id, repetition: 1, arm, binding: { suite: campaign[arm].digest, profile: campaign.profile.digest,
        environment: campaign.environment.digest, fixture: c.fixture, task: c.task, grader: c.grader, rubric: c.rubric },
      status: 'COMPLETED', outcome: 'COMPLETED_CHANGE', result_revision: campaign[arm].revision,
      host: { actor: 'reference_author', profile_verified: true, budgets_enforced: true, receipt: 'host' },
      graders: [{ id: 'deterministic_probe', independent: true, report: 'grade' }],
      author_verification: { result: probe.status === 0 ? 'PASS' : 'FAIL', evidence: ['grade', 'public_tests'] },
      assertions: grade.assertions.map(a => ({ ...a, evidence: ['grade'] })), quality: [],
      metrics: { wall_ms: Math.ceil(performance.now() - start), tokens: 0 }, evidence };
    packets[arm] = path.join(packetRoot, 'packet.json');
    await writeFile(packets[arm], JSON.stringify(packet, null, 2));
    evaluate('record', store, packets[arm]);
  }
  const report = evaluate('compare', store);
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  return { output, store, packets, report };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) { console.error('Usage: node evals/reuse-parser/control.mjs NEW_DIRECTORY'); process.exitCode = 2; }
  else try { const { output, report } = await control(process.argv[2]); console.log(JSON.stringify({ output,
    direction: report.direction, qualification: report.qualification, interpretation: report.interpretation })); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
