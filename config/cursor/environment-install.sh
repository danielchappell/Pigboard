#!/usr/bin/env bash
# Cursor Install Script. Set PIGBOARD_REVISION to a reviewed, published commit.
# PIGBOARD_APP may override the single-repository install working directory.
set -euo pipefail
set +x
: "${PIGBOARD_REVISION:?Set PIGBOARD_REVISION to the reviewed 40-character commit}"
[[ "$PIGBOARD_REVISION" =~ ^[0-9a-f]{40}$ ]] || { echo 'Pigboard setup blocked: invalid revision.' >&2; exit 1; }
PIGBOARD_SOURCE=https://github.com/danielchappell/ski-stack.git
PIGBOARD_APP="${PIGBOARD_APP:-$PWD}"
export GIT_TERMINAL_PROMPT=0
node -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(1)'
git -C "$PIGBOARD_APP" rev-parse --show-toplevel >/dev/null
PIGBOARD_BOOTSTRAP=$(mktemp -d /tmp/pigboard-bootstrap.XXXXXXXX)
trap 'rm -rf -- "$PIGBOARD_BOOTSTRAP"' EXIT
git -C "$PIGBOARD_BOOTSTRAP" init --quiet
if ! git -C "$PIGBOARD_BOOTSTRAP" fetch --quiet --depth=1 -- "$PIGBOARD_SOURCE" "$PIGBOARD_REVISION" 2>/dev/null; then
  echo 'Pigboard setup blocked: cannot fetch the pinned private source. Check build Git access and published revision.' >&2
  exit 1
fi
git -C "$PIGBOARD_BOOTSTRAP" checkout --quiet --detach FETCH_HEAD
[[ "$(git -C "$PIGBOARD_BOOTSTRAP" rev-parse HEAD)" = "$PIGBOARD_REVISION" ]]
if [[ ! -e /opt/pigboard && ! -L /opt/pigboard ]]; then
  sudo -n install -d -m 700 -o "$(id -u)" -g "$(id -g)" /opt/pigboard
fi
node "$PIGBOARD_BOOTSTRAP/scripts/install-cursor-skills.mjs" \
  --source "$PIGBOARD_SOURCE" --ref "$PIGBOARD_REVISION" \
  --app "$PIGBOARD_APP" --root /opt/pigboard
