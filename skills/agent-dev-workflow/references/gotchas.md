# Gotchas — the bugs every implementation re-derives if not warned

These are real failures hit while building this pattern across projects. Each one
costs an hour of debugging if you don't know it up front.

## `ss` doesn't exist on macOS — and fails silently

The single worst one. A naive port check uses `ss -tlnp` (Linux). On macOS `ss`
isn't installed, the command fails, `2>/dev/null` swallows the error, the grep
matches nothing → **every port reads "free"** → every concurrent worktree picks
the *same* port and they collide. It looks like the port logic is broken; really
the detector is no-op'ing.

Fix (already in the `_common.sh` template): branch on the tool.

```bash
port_in_use() {
  if command -v lsof &>/dev/null; then
    lsof -iTCP:"$1" -sTCP:LISTEN -P -n &>/dev/null   # macOS + most Linux
  elif command -v ss &>/dev/null; then
    ss -tlnp 2>/dev/null | grep -q ":$1 "            # Linux without lsof
  else
    return 0                                          # unknown → assume in use
  fi
}
```

Also: **always scan from the default port**, not from `default+1` for worktrees.
If a worktree starts scanning at 4001, it skips a free 4000. Reuse the canonical
port whenever it's actually free; let real listen-state — not worktree identity —
decide collisions.

## Two collision axes: worktrees *and* other projects

The port logic above solves **intra-project** collisions — two worktrees of the
*same* repo never grab the same port. It does nothing about **inter-project**
collisions: run several Jarvus repos at once and they'd fight over ports if they
shared a base. In practice they don't, because each repo claims a distinct **base
port band** — e.g. one project in `25xx`, another in `35xx`, another's Postgres at
`5532`. That base is a per-project constant *you* choose; the worktree logic only
ranges within it.

Two ways to choose it:

- **Hand-pick** a distinct, uncommon high band per repo and keep PG + backend +
  frontend coherent within it (e.g. PG `N530`, backend `N531–N599`, frontend
  `N600–N699`). The traps: forgetting which bands are already taken, and splitting a
  repo across unrelated bands (one real repo runs Postgres on `5532` but its server
  on `4001–4099` — avoid that incoherence).
- **Derive it from a hash of the repo name** — collision-resistant with no registry
  to remember, the same trick the DB names use for worktree *paths*, applied at repo
  granularity:

  ```bash
  # deterministic base in a high block (20000–59990), distinct per repo name
  app_base_port() {
    local n; n=$(basename "$(app_root)" | cksum | cut -d' ' -f1)
    echo $(( 20000 + (n % 4000) * 10 ))
  }
  # then PG = base, backend range = base+1..base+49, frontend = base+50..base+99
  ```

## postgres:18 changed the data directory layout

On `postgres:18` the volume must mount at `/var/lib/postgresql`, **not**
`/var/lib/postgresql/data` (the path used through 17). Mount the wrong one and the
container's healthcheck never goes ready and `wait_for_postgres` times out after
30s.

**Pin the same major production runs.** Whatever major your prod DB is (Cloud SQL,
RDS, …), pin that in `_common.sh` so `strip_cloudsql`'d snapshots restore without
version-mismatch surprises. That rule cuts both ways: when prod runs 18, you don't
get to stay on the 17 template default to dodge the mount change. The `_common.sh`
template carries the mount as `APP_PG_DATA_DIR` — for 18, change **both** lines
together:

```bash
APP_PG_IMAGE="postgres:18-alpine"
APP_PG_DATA_DIR="/var/lib/postgresql"     # NOT /var/lib/postgresql/data
```

Across Jarvus repos the major currently drifts (16 / 17 / 18 all in use) — match
*your* prod. And remember container-reuse (below): switching majors on an existing
container/volume needs a deliberate `docker rm` + volume removal.

## docker-compose can't do per-context isolation — evict Postgres from it

Compose pins one fixed DB name and one fixed host port — exactly what defeats
per-worktree databases and ports. It also breaks in this workflow specifically:
compose ties operations to the directory it was first run from, so when an agent
worktree is deleted while its compose containers keep running, you can't manage
them without recreating that exact path. So once these scripts exist, **remove the
Postgres service (and the app itself) from compose** — the `bin/` scripts manage a
path-independent shared container by name instead. Keeping a compose Postgres
alongside the bin/ one invites "which Postgres am I talking to?" confusion.

That's an eviction, not necessarily a deletion. Compose keeps exactly one job:
the **once-per-machine auxiliary-services runner** (a validator container, a local
OIDC IdP — see SKILL.md "Auxiliary services"). Those are shared across all
worktrees, never replicated per worktree, so compose's one-fixed-port model is
correct for them. If the file only templated Postgres, delete it outright.

## `cd` inside a piped/exec'd script

When a script needs to run a command in a subdir AND `exec`/background it with a
specific env, `cd "$dir"` before the `exec` is cleaner than wrapping in
`bash -c 'cd … && …'`. The single-service `dev` template does the former. The
fullstack `dev` backgrounds two children, so it uses subshells `( cd … && … ) &`.

## Container reuse vs. recreate

`ensure_postgres` reuses a container that already exists (just `docker start`s it
if stopped) and only creates one when absent. This is what lets many worktrees
share one Postgres. Don't `docker run` unconditionally — you'll get a name clash
or orphaned data. If you ever change Postgres image/version, you must `docker rm`
the old container (and possibly the volume) once, deliberately.

## md5 binary differs across platforms

Linux/coreutils has `md5sum`; BSD/macOS has `md5 -q`. The `app_hash` helper
branches on which exists so worktree DB names are stable on both. Don't hard-code
`md5sum`.
