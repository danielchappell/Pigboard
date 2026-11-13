# Permanent reviewer CLI setup

Scope: reuse the reviewed Pigboard external skill installation and pinned Rovito
0.1.295 installer. Prepare a persistent, nonsecret, isolated CLI profile for the
verified reviewer account/repository. Both delivery automations remain inactive.
No Bitbucket/Jira mutation or review run is authorized by this setup.

One setup slice (one PR, under 20 files, under two days):
- A deterministic Node setup command accepts verified nonsecret account email,
  account UUID, repository and repository UUID through explicit arguments. It
  writes a v2 `pigboard-pr-review` profile with `read-only` policy under a dedicated
  outside-checkout root. It never reads tokens, contacts providers, signs in or
  infers identity. It preserves any existing mismatched configuration and fails.
- Reuse the exact pinned Rovito executable/docs. Prepare a small capability receipt
  with the isolated config path and explicit profile/repository command. Link this
  prepared capability from the existing Cursor skill reference. Preserve shared
  review criteria, comment handling and one-sentence automation prompts.
- Do not claim full-review readiness: the saved token has identity/repository read
  scopes only. PR/CI permissions, eligible approval actor, Jira capabilities,
  review evidence/state, and a chosen authorized test Story/PR remain setup gates.
- Publish reviewed code to Pigboard; append the pinned setup command to Cursor's
  existing installer and refresh the skill bundle pin. Build with the verified
  account/repository identifiers from the prior successful read-only check.
  Test the persistent profile via read-only `auth doctor` and `context show`.
  Select a passing setup Build without enabling either automation.

Validation: fixture tests for isolated file permissions/config, idempotent reuse,
invalid input, outside-checkout constraint, symlinks and mismatch preservation.
Use the existing installer suite and skill validation. Two independent plan reviews
before implementation and committed-code reviews before PR. Hosted checks and the
actual Cursor Build/read-only provider check are separate evidence.
Rollback: keep prior selected Build and install command until the new Build passes;
on failure retain the previous selected Build and stop. A profile/policy change is
an explicit setup operation, never agent repair or fallback. No credentials enter
source, generated config, prompt, args or logs. Account settings stay in the Cursor
setup command; public code contains no personal account identifiers.

Principles: Intuitive—one prepared CLI route; Discoverable—skill links to its exact
capability and vendor docs; Delightful—no recurring sign-in or model-led setup;
Token saver—profile creation is deterministic; Secure—read-only policy, isolated
config, no stored token and preserved mismatches; Agents are equal—explicit command
and JSON receipt plus human setup guide; Dependable—separate installed/authenticated/
review-ready states and retain the last working Build. These apply to both humans
and agents; this setup does not implement workflow locks or grant provider rights.

Plan gate: two fresh independent Sol reviewers returned CLEAN, with 12/12 and
10/10 requirements covered and second sweeps. Product/docs and technical/security
lenses each assessed all seven principles; no in-scope findings.

Author implementation assessment: the setup produces only a v2 read-only profile
and a capability JSON outside the app. Identity metadata is explicit and no token
is read or persisted. Existing config is reused only if exact and owner-only;
otherwise it is preserved. Intuitive/discoverable: the Cursor reference links the
prepared command and vendor docs. Delightful/token saver: no model-led setup or
repeated login. Secure: no policy-elevation option or provider calls. Agents are
equal: JSON receipt and human guide cover the same route. Dependable: setup receipt
explicitly does not claim provider verification/full-review readiness. Local tests:
22/22 passed; skill frontmatter validation passed. Live permanent-profile Build
acceptance remains pending. This is an author assessment, not independent review.
