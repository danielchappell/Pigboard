#!/usr/bin/env bash
# Run during Cursor Build, after the Pigboard skill installer. No credentials needed.
set -euo pipefail
set +x
umask 077
[[ "$(uname -s)/$(uname -m)" = Linux/x86_64 ]] || { echo 'Rovito setup requires Linux x86-64.' >&2; exit 1; }
for tool in node curl sha256sum tar; do command -v "$tool" >/dev/null; done
root="${PIGBOARD_TOOL_ROOT:-/opt/pigboard/tools}"
app="${PIGBOARD_APP:-$PWD}"
node - "$root" "$app" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [root, app] = process.argv.slice(2);
if (Number(process.versions.node.split('.')[0]) < 20) throw Error('Node 20+ required.');
function canonical(p) {
  try { return fs.realpathSync(p); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    if (fs.lstatSync(p, {throwIfNoEntry:false})) throw Error('Dangling path.');
    return path.join(canonical(path.dirname(p)), path.basename(p));
  }
}
const inside = (a,b) => {const r=path.relative(a,b);return r!== '..' && !r.startsWith('..'+path.sep) && !path.isAbsolute(r);};
if (!path.isAbsolute(root) || path.resolve(root) !== root || canonical(root) !== root)
  throw Error('Tool root must be an absolute canonical path without symlinks.');
const application = fs.realpathSync(app);
if (inside(application,root) || inside(root,application)) throw Error('Tool root must be separate from the application.');
for (let dir=root;;dir=path.dirname(dir)) {
  if (fs.lstatSync(path.join(dir,'.git'), {throwIfNoEntry:false})) throw Error('Tool root must be outside Git checkouts.');
  if (path.dirname(dir) === dir) break;
}
NODE
version=0.1.295
archive_hash=8f5b480259e662ef9ac8e267064758c8651cd6de32c222e8fe58a98236b536ed
binary_hash=03e49d29640af64bd25b1517445391cd3bf6f68f26347461b90da9b9fc79bfb6
destination="$root/rovito-$version-linux-amd64"
temporary=''
trap 'if [[ -n "$temporary" ]]; then rm -rf -- "$temporary"; fi' EXIT
verify() {
  local directory="$1"
  [[ -d "$directory" && ! -L "$directory" ]] || return 1
  for file in rovito docs/cli.md docs/oauth.md schemas/rovito.review-submission.v1.schema.json LICENSE NOTICE; do
    [[ -f "$directory/$file" && ! -L "$directory/$file" ]] || return 1
  done
  [[ -x "$directory/rovito" ]] || return 1
  printf '%s  %s\n' "$binary_hash" "$directory/rovito" | sha256sum --strict --check - >/dev/null
  # Probe only the pinned executable, with no inherited provider credentials/config.
  env -i PATH="$PATH" LANG=C "$directory/rovito" version --output json > "$probe"
  node - "$probe" "$version" <<'NODE'
const fs=require('node:fs');
const receipt=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if (receipt.data?.version !== process.argv[3]) throw Error('Unexpected Rovito version.');
NODE
  env -i PATH="$PATH" LANG=C "$directory/rovito" --help >/dev/null
}
mkdir -p -- "$root"
temporary=$(mktemp -d "$root/.rovito-install.XXXXXXXX")
probe="$temporary/version.json"
reused=false
if [[ -e "$destination" || -L "$destination" ]]; then
  verify "$destination"
  reused=true
else
  archive="$temporary/rovito.tar.gz"
  # --disable prevents local curl configuration from changing the fixed download.
  env -i PATH="$PATH" LANG=C curl --disable --fail --silent --show-error --location \
    --proto '=https' --proto-redir '=https' --connect-timeout 20 --max-time 120 \
    "https://rovito.scubapig.software/downloads/v$version/rovito_${version}_linux_amd64.tar.gz" \
    --output "$archive"
  printf '%s  %s\n' "$archive_hash" "$archive" | sha256sum --strict --check - >/dev/null
  mkdir "$temporary/release"
  tar -xzf "$archive" -C "$temporary/release" --no-same-owner
  verify "$temporary/release"
  # Rename publishes only a completely verified directory and never merges trees.
  node - "$temporary/release" "$destination" <<'NODE'
const fs=require('node:fs');
if (fs.lstatSync(process.argv[3],{throwIfNoEntry:false})) throw Error('Destination appeared during installation.');
fs.renameSync(process.argv[2],process.argv[3]);
NODE
fi
node - "$destination/rovito" "$version" "$archive_hash" "$binary_hash" "$reused" <<'NODE'
const [executable,version,archiveSha256,binarySha256,reused]=process.argv.slice(2);
console.log(JSON.stringify({executable,version,archiveSha256,binarySha256,reused:reused==='true',verification:['binary-sha256','version','help']}));
NODE
