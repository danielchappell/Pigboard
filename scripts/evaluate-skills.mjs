#!/usr/bin/env node
import { prepare, record, load } from '../lib/evaluation/store.mjs';
import { compare } from '../lib/evaluation/compare.mjs';
import { fail } from '../lib/evaluation/contracts.mjs';

const help = `Compare Pigboard skill or system versions using independently graded evidence.
Node 20+, prepared source checkout (npm ci). This is maintainer tooling, not an installed worker helper.

node scripts/evaluate-skills.mjs prepare CAMPAIGN.json NEW_DIRECTORY
node scripts/evaluate-skills.mjs record DIRECTORY PACKET.json
node scripts/evaluate-skills.mjs compare DIRECTORY

All results are JSON. Prepare freezes the scheduled attempts; record copies and
checks evidence; compare verifies retained hashes and reports every planned pair.
No model execution, shell commands from records, service access or paid calls.
The prepared host owns sandboxing/budgets; independent graders own observations.
Exit 0: command succeeded, or comparison qualified with no measured regression.
Exit 1: incomplete/failed qualification or measured regression/mixed outcome.
Exit 2: usage, invalid input, duplicate/busy store or integrity failure.
See docs/skill-evaluation.md for complete records, recovery and trial setup.
Local control: node evals/reuse-parser/control.mjs NEW_DIRECTORY
`;
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') process.stdout.write(help);
  else {
    let result;
    if (args[0] === 'prepare' && args.length === 3) result = await prepare(args[1], args[2]);
    else if (args[0] === 'record' && args.length === 3) result = await record(args[1], args[2]);
    else if (args[0] === 'compare' && args.length === 2) {
      const { campaign, packets } = await load(args[1]);
      result = compare(campaign, packets);
      process.exitCode = result.gate === 'PASS' ? 0 : 1;
    } else fail('USAGE');
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  const known = ['USAGE', 'INPUT', 'SHAPE', 'IDENTITY', 'EVIDENCE', 'DUPLICATE', 'INTEGRITY', 'BUSY', 'LIMIT'].includes(error.code);
  console.log(JSON.stringify({ schema: 'pigboard-evaluation-error/v1', code: known ? error.code : 'IO',
    message: known ? error.message : 'Evaluation could not complete. Check prepared dependencies and directory access; no result is a pass.' }));
  process.exitCode = 2;
}
