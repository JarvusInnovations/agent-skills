# Deployment patterns — TODO (deferred second pass, not yet written)

> **Not written yet.** The first pass of `jarvus-dbt` covers model *quality* (conventions,
> testing, lint/CI). The run/orchestration/publish side is deliberately deferred so it can be
> distilled properly from our deployment-heavy projects rather than guessed.

When picked up, this reference should cover (sourced from our actual deployment work, which is
where the broader set of projects — including the AI-scaffolded ones — *are* good references,
even though they're not authorities on model quality):

- **Run paths** — `dbt run`/`build` invocation, profiles, and the local-vs-CI-vs-prod target
  split. (e.g. transit-lake's `bin/generate-data` → `uv run dbt ...` → parquet → GCS publish.)
- **Orchestration** — Dagster integration via `+meta: { dagster: { group: ... } }` per model
  for asset lineage (jarvus-data-pipeline pattern).
- **External materialization & handoff** — DuckDB → object storage (GCS) external models and
  cross-container handoff (co-air-quality-udda pattern); `on-run-start` registration macros.
  (Note: this one straddles deployment *and* data-access / client-facing performance — it lands
  here mainly because it doesn't merit its own skill and isn't a modeling "convention"; revisit
  the placement when this section is written.)
- **Warehouse auth in CI/prod** — BigQuery service account / Workload Identity vs the
  credential-free DuckDB path; CI targets and keyfile handling.
- **Cross-platform moves** — DuckDB ↔ BigQuery; reference dbt-labs' `dbt-migration` skills.
- **Docs/artifacts publish** — `dbt docs generate` + manifest/catalog upload; mermaid DAGs
  (dbt-labs' `creating-mermaid-dbt-dag`).

Owner note: deployment is Chris's strength; the quality half above is the dbt lead's. Keep the
two halves clearly sourced.
