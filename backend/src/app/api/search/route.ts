import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { searchLogs } from "@/lib/opensearch";
import { getHiddenFields, stripFields } from "@/lib/fieldPermissions";
import { cacheGet, cacheSet } from "@/lib/cache";

const CACHE_TTL_SECONDS = Number(process.env.SEARCH_CACHE_TTL_SECONDS) || 4;

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;
  const { user: payload } = auth;

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const source = searchParams.get("source") || undefined;
  const user = searchParams.get("user") || undefined;
  const src_ip = searchParams.get("src_ip") || undefined;
  const severityParam = searchParams.get("severity_min");
  const severity_min = severityParam ? Number(severityParam) : undefined;
  const sizeParam = searchParams.get("size");
  const size = sizeParam ? Number(sizeParam) : undefined;
  const pageParam = searchParams.get("page");
  const page = pageParam ? Number(pageParam) : 0;

  const effectiveSize = size !== undefined && !Number.isNaN(size) ? size : 20;

  const cacheKey = `search:${payload.tenant}:${payload.role}:${keyword ?? ""}:${from ?? ""}:${to ?? ""}:${source ?? ""}:${user ?? ""}:${src_ip ?? ""}:${severity_min ?? ""}:${effectiveSize}:${page}`;
  const cached = await cacheGet<{ hits: unknown[]; total: unknown }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  const results = await searchLogs({
    query: keyword || "",
    tenant: payload.tenant,
    from,
    to,
    source,
    user,
    src_ip,
    ...(severity_min !== undefined && !Number.isNaN(severity_min) ? { severity_min } : {}),
    size: effectiveSize,
    from_offset: page * effectiveSize,
  });

  const hiddenFields = getHiddenFields(payload.role, payload.tenant);
  const filteredHits = results.body.hits.hits.map((hit: { _source: Record<string, unknown> }) => ({
    ...hit,
    _source: stripFields(hit._source, hiddenFields),
  }));

  const responseBody = { hits: filteredHits, total: results.body.hits.total };
  await cacheSet(cacheKey, responseBody, CACHE_TTL_SECONDS);
  return NextResponse.json(responseBody, { headers: { "X-Cache": "MISS" } });
}
