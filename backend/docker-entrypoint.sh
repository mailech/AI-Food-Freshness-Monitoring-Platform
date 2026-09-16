#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Container entrypoint.
#
#   1. wait for PostgreSQL to accept connections
#   2. run `alembic upgrade head`   (unless RUN_MIGRATIONS=false)
#   3. seed demo data              (only when SEED_ON_START=true)
#   4. exec the CMD
#
# Migrations are the schema source of truth - the app never creates tables
# implicitly in a containerised deployment.
# ---------------------------------------------------------------------------
set -euo pipefail

RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
SEED_ON_START="${SEED_ON_START:-false}"
WAIT_FOR_DB_TIMEOUT="${WAIT_FOR_DB_TIMEOUT:-60}"

log() { printf '[entrypoint] %s\n' "$*"; }

wait_for_database() {
  if [[ "${DATABASE_URL:-}" != postgres* ]]; then
    log "non-PostgreSQL DATABASE_URL - skipping the connectivity wait"
    return 0
  fi

  log "waiting up to ${WAIT_FOR_DB_TIMEOUT}s for the database…"
  local elapsed=0
  until python - <<'PY'
import sys
from sqlalchemy import create_engine, text
from app.config import settings

try:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
except Exception as exc:
    print(f"not ready: {type(exc).__name__}", file=sys.stderr)
    sys.exit(1)
PY
  do
    if (( elapsed >= WAIT_FOR_DB_TIMEOUT )); then
      log "ERROR: the database did not become available in ${WAIT_FOR_DB_TIMEOUT}s"
      exit 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  log "database is ready"
}

wait_for_database

if [[ "${RUN_MIGRATIONS}" == "true" ]]; then
  log "applying database migrations"
  alembic upgrade head
  log "migrations applied"
else
  log "RUN_MIGRATIONS=false - skipping migrations"
fi

if [[ "${SEED_ON_START}" == "true" ]]; then
  log "seeding demo data (SEED_ON_START=true)"
  # Idempotent: the seeder skips batch creation when data already exists.
  python -m app.seed || log "WARNING: seeding failed; continuing to start the API"
fi

log "starting: $*"
exec "$@"
