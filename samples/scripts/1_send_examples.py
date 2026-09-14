#!/usr/bin/env python3
"""
Send one minimal example event per source (api, firewall, network, crowdstrike,
aws, m365, ad) to /api/ingest. Fastest smoke test that every normalizer is
reachable and that ingestion accepts all supported log types.

Usage:
  ./1_send_examples.py [--host http://localhost:3000] [--email admin@demoA] [--password password123]
"""
import argparse
import sys

from common import add_connection_args, http_json, login

EXAMPLES = [
    ("api", {
        "source": "api", "event_type": "app_login_failed", "event_subtype": "auth",
        "http_method": "POST", "url": "/api/v1/login", "status_code": 401,
        "src_ip": "203.0.113.7", "user": "alice", "severity": 5,
    }),
    ("firewall", {
        "source": "firewall", "msg": "deny inbound tcp", "action": "deny",
        "src_ip": "198.51.100.9", "dst_ip": "10.0.0.5", "dst_port": 22,
        "protocol": "TCP", "severity": 7,
    }),
    ("network", {
        "source": "network", "msg": "connection reset", "action": "reset",
        "src_ip": "198.51.100.20", "dst_ip": "10.0.0.8", "dst_port": 443,
        "protocol": "TCP", "severity": 5,
    }),
    ("crowdstrike", {
        "source": "crowdstrike", "event_type": "threat", "event_subtype": "alert",
        "action": "blocked", "host": "WIN-01", "user": "bob",
        "rule_name": "Malicious File Blocked", "severity": 9,
    }),
    ("aws", {
        "source": "aws", "event_type": "cloud", "event_subtype": "api_call",
        "action": "AssumeRole", "user": "arn:aws:iam::123:user/dev",
        "src_ip": "203.0.113.30",
        "cloud": {"account_id": "123456789012", "region": "ap-southeast-1", "service": "sts"},
        "severity": 5,
    }),
    ("m365", {
        "source": "m365", "event_type": "security", "event_subtype": "login",
        "action": "UserLoginFailed", "user": "carol@contoso.com",
        "src_ip": "203.0.113.40", "severity": 6,
    }),
    ("ad", {
        "source": "ad", "event_id": 4625, "event_type": "authentication", "event_subtype": "login_failure",
        "action": "Logon Failure", "user": "CORP\\dave", "host": "DC01",
        "src_ip": "203.0.113.50", "severity": 6,
    }),
]


def main():
    parser = argparse.ArgumentParser(description="Smoke test ingestion for every supported source.")
    add_connection_args(parser)
    args = parser.parse_args()

    token = login(args.host, args.email, args.password)
    print(f"Logged in as {args.email}\n")

    failed = 0
    for source, payload in EXAMPLES:
        status, body = http_json(f"{args.host}/api/ingest", "POST", payload, token=token)
        ok = status == 200
        failed += 0 if ok else 1
        detail = "" if ok else f"  {body}"
        print(f"  {source:12} -> HTTP {status}{detail}")

    print(f"\nTotal: {len(EXAMPLES) - failed} success, {failed} failed")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
