---
name: ci-quality-gates
description: Stand up the pre-merge CI quality gates a repo runs before code lands on develop — tool provisioning (asdf + .tool-versions + cache), lockfile-frozen installs, path-filtered GitHub Actions, and the lint / format:check / typecheck / test gate set with Jarvus's standard linters (oxlint + oxfmt for TypeScript, ruff for Python, tofu fmt/validate for IaC). Use when setting up CI for a new repo, adding a lint/format/type-check/test gate to an existing one, wiring GitHub Actions for code quality, choosing or standardizing linters/formatters, fixing CI that re-installs tools slowly, or noticing a repo runs tests but no linter. Scope stops at merge — Release-PR automation belongs to release-flow; build/publish/deploy to per-stack build + deploy skills. Triggers: "set up CI", "add linting/CI", "GitHub Actions checks", "oxlint", "oxfmt", "ruff", "format check", "type-check in CI", "quality gate", "lint isn't running in CI", "asdf in CI".
---

# CI quality gates (pre-merge checks)

Sets up the checks that gate a pull request **before it merges to `develop`**:
the toolchain provisioning, then lint + format-check + type-check + test, with
Jarvus's standard linters. The reusable core is *the gate harness* — provisioning,
the script contract, path filters, lockfile-frozen installs — and linting is one
tier that rides on it next to type-check and test.

The portfolio's actual failure mode isn't picking the wrong linter; it's repos
that ship **no linter at all** (tests + type-check only, or build + test only).
This skill exists so a new repo gets the whole gate by default instead of
re-deciding — or skipping it.

## Scope: what's in, what's out

| In scope (gates a PR before merge) | Out of scope (hand off) |
|---|---|
| asdf provisioning + tool caching | Release-PR automation → **`release-flow`** |
| lint, format-check, type-check, test | Container build / image publish → per-stack build docs |
| IaC `fmt` + `validate` (credential-free) | Deploy / `tofu apply` → **`sysadmin`** / deploy skill |
| docs `build --strict` (optional) | `tofu plan` & integration tests needing secrets (later gate) |

One-sentence charter: **how a repo gates a PR before it merges.** If credentials
or a release tag are involved, it's a different skill.

## The two reference deep-dives

| File | Read when |
|---|---|
| [provisioning.md](references/provisioning.md) | the CI harness — asdf + cache composite, lockfile-frozen installs, path filters, credential-free principle, private-dep git rewrite |
| [tool-standards.md](references/tool-standards.md) | the linters/formatters — the TS script contract, oxc + ruff configs, the `typecheck` naming convention, pre-commit's optional role, the one-time adoption migration |

## The gate set

| Gate | TypeScript | Python | IaC |
|---|---|---|---|
| Lint | `oxlint` | `ruff check` | — |
| Format | `oxfmt --check` | `ruff format --check` | `tofu fmt -check` |
| Types | `tsc --noEmit` | `mypy` (optional) | `tofu validate -backend=false` |
| Test | `bun test` | `pytest` | — |

All four TS gates are invoked through a fixed **script contract** —
`lint` / `format` / `format:check` / `typecheck` — so the workflow is identical
across packages and only calls `bun run <name>`. Details + the naming caveat in
[tool-standards.md](references/tool-standards.md).

**DB-backed tests stay in this gate — they just need a database.** A `bun test` /
`pytest` suite that hits Postgres is still fork-safe (no secrets), so it belongs
here: give CI an **ephemeral service-container Postgres** and an explicit
`DATABASE_URL`. Locally, that same `test` script gets an isolated DB from
**`agent-dev-workflow`**'s `bin/test` + test preload, whose `??=` defers to CI's
`DATABASE_URL`. (Integration tests that need *secrets* are the separate later gate
in the scope table above.)

## The universal harness (don't reinvent it)

Every job, every language, shares the same provisioning. Consolidate it into one
local composite action and call it after checkout:

```yaml
steps:
  - uses: actions/checkout@v6
  - uses: ./.github/actions/setup-asdf   # asdf + cache + reshim, one place
```

