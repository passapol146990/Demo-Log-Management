import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { WorkerConfig, saveWorkerConfig, getWorkerConfig } from "@/lib/workerConfig";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ["admin", "viewer"]);
  if (auth instanceof Response) return auth;

  const cfg = getWorkerConfig();
  return NextResponse.json(cfg);
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const interval = Number(body.alertCheckIntervalMs);

    if (!Number.isInteger(interval) || interval < 1000 || interval > 3600000) {
      return NextResponse.json(
        { error: "alertCheckIntervalMs must be an integer between 1000 and 3600000" },
        { status: 400 }
      );
    }

    const cfg: WorkerConfig = { alertCheckIntervalMs: interval };
    saveWorkerConfig(cfg);

    return NextResponse.json(cfg);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}