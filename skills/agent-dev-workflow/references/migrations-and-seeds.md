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

## Seeds (optional)

Some projects seed reference/demo data on a fresh DB; many don't. If yours does,
uncomment the seed lines in `setup`/`reset-db` and make seeds **idempotent**
(`INSERT … ON CONFLICT DO NOTHING`) so re-running is safe. Crucially, **don't seed
when loading a snapshot** (the snapshot already has data) and **don't seed the
test DB** (suites set up their own fixtures). A common shape is one or more
`seed*.sql` files run on a fresh non-snapshot DB, plus an optional local
`.scratch/extra-seed.sql` for personal data; other projects keep seeding out of
`bin/` entirely (a one-off script run on demand). Pick whichever fits.

## A note on what NOT to put here

Resist baking application-specific data setup into these scripts beyond a thin
seed hook. The scripts manage the *database lifecycle*; rich fixture/demo data is
the app's concern and tends to churn. Keep the boundary clean so the scripts stay
portable across projects.
