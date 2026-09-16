import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deleteAllLogsAndAlerts } from "@/lib/opensearch";
import { cacheDeleteByPrefix } from "@/lib/cache";

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  const result = await deleteAllLogsAndAlerts();
  await cacheDeleteByPrefix("search:");
  await cacheDeleteByPrefix("alerts:");
  return NextResponse.json({ success: true, ...result });
}
