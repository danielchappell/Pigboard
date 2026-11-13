# Public source and verified Cursor environment — 13 November 2026

The owner explicitly approved publishing the entire existing danielchappell/ski-stack
repository, including its older configuration and metadata. An earlier automatic
approval rejection was resolved by that explicit decision; the successful GitHub
change was verified with isPrivate=false. No deploy key was generated or installed.

Before publication, an official checksum-verified Gitleaks 8.30.1 scan of a fresh
remote mirror covered 164 commits / approximately 6.83 MB across published refs.
Six findings were classified: one Git object hash, four test signing-secret instances,
and a 20-character ghp_-prefixed sanitizer rejection fixture. No actual credential
was identified among them. This scan is not a proof of absence of every possible
confidential fact; full repository exposure was explicitly authorized.

An anonymous HTTPS download of implementer-entrypoint/SKILL.md at the pinned release
matched SHA-256 37e579989fa448271ccbb0d2af54ddfc892a5e9084953e98a5f770dd70a2066e.

## Live Build evidence

Environment: 9cb332e1-dee7-11f1-ba91-f63b1661ac50, personal Safeguard Engineering,
Pigboard AI-Daniel-1 Plexus. Build:
https://cursor.com/t/safeguardglobal-engineering/cloud-agents/builds/bld-20261113-277cc7ee-c12a-43bb-a1ea-eccdbb01f08f

Draft manual Build ran the previously reviewed, unchanged HTTPS install command.
Plexus master checkout: 9c7f525. Pigboard pin:
12675375bc8710f197f9ceba43f56a2d845fbd0d.
Install exited 0; snapshot completed; UI status Success. Downloaded full log and
parsed the JSON receipt, retained at evidence/cursor-environment/build-success-receipt.json.
Verified ten entrypoints, 23 source-file hashes, locked dependency versions,
pg.Client load and bru --version, with stable path /opt/pigboard/skills.
Then selected Activate draft -> Activate. Build no longer marked Draft.

## Automation activation

At the owner's explicit request after verification, enabled automation
65bdee88-dee5-11f1-ba91-f63b1661ac50. UI read back Status Active / toggle on,
Plexus/master, Grok 4.7 High, webhook and the exact minimal prompt. No agent run or
Jira mutation was used for this environment test. Screenshots retained locally:
outputs/cursor-environment/build-success.png and automation-active.png.

No runtime code changed in this rollout. Prior exact-code reviews and 208/208 local
tests remain historical evidence for their commits; this record adds actual cloud
installation and configuration evidence. It does not assert live Jira admission,
model phase switching, independent reviewer execution, PR publication or CI success.
The automation overview reports zero MCP connections; complete ticket tools and
Jira webhook/authentication wiring before dispatching live work. No merge/deploy.
