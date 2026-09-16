import { client } from "@/lib/opensearch";

function alertStateIndexName(tenant: string): string {
  return `alert_state-${tenant.toLowerCase()}`;
}

async function ensureIndex(tenant: string): Promise<void> {
  const indexName = alertStateIndexName(tenant);
  const exists = await client.indices.exists({ index: indexName });
  if (exists.body) return;
  await client.indices.create({
    index: indexName,
    body: {
      mappings: {
        properties: {
          tenant: { type: "keyword" },
          rule_id: { type: "keyword" },
          group_value: { type: "keyword" },
          last_triggered_at: { type: "date" },
        },
      },
    },
  });
}

export async function shouldEmit(
  key: { tenant: string; ruleId: string; groupValue: string },
  cooldownMs: number
): Promise<boolean> {
  const docId = `${key.tenant}:${key.ruleId}:${key.groupValue}`;
  const indexName = alertStateIndexName(key.tenant);

  try {
    await ensureIndex(key.tenant);

    try {
      const result = await client.get({ index: indexName, id: docId });
      const lastTriggeredAt = (result.body._source as { last_triggered_at?: string })?.last_triggered_at;
      if (lastTriggeredAt) {
        const elapsed = Date.now() - Date.parse(lastTriggeredAt);
        if (elapsed < cooldownMs) {
          return false;
        }
      }
    } catch {
    }

    await client.index({
      index: indexName,
      id: docId,
      body: {
        tenant: key.tenant,
        rule_id: key.ruleId,
        group_value: key.groupValue,
        last_triggered_at: new Date().toISOString(),
      },
      refresh: true,
    });

    return true;
  } catch {
    return true;
  }
}
