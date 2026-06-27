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
30s. If you pin `postgres:17-alpine` (the template default) use `…/data`; only
change the mount if you deliberately move to 18.

**Pin the same major production runs.** Whatever major your prod DB is (Cloud SQL,
RDS, …), pin that in `_common.sh` so `strip_cloudsql`'d snapshots restore without
version-mismatch surprises. Across Jarvus repos this currently drifts (16 / 17 / 18
all in use) — match *your* prod, and mind the data-dir caveat above when it's 18.

## docker-compose can't do per-context isolation — remove it

If the repo had a `docker-compose.yml` just to template a local Postgres, **delete
it** once these scripts exist. Compose pins one fixed DB name and one fixed host
port — exactly what defeats per-worktree databases and ports. It also breaks in
this workflow specifically: compose ties operations to the directory it was first
run from, so when an agent worktree is deleted while its compose containers keep
running, you can't manage them without recreating that exact path. The `bin/`
scripts manage a path-independent shared container by name instead. Keeping both
invites "which Postgres am I talking to?" confusion — pick the scripts.

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
