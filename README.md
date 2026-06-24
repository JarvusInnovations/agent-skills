# Jarvus Agent Skills

A collection of agent skills used within Jarvus.

## Installation

Install via [skills](https://skills.sh/) globally (recommended) or to a specific project:

```bash
npx skills add JarvusInnovations/agent-skills
```

## Skills

- `frontend-shadcn`: Frontend development using Vite+React+ShadCN+Tailwind
- `backend-fastify`: Backend development using Node.js+Fastify
- `mobile-flutter`: Mobile app development using Flutter+Riverpod+go_router
- `agent-dev-workflow`: Agent-friendly local dev — `bin/` task-runner, worktree-isolated Postgres databases + ports, dedicated test DB
- `release-flow`: Cut releases via the develop→main Release-PR automation (infra-components `release-prepare`/`validate`/`publish`) — draft notes from the bot changelog, pick the version bump, merge to publish
- `axi-skills`: Bake an AXI CLI (`axi-sdk-js`) into a skill — esbuild → committed `.mjs` bundle, bash shim, SessionStart hooks (project & global scope), SKILL.md generation, CI drift gate, home vs dashboard split. The packaging companion to the upstream `axi` skill

`specops` (spec-driven development) now lives in its own repo: [JarvusInnovations/specops](https://github.com/JarvusInnovations/specops) — install with `npx skills add JarvusInnovations/specops`.