Plus three rules that make CI reproducible and cheap (full rationale in
[provisioning.md](references/provisioning.md)):

- **`.tool-versions` is the only place tool versions live** — local dev and CI
  read the same file, so they can't drift.
- **Lockfiles committed; CI installs frozen** — `bun install --frozen-lockfile`,
  `uv run --frozen …`. A PR can't pass against unrecorded dependency versions.
- **Path-filtered triggers** — each workflow fires only on its domain (and on
  edits to itself).
- **Credential-free** — lint/format/type-check/validate/hermetic-tests need no
  secrets, so they run on fork PRs and start instantly.

## Templates

`references/templates/` — copy and adapt (each carries `# ADAPT:` markers):

| Template | Drop at | Purpose |
|---|---|---|
| `github-actions/setup-asdf/action.yml` | `.github/actions/setup-asdf/action.yml` | the shared provisioning composite |
| `github-actions/lint.yml` | `.github/workflows/lint.yml` | ruff + oxc/tsc lint gate (per-package matrix) |
| `github-actions/test.yml` | `.github/workflows/test.yml` | pytest + bun test gate |
| `github-actions/ui-checks.yml` | `.github/workflows/ui-checks.yml` | single-package frontend lint+fmt+types |
| `github-actions/tf-validate.yml` | `.github/workflows/tf-validate.yml` | OpenTofu fmt + validate |
| `oxlintrc.base.json` | `.oxlintrc.json` (or root `.oxlintrc.base.json` in a monorepo) | TS lint config — correctness=error |
| `oxlintrc.react.json` | `<ui>/.oxlintrc.json` | stricter React/UI lint config |
| `ruff.pyproject.toml` | append to `pyproject.toml` | ruff rule set |
| `vscode-extensions.json` | `.vscode/extensions.json` | recommend oxc-vscode for local feedback |

## Build order

1. **Read [provisioning.md](references/provisioning.md) and
   [tool-standards.md](references/tool-standards.md) first.** They carry the
   rationale and the gotchas (reshim-after-cache, the `typecheck` naming convention).
2. **Confirm `.tool-versions` exists** and pins everything CI needs (bun, uv,
   python, opentofu — whatever applies). If not, set it via `asdf set …` first.
3. **Drop the composite action** at `.github/actions/setup-asdf/action.yml`.
4. **Add per-language config + scripts:** oxc configs + the four `package.json`
   scripts for TS; the ruff block + `uv add --dev ruff` for Python.
5. **Add the workflows you need**, delete the jobs you don't, fix the `paths:`
   and `working-directory:` to the repo's real layout.
6. **For an existing repo, land the one-time format/lint-fix as a separate commit
   *before* the workflow commit** (see the migration section in
   [tool-standards.md](references/tool-standards.md)) so the gate goes green on
   its first run.
7. **Commit `.vscode/extensions.json`** so local editors match CI.
8. **Verify**: open a PR (or push a branch) and confirm each gate runs, is
   green, and a deliberate violation actually fails it. Don't assume — a
   mis-filtered `paths:` silently skips the gate, which reads as "passing".

## Guardrails

- **Don't let the gate need secrets.** The moment a "lint" job wants cloud
  credentials, it's the wrong job — split the credentialed check into its own
  later workflow. Keep this set fork-safe and instant.
- **One linter + one formatter per language.** oxc for TS, ruff for Python. Don't
  add eslint/prettier/biome/black alongside — that's the sprawl this replaces. A
  Vite scaffold ships a default eslint; remove it when adopting oxc.
- **Type-check is a gate, not a nicety.** `tsc --noEmit` / strict mode catches
  bugs no linter does — keep it required.
- **Pre-commit is optional, not the gate.** CI is the source of truth; the IDE is
  local feedback. Only reach for a `.pre-commit-config.yaml` on multi-linter
  Python repos (ruff + sqlfluff + markdown + …). See
  [tool-standards.md](references/tool-standards.md).
- **Stay before the merge line.** Release, build, publish, deploy, and
  credentialed plans belong to other skills. If you're editing
  `release-prepare.yml` or a deploy workflow, you're in the wrong skill.
