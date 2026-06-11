# Orchestrator integration (Conductor, etc.)

The reason this pattern exists: AI agent orchestrators spin up a **separate git
worktree per session** and let you register **setup / run / cleanup** commands.
Many sessions run on one machine at once, so each needs its own database and port
with zero manual config. These scripts provide exactly that contract.

## The contract

- **setup** → `bin/setup`. Idempotent: ensures the shared container, creates this
  worktree's DB (derived from its path), installs deps, migrates. It **prints
  `KEY=VALUE` env lines to stdout** (`DATABASE_URL`, `APP_DATABASE`, `PORT`, and
  `VITE_PORT` for fullstack) and all human status to **stderr** — so an
  orchestrator can capture stdout and inject those vars into the run step.
- **run** → `bin/dev` (or `bin/server`). Picks the same free port and derives the
  same DB, so it works whether or not the orchestrator threaded `setup`'s output
  through. Uses `exec` for clean signal handling.
- **cleanup** → `bin/cleanup`. Drops this worktree's DB (refuses the canonical
  one without `--force`); stops the dev session if a fullstack `bin/dev` left a
  PID file. Leaves the shared container up for other worktrees.

## Why stdout/stderr discipline matters

An orchestrator captures a script's stdout to learn where the service landed
(`PORT=4002`). If status chatter ("Creating database…", "Running migrations…")
goes to stdout too, it pollutes that capture. Rule: **machine-parseable env →
stdout; everything humans read → stderr.** Every template here follows it.

## Identity is the worktree path

DB name and port both derive from the worktree, so two sessions never collide and
re-running setup in the same worktree is a no-op-or-reset (not a duplicate).
`git worktree list --porcelain | head -1` identifies the main worktree (canonical
DB + default port); everything else is a hashed-path derivative. An orchestrator
needs no per-session config — just register the three scripts once.

## Override hooks

Every derived value has an env override for when an orchestrator wants explicit
control: `APP_DATABASE`, `APP_PG_PORT`, `PORT`, `VITE_PORT`. Honor these first in
every script (the templates do).
