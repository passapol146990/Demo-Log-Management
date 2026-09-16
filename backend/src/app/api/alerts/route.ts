import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAlertHistory, getPersistedAlerts } from "@/lib/alerting";
import { cacheGet, cacheSet } from "@/lib/cache";

const CACHE_TTL_SECONDS = Number(process.env.SEARCH_CACHE_TTL_SECONDS) || 4;

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const cacheKey = `alerts:${auth.user.tenant.toLowerCase()}`;
  const cached = await cacheGet<{ alerts: unknown[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  const persisted = await getPersistedAlerts(auth.user.tenant);
  const history = persisted.length > 0 ? persisted : getAlertHistory();
  const responseBody = { alerts: history };
  await cacheSet(cacheKey, responseBody, CACHE_TTL_SECONDS);
  return NextResponse.json(responseBody, { headers: { "X-Cache": "MISS" } });
}
