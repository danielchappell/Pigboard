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

Pause affected automations, build and inspect the receipt before selecting the new
Build and restoring them. Success includes version, executable, hashes and completed
version/help probes. Existing valid installs are reused; mismatches are preserved
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
Keep the token in Cursor secrets, never in source, tickets, prompts or command-line
arguments. A v2 profile at the user's standard config location needs the selected
email, verified Bitbucket account UUID, `auth_type: api-token`, `policy: review-write`,
Plexus repository name and UUID, active state and credential generation. These are
configuration values, not permissions granted by a label. Do not invent UUIDs or
borrow another person's identity. Profile metadata alone does not verify the token's
actual actor; check the provider identity during setup.

Read-only setup checks must establish the actual account, repository, PR snapshot,
complete comparison/comments and CI. Then verify authorized comment/edit, approval
and own-approval-removal behavior on an explicitly chosen test PR. Keep Jira access
and direct transitions, run ownership, durable evidence and duplicate handling as
separate setup gates. A successful version/help probe cannot satisfy them.

Use the same explicit executable, profile and repository on every command. Preserve
snapshot continuation arguments. Approval, comments and transitions require the
reviewer's freshness checks and read-back receipts; do not blindly repeat uncertain
writes. The entrypoint already defines these rules. Do not duplicate them in the
automation's one-sentence prompt.
