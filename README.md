# Jarvus Agent Skills

A collection of agent skills used within Jarvus.

## Installation

Install with the [`skills`](https://skills.sh/) CLI. Grab everything at once, or install individual
skills at the scope that fits — see [Skills](#skills) below for each skill's recommended scope and a
link to its own README.

```bash
# everything (project-level)
npx skills add JarvusInnovations/agent-skills

# a single skill, project-level
npx skills add JarvusInnovations/agent-skills --skill <name>

# a single skill, available in every project
npx skills add --global JarvusInnovations/agent-skills --skill <name>
```

**Project vs global.** Install a skill **per-project** when it encodes the stack *that* project uses
— the guidance then lives with the code, is version-controlled, and updates as the project does, so
every developer's agent stays in sync. Install it **globally** when you use the skill to *bootstrap*
new projects, or when its value is *ambient* across many repos that won't all have it installed.

## Skills

### Per-project — install in the repo so every contributor's agent shares the same stack guidance

```bash
npx skills add JarvusInnovations/agent-skills --skill <name>
```

- [`jarvus-react`](skills/jarvus-react/README.md) — Frontend development using Bun + Vite + React 19 + Tailwind CSS v4 + React Router v7 (shadcn/ui optional)
- [`jarvus-fastify`](skills/jarvus-fastify/README.md) — Backend development using Fastify 5 + TypeScript on Bun
- [`jarvus-flutter`](skills/jarvus-flutter/README.md) — Mobile app development using Flutter + Riverpod + go_router
- [`jarvus-dbt`](skills/jarvus-dbt/README.md) — Jarvus house conventions for dbt (modeling, testing, sqlfluff/CI); the opinionated layer over dbt-labs' first-party dbt skills

### Global — install once for all projects

```bash
npx skills add --global JarvusInnovations/agent-skills --skill <name>
```

- [`ci-quality-gates`](skills/ci-quality-gates/README.md) — Stand up the pre-merge CI quality gates: asdf provisioning + caching, the `lint`/`format:check`/`typecheck`/`test` script contract, and the house linters (oxlint + oxfmt, ruff, tofu fmt/validate). You reach for it to *bootstrap* a repo's CI before code lands on develop.
- [`agent-dev-workflow`](skills/agent-dev-workflow/README.md) — Agent-friendly local dev: a `bin/` task-runner, worktree-isolated Postgres databases + ports, and a dedicated test DB. You reach for it to *bootstrap* a project's dev workflow.
- [`release-flow`](skills/release-flow/README.md) — Cut releases via the develop→main Release-PR automation (infra-components `release-prepare`/`validate`/`publish`). *Ambient* across the many repos Jarvus ships, most of which won't have it installed locally.
- [`axi-skills`](skills/axi-skills/README.md) — Bake an AXI CLI (`axi-sdk-js`) into a skill — committed `.mjs` bundle, shim, SessionStart hooks, SKILL.md generation, CI drift gate. The packaging companion to the upstream `axi` skill; used while *building* tooling.

---

`specops` (spec-driven development) now lives in its own repo: [JarvusInnovations/specops](https://github.com/JarvusInnovations/specops) — install with `npx skills add JarvusInnovations/specops`.
