import { LogEntry } from "@/lib/types/log";

export function topByField(logs: LogEntry[], field: keyof LogEntry, limit = 10): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const value = log[field];
    if (value === undefined || value === null || value === "") continue;
    const key = String(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function timelineBuckets(logs: LogEntry[], bucketMinutes = 60): { time: string; count: number }[] {
  const bucketMs = bucketMinutes * 60 * 1000;
  const counts = new Map<number, number>();
  for (const log of logs) {
    const ts = new Date(log["@timestamp"]).getTime();
    if (Number.isNaN(ts)) continue;
    const bucket = Math.floor(ts / bucketMs) * bucketMs;
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({ time: new Date(bucket).toISOString(), count }));
}

export function severityDistribution(logs: LogEntry[]): { severity: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const key = String(log.severity);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => Number(a.severity) - Number(b.severity));
}
