// Evaluator-owned. Never copy this file into a model's public fixture.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const subject = path.resolve(process.argv[2]);
const { parseRows } = await import(pathToFileURL(path.join(subject, 'parser.mjs')));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'pgb-parser-probe-'));
const assertions = [];
function check(id, action) {
  try { action(); assertions.push({ id, result: 'PASS' }); }
  catch { assertions.push({ id, result: 'FAIL' }); }
}
try {
  const input = path.join(temporary, 'input.csv');
  await writeFile(input, 'name;value\n"a;b";2\n');
  check('default_compatible', () => assert.deepEqual(parseRows('name,value\n"a,b",2\n'), [['name', 'value'], ['a,b', '2']]));
  check('library_delimiter', () => assert.deepEqual(parseRows('name;value\n"a;b";2\n', ';'), [['name', 'value'], ['a;b', '2']]));
  check('cli_delimiter', () => assert.deepEqual(JSON.parse(execFileSync(process.execPath,
    [path.join(subject, 'cli.mjs'), input, ';'], { encoding: 'utf8', timeout: 5000 })), [['name', 'value'], ['a;b', '2']]));
  console.log(JSON.stringify({ assertions }));
  process.exitCode = assertions.every(a => a.result === 'PASS') ? 0 : 1;
} finally { await rm(temporary, { recursive: true, force: true }); }
