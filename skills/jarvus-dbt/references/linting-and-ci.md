# Linting & CI

`sqlfluff` (dbt templater) for SQL, run directly in a path-filtered CI gate.
Copy-paste config is in [templates/](templates/); this explains the choices.

## sqlfluff config

Config lives in `pyproject.toml` (co-located with the project's other tooling). The house
baseline — DuckDB shown; swap `dialect`/adapter deps for BigQuery:

```toml
[tool.sqlfluff.core]
dialect = "duckdb"          # or "bigquery"
templater = "dbt"
max_line_length = 120
layout_config_style = "vertical"   # keywords on new lines

[tool.sqlfluff.templater.dbt]
project_dir = "warehouse"
profiles_dir = "warehouse"
target = "local"

[tool.sqlfluff.layout.type.comma]
line_position = "trailing"

# lowercase everything
[tool.sqlfluff.rules.capitalisation.keywords]
capitalisation_policy = "lower"
[tool.sqlfluff.rules.capitalisation.identifiers]
extended_capitalisation_policy = "lower"
# (functions / types / literals likewise)

# house rules that ARE machine-enforceable with stock sqlfluff:
[tool.sqlfluff.rules.aliasing.forbid]
force_enable = true                 # no unnecessary table aliases
[tool.sqlfluff.rules.references.qualification]   # require qualified columns
```

`templater = "dbt"` means sqlfluff compiles models through dbt, so it needs the dbt adapter
available and a `profiles_dir` (in CI we write a throwaway DuckDB profile — see the gate
below). Pin the sqlfluff and adapter versions in the CI lint job install (the `uv` linters group).

### Which conventions stock sqlfluff covers — and which it doesn't

Stock rules cover: capitalisation, line length, comma/layout, **`aliasing.forbid`** (no
needless aliases), **`references.qualification`** (qualified columns), column order. They do
**not** cover the Jarvus-specific semantics:

- semantic **noun** alias choice (vs. just "has an alias")
- **no inner joins**
- **staging models doing no aggregation/dedup**

Two ways to enforce those:

1. **Custom sqlfluff rule plugins (preferred when we want them as first-class lint failures).**
   sqlfluff supports plugins: a small Python package that registers `BaseRule` subclasses
   (custom codes, e.g. `JV01`) discovered via a `sqlfluff` setuptools entry point. A rule walks
   the parse tree (e.g. flag `join_clause` segments that are `inner join`/bare `join` in a
   model path; flag `group by`/`distinct` inside `models/staging/`). These then lint + annotate
   in CI exactly like built-in rules. This is the path to graduate the conventions in
   [conventions.md](conventions.md) from prose into enforced checks. Ship the plugin in the
   repo (or a shared internal package) and install it alongside sqlfluff in CI (the `uv`
   linters group).
2. **A lightweight grep/AST check** in CI (a script run as its own step) — faster to stand up,
   no plugin packaging; good for a first cut before investing in real rules.
3. **`dbt-checkpoint`** checks for *model-metadata* rules orthogonal to SQL text —
   `check-model-has-tests`, `check-model-has-description`, `check-column-desc-are-same`. These
   ship as pre-commit hooks but are plain CLI entry points — run them **directly** as a CI step
   (we don't use pre-commit — see below). Consider once the basics are in.

Start with stock rules + (2) or `dbt-checkpoint`; invest in (1) custom plugins for the rules
worth blocking merges on (no-inner-joins is the strongest candidate, given the silent-drop
case study).

## Local feedback (editor, not git hooks)

Per the `ci-quality-gates` enforcement philosophy, **CI is the only gate — no pre-commit.**
sqlfluff runs *directly* in CI (it emits PR annotations natively; see the gate below). For
local fast feedback use a **sqlfluff editor integration** (the vscode-sqlfluff extension or a
sqlfluff LSP) and run `sqlfluff lint` / `sqlfluff fix` by hand — don't wire a git hook.

## The CI gate

Path-filtered, **credential-free** for the DuckDB stack (it reads public data; no warehouse
secret). Mirror the existing repo CI conventions (e.g. `setup-bun`/`setup-uv` directly rather
than a composite if that's what the repo already uses). Full workflow in
[templates/github-actions/dbt.yml](templates/github-actions/dbt.yml). Shape:

1. **detect-changes** — only run on changes under the dbt dir(s) + config (path filter).
2. **lint** — install sqlfluff (+ the dbt adapter), write a throwaway local DuckDB
   `profiles.yml`, `dbt deps`, then
   `sqlfluff lint <model paths> --format github-annotation-native --annotation-level failure`
   (annotates the PR inline — no pre-commit needed). Cache `dbt_packages` (key on
   `packages.yml`).
3. **parse (every tenant)** — `dbt parse` (or `dbt compile`) for **each** configured
   tenant/project. This is the "must work for all tenants" gate from
   [conventions.md](conventions.md), and it needs **no data**.
4. **unit tests** — `dbt build --select <unit_test selection>` / the project's unit-test run —
   fixture-based, still no warehouse.
5. *(optional, data-backed)* — generic `dbt test` on a thin slice. For BigQuery projects this
   needs a service account + a CI target; for DuckDB it can run on a small public slice. Keep
   it separate so the credential-free gate stays fast and fork-safe.

For larger projects, scope the build to changed models with **`state:modified`** + deferral
(dbt-labs' `using-dbt-state`) so CI doesn't rebuild the world — this is the "no crazy huge data
reads" requirement.

## Plugs into `ci-quality-gates`

This is the **dbt lane** of the `ci-quality-gates` contract: same path-filtered, lockfile-frozen,
credential-free harness, just with `sqlfluff` as the linter and `dbt parse`/unit-tests as the
test gate. Keep it before the merge line; data-backed tests needing secrets are a separate,
later gate.
