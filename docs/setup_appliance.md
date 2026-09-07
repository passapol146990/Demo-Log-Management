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
- **Syslog**: udp://localhost:514

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
