import { digestValue, slot } from './contracts.mjs';

function assess(campaign, c, packet) {
  const gaps = [], failures = [];
  const add = (list, code) => list.push(code);
  if (!packet.host?.profile_verified) add(gaps, 'PROFILE_NOT_VERIFIED');
  if (!packet.host?.budgets_enforced) add(gaps, 'BUDGET_NOT_ENFORCED');
  const graders = packet.graders.filter(g => g.independent && g.id !== packet.host?.actor);
  if (graders.length < c.graders_required) add(gaps, 'INDEPENDENT_GRADING_MISSING');
  if (packet.metrics.wall_ms === null || packet.metrics.tokens === null) add(gaps, 'COST_UNKNOWN');
  if (packet.status === 'INCOMPLETE' || packet.status === 'INFRASTRUCTURE_FAILURE') add(gaps, packet.status);
  if (packet.status === 'BUDGET_EXHAUSTED' || packet.metrics.wall_ms > campaign.limits.wall_ms ||
      packet.metrics.tokens > campaign.limits.tokens) add(failures, 'BUDGET_EXHAUSTED');
  if (packet.outcome === null) add(gaps, 'OUTCOME_UNKNOWN');
  else if (packet.outcome !== c.expected_outcome) add(failures, 'WRONG_OUTCOME');
  if (packet.author_verification.result === 'FAIL') add(failures, 'AUTHOR_VERIFICATION_FAILED');
  if (packet.outcome === 'COMPLETED_CHANGE') {
    if (!packet.result_revision) add(gaps, 'RESULT_REVISION_MISSING');
    if (!['PASS', 'FAIL'].includes(packet.author_verification.result)) add(gaps, 'AUTHOR_VERIFICATION_MISSING');
  }
  for (const a of packet.assertions) {
    if (a.result === 'INCOMPLETE') add(gaps, `ASSERTION:${a.id}`);
    if (a.result === 'FAIL') add(failures, `ASSERTION:${a.id}`);
  }
  for (const q of packet.quality) if (q.applicable && q.score === null) add(gaps, `QUALITY:${q.id}`);
  const hard = packet.assertions.filter(a => a.result === 'FAIL' &&
    c.assertions.find(spec => spec.id === a.id).kind === 'integrity').map(a => a.id);
  const mustPass = packet.assertions.filter(a => a.result === 'FAIL' &&
    c.assertions.find(spec => spec.id === a.id).must_pass).map(a => a.id);
  return { slot: slot(packet), run_id: packet.run_id, status: packet.status, outcome: packet.outcome,
    comparable_basis: Boolean(packet.host?.profile_verified && packet.host?.budgets_enforced && graders.length >= c.graders_required),
    success: packet.status === 'COMPLETED' && !gaps.length && !failures.length,
    gaps, failures, hard_failures: hard, must_pass_failures: mustPass,
    assertions: packet.assertions, quality: packet.quality, metrics: packet.metrics,
    evidence: packet.evidence.map(({ id, path, digest }) => ({ id, path, digest })),
    packet: digestValue(packet) };
}

