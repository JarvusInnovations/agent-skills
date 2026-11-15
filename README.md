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

**Project vs global.** The question is whether the skill describes how work is done in a repo, or
is a recipe you run once.

- Install a skill **per-project** when it covers **ongoing practices** for work in that repo: the
  stack's conventions, how tools are built there, how CI and local dev are wired, how releases
  are cut. A project install vendors
  the skill into the repo, so the guidance is version-controlled with the code and every
  contributor's agent follows the same rules. When the skill is updated, the update arrives as a
  diff, so the people and agents on the project can see how the practice changed and apply it.
  That makes a project install the channel for distributing updated practices, including for
  skills whose first job is to set something up.
- Install a skill **globally** when it is a **one-off recipe** that stops being relevant once it
  has run, such as setting up a new repo, or when its work isn't tied to any repo, such as
  drafting documents.

## Skills

### Per-project: ongoing practices, vendored into the repo

```bash
npx skills add JarvusInnovations/agent-skills --skill <name>
```

- [`jarvus-react`](skills/jarvus-react/README.md) — Frontend development using Bun + Vite + React 19 + Tailwind CSS v4 + React Router v7 (shadcn/ui optional)
- [`jarvus-fastify`](skills/jarvus-fastify/README.md) — Backend development using Fastify 5 + TypeScript on Bun
- [`jarvus-flutter`](skills/jarvus-flutter/README.md) — Mobile app development using Flutter + Riverpod + go_router
- [`jarvus-dbt`](skills/jarvus-dbt/README.md) — Jarvus house conventions for dbt (modeling, testing, sqlfluff/CI); the opinionated layer over dbt-labs' first-party dbt skills
- [`jarvus-extjs`](skills/jarvus-extjs/README.md) — Maintaining the legacy Slate ExtJS 6.2 classic apps (SlateAdmin, Slate CBL); frozen-stack house patterns + Cypress e2e spec idioms
- [`jarvus-axi`](skills/jarvus-axi/README.md) — Jarvus house style for `*-axi` CLI tools, beyond the upstream `axi` principles: strict flag parsing, `--json-out` exports, fail-closed reads, mutation gates, multi-account handling, `setup hooks`, the npm-published repo recipe, and the AXI catalog admission checklist. Install it in every repo where an AXI tool is built.
- [`axi-skills`](skills/axi-skills/README.md) — Bake an AXI CLI (`axi-sdk-js`) into a skill — committed `.mjs` bundle, shim, SessionStart hooks, SKILL.md generation, CI drift gate. The packaging companion to the upstream `axi` skill. Install it in the repo that ships the bundled CLI.
- [`release-flow`](skills/release-flow/README.md) — Cut releases via the develop→main Release-PR automation (infra-components `release-prepare`/`validate`/`publish`). Install it in every repo that releases this way.
- [`ci-quality-gates`](skills/ci-quality-gates/README.md) — The pre-merge CI quality gates: asdf provisioning + caching, the `lint`/`format:check`/`typecheck`/`test` script contract, and the house linters (oxlint + oxfmt, ruff, tofu fmt/validate). Sets them up in a new repo, and keeps an existing repo current as the standards change.
- [`agent-dev-workflow`](skills/agent-dev-workflow/README.md) — Agent-friendly local dev: a `bin/` task-runner, worktree-isolated Postgres databases + ports, and a dedicated test DB. Sets the workflow up in a new project, and keeps an existing one current as the practices change.

### Global: one-off recipes, and work that isn't tied to a repo

```bash
npx skills add --global JarvusInnovations/agent-skills --skill <name>
```

- [`repo-setup`](skills/repo-setup/README.md) — Stand up a new repo the house way: `develop` as default, `main` as release target, merge-commit-only policy, the branch rulesets that keep auto-delete from eating `develop`, and the Release-PR workflows. You reach for it *before* a repo exists — and to audit existing ones against house conventions.
- [`doc-drafting`](skills/doc-drafting/README.md) — Two-stage drafting for AI-generated documents people will review: regenerate into new tabs, never over anyone's edits; a header table that says what state the document is in, what's wanted, and who has signed off; freeze, then humans line-edit and the agent only observes. *Ambient* across every document an agent produces for someone else to read.
- [`plain-language`](skills/plain-language/README.md) — Write in plain language per the digital.gov guide behind the Plain Writing Act: lead with the answer, active voice, familiar words, short paragraphs, informative headings. *Ambient* across every document, email, and chat reply an agent writes for a person to read.

---

`specops` (spec-driven development) now lives in its own repo: [JarvusInnovations/specops](https://github.com/JarvusInnovations/specops) — install with `npx skills add JarvusInnovations/specops`.
