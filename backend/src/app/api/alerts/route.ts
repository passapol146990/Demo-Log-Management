import { NextRequest, NextResponse } from "next/server";
import { getAlertHistory } from "@/lib/alerting";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { getAlertHistory } = await import("@/lib/alerting");
  const history = getAlertHistory();
  return NextResponse.json({ alerts: history });
}
