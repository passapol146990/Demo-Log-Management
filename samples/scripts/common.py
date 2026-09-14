import json
import sys
from urllib import error, request

DEFAULT_HOST = "http://localhost:3000"
DEFAULT_EMAIL = "admin@demoA"
DEFAULT_PASSWORD = "password123"


def add_connection_args(parser):
    parser.add_argument("--host", default=DEFAULT_HOST, help="base URL ของ backend")
    parser.add_argument("--email", default=DEFAULT_EMAIL, help="อีเมลสำหรับ login")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="รหัสผ่าน")


def http_json(url, method="GET", body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except error.HTTPError as e:
        return e.code, json.loads(e.read())


def login(host, email, password):
    status, body = http_json(f"{host}/api/auth/login", "POST", {"email": email, "password": password})
    if status != 200:
        print(f"Login ไม่สำเร็จ: {status} {body}")
        sys.exit(1)
    return body["token"]
