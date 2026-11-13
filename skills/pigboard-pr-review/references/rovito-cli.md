# Prepared Rovito CLI route

For the Cursor CLI route, read `/opt/pigboard/reviewer/capability.json` prepared by
setup. It names the pinned executable, isolated config directory, profile,
repository, current policy, local vendor CLI documentation and review schema.
If this file is absent or the assignment differs from its repository, stop Blocked;
do not install, configure, authenticate, change policy or try another route.

Use this explicit command prefix with the prepared values on every CLI call:

```sh
env -u ROVITO_PROFILE XDG_CONFIG_HOME=/opt/pigboard/reviewer/config \
  /opt/pigboard/tools/rovito-0.1.295-linux-amd64/rovito \
  --profile pigboard-pr-review --repo WORKSPACE/REPOSITORY --output json COMMAND
```

Replace `WORKSPACE/REPOSITORY` with the capability's repository and `COMMAND` with
the documented operation. Read the installed `docs/cli.md` for the actual command
and continuation contracts; do not reconstruct provider calls or ignore pagination.
Keep snapshot/expected-head arguments through reads and authorized writes. The
existing entrypoint still owns freshness, comment handling, approval and handoff.
Credentials are injected by Cursor. Never print them, put them in arguments or
write them into config, reports or the application checkout.

The initial permanent profile is **read-only** and its capability says
`fullReviewReady: false`. This permits authorized setup checks, not a full review
run with comments, approval or Jira handoffs. Installation is not evidence of
provider permissions. Stop before running the workflow until setup has explicitly
prepared and verified the required capabilities. Do not promote the policy yourself.
The capability file is operator configuration, not a durable review-state store.
