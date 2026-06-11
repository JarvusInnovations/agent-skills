---
name: agent-dev-workflow
description: Set up an agent-friendly local dev workflow — a bin/ task-runner (inspired by GitHub's scripts-to-rule-them-all) over a shared Postgres container that gives every git worktree its own isolated database and port, plus a dedicated test database so tests never clobber dev data. Use this whenever a project needs worktree-isolated local development, when setting up for AI agent orchestrators (Conductor and similar) that spin up a worktree per session and register setup/run/cleanup commands, when multiple copies of a backend must run concurrently on one machine, when replacing a docker-compose-for-local-postgres setup, or when tests keep wiping local dev/demo data. Triggers on "bin/ scripts", "worktree isolation", "per-worktree database/port", "scripts to rule them all", "agent dev environment", "setup/run/cleanup scripts", or tests clobbering the dev database.
---

# Agent-friendly dev workflow (bin/ + worktree isolation)

This skill scaffolds a `bin/` task-runner that lets **many copies of a project run
concurrently on one machine** — one per git worktree — each with its own database
and port, sharing a single Postgres container. It's the contract AI agent
orchestrators (Conductor and similar) want: register `setup` / `run` / `cleanup`
once and every session gets an isolated environment for free. As a high-value side
effect, tests run against a dedicated database and **can never wipe your dev data**.

It's modeled on GitHub's *scripts-to-rule-them-all*, but uses `bin/` (the name
`script/` never caught on) and adds the worktree-isolation layer.

## When this is the right tool

A project backed by Postgres where you want any of: concurrent worktree dev,
orchestrator setup/run/cleanup hooks, an end to tests clobbering dev data, or a
replacement for a docker-compose-just-for-local-postgres. If there's no database,
most of this doesn't apply. If there's no concurrency need *and* tests already use
a separate DB, the payoff is small.

## The core idea: identity derives from the worktree

One shared Postgres container (started once, reused by name — path-independent, so
it survives worktree deletion). Each context gets a **database** and a **port**
derived from its worktree path:

| Context | Database | Backend port |
|---|---|---|
| Main checkout | the canonical name (durable dev data) | the default (e.g. 4000) |
| Each agent worktree | `app_<hash-of-path>` (isolated) | next free port |
| The test runner | `app_test` (forced) | n/a |

Because identity comes from the path, two sessions never collide and re-running
setup is idempotent. Every derived value has an env override (`APP_DATABASE`,
`APP_PG_PORT`, `PORT`, …) for explicit orchestrator control.

## What's invariant vs. project-specific

The whole point of distilling this from several real Postgres-backed projects is to
know which parts you copy verbatim and which you adapt.

**Invariant** (copy from `references/bin/`, just swap the `app`/`APP_` prefix):

- worktree-aware DB naming (`app_db_name`, `is_main_worktree`, `app_hash`)
- shared-container management (`ensure_postgres`, `wait_for_postgres`, `app_psql`)
- DB create/recreate helpers; the `setup`/`reset-db`/`db`/`cleanup`/`test` scripts
- port picking (`port_in_use`, `find_available_port`, `app_pick_port`) — **including
  the macOS `lsof`/`ss` split; do not "simplify" it away** (see gotchas)
- stdout=env / stderr=status discipline

**Project-specific** (the knobs you set):

- the prefix, PG user/password/image, container/volume names, default PG port
- `app_server_dir` — repo root (single package) vs a subdir (monorepo)
- `app_migrate` — how migrations run → **`references/migrations-and-seeds.md`**
- single-service `dev` (frontend runs separately) vs fullstack `dev` (starts both,
  kills both) → use `references/bin/dev` or `references/bin/dev-fullstack`
- whether the project seeds, and whether it has prod snapshots at all

## Build order

1. **Read the relevant references first** (below) — they encode hard-won bugs.
2. Copy `references/bin/*` into the project's `bin/`, rename the prefix, fill the
   constants in `_common.sh`. Pick a PG host port well outside 5432.
3. Set `app_server_dir` and `app_migrate` for this project
   (`references/migrations-and-seeds.md`).
4. Choose the `dev` variant (single-service vs `dev-fullstack`).
5. Wire **test isolation** — the preload that points tests at `app_test`
   (`references/test-isolation.md`). This is the highest-value step; do it even if
   you skip everything else.
6. `chmod +x bin/*` (not `_common.sh`). Remove any `docker-compose.yml` that only
   templated local Postgres, and update `.env.example` + the project's agent docs
   (CLAUDE.md or equivalent) to point at `bin/`.
7. **Verify** end to end (don't assume): `bin/setup` on a clean checkout; the
   sentinel-row test from `test-isolation.md`; `bin/dev` twice concurrently lands on
   two different ports; `bin/cleanup` in a throwaway worktree leaves the main DB
   intact. `bash -n` every script.

## Reference files

| File | Read when |
|---|---|
| `references/bin/` | always — the script templates you copy + adapt |
| `references/test-isolation.md` | wiring tests to `app_test` (the preload) — almost always |
| `references/migrations-and-seeds.md` | setting `app_migrate`; deciding on seeds |
| `references/gotchas.md` | **before writing port logic or picking a PG image** — the silent-failure bugs |
| `references/orchestrator-integration.md` | wiring Conductor/orchestrator setup/run/cleanup; the stdout/stderr contract |
| `references/snapshots.md` | only if the project has a production DB to snapshot (skip for greenfield) |

## Guardrails

- Keep the scripts to **database + process lifecycle**. Rich demo/fixture data is
  the app's concern and churns fast — at most a thin idempotent seed hook
  (`migrations-and-seeds.md`). A bloated `bin/` stops being portable.
- These are dev-only. **CI keeps its own explicit `DATABASE_URL`** against an
  ephemeral DB; the test preload's `??=` defers to it. Verify CI stays green; you
  shouldn't need to touch the CI workflow.
- Don't drop the canonical dev DB casually — `bin/cleanup` guards it behind
  `--force`; `bin/reset-db` is the intended "start the main DB over" path.
