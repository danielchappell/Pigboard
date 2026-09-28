# D3r discovery: rotate one named caller without an authority gap

28 September 2026. Design Task for independent review, not a ready Story or a
change to the selected owner/private-service boundary. D3e's complete
issue/request-status/recipient-status/revoke API is still NOT CLEAN as a
less-than-two-day Story and has not been implemented. This Task advances a
separate pre-S02a dependency while live Jira/Neon credentials are pending.

## Outcome and constraints

The current named human owner can replace one human or agent recipient's
`connection_admin` bearer without distributing the owner credential, the Neon
URL, or a shared agent credential. The old bearer continues to authorize until
the recipient has durably stored the replacement and proves possession of both
its current bearer and the replacement. At one serialized activation commit,
the replacement becomes active and every old bearer for that recipient becomes
inactive. A newly authorized command has no interval with two fully active
bearers and no planned interval with neither active. A lost reply, failed file
write, revoked recipient, stale owner or unavailable root must not be reported
as success or trigger an automatic second rotation.

The actor boundary stays the D3e boundary: owner initiation uses the fixed
private Flycast service with the current human owner grant; recipient proof uses
its separately mapped network-only peer. Fly holds the runtime SQL secret; the
protected owner/recipient files hold bearers. Only the pinned production Neon
root is authoritative. Service revocation and mapped peer removal remain
separate outcomes. This does not rotate Jira, Cursor, Fly, Neon or encryption
keys; it does not create a second owner or widen project scope.

## Candidate protocol to test

1. The owner client durably saves a caller-generated rotation request ID and
   exclusively allocates a protected response file **before** sending. The
   owner-authenticated prepare command names stable recipient key, principal
   ID and expected generation. Under the pinned authority row lock, it verifies
   the owner's current human grant, that the recipient still has one active
   `connection_admin` grant and active bearer, and that no other pending
   rotation exists. It records the initiating owner principal and credential
   IDs with a digested **pending activation credential** and one append-only
   prepare event. The old bearer remains active. The pending bearer cannot
   inspect Jira, change grants or call `/me` as an active caller.
   It has no independent route authority; activation also needs the recipient's
   still-current bearer.
2. The prepare response contains the new bearer exactly once. The client
   validates the response, fsyncs the protected file and parent, then transfers
   it through a private channel into the named recipient's own protected store.
   The human CLI or noninteractive agent recipient exclusively creates a
   mode-0600 replacement file inside its owned mode-0700 store, fsyncs file and
   parent, then reopens and verifies file identity, mode and bearer contents
   before acknowledging protected custody. A write, fsync, identity or restart
   check failure leaves the old bearer active and the rotation pending. No token
   enters logs, URLs, arguments, normal status results, or repository artifacts.
   A recipient unable to join its mapped private peer cannot activate. A lost
   or undelivered response leaves the old bearer working. The owner uses
   request-ID and recipient-key status to determine whether a pending digest
   exists, then may cancel it under the same lock; it never blindly prepares
   again. Cancellation is distinct from revoking the recipient.
3. The recipient calls a fixed activation route with both the currently active
   bearer and the pending replacement bearer plus its request ID from its own
   private peer. The client reads both protected files and transmits the current
   bearer in `Authorization` and the pending bearer in a separate bounded
   secret header; both headers are redacted from every log. An uncertain POST
   is never retried automatically. In one transaction under the authority row
   lock, the service
   verifies that both digests belong to the same principal/key, the exact
   pending request, active grant, unexpired pending state, unchanged principal
   identity and still-active old credential ID captured at prepare. It also
   rechecks the initiating human owner's recorded principal and credential IDs
   against the current active owner grant and bearer. Owner recovery or
   replacement invalidates the pending rotation; the old recipient bearer
   remains active, the new owner sees the stale request state and may start a
   new request. Activation does not require the global pilot generation to
   equal its prepare value: unrelated
   owner work may advance it. A same-recipient revoke, replacement, cancellation
   or expiry makes the pending request nonactivatable with a specific
   owner-readable status. The transaction changes the pending credential to
   active and marks every previously active bearer for that recipient inactive
   in the same commit. It appends an activation event and advances generation.
   The response contains no bearer. The new bearer now works on `/me`; the old
   bearer fails on the next command. An old-bearer command already in flight
   linearizes at its final grant/credential recheck under the same authority
   lock, as the selected S02a first-service design requires. A command whose
   final check wins before activation may finish its authorized response after
   the cutover; a check after activation denies the old bearer. The guarantee
   concerns authorization/effect ordering, not wall-clock response completion.
   A fresh recipient-status GET using the now-current new bearer and the same
   request ID may read only that committed status; it cannot repeat the write.
   The activation POST is never replayed after an uncertain result. After a
   later revoke or supersession, an inactive token cannot read status or
   reactivate itself.
