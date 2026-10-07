#!/bin/sh
set -eu
website_commit=${PIGBOARD_SITE_COMMIT:-$(git rev-parse HEAD)}
export PIGBOARD_SITE_COMMIT="$website_commit"
export PIGBOARD_SITE_ORIGIN=https://pigboard.scubapig.software
node --input-type=module -e "import {build} from './website/build.mjs'; build({out:'dist/website-image'});"
website_image="pigboard-website-check:$website_commit"
docker build -f Dockerfile.website -t "$website_image" .
test "$(docker image inspect "$website_image" --format '{{.Config.User}}')" = '65532:65532'
website_container=$(docker run -d --label pigboard.website.check=true -p 127.0.0.1::8080 "$website_image")
trap 'docker rm -f "$website_container" >/dev/null' EXIT
website_port=$(docker port "$website_container" 8080/tcp)
export PIGBOARD_SMOKE_ORIGIN="http://$website_port"
export PIGBOARD_SMOKE_REPORT=dist/website-release/container-smoke.json
node website/smoke.mjs
