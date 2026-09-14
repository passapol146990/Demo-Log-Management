# Data Retention Policy

## Overview
Log data is automatically cleaned up based on age to maintain system performance and storage efficiency.

## Configuration
- **Retention Period**: 7 days (configurable via `LOG_RETENTION_DAYS` env variable)
- **Cleanup Method**: OpenSearch deleteByQuery
- **Schedule**: Runs automatically on `worker` service start, then every 24 hours

## Implementation
The `deleteOldLogs` function in `/backend/src/lib/opensearch.ts` removes logs older than the configured threshold. It is scheduled by `/backend/workers/retentionWorker.ts`, which runs inside the `worker` container (loaded via `/backend/workers/index.ts` alongside `alertChecker.ts`):

```typescript
await deleteOldLogs(Number(process.env.LOG_RETENTION_DAYS) || 7);
```

Check `docker logs <worker-container>` to confirm the cleanup ran — it logs `Retention worker started` on boot and `Retention: deleted logs older than N days` after each cleanup.

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
