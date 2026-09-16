import { client } from "@/lib/opensearch";
import { FALLBACK_TENANTS } from "./fieldPermissions";

export async function listTenants(): Promise<string[]> {
  try {
    const indices = await client.cat.indices({ index: "logs-*", format: "json" });
    const body = (indices.body as Array<{ index?: string }>) || [];
    const unique = new Set<string>();
    for (const entry of body) {
      const indexName = entry.index ?? "";
      const match = /^logs-(.+)$/.exec(indexName);
      if (match && match[1]) unique.add(match[1]);
    }
    if (unique.size > 0) return Array.from(unique);
    for (const tenant of FALLBACK_TENANTS) unique.add(tenant.toLowerCase());
    return Array.from(unique);
  } catch {
    return ["demoa", "demob"];
  }
}
