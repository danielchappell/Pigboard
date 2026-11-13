# Rovito for the Cursor reviewer

The selected route is the existing Rovito CLI. MCP is separate work; switch only
after it is implemented and tested with Cursor automations. The reviewer prompt
continues to point to the installed Pigboard entrypoint.

## Install before the agent starts

[rovito-install.sh](rovito-install.sh) prepares the official Linux x86-64 release
0.1.295 in `/opt/pigboard/tools/rovito-0.1.295-linux-amd64`. It retains the release's
CLI documentation, review schema and licenses. The executable is:

```text
/opt/pigboard/tools/rovito-0.1.295-linux-amd64/rovito
```

It needs Node 20+, Bash, curl, sha256sum and tar. Run it after the existing Pigboard
skill installer, as the same Build user. The tool directory must be writable and
outside Git checkouts; no sudo or credentials are used. `PIGBOARD_APP` defaults to
the current application checkout. `PIGBOARD_TOOL_ROOT` optionally selects another
absolute, canonical tool directory outside the application and Git checkouts.

Append this to the saved Cursor **Install Script** after replacing both placeholders
with the reviewed, published Pigboard commit and this script's SHA-256. Keep the
existing skill install command and pin unchanged. Keep **Start Script** empty.

```sh
(
  set -euo pipefail
  set +x
  umask 077
  script_dir=$(mktemp -d /tmp/pigboard-rovito-bootstrap.XXXXXXXX)
  trap 'rm -rf -- "$script_dir"' EXIT
  curl --disable --fail --silent --show-error --location \
    --proto '=https' --proto-redir '=https' --connect-timeout 20 --max-time 120 \
    https://raw.githubusercontent.com/danielchappell/Pigboard/REVIEWED_COMMIT/config/cursor/rovito-install.sh \
    --output "$script_dir/install.sh"
  printf '%s  %s\n' REVIEWED_SCRIPT_SHA256 "$script_dir/install.sh" | sha256sum --strict --check -
  bash "$script_dir/install.sh"
)
```

Keep affected automations inactive, build and inspect the receipt before selecting
the new Build. A successful Build does not authorize activation; enable an
automation only after explicit owner go-live authorization. Success includes
version, executable, hashes and completed version/help probes. Existing valid
installs are reused; mismatches are preserved
and fail setup. A human resolves a failed installation or restores the previously
verified Build/configuration. Never ask an agent to install or repair it.

The [official guide](https://rovito.scubapig.software/guides/install.html) supplied
the archive hash. The executable hash was independently calculated from that verified
archive. Hashes protect the pinned download; Linux archives have no publisher signature.
Fixture tests do not prove real Linux execution. Record the actual Cursor Build
receipt separately from authenticated access tests.

## Configure access separately

The installer does not sign in, select an account, create a profile or contact
Bitbucket. Before reviewer activation, choose an eligible approval account and
configure its non-secret Rovito profile and secure Cursor credentials. Use the
release's `docs/oauth.md`, `docs/cli.md` and review-submission schema for the exact
supported interface. Provide their paths in the prepared capability instructions.

The existing headless API-token route reads `ROVITO_EMAIL` and `ROVITO_API_TOKEN`.
Keep these in Cursor Runtime Secrets, never in source, tickets, prompts or command
arguments. The owner saved these for the verified account; the successful read-only
check is recorded in the reviewer setup guide.

### Persistent profile

After the pinned tool/skill installers, run the reviewed, published
`scripts/configure-reviewer-cli.mjs` with verified nonsecret values:

```sh
node configure-reviewer-cli.mjs \
  --email VERIFIED_EMAIL \
  --account-uuid '{VERIFIED_ACCOUNT_UUID}' \
  --repository WORKSPACE/REPOSITORY \
  --repository-uuid '{VERIFIED_REPOSITORY_UUID}'
```

Fetch this script from an exact Pigboard commit and verify its SHA-256 before
execution, as with the tool installer above. Keep personal account values in the
saved environment setup, not the public source. The command writes an isolated
v2 profile and capability file under `/opt/pigboard/reviewer`, outside the app and
all Git checkouts. `--app` defaults to the current checkout; `--root` can select an
outside-checkout canonical location for isolated validation. The standard runtime
path is fixed by the linked skill contract; a custom root is for setup tests only.
Existing identical files are reused; unsafe or mismatched files are preserved and
setup fails. A human may prepare a new root/Build or explicitly replace the old
configuration after inspecting the difference. There is no automatic migration.

The default policy is `read-only`. For operator-authorized review preparation,
append `--policy review-write` to the command above. These are the only supported
values. The selected policy appears in config, capability and setup receipt.
An existing profile with a different policy is preserved and setup fails; use a
fresh Build/root or explicitly resolve the mismatch as an operator. The delivery
agent must never change policy or repair setup.

This is persistent configuration, not a full-review authorization. Both policies
keep `providerAccessVerified: false` and `fullReviewReady: false` in the capability.
The command neither reads a token nor contacts
Bitbucket; its receipt says `providerAccessVerified: false`. Use the
[prepared CLI contract](../../skills/pigboard-pr-review/references/rovito-cli.md)
for the exact invocation and installed vendor documentation. The current skill
bundle must include that reference. Do not add setup instructions to the prompt.

Keep both automations inactive, build, then run authorized `auth doctor` and
`context show` using this persistent config and explicit profile/repository.
Record those results separately from the installer receipt. Select the passing
Build only after checking it; Build selection does not enable an automation.
Credentials remain runtime secrets and are not written into the snapshot files.
Full-review setup still needs verified token rights, prepared Jira/run/evidence
capabilities and authorized fixture acceptance; this installer cannot prove them.

The pinned CLI's `review-write` policy permits reads and collaborative writes,
including PR comment creation/editing, approval and changes-requested. It rejects
merge (operational) and comment deletion (destructive). This applies to calls
through that CLI policy; it does not restrict arbitrary use of the raw token or
policy reconfiguration. Bitbucket's `write:pullrequest:bitbucket` token scope also
grants merge, so do not describe the token itself as unable to merge. The workflow
forbids merge and the agent must use the prepared profile unchanged.

Before any Safeguard Bitbucket or Jira access, obtain the owner's explicit approval
of the exact target and actions. An account email or nominated test PR is context,
not that approval. Do not sign in, switch accounts, handle credentials or query
provider identity/repository/PR metadata during credential-free preparation.
No Safeguard Jira test is currently authorized. Fixture writes require a separate
explicit approval from read-only checks.

Once specifically authorized, read-only setup checks must establish the actual
account, repository, PR snapshot, complete comparison/comments and CI. Then verify
authorized comment/edit, approval
and own-approval-removal behavior on an explicitly chosen test PR. Keep Jira access
and direct transitions, run ownership, durable evidence and duplicate handling as
separate setup gates. A successful version/help probe cannot satisfy them.

Use the same explicit executable, profile and repository on every command. Preserve
snapshot continuation arguments. Approval, comments and transitions require the
reviewer's freshness checks and read-back receipts; do not blindly repeat uncertain
writes. The entrypoint already defines these rules. Do not duplicate them in the
automation's one-sentence prompt.
