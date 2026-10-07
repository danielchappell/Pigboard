# Pigboard website

The public marketing website has Home, Method and Availability pages. It describes
the intended delivery outcome for a lead with an existing technical team and
clearly identifies today's private tools. It does
not expose the private host, offer hosted signup, or require credentials to run.

## Build and preview

Use Node 20 or later and Go 1.26.6. From the repository root:

```sh
node website/build.mjs
go -C website build -o ../dist/pigboard-site ./cmd/site
./dist/pigboard-site
```

Open <http://127.0.0.1:8772/>. Stop with Ctrl-C before rebuilding after editing
HTML, CSS, JavaScript or artwork, then start the server again. The rooted server
keeps the directory it opened at startup; a successful build replaces that
directory, so a running preview must restart to use the new output.
Use `./dist/pigboard-site -listen 127.0.0.1:8773` for another port. Keep preview
listeners on loopback. Missing or malformed generated output stops startup with
an error; rebuild before retrying. `/healthz` reports process health; `/readyz`
checks the website index and version, without touching product services.

Local builds use `local` as the revision, loopback canonical URLs and `noindex`.
A public metadata build requires both an HTTPS origin and a full Git revision:

```sh
PIGBOARD_SITE_ORIGIN=https://pigboard.example \
PIGBOARD_SITE_COMMIT=$(git rev-parse HEAD) node website/build.mjs
```

The example domain is illustrative. This builds files; it does not deploy them.
A loopback origin always remains a preview, including with a full revision.
`version.json` records the origin, revision and preview flag for verification.

## Checks

```sh
node --test website/website.test.mjs
node --check website/app.js
go -C website test -race ./...
go -C website vet ./...
```

The GitHub Actions website workflow runs these checks and builds the pages.
The repository's ordinary `npm test` also discovers the website Node tests;
its existing PostgreSQL integration prerequisites still apply to the full suite.
Browser checks cover desktop/mobile, every primary link, keyboard tabs, copy
feedback and readable content without JavaScript. The preview and eventual
container use the same Go executable, generated-file allowlist and rooted
filesystem handler, which rejects symlink escapes.

## Build recovery

`dist/website/` is generated and ignored. The builder validates all source and
approved artwork before writing a staged sibling directory. It replaces only
an empty output directory or one with its own build manifest. A file, symlink
or unrelated directory is refused; choose a dedicated output instead of deleting
unrelated data. Do not run concurrent builds into the same output directory.

If promotion fails, the builder restores the previous directory. If restoration
also fails, the error names the retained backup and staged output: stop the
preview, inspect those directories, move the previous complete backup back to
`dist/website/`, then retry the build. Preserve both until recovery is verified.
A warning after successful promotion means the new site is complete but an old
backup could not be removed; inspect it and remove that named backup when safe.

## Source and delivery boundary

The shared components, spacing, page patterns and Go serving approach come from
Rovito revision `32875af00a19241541296bbb10543ec29fcb7a42`: `website/`,
`internal/website`, `Dockerfile.oauth` and `deploy/fly/oauth.toml`. Internal CSS
names such as `--rv-*` retain that component interface, with semantic aliases
adapted to Pigboard's light theme. Pigboard uses sunshine yellow (`#ffe36a`),
cobalt (`#244de8`), deep blue (`#183159`), coral (`#ff8c73`), mint (`#a7e4ca`)
and warm paper (`#fffaf0`). Header/hero use yellow, benefits use a blue field
with colored panels, and the closing section uses coral. Dark links and white
text on blue actions keep the color roles readable.

The header/footer wordmark is semantic HTML in the existing rounded font family.
The hero uses `mascot-board-v2.png`: the pig and translucent board with transparent
surroundings, copied unmodified from the generated source and hash-checked.
Original approved exports remain in `assets/brand/pigboard/`; the graphite
lockup remains the social-sharing image. No opacity, tint or opaque frame is
applied to the hero. The [asset guide](../assets/brand/pigboard/README.md) records
provenance, the exact new prompt and export limits. The earlier plum theme is
historical; the [bold visual follow-up](../docs/designs/pigboard-bold-visuals.md)
records the owner's new happy, colorful, bold direction.
Tab panels are readable before JavaScript; copy controls remain hidden until
their handler is ready. Script initialization adds tab roles,
keyboard selection and hiding. Clipboard denial selects the text with feedback.

GitHub and GitHub Actions are the owner's chosen source and CI platform. The
next delivery slice packages this server with Rovito's Docker/Fly approach and
protected deployment controls. Production app/domain, credentials, release and
live verification remain separate. This slice changes no private-host service,
DNS or production deployment. See the [design](../docs/designs/pigboard-website.md),
[plan](../docs/plans/pigboard-website.md) and [evidence](../docs/reviews/pigboard-website.md).

## Copy and claim boundaries

The current positioning refinement is in the
[website design](../docs/designs/pigboard-website.md#customer-promise-refinement--4-october-2026).
It supersedes the earlier process-led marketing candidate. Lead with delivery,
project visibility, informed decisions and team continuity; explain the supported
method as the mechanism. Keep examples illustrative and hosted capability
future-oriented, including in page descriptions. Do not claim battle-tested
hosted operation, quantified savings, uniqueness or guaranteed correctness
without evidence. Availability must describe actual access without an invented
signup or contact channel.
