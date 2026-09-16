#!/usr/bin/env python3
"""
Enable the "Login Failures" alert rule, then send N AD 4625 events from one
source IP so the alert worker fires on its next cycle (~10s).

Usage:
  ./4_demo_login_failure_alert.py [--host https://besides-finals-coast-tabs.trycloudflare.com] [--count 5]
"""
import argparse
import sys

from common import add_connection_args, http_json, login

SAME_IP = "203.0.113.99"
RULE_NAME = "Login Failures"
DEFAULT_HOST = "https://besides-finals-coast-tabs.trycloudflare.com"


def main():
    parser = argparse.ArgumentParser(description="Demo the login-failure alert pipeline.")
    add_connection_args(parser)
    parser.set_defaults(host=DEFAULT_HOST)
    parser.add_argument("--count", type=int, default=5, help="จำนวน event login_failure ที่จะยิง")
    args = parser.parse_args()
    token = login(args.host, args.email, args.password)
    print(f"Logged in as {args.email}")

    status, body = http_json(f"{args.host}/api/alert-rules", token=token)
    rule = next((r for r in body.get("rules", []) if r["name"] == RULE_NAME), None)
    if not rule:
        print(f"Rule not found: {RULE_NAME}")
        sys.exit(1)

    status, body = http_json(
        f"{args.host}/api/alert-rules", "PATCH", {"id": rule["id"], "enabled": True}, token=token
    )
    if status != 200:
        print(f"Failed to enable rule: {status} {body}")
        sys.exit(1)
    print(f"Enabled rule {RULE_NAME} ({rule['id']})")

    events = [{
        "source": "ad", "event_id": 4625, "event_type": "authentication",
        "event_subtype": "login_failure", "action": "Logon Failure",
        "user": "CORP\\attacker", "host": "DC01", "src_ip": SAME_IP, "severity": 6,
    } for _ in range(args.count)]

    status, body = http_json(f"{args.host}/api/ingest", "POST", {"logs": events}, token=token)
    if status == 200:
        print(f"Ingested {body['succeeded']}/{body['total']} login_failure events from {SAME_IP}")
    else:
        print(f"Ingest failed: {status} {body}")

    print("Worker evaluates every 10s. Watch the dashboard bell/toast, or run:")
    print(f'  curl -s {args.host}/api/alerts -H "Authorization: Bearer <TOKEN>"')


if __name__ == "__main__":
    main()
