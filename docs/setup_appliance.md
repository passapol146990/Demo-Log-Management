# Appliance Deployment Guide

## Prerequisites
- Docker and Docker Compose installed on the host machine
- At least 4GB RAM available for OpenSearch

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/passapol146990/Demo-Log-Management.git
cd Demo-Log-Management
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your JWT_SECRET and other variables
```

### 3. Start All Services
```bash
# Option 1: Using make
make up

# Option 2: Using docker compose
docker compose up -d
```

### 4. Verify All Services
```bash
# Check service status
docker compose ps

# View logs
make logs

# Or check manually
curl http://localhost:3000
curl http://localhost:9200
```

### 5. Seed Initial Data
```bash
make seed
```

### 6. Run Tests
```bash
make test
```

### 7. Access the Application
- **Frontend**: http://localhost:3000
- **OpenSearch**: http://localhost:9200
- **OpenSearch Dashboards**: http://localhost:5601 (browse/query raw index data — see below)
- **Syslog**: udp://localhost:514

### OpenSearch Dashboards (optional data browser)
`opensearch-dashboards` is a UI on top of OpenSearch for exploring the raw `logs` index directly —
useful for debugging ingestion/mapping without writing `curl`/DevTools queries by hand. It ships in
the same `docker compose` stack and starts automatically with `make up` / `docker compose up -d`.

1. Open http://localhost:5601
2. Go to **Stack Management → Index Patterns** (or **Discover** will prompt you) and create an index
   pattern matching `logs*`, using `@timestamp` as the time field
3. Go to **Discover** to browse/filter/search raw documents, or **Dev Tools** to run queries directly
   against `http://opensearch:9200` (e.g. `GET logs/_search`)

Security plugin is disabled for this demo stack (`plugins.security.disabled=true`,
`DISABLE_SECURITY_DASHBOARDS_PLUGIN=true`), matching the same setup as the `opensearch` service —
this is a local/demo-only configuration.

### Login Credentials
- admin@demoA / password123 (admin role, demoA tenant)
- viewer@demoA / password123 (viewer role, demoA tenant)
- admin@demoB / password123 (admin role, demoB tenant)
- viewer@demoB / password123 (viewer role, demoB tenant)

### Stop Services
```bash
make down
```

### Clean Everything
```bash
make clean
```

## Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Backend   │────▶│ OpenSearch  │
│  (Browser)  │     │  (Next.js)  │     │  (Storage)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │              ┌────▼────┐              │
       │              │  Vector │              │
       │              │ (Syslog)│              │
       │              └────┬────┘              │
       │                 │                   │
       │                 ▼                   │
       │            Syslog UDP/TCP           │
       │            port 514               │
       │                                   │
       └────── Alert Worker ◀──────────────┘
                 (cron every 60s)
```
