#!/usr/bin/env python3
"""
Log in, then POST every event in the sample JSON files (api, crowdstrike, aws,
m365, ad) to /api/ingest. Timestamps are shifted so the newest event in each
file lands at "now", preserving relative spacing, so time-window alert rules
can trigger live.

Usage:
  ./3_post_logs.py [--host http://localhost:3000] [--email admin@demoA] [--password password123]
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from common import add_connection_args, http_json, login

SOURCE_FILES = {
    "api": "api_events.json",
    "crowdstrike": "crowdstrike_events.json",
    "aws": "aws_cloudtrail_events.json",
    "m365": "m365_audit_events.json",
    "ad": "ad_windows_events.json",
}

LOGS_DIR = Path(__file__).resolve().parent.parent / "logs"


def shift_timestamps(events):
    parsed = [datetime.fromisoformat(e["@timestamp"].replace("Z", "+00:00")) for e in events]
    offset = datetime.now(timezone.utc) - max(parsed)
    for event, ts in zip(events, parsed):
        event["@timestamp"] = (ts + offset).isoformat().replace("+00:00", "Z")
    return events


def main():
    parser = argparse.ArgumentParser(description="POST all sample JSON logs to /api/ingest.")
    add_connection_args(parser)
    args = parser.parse_args()

    token = login(args.host, args.email, args.password)
    print(f"Logged in as {args.email}")

    results = {}
    for source, filename in SOURCE_FILES.items():
        path = LOGS_DIR / filename
        if not path.exists():
            print(f"Skipping {source}: {path} not found")
            continue
        events = shift_timestamps(json.loads(path.read_text()))
        ok, fail = 0, 0
        for event in events:
            event.setdefault("source", source)
            status, body = http_json(f"{args.host}/api/ingest", "POST", event, token=token)
            if status == 200:
                ok += 1
            else:
                fail += 1
                print(f"  [{source}] failed: {status} {body}")
        results[source] = (ok, fail)
        print(f"{source}: {ok} success, {fail} failed")

    print("\nSummary:")
    total_ok, total_fail = 0, 0
    for source, (ok, fail) in results.items():
        print(f"  {source}: {ok} ok, {fail} fail")
        total_ok += ok
        total_fail += fail

    print(f"\nTotal: {total_ok} success, {total_fail} failed")
    sys.exit(0 if total_fail == 0 else 1)


if __name__ == "__main__":
    main()
