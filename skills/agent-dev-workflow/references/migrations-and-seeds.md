# Migrations & seeds — the project-specific wiring

`app_migrate()` in `_common.sh` is the one helper that's almost always
project-specific. Everything else in the pattern is migration-tool-agnostic; this
is where you adapt.

## Migrations

Set `app_migrate()` to however the project applies migrations. Two shapes seen
across real projects:

- **A package script** (simplest — reuse what `package.json` already defines):

  ```bash
  app_migrate() {
    local url="$1"
    echo "Running migrations..." >&2
    (cd "$(app_server_dir)" && DATABASE_URL="$url" bun run db:migrate) >&2
  }
  ```

  e.g. `db:migrate` → `drizzle-kit migrate`. The drizzle config reads
  `DATABASE_URL` from env, so passing it through is enough.

- **A migration runner script** (when there's a dedicated entrypoint):

  ```bash
  app_migrate() {
    local url="$1"
    echo "Running migrations..." >&2
    DATABASE_URL="$url" bun run "$(app_server_dir)/src/db/run-migrations.ts" >&2
  }
  ```

The **test preload** migrates in-process instead of shelling out (it's already in
JS and wants no Docker dependency) — typically drizzle-orm's programmatic
`migrate(drizzle(sql), { migrationsFolder })`. Both read the same migrations
folder; they're two callers of one migration set, not two migration systems.

Non-bun stacks: `alembic upgrade head` (Python), `rails db:migrate`,
`migrate -path … up` (golang-migrate), etc. — same idea, swap the command.

## Seeds (optional) — three postures

How you populate a fresh dev DB is a project choice. Three postures seen across real
repos:

1. **Synthetic seeds** — hand-authored idempotent `seed*.sql`
   (`INSERT … ON CONFLICT DO NOTHING`) run on a fresh non-snapshot DB, plus an
   optional local `.scratch/extra-seed.sql` for personal data. Right when the curated
   dataset *is* the product (e.g. a demo app).
2. **Snapshot-as-seed** — no hand-written fixtures at all; `bin/load-snapshot`
   (default → latest prod) *is* the seed. Right when real prod data exists; often the
   only synthetic thing left is a dev auth token/secret applied at runtime, not at
   setup. See **`references/snapshots.md`**. This is the guardrail's ideal — nothing
   to maintain.
3. **Empty + per-suite fixtures** — `setup` leaves the DB empty (just migrated) and
   tests build their own fixtures per suite. Right when there's no meaningful shared
   dev dataset (and prod data is PII you wouldn't pull to a laptop).

Decision rule: **do you have meaningful prod data to pull?** Yes → snapshot-as-seed.
No, but the dataset is the deliverable → synthetic. Neither → empty + fixtures.

Whichever you pick: keep seeds **idempotent**, **don't seed when loading a snapshot**
(it already has data), and **don't seed the test DB** (suites own their fixtures). To
wire posture 1, uncomment the seed lines in `setup`/`reset-db`.

## A note on what NOT to put here

Resist baking application-specific data setup into these scripts beyond a thin
seed hook. The scripts manage the *database lifecycle*; rich fixture/demo data is
the app's concern and tends to churn. Keep the boundary clean so the scripts stay
portable across projects.
