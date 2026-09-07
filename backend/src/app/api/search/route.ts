import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { searchLogs } from "@/lib/opensearch";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const source = searchParams.get("source") || undefined;

  const results = await searchLogs({
    query: keyword || "",
    tenant: payload.tenant,
    from,
    to,
    source,
  });

  return NextResponse.json({ hits: results.body.hits.hits, total: results.body.hits.total });
}
