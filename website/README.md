# Pigboard website

The public marketing website has Home, Method and Availability pages. It describes
Pigboard's intended product and clearly identifies today's private tools. It does
not expose the private host, offer hosted signup, or require credentials to run.

## Build and preview

Use Node 20 or later and Go 1.26.6. From the repository root:

```sh
node website/build.mjs
go -C website build -o ../dist/pigboard-site ./cmd/site
./dist/pigboard-site
```

Open <http://127.0.0.1:8772/>. Stop with Ctrl-C. Rebuild after editing HTML, CSS,
JavaScript or artwork; the server reads the generated files on each request.
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

The shared visual tokens, styles, page patterns and Go serving approach come from
Rovito revision `32875af00a19241541296bbb10543ec29fcb7a42`: `website/`,
`internal/website`, `Dockerfile.oauth` and `deploy/fly/oauth.toml`. Internal CSS
names such as `--rv-*` retain that shared origin. Pigboard adapts the copy, opaque
wordmark crop, laptop hero composition and progressive enhancement; all three owner-approved PNGs under
`assets/brand/pigboard/` are copied byte-for-byte and checked against pinned hashes.
Tab panels are readable before JavaScript; copy controls remain hidden until
their handler is ready. Script initialization adds tab roles,
keyboard selection and hiding. Clipboard denial selects the text with feedback.

GitHub and GitHub Actions are the owner's chosen source and CI platform. The
next delivery slice packages this server with Rovito's Docker/Fly approach and
protected deployment controls. Production app/domain, credentials, release and
live verification remain separate. This slice changes no private-host service,
DNS or production deployment. See the [design](../docs/designs/pigboard-website.md),
[plan](../docs/plans/pigboard-website.md) and [evidence](../docs/reviews/pigboard-website.md).
