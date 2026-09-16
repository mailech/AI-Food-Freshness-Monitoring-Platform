#!/usr/bin/env bash
# ===========================================================================
#  Showcase launcher for the AI Food Freshness Monitoring Platform (macOS/Linux).
#
#  Starts the whole stack, waits until it is genuinely healthy, verifies it with
#  real API calls, then opens the browser on a guided tour.
#
#    ./showcase.sh                      auto-detect docker or local
#    ./showcase.sh --mode local         uvicorn + vite with hot reload
#    ./showcase.sh --mode docker        postgres + fastapi + nginx
#    ./showcase.sh --reseed --fast-seed regenerate demo data quickly
#    ./showcase.sh --no-browser         start without opening tabs
#    ./showcase.sh --stop               shut everything down
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
STATE_FILE="$ROOT/.showcase-state"
SQLITE_FILE="$BACKEND_DIR/freshness.sqlite3"

API_URL="http://localhost:8000"
DOCKER_URL="http://localhost:3000"
LOCAL_URL="http://localhost:5173"
DEMO_PASSWORD="Demo@1234"

MODE="auto"
RESEED=false
FAST_SEED=false
NO_BROWSER=false
VERIFY=false
DO_STOP=false

# ------------------------------------------------------------------ output
BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; CYAN=$'\033[36m'

banner() { printf '\n%s%s%s\n %s%s%s\n%s%s%s\n' "$DIM" "$(printf '=%.0s' {1..74})" "$RESET" "$CYAN$BOLD" "$1" "$RESET" "$DIM" "$(printf '=%.0s' {1..74})" "$RESET"; }
step()   { printf '  -> %s\n' "$1"; }
ok()     { printf '  %s[ok]%s   %s\n' "$GREEN" "$RESET" "$1"; }
warn()   { printf '  %s[warn]%s %s\n' "$YELLOW" "$RESET" "$1"; }
err()    { printf '  %s[fail]%s %s\n' "$RED" "$RESET" "$1"; }
info()   { printf '         %s%s%s\n' "$DIM" "$1" "$RESET"; }

# ------------------------------------------------------------------- args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)       MODE="${2:-auto}"; shift 2 ;;
    --reseed)     RESEED=true; shift ;;
    --fast-seed)  FAST_SEED=true; shift ;;
    --no-browser) NO_BROWSER=true; shift ;;
    --verify)     VERIFY=true; shift ;;
    --stop)       DO_STOP=true; shift ;;
    -h|--help)    sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)            err "unknown option: $1"; exit 1 ;;
  esac
done

open_url() {
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1 &
  elif command -v open   >/dev/null 2>&1; then open "$1" >/dev/null 2>&1 &
  else info "open manually: $1"; fi
}

docker_running() { docker info >/dev/null 2>&1; }

wait_for_url() {
  local url="$1" timeout="${2:-180}" label="${3:-service}" elapsed=0
  while (( elapsed < timeout )); do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      printf '\r'; ok "$label is up"; return 0
    fi
    printf '\r  %s... waiting for %s (%ss left)   %s' "$DIM" "$label" "$((timeout - elapsed))" "$RESET"
    sleep 2; elapsed=$((elapsed + 2))
  done
  printf '\r'; err "$label did not become ready within ${timeout}s"; return 1
}