// Direction and candidate qualification answer different questions. In particular,
// an equally unsafe baseline cannot make an unsafe candidate eligible.
export function compare(campaign, packets) {
  const bySlot = new Map(packets.map(p => [slot(p), p]));
  const missing = [], gaps = [], blocking = [], pairs = [], cases = [];
  let gains = 0, losses = 0;
  const totals = { baseline: { wall_ms: 0n, tokens: 0n, missing_costs: 0 },
    candidate: { wall_ms: 0n, tokens: 0n, missing_costs: 0 } };
  for (const c of campaign.cases) {
    const counts = { baseline: 0, candidate: 0 }, missingByArm = { baseline: 0, candidate: 0 };
    for (let repetition = 1; repetition <= c.repetitions; repetition++) {
      const pair = { case: c.id, repetition, split: c.split, baseline: null, candidate: null,
        gains: [], regressions: [], quality: [], cost_delta: null };
      for (const arm of ['baseline', 'candidate']) {
        const key = `${c.id}--${repetition}--${arm}`, packet = bySlot.get(key);
        if (!packet) { missing.push(key); missingByArm[arm]++; continue; }
        const result = assess(campaign, c, packet);
        pair[arm] = result;
        if (result.success) counts[arm]++;
        gaps.push(...result.gaps.map(reason => ({ slot: key, reason })));
        if (arm === 'candidate') {
          blocking.push(...result.hard_failures.map(id => ({ slot: key, reason: `HARD_FAILURE:${id}` })),
            ...result.must_pass_failures.map(id => ({ slot: key, reason: `MUST_PASS:${id}` })));
          if (result.failures.includes('AUTHOR_VERIFICATION_FAILED')) blocking.push({ slot: key, reason: 'AUTHOR_VERIFICATION_FAILED' });
        }
        for (const metric of ['wall_ms', 'tokens']) {
          if (packet.metrics[metric] === null) totals[arm].missing_costs++;
          else totals[arm][metric] += BigInt(packet.metrics[metric]);
        }
      }
      if (pair.baseline && pair.candidate) {
        const a = pair.baseline, b = pair.candidate;
        // Compare observable graded differences even when another observation is
        // missing; never hide a known loss behind an incomplete overall attempt.
        for (const assertion of a.comparable_basis && b.comparable_basis ? c.assertions : []) {
          const old = a.assertions.find(x => x.id === assertion.id).result;
          const next = b.assertions.find(x => x.id === assertion.id).result;
          if (old === 'FAIL' && next === 'PASS') pair.gains.push(`ASSERTION:${assertion.id}`);
          if (old === 'PASS' && next === 'FAIL') pair.regressions.push(`ASSERTION:${assertion.id}`);
        }
        if (!a.gaps.length && !b.gaps.length) {
          if (!a.success && b.success) pair.gains.push('SUCCESS');
          if (a.success && !b.success) pair.regressions.push('SUCCESS');
        }
        for (const id of c.dimensions) {
          const old = a.quality.find(q => q.id === id), next = b.quality.find(q => q.id === id);
          const comparable = a.comparable_basis && b.comparable_basis && old.applicable === next.applicable &&
            (!old.applicable || old.score !== null && next.score !== null);
          const delta = comparable && old.applicable ? next.score - old.score : null;
          pair.quality.push({ id, baseline: old, candidate: next, delta });
          if (!comparable) gaps.push({ slot: `${c.id}--${repetition}`, reason: `QUALITY_NOT_COMPARABLE:${id}` });
          if (delta > 0) pair.gains.push(`QUALITY:${id}`);
          if (delta < 0) pair.regressions.push(`QUALITY:${id}`);
        }
        pair.cost_delta = Object.fromEntries(['wall_ms', 'tokens'].map(key => [key,
          a.metrics[key] === null || b.metrics[key] === null ? null : b.metrics[key] - a.metrics[key]]));
      }
      gains += pair.gains.length; losses += pair.regressions.length;
      pairs.push(pair);
    }
    // Missing observations can still resolve to success only if no observed fact
    // already rules it out. Infrastructure failures are failed attempts too.
    const candidateIncomplete = pairs.filter(p => p.case === c.id && p.candidate?.gaps.length &&
      !p.candidate.failures.length && ['COMPLETED', 'INCOMPLETE'].includes(p.candidate.status)).length;
    if (counts.candidate + missingByArm.candidate + candidateIncomplete < c.min_successes) {
      blocking.push({ case: c.id, reason: 'SUCCESS_FLOOR', required: c.min_successes, actual: counts.candidate });
    }
    cases.push({ case: c.id, split: c.split, planned_per_arm: c.repetitions,
      minimum_successes: c.min_successes, successes: counts, missing: missingByArm });
  }
  const incomplete = missing.length > 0 || gaps.length > 0;
  const qualification = blocking.length ? 'FAIL' : incomplete ? 'INCOMPLETE' : 'PASS';
  const direction = losses ? (gains ? 'MIXED' : 'REGRESSION') : incomplete ? 'INCOMPLETE' :
    gains && qualification === 'PASS' ? 'PROMISING' : 'NO_MEASURED_CHANGE';
  // Accepted per-attempt integers are safe, but their sum may not be. Keep JSON
  // totals exact without changing ordinary numeric totals or stored metrics.
  for (const costs of Object.values(totals)) {
    for (const metric of ['wall_ms', 'tokens']) {
      costs[metric] = costs[metric] <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(costs[metric]) : costs[metric].toString();
    }
  }
  return { schema: 'pigboard-evaluation-report/v1', campaign: digestValue(campaign),
    kind: campaign.kind, unit: campaign.unit, direction, qualification,
    gate: qualification === 'PASS' && ['PROMISING', 'NO_MEASURED_CHANGE'].includes(direction) ? 'PASS' : 'FAIL',
    planned_attempts: pairs.length * 2, recorded_attempts: packets.length,
    missing, gaps, blocking, cases, pairs, totals,
    interpretation: campaign.kind === 'synthetic_control' ?
      'Synthetic framework control; no model performance was measured.' :
      'Observed sample only; not statistical superiority, release approval or live acceptance.' };
}
