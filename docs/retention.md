# Data Retention Policy

## Overview
Log data is automatically cleaned up based on age to maintain system performance and storage efficiency.

## Configuration
- **Retention Period**: 7 days (configurable via `RETENTION_DAYS` env variable)
- **Cleanup Method**: OpenSearch deleteByQuery
- **Schedule**: Runs automatically when the worker starts and on a cron basis

## Implementation
The `deleteOldLogs` function in `/backend/src/lib/opensearch.ts` removes logs older than the configured threshold:

```typescript
await deleteOldLogs(7); // Delete logs older than 7 days
```

## Manual Cleanup
```bash
# Run cleanup manually in the backend container
docker compose exec backend node -e "require('./src/lib/opensearch').deleteOldLogs(7)"
```

## Index Rollover
For high-volume environments, consider configuring OpenSearch Index State Management (ISM):
- Create rollover policy at 50GB or 7 days
- Delete indices after 7 days
- Configure in `/docs/ism_policy.json`

## Storage Estimation
| Logs/Day | Storage/Month |
|----------|---------------|
| 1,000 | ~50MB |
| 10,000 | ~500MB |
| 100,000 | ~5GB |
| 1,000,000 | ~50GB |

## Notes
- OpenSearch single-node deployment is suitable for demo/small-scale
- For production, configure dedicated OpenSearch cluster with appropriate storage
- Backups should be taken before retention cleanup
