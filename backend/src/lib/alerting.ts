import { client } from "./opensearch";
import { AlertRule } from "./alertRules";
import { getAllRules, getEnabledRules } from "./alertRulesStore";
import { findRuleGroups } from "./ruleAggregation";
import { shouldEmit } from "./alertDedup";
import { dispatchWebhook } from "./webhookDispatch";
import { AlertEvent } from "./types/alert";
import { cacheDeleteByPrefix } from "./cache";

export const ALERT_CHECK_INTERVAL_MS = Number(process.env.ALERT_CHECK_INTERVAL_MS) || 10000;

function alertIndexName(tenant: string): string {
  return `alerts-${tenant.toLowerCase()}`;
}

async function ensureAlertsIndex(tenant: string): Promise<void> {
  const indexName = alertIndexName(tenant);
  const exists = await client.indices.exists({ index: indexName });
  if (!exists.body) {
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            id: { type: "keyword" },
            rule_id: { type: "keyword" },
            rule_name: { type: "keyword" },
            triggered_at: { type: "date" },
            description: { type: "text" },
            severity: { type: "integer" },
            tenant: { type: "keyword" },
          },
        },
      },
    });
  }
}

async function persistAlert(alert: AlertEvent): Promise<void> {
  await ensureAlertsIndex(alert.tenant);
  await client.index({ index: alertIndexName(alert.tenant), id: alert.id, body: alert });
}

const alertHistory: AlertEvent[] = [];

export async function getAlertRules(): Promise<AlertRule[]> {
  return getAllRules();
}

export function getAlertHistory(): AlertEvent[] {
  return alertHistory;
}

export async function getPersistedAlerts(tenant?: string): Promise<AlertEvent[]> {
  try {
    const normalizedTenant = tenant?.toLowerCase();
    const indexPattern = normalizedTenant ? alertIndexName(normalizedTenant) : "alerts-*";
    const exists = await client.indices.exists({ index: indexPattern });
    if (!exists.body) return [];
    const result = await client.search({
      index: indexPattern,
      body: {
        size: 100,
        sort: [{ triggered_at: { order: "desc" } }],
        query: normalizedTenant
          ? {
              bool: {
                should: [
                  { term: { tenant: normalizedTenant } },
                  { term: { "tenant.keyword": normalizedTenant } },
                ],
                minimum_should_match: 1,
              },
            }
          : { match_all: {} },
      },
    });
    return result.body.hits.hits.map((hit: { _source: AlertEvent }) => hit._source);
  } catch {
    return [];
  }
}

export async function evaluateRule(rule: AlertRule, tenant: string): Promise<AlertEvent[]> {
  const groups = await findRuleGroups({
    tenant,
    matchField: rule.match_field,
    matchValue: rule.match_value,
    groupBy: rule.group_by,
    windowMinutes: rule.window_minutes,
    threshold: rule.threshold,
  });

  const cooldownMs = rule.cooldown_minutes != null
    ? rule.cooldown_minutes * 60000
    : Math.max(rule.window_minutes * 60000, ALERT_CHECK_INTERVAL_MS);
  const triggered: AlertEvent[] = [];

  for (const { group, count } of groups) {
    const emit = await shouldEmit(
      { tenant, ruleId: rule.id, groupValue: group },
      cooldownMs
    );
    if (!emit) continue;

    const alert: AlertEvent = {
      id: `alert-${Date.now()}-${rule.id}-${group}`,
      rule_id: rule.id,
      rule_name: rule.name,
      triggered_at: new Date().toISOString(),
      description: `${rule.description} — ${rule.group_by}=${group} reached ${count}/${rule.threshold} within ${rule.window_minutes}m`,
      severity: rule.severity,
      tenant,
    };
    alertHistory.push(alert);
    await persistAlert(alert);
    await cacheDeleteByPrefix(`alerts:${tenant.toLowerCase()}`);
    await dispatchWebhook(alert, rule.webhook_url);
    triggered.push(alert);
  }

  return triggered;
}

export async function evaluateAllRules(tenant: string): Promise<AlertEvent[]> {
  const rules = await getEnabledRules();
  const triggered: AlertEvent[] = [];
  for (const rule of rules) {
    triggered.push(...(await evaluateRule(rule, tenant)));
  }
  return triggered;
}

export { alertHistory };
export type { AlertRule };
