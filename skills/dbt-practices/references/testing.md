# Testing

Three layers of testing, each for a different job. For the *mechanics* of writing a unit-test
YAML, defer to dbt-labs' `adding-dbt-unit-test`; this covers **what to test and where**.

## 1. Generic schema tests (data shape, at the grain)

Declared in the model's `*.yml`. Put them on **keys and critical columns** of marts (and
important intermediates), not everywhere:

```yaml
models:
  - name: fct_scheduled_trips
    columns:
      - name: trip_id
        data_tests:
          - not_null
          - unique
      - name: route_id
        data_tests:
          - not_null
          - relationships:
              to: ref('dim_routes')
              field: route_id
      - name: direction_id
        data_tests:
          - accepted_values: { values: [0, 1] }
```

- Use **`dbt_utils`** for richer cases (`unique_combination_of_columns`, `accepted_range`,
  `expression_is_true`). `dbt_utils` is the baseline package everywhere.
- **Severity**: `error` for primary keys / uniqueness / referential integrity; `warn` for
  softer data-quality signals you want surfaced but not blocking.
- **Scope expensive tests** with `where:` (or a `config`) to recent data so CI/test runs stay
  cheap:

  ```yaml
        data_tests:
          - not_null:
              config:
                severity: warn
                where: "service_date >= current_date - interval 7 day"
  ```

- Avoid re-testing the same constraint at every layer — test at the grain where it's
  meaningful (usually the mart), not redundantly in intermediates.

## 2. Quality-model pattern (record-level validation in the DAG)

For facts where some records are invalid but you don't want to silently drop them, split
validation into a model so the result is materialized, queryable, and monitorable:

```
int_<thing>  →  fct_<thing>_quality  →  fct_<thing>
```

- `int_<thing>` — the reshaped records.
- `fct_<thing>_quality` — adds `has_*` boolean checks (e.g. `has_required_fields`,
  `has_valid_timestamp`), a row hash for dup detection
  (`dbt_utils.generate_surrogate_key([...])`), and an `is_valid` flag.
- `fct_<thing>` — selects the valid records (and/or exposes the flags) for consumers.

This makes "what got dropped and why" a row you can count and test, instead of an invisible
inner-join loss (see the case study in [conventions.md](conventions.md)). Dup detection,
required-field checks, and format checks all live in the `_quality` model.

## 3. Unit tests (transform logic, no warehouse)

dbt **unit tests** (`unit_tests:`) mock inputs and assert outputs — pure fixtures, **no data
read**. Use them for the *logic* of staging/intermediate models: the exact place our dbt lead
flagged AI mistakes (a staging model over-deduping, a join dropping rows). They're also the
cheapest CI signal — they run in the credential-free gate. See dbt-labs'
`adding-dbt-unit-test` for the YAML shape; reach for them whenever a model has non-trivial
logic worth pinning, or to drive TDD on a fix (write the failing case from a bug first).

## Packages

- **`dbt-labs/dbt_utils`** — always. Tests, surrogate keys, cross-db helpers.
- **`metaplane/dbt_expectations`** — when you want expectation-style data tests (used in the
  BigQuery TIDES work).
- Adapter utils as needed (e.g. `starburstdata/trino_utils` for Trino), via a `dispatch`
  search order in `dbt_project.yml`.

## What "good coverage" means here

- Every **mart** has: tested PK (`not_null` + `unique`), tested foreign keys
  (`relationships`), and descriptions on columns.
- Records that can be invalid go through a **`_quality`** model, not a silent filter.
- Non-trivial **staging/intermediate logic** has a **unit test**.
- Expensive tests are **scoped** and use appropriate **severity**.
