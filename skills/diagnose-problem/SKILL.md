---
name: diagnose-problem
description: Investigate a failing check, unexpected behavior or repeated unsuccessful fix and return an evidenced cause and the appropriate recovery route.
---

# Find the cause before the next fix

Use the expected behavior, observed failure, exact code state, accepted plan and
prepared tools. Apply [engineering-principles](../engineering-principles/SKILL.md).
The caller supplies a finite diagnostic allowance within the current run. This
method may reproduce behavior within that authority; it does not patch product
code, repair infrastructure or retry uncertain provider writes.

Preserve the failure output and the inputs that produced it. Reproduce it when
practical, or explain why the available evidence must suffice. Trace the real
calls and state changes to locate where actual behavior first differs from the
contract. Distinguish a product defect from a bad test assumption, missing setup
or a legitimate error response.

Test the deciding assumption with the smallest permitted observation. For example,
duplicate output may come from replayed persisted state; removing duplicate rows
can conceal that cause and delete valid data. Choose evidence that distinguishes
those explanations. Do not repeat a failed fix without new information.

Recommend the smallest correction that restores the contract and preserves other
callers. Include a useful regression check, preferably a practical failing-before
reproduction. Reuse the existing harness; do not build a fragile one merely to
manufacture a red/green sequence. Record related out-of-scope defects separately.

Return the observations, supported cause or exact remaining uncertainty, affected
contracts, proposed correction and verification, with one recovery class:

- **LOCAL_FIX:** the correction fits the accepted approach and scope.
- **REPLAN:** a false assumption changes the approach; stop before those edits.
- **UPSTREAM_WAIT:** a known assigned upstream repair prevents completion; the job
  must validate exact dependency and repair evidence before returning DEPENDENCY_WAIT.
- **BLOCKED:** the cause is unresolved, required access/setup is unavailable, the
  allowance is exhausted or an owner decision is needed.

The job owns the fix and handoff. Preserve evidence and the next useful action on
every stop. A diagnosis does not grant a bigger budget, a new repository or an
extra publication attempt.
