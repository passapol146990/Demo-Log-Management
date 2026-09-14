import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ingestSchema } from "@/lib/ingest-schema";
import { ZodError } from "zod";
import { normalize, validateAndNormalizeBatch } from "@/lib/ingest-batch";
import { indexLog } from "@/lib/opensearch";

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const body = await request.json();
    const tenant = user.tenant;

    // Batch detection: { "logs": [...] } is processed as a file-batch, everything
    // else falls through to the existing single-object path unchanged.
    if (typeof body === "object" && body !== null && "logs" in body) {
      if (!Array.isArray(body.logs)) {
        return NextResponse.json({ error: "'logs' must be an array" }, { status: 400 });
      }
      const { total, results, normalizedLogs } = validateAndNormalizeBatch(body.logs, tenant);
      for (const { log } of normalizedLogs) {
        await indexLog(log);
      }
      const succeeded = normalizedLogs.length;
      return NextResponse.json({
        batch: true,
        total,
        succeeded,
        failed: total - succeeded,
        results,
      }, { status: 200 });
    }

    const parsed = ingestSchema.parse(body);
    const data = { ...parsed, tenant };
    const result = normalize(parsed.source, data, JSON.stringify(body));
    await indexLog(result);
    return NextResponse.json({ normalized: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