# ------------------------------------------------------------------- stop
stop_everything() {
  banner "STOPPING"
  if [[ -f "$STATE_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$STATE_FILE"
    for pid_var in BACKEND_PID FRONTEND_PID; do
      local pid="${!pid_var:-}"
      if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        # Kill the process group so uvicorn's reloader and node children die too.
        kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
        sleep 1
        kill -KILL "-$pid" 2>/dev/null || true
        ok "stopped $pid_var ($pid)"
      fi
    done
    rm -f "$STATE_FILE"
  fi
  if docker_running; then
    step "docker compose down"
    (cd "$ROOT" && docker compose down >/dev/null 2>&1 || true)
    ok "containers stopped"
  fi
  printf '\n  %sEverything is shut down.%s\n\n' "$GREEN" "$RESET"
}

if $DO_STOP; then stop_everything; exit 0; fi

printf '\n  %sAI FOOD FRESHNESS MONITORING PLATFORM%s\n  %sshowcase launcher%s\n' \
  "$CYAN$BOLD" "$RESET" "$DIM" "$RESET"

# -------------------------------------------------------------- preflight
banner "PREFLIGHT"

if [[ "$MODE" == "auto" ]]; then
  if docker_running; then MODE="docker"; else MODE="local"; fi
  step "auto-detected mode: $MODE"
  [[ "$MODE" == "local" ]] && info "Docker daemon is not running, so using local mode."
fi

if [[ "$MODE" == "docker" ]] && ! docker_running; then
  err "Docker mode requested but the daemon is not running."
  info "Start Docker, or run:  ./showcase.sh --mode local"
  exit 1
fi

PYTHON=""
if [[ "$MODE" == "local" ]]; then
  for candidate in "$ROOT/.venv/bin/python" "$BACKEND_DIR/.venv/bin/python" "$(command -v python3 || true)"; do
    [[ -n "$candidate" && -x "$candidate" ]] && { PYTHON="$candidate"; break; }
  done
  if [[ -z "$PYTHON" ]]; then
    err "no Python interpreter found"
    info "python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt"
    exit 1
  fi
  ok "python: $PYTHON"

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    err "frontend dependencies are not installed"
    info "cd frontend && npm install"
    exit 1
  fi
  ok "frontend dependencies found"
fi

APP_URL="$LOCAL_URL"
[[ "$MODE" == "docker" ]] && APP_URL="$DOCKER_URL"

# ------------------------------------------------------------ docker mode
if [[ "$MODE" == "docker" ]]; then
  banner "STARTING THE STACK (docker compose)"
  info "PostgreSQL 16 + FastAPI + nginx. First run also builds the images,"
  info "applies Alembic migrations and seeds the demo data."
  echo

  cd "$ROOT"
  if $RESEED; then
    step "removing existing volumes so the data is regenerated"
    docker compose down -v >/dev/null 2>&1 || true
  fi

  export SEED_ON_START=true
  export JWT_SECRET_KEY="${JWT_SECRET_KEY:-showcase-local-secret}"

  step "docker compose up -d --build  (this can take a few minutes)"
  docker compose up -d --build 2>&1 | grep -Ei 'error' || true

  step "waiting for the containers to report healthy"
  docker compose up -d --wait --wait-timeout 300 >/dev/null 2>&1 || true
  echo
  docker compose ps --format '  {{.Service}}  {{.State}}  {{.Status}}'

  wait_for_url "$API_URL/health" 180 "API" || { info "docker compose logs backend --tail 60"; exit 1; }
  wait_for_url "$APP_URL"        90 "frontend" || { info "docker compose logs frontend --tail 40"; exit 1; }
fi

# ------------------------------------------------------------- local mode
if [[ "$MODE" == "local" ]]; then
  if $RESEED || [[ ! -f "$SQLITE_FILE" ]]; then
    banner "SEEDING THE DEMO DATABASE"
    $RESEED && info "Reseeding: existing data will be dropped." \
            || info "No database found, so creating one."

    seed_args=(-m app.seed --reset)
    if $FAST_SEED; then
      seed_args+=(--no-analysis)
      info "Fast mode: skipping the ML pipeline (dashboards will be sparser)."
    else
      info "Running the real analysis pipeline on 44 batches - takes ~60-90s."
    fi
    echo

    (cd "$BACKEND_DIR" && PYTHONPATH="$BACKEND_DIR" "$PYTHON" "${seed_args[@]}" 2>&1 |
      grep -E 'Users |Categories |Products |Batches |Inventory |Images |assessments|predictions|readings|Recommendations|Alerts|Notifications' |
      sed 's/^/     /') || { err "seeding failed"; exit 1; }
    ok "demo data ready"
  else
    ok "existing database found - use --reseed for fresh data"
  fi

  banner "STARTING THE BACKEND (uvicorn, hot reload)"
  (cd "$BACKEND_DIR" && PYTHONPATH="$BACKEND_DIR" setsid "$PYTHON" -m uvicorn app.main:app \
      --reload --port 8000 > "$ROOT/.showcase-backend.log" 2>&1 &
   echo "BACKEND_PID=$!" >> "$STATE_FILE.tmp")
  step "logging to .showcase-backend.log"
  wait_for_url "$API_URL/health" 120 "API" || { info "tail -40 .showcase-backend.log"; exit 1; }

  banner "STARTING THE FRONTEND (vite, hot reload)"
  (cd "$FRONTEND_DIR" && setsid npm run dev > "$ROOT/.showcase-frontend.log" 2>&1 &
   echo "FRONTEND_PID=$!" >> "$STATE_FILE.tmp")
  step "logging to .showcase-frontend.log"
  wait_for_url "$APP_URL" 120 "frontend" || { info "tail -40 .showcase-frontend.log"; exit 1; }

  mv "$STATE_FILE.tmp" "$STATE_FILE"
fi

echo "MODE=$MODE" >> "$STATE_FILE" 2>/dev/null || echo "MODE=$MODE" > "$STATE_FILE"

# ---------------------------------------------------------------- verify
banner "VERIFYING THE RUNNING STACK"

HEALTH="$(curl -fsS "$API_URL/health" 2>/dev/null || echo '')"
if [[ -z "$HEALTH" ]]; then
  err "the API health endpoint is not responding"; exit 1
fi
py_get() { "${PYTHON:-python3}" -c "import json,sys; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo '?'; }
ok "health: $(echo "$HEALTH" | py_get 'd["status"]') | database: $(echo "$HEALTH" | py_get 'd["database"]') | ML mode: $(echo "$HEALTH" | py_get 'd["model"]')"

TOKEN="$(curl -fsS -X POST "$API_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"admin@freshness.example.com\",\"password\":\"$DEMO_PASSWORD\"}" 2>/dev/null |
  py_get 'd["tokens"]["access_token"]')"

if [[ -z "$TOKEN" || "$TOKEN" == "?" ]]; then
  warn "could not sign in with the seeded admin account - try --reseed"
else
  ok "signed in as the seeded administrator"
  STATS="$(curl -fsS "$API_URL/api/v1/analytics/platform" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo '')"
  if [[ -n "$STATS" ]]; then
    echo
    printf '  %sDemo data loaded:%s\n' "$BOLD" "$RESET"
    info "users $(echo "$STATS" | py_get 'd["users"]["total"]') | products $(echo "$STATS" | py_get 'd["catalogue"]["products"]') | batches $(echo "$STATS" | py_get 'd["catalogue"]["batches"]')"
    info "AI analyses $(echo "$STATS" | py_get 'd["analysis"]["assessments"]') | storage readings $(echo "$STATS" | py_get 'd["storage_readings"]')"
  fi
fi

MODELS="$(curl -fsS "$API_URL/api/v1/system/models" 2>/dev/null || echo '')"
if [[ -n "$MODELS" ]]; then
  echo
  printf '  %sAI model provenance:%s\n' "$BOLD" "$RESET"
  echo "$MODELS" | "${PYTHON:-python3}" -c '
import json, sys
data = json.load(sys.stdin)
for role, info in data["roles"].items():
    kind = "BASELINE" if info["is_demo"] else "TRAINED "
    note = "metrics recorded" if info.get("metrics") else "no accuracy claimed"
    print(f"         {kind}  {role:<20} {info[\"name\"]:<28} {note}")
' 2>/dev/null || true
fi

if $VERIFY; then
  banner "END-TO-END CHECK (131 assertions)"
  (cd "$BACKEND_DIR" && PYTHONPATH="$BACKEND_DIR" "$PYTHON" scripts/e2e_smoke.py 2>&1 |
    grep -E 'E2E SMOKE|FAIL ' | sed 's/^/  /') || true
fi

# ------------------------------------------------------------------ tour
banner "DEMO ACCOUNTS"
printf '  Password for every account: %s%s%s\n' "$BOLD" "$DEMO_PASSWORD" "$RESET"
printf '  %s(the login page has one-click buttons, so you need not type them)%s\n\n' "$DIM" "$RESET"
printf '  %-20s %-34s %s\n' "ROLE" "EMAIL" "DASHBOARD SHOWS"
printf '  %-20s %-34s %s\n' "Consumer"           "consumer@freshness.example.com"   "Pantry, expiries, Analyse Food flow"
printf '  %-20s %-34s %s\n' "Retail Manager"     "manager@freshness.example.com"    "Stock quality, trends, waste risk"
printf '  %-20s %-34s %s\n' "Warehouse Operator" "warehouse@freshness.example.com"  "Cold-chain compliance, trends"
printf '  %-20s %-34s %s\n' "Quality Inspector"  "inspector@freshness.example.com"  "Inspection queue, indicators"
printf '  %-20s %-34s %s\n' "Administrator"      "admin@freshness.example.com"      "Users, health, model provenance"

banner "SUGGESTED TOUR"
cat <<'TOUR'
  Sign in as the Consumer  -> personal pantry, "use these first", recent scans
  Click "Analyse Food"     -> pick a batch, drop in data/sample/mouldy_bread.jpg,
                              enter 11 C and 95 %, then Analyse Freshness
  On the results page      -> read the "Why this score?" panel: it shows
                              0.40 x Visual + 0.25 x Storage + 0.20 x Shelf-Life
                              + 0.15 x Age, with each contribution in points
  Scroll to Visual         -> the overlay image with detected regions boxed
  Compare                  -> re-run with data/sample/fresh_tomato.jpg
  Switch to Retail Manager -> freshness trends, waste risk, value at risk
  Switch to Warehouse      -> compliance table, temperature trend vs the band
  Switch to Inspector      -> inspection queue and indicator frequency
  Switch to Administrator  -> users by role, system health, model provenance
  Open Reports             -> generate a PDF and an Excel file; both download
  Open Rotation            -> FIFO vs FEFO pick list, each row explains itself
  User menu -> About the AI models -> the honesty page
TOUR

banner "URLS"
printf '  Application  %s%s%s\n' "$BOLD" "$APP_URL" "$RESET"
printf '  API          %s\n'     "$API_URL"
printf '  Swagger UI   %s/docs\n' "$API_URL"
printf '  ReDoc        %s/redoc\n' "$API_URL"
printf '  Health       %s/health\n' "$API_URL"
printf '  Model info   %s/api/v1/system/models\n' "$API_URL"

banner "IMPORTANT: WHAT THE AI ACTUALLY IS"
printf '%s' "$YELLOW"
cat <<'HONEST'
  No trained neural network ships with this project. All four inference roles are
  transparent computer-vision / rule baselines, and NO accuracy figures are
  claimed for them. Every result is labelled accordingly in the UI, and the
  "About the AI models" page states the provenance of each role.
  See ml/datasets/README.md to train real models.
HONEST
printf '%s' "$RESET"

banner "TO STOP"
printf '  ./showcase.sh --stop\n\n'

if ! $NO_BROWSER; then
  banner "OPENING BROWSER"
  for url in "$APP_URL" "$API_URL/docs" "$API_URL/api/v1/system/models" "$API_URL/health"; do
    step "$url"; open_url "$url"; sleep 1
  done
  ok "browser tabs opened"
fi

printf '\n%s%s%s\n' "$GREEN" "$(printf '=%.0s' {1..74})" "$RESET"
printf '%s READY - the platform is running in %s mode%s\n' "$GREEN$BOLD" "$MODE" "$RESET"
printf '%s Open %s and sign in with any demo account.%s\n' "$GREEN" "$APP_URL" "$RESET"
printf '%s%s%s\n\n' "$GREEN" "$(printf '=%.0s' {1..74})" "$RESET"
