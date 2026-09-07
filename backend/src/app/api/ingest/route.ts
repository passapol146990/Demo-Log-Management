import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { ingestSchema } from "@/lib/ingest-schema";
import { ZodError } from "zod";
import { normalizeApi } from "@/lib/normalizers/api";
import { normalizeCrowdStrike } from "@/lib/normalizers/crowdstrike";
import { normalizeAWS } from "@/lib/normalizers/aws";
import { normalizeM365 } from "@/lib/normalizers/m365";
import { normalizeAD } from "@/lib/normalizers/ad";
import { normalizeNetwork } from "@/lib/normalizers/network";
import { normalizeFirewall } from "@/lib/normalizers/firewall";

function normalize(source: string, data: Record<string, unknown>, raw: string) {
  switch (source) {
    case "firewall": return normalizeFirewall(raw, data);
    case "api": return normalizeApi(data);
    case "crowdstrike": return normalizeCrowdStrike(data);
    case "aws": return normalizeAWS(data);
    case "m365": return normalizeM365(data);
    case "ad": return normalizeAD(data);
    case "network": return normalizeNetwork(raw, data);
    default: throw new Error(`Unknown source: ${source}`);
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = ingestSchema.parse(body);
    const tenant = payload.tenant;
    const data = { ...parsed, tenant };
    const result = normalize(parsed.source, data, JSON.stringify(body));
    return NextResponse.json({ normalized: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
