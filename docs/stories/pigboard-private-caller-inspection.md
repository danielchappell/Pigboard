Inspect your own Pigboard grant from a private workstation

Problem to solve

The private Pigboard host can show a caller's current grant, but the bootstrapped owner has no safe workstation command to use it. Manually building a request risks exposing the owner's bearer or misreading a failed inspection as revoked access.

Acceptance Criteria

- The bootstrapped owner can run one command to see only their current Pigboard principal and grants in text or JSON.
- A denied bearer is reported as denied, a valid 503 as unavailable, and a transport failure or invalid response as unverified; none claims revocation without proof.
- The command reads without changing a grant and never prints or logs the bearer.
- A named human or agent recipient can use the same command after a later Story issues their separate credential.

Technical Acceptance Criteria

- Read exactly one `pb1_` token, with at most one final LF, from a bounded, owned, mode-0600 nonsymlink file; verify its owned mode-0700 parent is the same real directory before and after the read.
- Send only `GET /v1/authority/me` to the reviewed private Flycast host and IPv6 pin; accept no caller URL, public address or redirect.
- Apply one total deadline from before connect through the full response and bound response bytes; validate the documented `schemaVersion: 1` JSON shape, reject control or line-separator characters in names, and rebuild output from validated fields.
- Keep the owner peer mapped to its principal ID; later recipients use separate peers mapped to stable recipient keys and never receive the owner bearer.
- Leave owner grant administration, Jira data, public ingress and database owner credentials out of this command.

Testing Strategy

- Manual QA: On a private workstation, run `caller:me` with the bootstrapped owner's protected token file and confirm the current principal and grants; then use a protected, correctly shaped but unissued fixture token and confirm the service returns denied.
- Access and setup: The live check needs the Pigboard Fly Machine, the owner-specific WireGuard peer and route, a current owner bearer, and the dedicated Neon runtime role; these are not yet live-proven.
- Automated regression: Test owner and separate agent-recipient own-grant fixtures, protected-file and private-route refusal, text/JSON output, denied and unverified results.
