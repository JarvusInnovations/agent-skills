# Test isolation — never let tests clobber dev data

The single highest-value payoff of this pattern: **tests run against their own
database (`app_test`), so a test suite's `truncate`/reset can never wipe the dev
data you're demoing against.** `bin/test` handles this, but the robust fix is a
**test-runner preload** so that even a bare `bun test` (someone forgetting `bin/`,
or an IDE test button) is safe too.

## The preload (bun example)

`bunfig.toml`:

```toml
[test]
preload = ["./test/setup.ts"]
```

`test/setup.ts` runs once before any test file. It must:

1. Default `DATABASE_URL` to the test DB **with `??=`** — so an explicit env
   (CI, or `bin/test` which `export`s it) always wins.
2. Create the test DB if missing (connect to the maintenance `postgres` DB first).
3. Migrate it to the current schema.

```ts
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const DEFAULT_TEST_URL = 'postgres://app:app@localhost:5432/app_test'
const usingDefault = process.env.DATABASE_URL === undefined

process.env.DATABASE_URL ??= DEFAULT_TEST_URL
process.env.JWT_SECRET ??= 'test-secret-min-32-chars-xxxxxxxxxxxxx'
// ...other required env with ??=

const url = process.env.DATABASE_URL

// Create the DB only when we own the default (CI provides its own, already created).
if (usingDefault) {
  const dbName = new URL(url).pathname.slice(1)
  const adminUrl = new URL(url); adminUrl.pathname = '/postgres'
  const admin = postgres(adminUrl.toString(), { max: 1 })
  try {
    const rows = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`
    if (rows.length === 0) await admin.unsafe(`CREATE DATABASE ${dbName}`)
  } finally { await admin.end({ timeout: 5 }) }
}

const sql = postgres(url, { max: 1 })
try { await migrate(drizzle(sql), { migrationsFolder: './migrations' }) }
finally { await sql.end({ timeout: 5 }) }
```

Then delete the per-file `process.env.DATABASE_URL = …` lines from each test —
the preload centralizes them. Keep any per-suite *override* (e.g. a suite that
sets `MIN_SUPPORTED_BUILD=500` to exercise a code path) — just drop the shared DB/secret defaults.

## Why `??=` and not `=`

`??=` only fills in a default when nothing was provided. CI sets `DATABASE_URL`
explicitly to its ephemeral service-container DB and migrates that itself, so the
preload must defer to it. Using `=` would override CI and break it.

## CI stays untouched

CI already points at a throwaway service-container DB via an explicit
`DATABASE_URL` and runs its own migrate step. This whole pattern is a **local-dev**
change — verify CI is green after adding the preload, but you should not need to
edit the CI workflow.

## Residual footgun to document, not over-engineer

If a dev copies `.env.example` → `.env` with `DATABASE_URL=…/app` (the dev DB),
the test runner auto-loads `.env` and a *bare* `bun test` would defer to it
(the preload uses `??=`). `bin/test` is immune (it `export`s the test URL, which
beats `.env`). Don't try to guard by DB *name* — CI's throwaway DB may legitimately
share the dev name. Just tell people: prefer `bin/test`.

## Verifying it actually works (do this once)

Seed a sentinel row into the dev DB, run the suite both ways, confirm it survived:

```bash
bin/db "INSERT INTO <some_table> (...) VALUES ('SENTINEL — do not delete', ...)"
bin/test                                   # and: (cd <server> && bun test)
bin/db "SELECT count(*) FROM <some_table> WHERE ... LIKE 'SENTINEL%'"  # → still 1
```

Other runners: pytest → a `conftest.py` fixture; vitest → `globalSetup`. Same
three responsibilities (default env, ensure DB, migrate).
