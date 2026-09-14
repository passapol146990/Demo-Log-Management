# Samples

Sample log files and scripts for testing ingestion into the Log Management system.

## Files

### `logs/`

| File | Source | Format |
|---|---|---|
| `firewall_syslog.txt` | firewall | RFC5424-ish syslog, allow/deny events, sent via `2_send_syslog.py` |
| `network_syslog.txt` | network | router/switch syslog (link up/down, port flap) |
| `api_events.json` | api | JSON array of HTTP access log events |
| `crowdstrike_events.json` | crowdstrike | JSON array of malware/threat detections |
| `aws_cloudtrail_events.json` | aws | JSON array of CloudTrail-style API calls |
| `m365_audit_events.json` | m365 | JSON array of Unified Audit Log events |
| `ad_windows_events.json` | ad | JSON array of Windows Security events (4624/4625/4634) |

`ad_windows_events.json` contains 5 consecutive `event_id: 4625` (LogonFailed)
events from `203.0.113.77` spaced 1 minute apart, which the `ad` normalizer
maps to `event_subtype: "login_failure"`. This is enough to trigger the
"Login Failures" alert rule (>=5 failures from the same IP within 5 minutes)
once posted through `3_post_logs.py`.

### `scripts/`

All scripts are Python 3 and numbered in the order they are meant to be run.
`common.py` holds the shared login/HTTP helpers.

1. **`1_send_examples.py`** — logs in then POSTs one minimal event for **every**
   source (api, firewall, network, crowdstrike, aws, m365, ad) to `/api/ingest`.
   Fastest smoke test that ingestion accepts all supported log types and every
   normalizer works.

   ```bash
   python3 scripts/1_send_examples.py
   python3 scripts/1_send_examples.py --host http://localhost:3000
   ```

2. **`2_send_syslog.py`** — sends each line of `logs/firewall_syslog.txt` as a
   UDP syslog message to Vector (`:514`), exercising the collector path.

   ```bash
   python3 scripts/2_send_syslog.py                 # localhost:514
   python3 scripts/2_send_syslog.py --host localhost --port 514
   ```

3. **`3_post_logs.py`** — logs into `/api/auth/login`, then POSTs every event in
   `logs/api_events.json`, `crowdstrike_events.json`, `aws_cloudtrail_events.json`,
   `m365_audit_events.json`, `ad_windows_events.json` to `/api/ingest`.
   Timestamps in each file are shifted so the most recent event lands at "now"
   (preserving relative spacing), so time-window alert rules can be tested live.

   ```bash
   python3 scripts/3_post_logs.py
   python3 scripts/3_post_logs.py --host http://localhost:3000 --email admin@demoA --password password123
   ```

4. **`4_demo_login_failure_alert.py`** — enables the "Login Failures" rule, then
   sends `--count` (default 5) AD `4625` login failures from a single source IP so
   the worker fires an alert on the next cycle (~60s). Watch the bell/toast, or
   `GET /api/alerts`.

   ```bash
   python3 scripts/4_demo_login_failure_alert.py
   python3 scripts/4_demo_login_failure_alert.py --host http://localhost:3000 --count 5
   ```

### Batch ingestion

`POST /api/ingest` also accepts a whole batch of log objects in a single
request: `{ "logs": [ {source, ...}, {source, ...}, ... ] }`. Each item is
validated and normalized independently (partial success is allowed — one bad
item doesn't fail the rest), and the response summarizes the outcome:

```json
{
  "batch": true,
  "total": 10,
  "succeeded": 8,
  "failed": 2,
  "results": [
    { "index": 0, "status": "ok" },
    { "index": 1, "status": "error", "error": "Validation failed: ..." }
  ]
}
```

`3_post_logs.py` still loops per-record by default (unchanged behavior). To
send an entire sample file as one batch request instead, wrap the file's
JSON array in a `logs` key and POST it directly, e.g.:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demoA","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

jq '{logs: .}' logs/api_events.json | curl -s -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @-
```

## Verify

```bash
# every source type accepted by /api/ingest
python3 scripts/1_send_examples.py

# firewall logs via syslog
python3 scripts/2_send_syslog.py
curl -u admin:'<OPENSEARCH_PASSWORD>' "http://localhost:9200/logs/_search?q=source:firewall"

# JSON logs via HTTP API
python3 scripts/3_post_logs.py
curl -u admin:'<OPENSEARCH_PASSWORD>' "http://localhost:9200/logs/_search?q=source:ad"

# alert rule (wait ~60s for the worker cycle after posting ad_windows_events.json)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demoA","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s http://localhost:3000/api/alerts -H "Authorization: Bearer $TOKEN"

# enrichment worker (geoip + reverse DNS, ~15s worker cycle)
bash tests/enrichment.sh
```

### `tests/`

| File | Purpose |
|---|---|
| `enrichment.sh` | Sends a log with `src_ip=8.8.8.8`, polls `/api/search` until the enrichment worker fills in `src_ip_geo`/`src_ip_hostname`, and prints the result. |
