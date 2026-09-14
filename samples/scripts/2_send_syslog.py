#!/usr/bin/env python3
"""
Send each line of logs/firewall_syslog.txt as a UDP syslog message to the
collector (Vector) to exercise the syslog ingestion path end to end.

Usage:
  ./2_send_syslog.py [--host localhost] [--port 514] [--file ../logs/firewall_syslog.txt] [--delay 0.2]
"""
import argparse
import socket
import sys
import time
from pathlib import Path

DEFAULT_FILE = Path(__file__).resolve().parent.parent / "logs" / "firewall_syslog.txt"


def main():
    parser = argparse.ArgumentParser(description="Send firewall syslog lines over UDP to Vector.")
    parser.add_argument("--host", default="localhost", help="syslog target host")
    parser.add_argument("--port", type=int, default=514, help="syslog target port (UDP)")
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE, help="ไฟล์ syslog ที่จะยิง")
    parser.add_argument("--delay", type=float, default=0.2, help="หน่วงระหว่างแต่ละบรรทัด (วินาที)")
    args = parser.parse_args()

    if not args.file.exists():
        print(f"Log file not found: {args.file}")
        sys.exit(1)

    lines = [line for line in args.file.read_text().splitlines() if line.strip()]
    print(f"Sending {len(lines)} syslog messages to udp://{args.host}:{args.port}")

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    for i, line in enumerate(lines, 1):
        sock.sendto(line.encode(), (args.host, args.port))
        print(f"[{i}/{len(lines)}] sent: {line[:60]}...")
        time.sleep(args.delay)
    sock.close()

    print(f"Done. Sent {len(lines)} messages to {args.host}:{args.port}")


if __name__ == "__main__":
    main()
