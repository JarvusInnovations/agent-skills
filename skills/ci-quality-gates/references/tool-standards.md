# Tool standards: the linters, formatters, and the script contract

What runs inside the gate. These are the Jarvus house choices — one linter and
one formatter per language family, no eslint+prettier+biome+mypy sprawl. Adopt
them so new repos stop re-deciding (the portfolio's real failure mode is repos
that ship *no* linter at all).

## The script contract (TypeScript)

Every TS package exposes the **same four scripts**, so CI is stack-agnostic — it
just calls `bun run <name>`:

```jsonc
{
  "scripts": {
    "lint":         "oxlint <paths>",          // e.g. "oxlint ." or "oxlint index.ts src"
    "format":       "oxfmt <paths>",           // writes
    "format:check": "oxfmt --check <paths>",   // CI uses this
    "typecheck":    "tsc --noEmit"             // or "tsc -b" for project-references
  }
}
```

> **Naming note.** The type-check script is **`typecheck`** across the Jarvus
> stack skills and the continuous-gtfs flagship. Some older scaffolds named it
> `check` — if you meet one, rename it to `typecheck` so the contract is uniform
> (the workflow templates here call `bun run typecheck`).

Add the tools as dev deps (don't hand-edit `package.json`):

```bash
bun add -d oxlint oxfmt
```

## TypeScript: oxlint + oxfmt + tsc

- **oxlint** — fast Rust linter. Config is `.oxlintrc.json`.
  - **Single-package repo:** use `templates/oxlintrc.base.json` directly as the
    package's `.oxlintrc.json`.
  - **Monorepo:** put `templates/oxlintrc.base.json` at the repo root as
    `.oxlintrc.base.json`, and give each package a tiny `.oxlintrc.json` that
    extends it:

    ```json
    {
      "$schema": "./node_modules/oxlint/configuration_schema.json",
      "extends": ["../../.oxlintrc.base.json"]
    }
    ```

    A server package that contains a UI subfolder ignores it so the UI is linted
    by its own stricter config: add `"ignorePatterns": ["ui"]`.
- **React/UI packages** get a stricter config — `templates/oxlintrc.react.json`
  (adds the `suspicious` + `perf` categories, react-hooks, react-compiler, and
  import-ordering rules). It's standalone (doesn't extend the base) because it
  needs the `react` plugin and a different category set.
- **oxfmt** — the formatter. CI runs `format:check`; developers run `format`.
- **tsc** — type-check only, `--noEmit` (Bun runs the source; tsc never builds).
  `strict: true` belongs in `tsconfig.json` — type-check *is* a gate, it catches
  a whole class of bugs no linter does.

**Philosophy: correctness-as-error, style-as-warn.** The base config sets the
`correctness` category to `error` and little else — no opinionated style churn on
the backend. The React config tightens to `error` for correctness/suspicious/perf
and uses `warn` for stylistic/import-ordering rules. Formatting is oxfmt's job,
not the linter's.

## Python: ruff (+ uv)

- **ruff** does both lint (`ruff check`) and format (`ruff format`) — it replaces
  black + flake8 + isort + pyupgrade. No black.
- Config block: `templates/ruff.pyproject.toml` → append to `pyproject.toml`.
  Standard rule set `["E", "F", "I", "B", "UP"]`, line length 88. Exempt
  generated files (protobuf, etc.) via `per-file-ignores`.
- Add it with `uv add --dev ruff`. CI runs `uv run --frozen ruff check` and
  `uv run --frozen ruff format --check`.
- **mypy is optional.** Data/infra repos that want strict typing add
  `uv add --dev mypy` and a `uv run mypy src/` step with `strict = true`. The
  flagship pipeline skips it; reach for it when the type surface is worth it.

## IaC: OpenTofu

`tofu fmt -check -recursive` + `tofu init -backend=false && tofu validate` per
root module. Format + config-validity only — never `tofu plan` in this gate
(needs state/credentials). See `templates/github-actions/tf-validate.yml`.

## Docs (optional)

A docs site (mkdocs) gets a build gate: `mkdocs build --strict` so a broken link
or missing nav entry fails the PR. Trigger on `docs/**` + `mkdocs.yml`.

## IDE recommendation, not pre-commit

Local fast feedback comes from the editor, not git hooks. Commit
`templates/vscode-extensions.json` as `.vscode/extensions.json` to recommend the
**oxc.oxc-vscode** extension (lint + format-on-save matching CI). For Python,
ruff's editor integration plays the same role.

**Pre-commit is an optional extra tier, not the gate.** The flagship
(continuous-gtfs) and the newest repos deliberately run checks in CI + IDE and
*skip* a pre-commit framework. Where it earns its keep is multi-linter Python
repos that also lint SQL/markdown/notebooks (e.g. ruff + sqlfluff + markdownlint +
nbstripout) — there a `.pre-commit-config.yaml` driven by `pre-commit/action` in
CI consolidates many hooks. Don't add it to a plain TS or single-linter Python
repo; it's friction without payoff there.

## Adopting on an existing repo: the one-time migration

Turning a gate on for the first time will surface findings. Land them as a
**single mechanical commit** *before* the commit that adds the workflow, so the
gate goes green on its first run and the diff stays legible:

1. `bun run format && bun run lint --fix` (or `uv run ruff format && ruff check
   --fix`) — commit as `style:` / `build:`.
2. Hand-fix whatever `--fix` couldn't.
3. Add the config files + scripts + workflow — commit as `ci:`.

Don't batch the auto-format with feature work; reviewers can't see the real
change underneath thousands of reformatted lines.
