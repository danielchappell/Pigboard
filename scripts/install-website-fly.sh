#!/bin/sh
set -eu
test "$(uname -s)" = Linux
test "$(uname -m)" = x86_64
website_fly_dir=$(mktemp -d)
trap 'rm -rf "$website_fly_dir"' EXIT
curl --fail --show-error --silent --location --proto '=https' --proto-redir '=https' \
  https://github.com/superfly/flyctl/releases/download/v0.4.99/flyctl_0.4.99_Linux_x86_64.tar.gz \
  --output "$website_fly_dir/flyctl.tar.gz"
printf '%s  %s\n' '384a14958b214b18ebda784dee101a633ceae626ac4bcccee0fc7ebb111247a4' "$website_fly_dir/flyctl.tar.gz" | sha256sum -c -
tar -xzf "$website_fly_dir/flyctl.tar.gz" -C "$website_fly_dir" flyctl
mkdir -p "$HOME/.local/bin"
install -m 755 "$website_fly_dir/flyctl" "$HOME/.local/bin/flyctl"
printf '%s\n' "$HOME/.local/bin" >> "$GITHUB_PATH"
"$HOME/.local/bin/flyctl" version