4. Current-owner status by request ID or stable recipient key distinguishes
   `pending`, `active`, `cancelled`, `superseded`, `expired`, `revoked`, verified
   `not_found` and `unverified`, with no bearer material. A recipient may inspect
   only its own current state through its currently active bearer; before
   activation the old bearer remains current, afterward the new bearer is
   current. A pending bearer alone or any inactive bearer gets generic denial.
   Only a fresh root read proves a committed state. An uncertain activation
   reply is reconciled by request ID and by probing `/me` with the new bearer;
   no automatic retry is sent. If the new file is lost after activation, the
   owner uses the existing all-credential revoke and separately onboards a new
   credential, reporting a real access interruption; it must not restore an
   old digest. This exception is a recovery path, not a promise of gap-free
   operation after credential loss.

## Feasibility questions before grooming

- Verify whether a pending digest can be represented with the current v3
  authority constraints, or whether a separately versioned migration is needed.
  The runtime role must not gain schema/role/restore authority; test effective
  grants and old-image refusal against the latest migration receipt.
- The chosen application activation authority is possession of **both** the
  currently active recipient bearer and the privately delivered pending
  bearer, validated for the same principal under the root lock. Fly WireGuard
  peers have organization-wide private reach, so peer membership provides
  network isolation and per-recipient custody/offboarding but is not claimed
  as application identity binding. A wrong recipient with only the pending
  file cannot activate it; theft of both bearers compromises that recipient
  and follows the D3e revoke/re-onboard recovery path. Live Fly tests must
  prove the private route, separate peer custody and pending-bearer-only denial
  from another peer; no unverified peer-ID signal is relied upon.
- Bound pending lifetime and cancellation. A stale pending bearer must never
  activate after initiating-owner recovery/replacement, recipient revoke or
  re-onboarding, a same-recipient state change that invalidates its captured
  old credential ID, or a newer accepted rotation. An unrelated global
  generation change does not strand the handoff. Define clock source and
  compare under the database lock, not an untrusted client timestamp.
- Test prepare versus revoke and concurrent prepare/activate/cancel with two
  real PostgreSQL sessions. Test lost prepare and activation replies, protected
  owner and recipient output-file failures, recipient restart before/after
  activation, unrelated owner mutation between prepare/activate, initiating
  owner recovery between prepare/activate, both orders of the in-flight
  old-bearer final authorization check, inactive-token replay/status denial,
  service restart, old/new `/me` acceptance, and v3/v4 image and migration
  compatibility. Live peer and root behavior remain
  separate acceptance checks.
- Inventory changed files and human hours including SQL migration, owner and
  recipient clients, routes, docs, test fixtures and PR preparation. If the
  complete outcome cannot fit one PR, 20 files and less than two human days,
  find a genuinely usable predecessor or redesign the boundary. Do not split
  prepare from activation into inert or unsafe Stories.

## Alternatives and decision

Immediate owner-side digest replacement is smaller, but invalidates the old
bearer before the new one is safely delivered. Keeping both old and new as
ordinary active bearers creates a temporary second fully authorized caller.
Revoke-then-issue and issue-then-revoke have the same gap/overlap problems.
The pending-then-activate protocol is the candidate to test because it makes
the recipient's successful receipt the cutover trigger while the database makes
the authority switch atomic. It remains a proposal until independent review,
database/peer feasibility and a credible PR-sized plan.

## Author assessment of seven principles

1. **Intuitive:** the owner starts replacement and the recipient activates it;
   both see named recipient and pending/active status. A two-step pilot flow is
   less smooth than a one-click rotation but reflects the handoff boundary.
2. **Discoverable:** human guidance must explain the saved request ID, protected
   file transfer, recipient durable-save acknowledgment and recovery; agents
   need structured prepare/activate/status
   contracts and noninteractive errors. The exact commands remain to design.
3. **Delightful experience:** the old bearer remains usable during normal
   transfer, avoiding a planned outage. Peer setup still adds pilot friction.
4. **Token saver:** targeted request/recipient status resolves uncertainty
   without broad authority dumps; it must explicitly omit token material and
   peer-removal proof.
5. **Secure:** owner initiation, dual-bearer activation, pinned root lock,
   separate recipient files/peers and atomic cutover limit authority. The
   service relies on two-token possession, not an unverified peer-ID binding.
6. **Agents are equal:** human and agent recipients perform the same private,
   noninteractive activation with separate credentials; only the human owner
   initiates or cancels, as already agreed.
7. **Dependable:** no automatic retry after an unknown commit; recipient file
   durability, in-flight command ordering, fresh status and old/new `/me` checks
   distinguish a normal cutover from lost response. A
   lost newly active file can still cause a real interruption and must be
   reported as such.
