# Architecture Documentation

## System Overview
Log Management Demo is a full-stack application for collecting, normalizing, storing, and analyzing log data from multiple sources.

## Technology Stack
- **Frontend + Backend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Log Collector**: Vector (syslog ingestion)
- **Storage/Search**: OpenSearch
- **Authentication**: JWT (via jose/jsonwebtoken), bcrypt
- **Validation**: Zod
- **Charts**: Recharts
- **Deployment**: Docker Compose

## Components

### Backend API (`/backend/src/app/api/`)
- `api/auth/login` - User authentication, returns JWT
- `api/auth/me` - Verify current user/token
- `api/auth/logout` - Clear session
- `api/ingest` - Accept and normalize logs from all sources
- `api/search` - Search logs with tenant isolation
- `api/alerts` - View alert history

### Source Normalizers (`/backend/src/lib/normalizers/`)
- `firewall.ts` - Firewall/syslog normalization
- `api.ts` - HTTP API log normalization
- `crowdstrike.ts` - CrowdStrike Falcon normalization
- `aws.ts` - AWS CloudTrail normalization
- `m365.ts` - Microsoft 365 Defender normalization
- `ad.ts` - Active Directory normalization
- `network.ts` - Generic network/syslog normalization

### Syslog Parser (`/backend/src/lib/syslog.ts`)
- Parses RFC 5424 format syslog messages
- Extracts key=value pairs from syslog messages
- Converts to normalized log format

### OpenSearch Client (`/backend/src/lib/opensearch.ts`)
- Index management with schema mapping
- Log indexing with tenant field
- Search with tenant filtering
- Data retention via deleteByQuery

### Alerting System (`/backend/src/lib/alerting.ts`, `/backend/workers/alertChecker.ts`)
- Configurable alert rules
- Background worker checks every 60s
- Webhook notifications

### Authentication (`/backend/src/lib/auth.ts`)
- JWT token generation and verification
- bcrypt password hashing
- RBAC (admin/viewer roles)
- Tenant-based authorization

## Data Flow
1. **Syslog**: Firewall → Vector (UDP 514) → Backend `/api/ingest` → OpenSearch
2. **HTTP API**: Client → Backend `/api/ingest` → Normalizer → OpenSearch
3. **Search**: Client → Backend `/api/search` → OpenSearch query → Tenant filter → Response
4. **Alerting**: Worker → OpenSearch query → Rule check → Webhook → Alert index

## Security
- All log searches enforce tenant isolation from JWT
- Tenant field cannot be overridden by client query parameters
- JWT tokens stored as httpOnly cookies
- Role-based access control on all endpoints

## Deployment Modes
- **Appliance**: `docker compose up -d` (single machine)
- **SaaS**: Deploy to cloud VM with reverse proxy (Caddy), external syslog
