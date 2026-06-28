# jarvus-dbt

Jarvus's house conventions for **writing, testing, and linting dbt** — the opinionated layer
that sits on top of [dbt-labs' first-party dbt skills](https://github.com/dbt-labs/dbt-agent-skills)
(which cover the mechanics). It encodes how our dbt lead wants models built: stage discipline
(staging never dedups/aggregates), deliberate materialization and grain, no inner joins,
import-CTEs-at-top, semantic table aliases, the generic + quality-model + unit-test patterns,
and a `sqlfluff` + CI setup — including a **credential-free multi-tenant CI gate** for
the DuckDB stack.

## When you'd want it

Any repo with a dbt project — building or reviewing models, deciding test coverage or
materialization, or standing up dbt linting/CI. Install it so an agent writing dbt follows the
house quality bar instead of improvising, and defers to the dbt-labs skills for command/test
mechanics.

## Install

**Recommended scope: per-project**, alongside the dbt-labs skills:

```bash
npx skills add JarvusInnovations/agent-skills --skill jarvus-dbt
# plus the first-party mechanics skills it references:
npx skills add dbt-labs/dbt-agent-skills
```

See `SKILL.md` for the conventions and `references/` for the modeling rules, testing patterns,
lint/CI setup, and copy-paste templates.

## Status

First pass = **model quality** (conventions + testing + lint/CI), distilled from our most
mature dbt work (calitp / wmata TIDES) and pending dbt-lead review. **Deployment** patterns are
a deferred second pass (`references/deployment.md`).
