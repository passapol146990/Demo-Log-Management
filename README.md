# Demo-Log-Management
Demo Project Interm Log Management Full Stack Developer

# how to run
```
./run.sh
```

# how to dev
```
./dev.sh
```

# Port Service
```
Backend:   http://localhost:3000
OpenSearch: http://localhost:9200
Syslog:    udp://localhost:514
```
---
# Test ingest Logs
```
./samples/scripts/1_send_examples.py // VPN IP
```
# Test Alert Warning
```
./samples/scripts/4_demo_login_failure_alert.py // [/]
```

# Default Login Credentials
| Email | Password | Role | Tenant |
|---|---|---|---|
| admin@demoA | password123 | admin | demoA |
| viewer@demoA | password123 | viewer | demoA |
| admin@demoB | password123 | admin | demoB |
| viewer@demoB | password123 | viewer | demoB |
