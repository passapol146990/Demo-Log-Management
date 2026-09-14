import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAlertHistory, getPersistedAlerts } from "@/lib/alerting";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const persisted = await getPersistedAlerts(auth.user.tenant);
  const history = persisted.length > 0 ? persisted : getAlertHistory();
  return NextResponse.json({ alerts: history });
}
