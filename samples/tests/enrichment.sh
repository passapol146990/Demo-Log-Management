#!/bin/bash
# Integration test for the enrichment worker (geoip + reverse DNS).
#
# Flow:
#   1. Ensure the stack (backend + worker + opensearch) is up via docker compose.
#   2. Log in and POST a test log with a known public src_ip (8.8.8.8).
#   3. Poll /api/search until the enrichment worker fills in src_ip_geo /
#      src_ip_hostname on that document (worker runs on ENRICHMENT_INTERVAL_MS,
#      default 15s).
#   4. Print the enrichment fields and fail if they never show up.
#
# Usage:
#   ./enrichment.sh [--host http://localhost:3000] [--email admin@demoA] [--password password123] [--timeout 90]
#
# Requires: curl, python3 (json parsing only, no extra deps), docker compose
# running (or point --host at an already-running instance).

set -uo pipefail

HOST="http://localhost:3000"
EMAIL="admin@demoA"
PASSWORD="password123"
TIMEOUT_SECS=90
COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MARKER="enrichment-test-$(date +%s)"
STARTED_STACK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --timeout) TIMEOUT_SECS="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

log() { echo "[enrichment-test] $*"; }
fail() { echo "[enrichment-test] FAIL: $*" >&2; exit 1; }

log "Target host: $HOST"

# 1. Start the system if it isn't already reachable.
if ! curl -sf -o /dev/null "$HOST/login"; then
  log "Backend not reachable, starting docker compose stack..."
  (cd "$COMPOSE_DIR" && docker compose up -d) || fail "docker compose up failed"
  STARTED_STACK=1
  log "Waiting for backend to become healthy..."
  for i in $(seq 1 60); do
    curl -sf -o /dev/null "$HOST/login" && break
    sleep 2
  done
  curl -sf -o /dev/null "$HOST/login" || fail "backend never became reachable at $HOST"
fi

log "Checking worker container is running..."
if command -v docker >/dev/null 2>&1; then
  (cd "$COMPOSE_DIR" && docker compose ps worker) || log "warning: could not inspect worker container"
fi

# 2. Log in.
log "Logging in as $EMAIL..."
LOGIN_RESP=$(curl -s -X POST "$HOST/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
[[ -n "$TOKEN" ]] || fail "login failed: $LOGIN_RESP"
log "Logged in."

# 3. Send a test log with a known public IP (Google Public DNS: geo=US, rdns=dns.google).
log "Sending test log with src_ip=8.8.8.8 (marker=$MARKER)..."
INGEST_RESP=$(curl -s -X POST "$HOST/api/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"source\":\"api\",\"event_type\":\"enrichment_test\",\"http_method\":\"GET\",\"url\":\"/enrichment-test\",\"status_code\":200,\"src_ip\":\"8.8.8.8\",\"user\":\"$MARKER\",\"severity\":1}")
echo "$INGEST_RESP" | python3 -c "import sys,json;json.load(sys.stdin)" >/dev/null 2>&1 \
  || fail "ingest did not return valid JSON: $INGEST_RESP"
log "Ingest response: $INGEST_RESP"

# 4. Poll search results until enrichment fields appear, or timeout.
log "Polling /api/search for enrichment fields (timeout=${TIMEOUT_SECS}s, worker cycle ~15s)..."
DEADLINE=$((SECONDS + TIMEOUT_SECS))
FOUND=0
LAST_DOC=""
while [[ $SECONDS -lt $DEADLINE ]]; do
  SEARCH_RESP=$(curl -s -G "$HOST/api/search" \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "keyword=$MARKER")
  LAST_DOC=$(echo "$SEARCH_RESP" | python3 -c "
import sys, json
try:
    body = json.load(sys.stdin)
except Exception:
    sys.exit(0)
hits = body.get('hits', [])
if not hits:
    sys.exit(0)
src = hits[0].get('_source', {})
print(json.dumps(src))
" 2>/dev/null)

  if [[ -n "$LAST_DOC" ]] && echo "$LAST_DOC" | grep -q "src_ip_geo"; then
    HAS_GEO=$(echo "$LAST_DOC" | python3 -c "import sys,json;d=json.load(sys.stdin);print('yes' if d.get('src_ip_geo') else 'no')")
    if [[ "$HAS_GEO" == "yes" ]]; then
      FOUND=1
      break
    fi
  fi
  sleep 5
done

if [[ $FOUND -ne 1 ]]; then
  log "Last seen document: ${LAST_DOC:-<none found>}"
  fail "enrichment fields (src_ip_geo) never appeared within ${TIMEOUT_SECS}s"
fi

log "Enrichment fields found:"
echo "$LAST_DOC" | python3 -m json.tool

GEO_COUNTRY=$(echo "$LAST_DOC" | python3 -c "import sys,json;print(json.load(sys.stdin).get('src_ip_geo',{}).get('country',''))")
RDNS_HOST=$(echo "$LAST_DOC" | python3 -c "import sys,json;print(json.load(sys.stdin).get('src_ip_hostname',{}).get('hostname',''))")

[[ -n "$GEO_COUNTRY" ]] || fail "src_ip_geo.country is empty"
log "GeoIP country: $GEO_COUNTRY (expected: United States)"

if [[ -n "$RDNS_HOST" ]]; then
  log "Reverse DNS hostname: $RDNS_HOST (expected: dns.google)"
else
  log "warning: src_ip_hostname not populated (reverse DNS may be blocked in this network, not fatal)"
fi

log "Checking worker logs for enrichment stats output..."
if command -v docker >/dev/null 2>&1; then
  (cd "$COMPOSE_DIR" && docker compose logs worker 2>/dev/null | grep -i "Enrichment:" | tail -5) \
    || log "warning: no 'Enrichment:' lines found in worker logs yet"
fi

if [[ $STARTED_STACK -eq 1 ]]; then
  log "(Stack was started by this script; leaving it running. Run 'docker compose down' to stop.)"
fi

log "PASS: log ingested with src_ip=8.8.8.8 was enriched with geoip"
exit 0
