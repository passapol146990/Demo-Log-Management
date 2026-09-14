import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { searchLogs } from "@/lib/opensearch";
import { getHiddenFields, stripFields } from "@/lib/fieldPermissions";

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

  return NextResponse.json({ hits: filteredHits, total: results.body.hits.total });
}
