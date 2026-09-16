import { randomUUID } from "crypto";
import { client } from "./opensearch";
import { AlertRule, DEFAULT_ALERT_RULES } from "./alertRules";

const RULES_INDEX = "alert_rules";

async function ensureRulesIndex(): Promise<void> {
  const exists = await client.indices.exists({ index: RULES_INDEX });
  if (exists.body) return;
  await client.indices.create({
    index: RULES_INDEX,
    body: {
      mappings: {
        properties: {
          id: { type: "keyword" },
          name: { type: "keyword" },
          description: { type: "text" },
          enabled: { type: "boolean" },
          match_field: { type: "keyword" },
          match_value: { type: "keyword" },
          group_by: { type: "keyword" },
          threshold: { type: "integer" },
          window_minutes: { type: "integer" },
          cooldown_minutes: { type: "integer" },
          severity: { type: "integer" },
          webhook_url: { type: "keyword" },
        },
      },
    },
  });
}

let seeded = false;

export async function ensureRulesSeeded(): Promise<void> {
  if (seeded) return;
  await ensureRulesIndex();
  const count = await client.count({ index: RULES_INDEX });
  if ((count.body.count ?? 0) === 0) {
    for (const rule of DEFAULT_ALERT_RULES) {
      const id = randomUUID();
      await client.index({ index: RULES_INDEX, id, body: { ...rule, id }, refresh: true });
    }
  }
  seeded = true;
}

export async function getAllRules(): Promise<AlertRule[]> {
  await ensureRulesSeeded();
  const result = await client.search({
    index: RULES_INDEX,
    body: { size: 1000, sort: [{ name: { order: "asc" } }] },
  });
  return result.body.hits.hits.map((hit: { _source: AlertRule }) => hit._source);
}

export async function getEnabledRules(): Promise<AlertRule[]> {
  const rules = await getAllRules();
  return rules.filter((r) => r.enabled);
}

export class AlertRuleError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type AlertRuleInput = Omit<AlertRule, "id">;

function isSameCondition(a: Pick<AlertRule, "match_field" | "match_value" | "group_by">, b: Pick<AlertRule, "match_field" | "match_value" | "group_by">): boolean {
  return (
    a.match_field === b.match_field &&
    a.match_value.trim().toLowerCase() === b.match_value.trim().toLowerCase() &&
    a.group_by === b.group_by
  );
}

async function assertNoDuplicateCondition(
  candidate: Pick<AlertRule, "match_field" | "match_value" | "group_by">,
  excludeId?: string
): Promise<void> {
  const rules = await getAllRules();
  const conflict = rules.find((r) => r.id !== excludeId && isSameCondition(r, candidate));
  if (conflict) {
    throw new AlertRuleError(
      `A rule with this exact condition already exists: "${conflict.name}" (${conflict.enabled ? "enabled" : "disabled"}). Edit that rule instead of creating a duplicate.`,
      409
    );
  }
}

export async function createRule(input: AlertRuleInput): Promise<AlertRule> {
  await ensureRulesSeeded();
  await assertNoDuplicateCondition(input);
  const id = randomUUID();
  const rule: AlertRule = { ...input, id };
  await client.index({ index: RULES_INDEX, id, body: rule, refresh: true });
  return rule;
}

export async function updateRule(id: string, patch: Partial<AlertRuleInput>): Promise<AlertRule> {
  await ensureRulesSeeded();
  let existing: AlertRule;
  try {
    const result = await client.get({ index: RULES_INDEX, id });
    existing = result.body._source as AlertRule;
  } catch {
    throw new AlertRuleError("Rule not found", 404);
  }
  const updated: AlertRule = { ...existing, ...patch, id };
  if (patch.match_field || patch.match_value || patch.group_by) {
    await assertNoDuplicateCondition(updated, id);
  }
  await client.index({ index: RULES_INDEX, id, body: updated, refresh: true });
  return updated;
}

export async function deleteRule(id: string): Promise<void> {
  await ensureRulesSeeded();
  try {
    await client.get({ index: RULES_INDEX, id });
  } catch {
    throw new AlertRuleError("Rule not found", 404);
  }
  await client.delete({ index: RULES_INDEX, id, refresh: true });
}
