# Canonical sources

Our tools share a lot of code by copying it. There is no shared Jarvus package, and upstream
keeps the SDK to what every AXI tool needs. The cost of copying is that a fix made in one repo
has to be carried to the others, and that the nearest tool may hold an older version.

So copy each module from the repo named here, which holds the current form. All are public
under `github.com/JarvusInnovations/`.

| Need | Copy from | Notes |
| --- | --- | --- |
| Strict flag parser (`FlagSpec`, positional counts, deprecated hints) | `nexudus-axi` `src/flags.ts` | The current parser. Has a global selector flag. |
| Declared-flags-versus-`--help` test, value and `--fields` validation | `gws-axi` `src/util/flags.ts`, `flags.test.ts` | Use with a service → subcommand dispatcher. |
| `formatError` (exit 2 for usage codes, `INTERNAL_ERROR` wrap) | `nexudus-axi` `src/cli.ts` | Exported for unit tests. |
| Tabular export writer (`--json-out`, `--csv-out`) | `gws-axi` `src/util/export.ts` | The hardened form: per-user dir, exclusive create, `export_error:`. |
| Exports mapped onto an upstream's native formats (csv, json, xlsx) | `metabase-axi` `src/output.ts` | The original implementation of the side channel. |
| `--json-out` for a whole command result, with streaming | `agent-recall-axi` `src/commands/json-out.ts` | Validates the path before reading anything; refuses symlinks. |
| Round-trippable `--ndjson-out`, lossy `--csv-out` | `gitsheets` `packages/gitsheets-axi/src/util/export-file.ts` | |
| List and help renderers, field schema builders | `gws-axi` `src/output/schema.ts`, `render.ts` | `renderListResponse`, `renderHelp`, block-form help. |
| `reference.ts` and the SKILL.md generator | `nexudus-axi` `src/reference.ts`, `scripts/generate-skill.ts` | Whole-file generation with `npx -y` examples. |
| `setup hooks [status\|uninstall] [--scope]` | `nexudus-axi` `src/commands/setup.ts` | Fail-closed: `onError` is fatal, status is re-read. Its project scope uses the working directory; add the `--dir` or git-root rule. |
| Tool-owned hook settings merges (exact ownership, atomic writes) | `agent-recall-axi` `src/commands/hook-settings.ts` | Only when the SDK installer isn't enough. |
| `doctor` rows and exit logic | `nexudus-axi` `src/commands/doctor.ts` | |
| Home view that degrades to `unavailable (…)` | `nexudus-axi` `src/commands/home.ts` | |
| Multi-account config and resolution | `nexudus-axi` `src/config.ts` | Per-account directories, explicit account for mutations. |
| Account pin and `account_source` | `gws-axi` `src/google/account.ts`, `specs/api/conventions.md` | The fullest written contract for accounts and environment variables. |
| Time ranges, tokens and window echo | `gws-axi` `specs/api/conventions.md`; `calendly-axi` `src/time/` | Read the spec first; it explains each edge case. |
| Per-call deadlines | `remarkable-axi` `src/timeout.ts` | |
| `--version` fast path | `nexudus-axi` `bin/nexudus-axi.ts` | |
| Privacy scrub gate and its test | `agent-recall-axi` `scripts/scrub-check.sh`, `test/scrub.test.ts` | |
| Network block for tests | `agent-recall-axi` `test/helpers/block-network.mjs` | |
| Conformance tests (temp `HOME`, hooks disabled) | `nexudus-axi` `test/conformance.test.ts` | |
| CI with the no-credentials smoke test | `nexudus-axi` `.github/workflows/ci.yml` | |
| Trusted-publishing workflow | `nexudus-axi` `.github/workflows/publish-npm.yml` | Identical across the npm tools. |

## Specs worth reading as models

| For | Read |
| --- | --- |
| A principles file with decisive rules and reasons | `gws-axi` `specs/principles.md` |
| A cross-command conventions contract | `gws-axi` `specs/api/conventions.md` |
| A destructive-operation safety spec | `remarkable-axi` `specs/behaviors/ink-preservation.md` |
| A tool distilled from its predecessors | `nexudus-axi` `specs/principles.md` |
| Fail-closed fix plans with failing-first validation | `nexudus-axi` `plans/` |
| A no-network, read-only tool's guarantees | `agent-recall-axi` `specs/` |

## Known deviations in older tools

These tools predate some rules. Don't copy these parts forward.

- **Hand-written help and skill:** metabase-axi, otter-axi, slack-axi and harvest-axi write `--help` text by hand, with no `reference.ts` and no drift gate.
- **No `--version` fast path:** most tools before nexudus-axi. calendly-axi has it.
- **Project-scope hooks written under the current directory:** nexudus-axi, calendly-axi and agent-recall-axi use the working directory as the project target. The rule is `--dir`, else the git root, else an error (`home-doctor-hooks.md`). specops does it correctly.
- **`doctor` with `ok|warn` rows:** slack-axi.
- **Lenient parsing in part of a tool:** specops validates only its `setup` command; its other commands still accept unknown flags.
- **Free-text no-op results and unechoed environment credentials:** harvest-axi.
- **Auto-named export files that can collide:** harvest-axi names them from a millisecond timestamp. Use exclusive-create with a suffix, as gws-axi does.
- **A corrupt config read as an empty default:** metabase-axi and calendly-axi.

Bringing one of these in line is a welcome change. Do it as its own plan in that repo.

Fixed since this list was first written, and safe to copy from the repo's `develop` branch: strict flag parsing and `formatError` in metabase-axi, otter-axi and slack-axi; counts as a `count:` field in slack-axi; tokens on stdin in calendly-axi and slack-axi; the fail-closed `setup hooks` in calendly-axi; and `setup hooks` replacing the top-level `hook` command in agent-recall-axi and specops.

## When you improve a shared module

1. Make the change in the canonical repo first, with tests.
2. Note it in the commit body so it can be found ("ported to …" or "port to siblings").
3. Open issues or PRs on the tools that carry a copy.
4. If the canonical home moves, update this table.

If a module is needed by nearly every AXI tool, not just ours, propose it for `axi-sdk-js`
upstream. That is where the declarative flag specs are heading.
