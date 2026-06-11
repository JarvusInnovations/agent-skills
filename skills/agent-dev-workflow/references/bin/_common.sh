# Shared functions for <PROJECT> development scripts. Source this; don't run it.
#
# This is the invariant core of the agent-dev-workflow pattern. A single shared
# Postgres container hosts a SEPARATE DATABASE per context (main checkout, each
# agent worktree, the test runner), and each context binds a free port — so many
# worktrees run at once without clobbering each other.
#
# TO ADAPT: replace the `app`/`APP_` prefix with a short one for your project
# (e.g. a 2-3 letter initialism) and set the constants below. Pick a PG host port
# well outside the common 5432 to avoid colliding with other local Postgres instances.

set -euo pipefail

APP_PG_USER="app"
APP_PG_PASSWORD="app"
APP_PG_IMAGE="postgres:17-alpine"     # see gotchas.md before choosing 18
APP_CONTAINER_NAME="app-postgres"
APP_VOLUME_NAME="app-pgdata"

app_root() {
  git rev-parse --show-toplevel
}

# Where the backend lives. Single-package repo → app_root; monorepo → a subdir
# (e.g. "$(app_root)/server" or "$(app_root)/apps/server"). Adjust per project.
app_server_dir() {
  echo "$(app_root)"
}

app_pg_port() {
  echo "${APP_PG_PORT:-5432}"   # pick a project-specific default (e.g. 5532)
}

# ── Database naming: one DB per context ──────────────────────────────────────
# APP_DATABASE set → that name (the test runner / orchestrator forces this).
# main worktree    → the canonical name (your durable dev data).
# other worktree   → app_<hash-of-path> (isolated, stable per worktree).
is_main_worktree() {
  local worktree_root main_worktree
  worktree_root="$(app_root)"
  main_worktree="$(git worktree list --porcelain | head -1 | sed 's/^worktree //')"
  [ "$worktree_root" = "$main_worktree" ]
}

# Portable 8-char hex hash (md5sum on Linux/coreutils, md5 on BSD/macOS).
app_hash() {
  if command -v md5sum &>/dev/null; then
    echo -n "$1" | md5sum | head -c 8
  else
    echo -n "$1" | md5 -q | head -c 8
  fi
}

app_db_name() {
  if [ -n "${APP_DATABASE:-}" ]; then
    echo "$APP_DATABASE"
    return
  fi
  if is_main_worktree; then
    echo "app"
  else
    echo "app_$(app_hash "$(app_root)")"
  fi
}

app_database_url() {
  echo "postgres://${APP_PG_USER}:${APP_PG_PASSWORD}@localhost:$(app_pg_port)/$(app_db_name)"
}

# ── Shared Postgres container ────────────────────────────────────────────────
ensure_postgres() {
  local container="$APP_CONTAINER_NAME" port
  port="$(app_pg_port)"
  if docker inspect "$container" &>/dev/null; then
    if [ "$(docker inspect -f '{{.State.Running}}' "$container")" != "true" ]; then
      echo "Starting existing postgres container..." >&2
      docker start "$container" >/dev/null
    fi
  else
    echo "Creating postgres container on port ${port}..." >&2
    docker run -d \
      --name "$container" \
      -p "${APP_PG_BIND:-127.0.0.1}:${port}:5432" \
      -e POSTGRES_USER="$APP_PG_USER" \
      -e POSTGRES_PASSWORD="$APP_PG_PASSWORD" \
      -e POSTGRES_DB=app \
      -v "${APP_VOLUME_NAME}:/var/lib/postgresql/data" \
      "$APP_PG_IMAGE" >/dev/null
  fi
  wait_for_postgres
}

wait_for_postgres() {
  local container="$APP_CONTAINER_NAME" attempts=0
  while ! docker exec "$container" pg_isready -U "$APP_PG_USER" -q 2>/dev/null; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
      echo "ERROR: postgres did not become ready after 30 seconds" >&2
      return 1
    fi
    sleep 1
  done
}

# psql inside the container — no host psql needed. Default DB = maintenance 'postgres'.
app_psql() {
  docker exec -i "$APP_CONTAINER_NAME" psql -U "$APP_PG_USER" "$@"
}

app_ensure_db() {
  local db="$1" exists
  exists="$(app_psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'" 2>/dev/null || true)"
  if [ "$exists" != "1" ]; then
    echo "Creating database ${db}..." >&2
    app_psql -d postgres -c "CREATE DATABASE ${db} OWNER ${APP_PG_USER}" >/dev/null
  fi
}

app_recreate_db() {
  local db="$1"
  app_psql -d postgres -c "
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity
    WHERE datname = '${db}' AND pid <> pg_backend_pid()
  " >/dev/null 2>&1 || true
  echo "Dropping database ${db}..." >&2
  app_psql -d postgres -c "DROP DATABASE IF EXISTS ${db}" >/dev/null
  echo "Creating database ${db}..." >&2
  app_psql -d postgres -c "CREATE DATABASE ${db} OWNER ${APP_PG_USER}" >/dev/null
}

# Run migrations against a DATABASE_URL. PROJECT-SPECIFIC — see migrations-and-seeds.md.
app_migrate() {
  local url="$1"
  echo "Running migrations..." >&2
  (cd "$(app_server_dir)" && DATABASE_URL="$url" bun run db:migrate) >&2
}

# ── Per-context port picking ─────────────────────────────────────────────────
# CRITICAL (see gotchas.md): use lsof on macOS, ss on Linux. `ss` does NOT exist
# on macOS and fails *silently* — without this split every port reads "free" and
# concurrent worktrees all collide on the same port. If neither tool exists,
# assume "in use" so we skip rather than double-bind.
port_in_use() {
  if command -v lsof &>/dev/null; then
    lsof -iTCP:"$1" -sTCP:LISTEN -P -n &>/dev/null
  elif command -v ss &>/dev/null; then
    ss -tlnp 2>/dev/null | grep -q ":$1 "
  else
    return 0
  fi
}

# First free port in [start, end].
find_available_port() {
  local start="$1" end="$2" port
  for port in $(seq "$start" "$end"); do
    if ! port_in_use "$port"; then
      echo "$port"
      return
    fi
  done
  echo "ERROR: no available port in range ${start}-${end}" >&2
  return 1
}

# The backend port for this context. Always scans FROM the default so the main
# port is reused when free (not skipped on worktree identity); collisions are
# detected by real listen-state. Override with PORT.
app_pick_port() {
  if [ -n "${PORT:-}" ]; then echo "$PORT"; return; fi
  if ! port_in_use 4000; then echo "4000"; return; fi
  find_available_port 4001 4099
}
