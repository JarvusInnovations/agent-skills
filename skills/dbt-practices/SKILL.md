---
name: dbt-practices
description: Jarvus house conventions for writing, testing, and linting dbt projects — model layering and grain, what each stage may/may not do, the no-inner-joins and semantic-alias rules, the generic + quality-model + unit-test patterns, the sqlfluff/pre-commit config, and a credential-free multi-tenant CI gate. Use when building or reviewing dbt models, deciding materialization or test coverage, setting up dbt linting/CI, or when "dbt", "sqlfluff", "staging/intermediate/marts", "dbt test", or "TIDES" come up. This is the opinionated house layer ON TOP OF dbt-labs' first-party dbt skills (which cover the mechanics) — see "Relationship to other skills".
---

# dbt practices (Jarvus house conventions)

This is the **opinionated layer**: how Jarvus wants dbt models written, tested, and linted —
not how to operate dbt. The mechanics (running commands, writing a unit-test YAML, dbt state,
the semantic layer, mesh) are covered by **dbt-labs' first-party skills**; this skill defers
to them and adds the house conventions, quality bar, and CI gate they don't carry.

**Source of authority.** The conventions here are distilled from our most mature dbt work —
`calitp-data-infra` and `wmata-tides-infra` (TIDES / Cal-ITP) — and the modeling rules our
dbt lead has set on in-flight projects. Treat those as authoritative over ad-hoc/AI-scaffolded
patterns. Adapter examples use **DuckDB** (our TIDES stack) and **BigQuery** where they differ.

> **Maturity: first pass, pending dbt-lead review.** This covers the **model-quality** half
> (conventions + testing + lint/CI). The **deployment** half (run/orchestration/publish
> patterns across DuckDB & BigQuery) is deliberately deferred to a second pass — see
> [deployment.md](references/deployment.md).

## The conventions at a glance

These are the rules to apply on every model; rationale and examples in
[conventions.md](references/conventions.md):

- **Stage discipline.** `staging` is 1:1 with the source — rename/recast/light-clean only;
  **never dedup or aggregate in staging**. Reshaping/business logic lives in `intermediate`;
  consumable grain lives in `marts`.
- **Materialization is deliberate**, never assumed — decide view vs table vs incremental per
  model and record why (grain, cost, downstream use).
- **No inner joins.** Use left joins with explicit `where` filters so dropped rows are
  visible, not silent. A silently-dropping inner join is a bug (see the case study in
  [conventions.md](references/conventions.md)).
- **Import dependencies at the top** as `with <name> as ( select ... from {{ ref(...) }} )`
  CTEs — one per upstream — for readability and dependency tracing.
- **Semantic table aliases**, never letter abbreviations: derive a short noun from the
  table/CTE by stripping layer/namespace prefixes (`fct_scheduled_stop_times` →
  `scheduled_stop_times`, `stg_vehicle_positions` → `vehicle_positions`). Role-based names
  for self-joins (`from_stop`/`to_stop`). This is partly machine-enforced by sqlfluff
  (`aliasing.forbid`, `references.qualification`).
- **Timeless comments.** Comments state what is persistently true — never narrate a change
  ("renamed from…", "replaced…").
- **It must work for every tenant.** Changes parse and run across *all* configured
  tenants/projects, not just the one you touched — the CI gate enforces this.

## Testing

Generic schema tests + the quality-model pattern + unit tests, with severity and scoping.
See [testing.md](references/testing.md). In short: generic tests (`not_null`/`unique`/
`relationships`/`accepted_values` + `dbt_utils`) on keys and critical columns; the
`int_* → fct_*_quality → fct_*` quality-model pattern for record-level validation; and dbt
**unit tests** (fixture-based, no warehouse) for staging/intermediate *transform logic*.

## Linting & CI

`sqlfluff` (dbt templater) + pre-commit + a path-filtered CI gate. See
[linting-and-ci.md](references/linting-and-ci.md) and the copy-paste templates in
[references/templates/](references/templates/). The DuckDB stack reads public data, so the
**lint + multi-tenant `dbt parse` + unit-test gate is credential-free and fork-safe** — no
warehouse secret needed (unlike a BigQuery project, which needs a service account).

## Relationship to other skills

- **dbt-labs first-party skills** (`dbt`, `dbt-extras`, `dbt-migration` from
  `dbt-labs/dbt-agent-skills`) — the **mechanics**. Don't re-document them; point at them:
  - `running-dbt-commands` — CLI invocation / choosing the executable.
  - `adding-dbt-unit-test` — the unit-test YAML mechanics (this skill says *when*: staging/
    intermediate transform logic).
  - `using-dbt-state` — slim CI via `state:modified` / deferral (serves "no huge data reads").
  - `using-dbt-for-analytics-engineering` — generic AE principles; this skill is the Jarvus
    extension of it.
  - `dbt-migration/*` + `creating-mermaid-dbt-dag` — relevant to the deferred deployment pass.
- **`ci-quality-gates`** — owns *how a repo gates a PR*. The dbt gate here is the dbt **lane**
  of that contract; the CI template lives in [references/templates/](references/templates/) and
  plugs into the same path-filtered, lockfile-frozen harness.

## Reference files

| File | Read when |
|---|---|
| [conventions.md](references/conventions.md) | writing/reviewing models — the modeling rules + rationale |
| [testing.md](references/testing.md) | deciding test coverage; generic vs quality-model vs unit tests |
| [linting-and-ci.md](references/linting-and-ci.md) | setting up sqlfluff, pre-commit, and the CI gate |
| [references/templates/](references/templates/) | copy-paste config (sqlfluff, pre-commit, CI workflow) |
| [deployment.md](references/deployment.md) | **deferred** — run/orchestration/publish (second pass) |
