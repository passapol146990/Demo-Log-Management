const ruleStore = new Map<string, Record<string, unknown>>();
const mockAlertsIndex = jest.fn();

jest.mock("@opensearch-project/opensearch", () => ({
  Client: jest.fn().mockImplementation(() => ({
    indices: {
      exists: jest.fn().mockResolvedValue({ body: true }),
      create: jest.fn().mockResolvedValue({ body: {} }),
    },
    count: jest.fn().mockImplementation(async () => ({ body: { count: ruleStore.size } })),
    get: jest.fn(),
    search: jest.fn().mockImplementation(async () => ({
      body: { hits: { hits: Array.from(ruleStore.values()).map((_source) => ({ _source })) } },
    })),
    index: jest.fn().mockImplementation(async ({ index, id, body }: { index: string; id: string; body: Record<string, unknown> }) => {
      if (index === "alert_rules") ruleStore.set(id, body);
      else mockAlertsIndex({ index, id, body });
      return { body: {} };
    }),
    delete: jest.fn(),
  })),
}));

const mockFindRuleGroups = jest.fn();
jest.mock("@/lib/ruleAggregation", () => ({
  findRuleGroups: (...args: unknown[]) => mockFindRuleGroups(...args),
}));

const mockShouldEmit = jest.fn();
jest.mock("@/lib/alertDedup", () => ({
  shouldEmit: (...args: unknown[]) => mockShouldEmit(...args),
}));

jest.mock("@/lib/webhookDispatch", () => ({
  dispatchWebhook: jest.fn().mockResolvedValue(undefined),
}));

import { getAlertHistory, getAlertRules, evaluateRule, evaluateAllRules } from "@/lib/alerting";
import { AlertRule } from "@/lib/alertRules";

describe("Alerting", () => {
  beforeEach(() => {
    ruleStore.clear();
    mockAlertsIndex.mockClear();
    mockFindRuleGroups.mockReset();
    mockShouldEmit.mockReset();
    mockShouldEmit.mockResolvedValue(true);
    delete process.env.WEBHOOK_URL;
  });

  test("alerting returns an array for history", () => {
    const history = getAlertHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  test("default alert rules are seeded and Login Failures is enabled", async () => {
    const rules = await getAlertRules();
    expect(rules.length).toBeGreaterThan(0);
    const loginRule = rules.find((r) => r.name === "Login Failures");
    expect(loginRule).toBeDefined();
    expect(loginRule!.enabled).toBe(true);
  });

  const loginFailureRule: AlertRule = {
    id: "test-rule",
    name: "Test Login Failures",
    description: "test rule",
    enabled: true,
    match_field: "event_subtype",
    match_value: "login_failure",
    group_by: "src_ip",
    threshold: 5,
    window_minutes: 5,
    cooldown_minutes: 5,
    severity: 8,
  };

  test("evaluateRule triggers when aggregation returns a group at threshold", async () => {
    mockFindRuleGroups.mockResolvedValue([{ group: "10.0.0.1", count: 5 }]);
    const triggered = await evaluateRule(loginFailureRule, "demoA");
    expect(triggered.length).toBe(1);
    expect(triggered[0].rule_id).toBe("test-rule");
    expect(triggered[0].tenant).toBe("demoA");
    expect(triggered[0].severity).toBe(8);
    expect(mockAlertsIndex).toHaveBeenCalledTimes(1);
  });

  test("evaluateRule passes rule criteria and tenant to the aggregation", async () => {
    mockFindRuleGroups.mockResolvedValue([]);
    await evaluateRule(loginFailureRule, "demoB");
    expect(mockFindRuleGroups).toHaveBeenCalledWith({
      tenant: "demoB",
      matchField: "event_subtype",
      matchValue: "login_failure",
      groupBy: "src_ip",
      windowMinutes: 5,
      threshold: 5,
    });
  });

  test("evaluateRule does not trigger when no group reaches threshold", async () => {
    mockFindRuleGroups.mockResolvedValue([]);
    const triggered = await evaluateRule(loginFailureRule, "demoA");
    expect(triggered.length).toBe(0);
    expect(mockAlertsIndex).not.toHaveBeenCalled();
  });

  test("evaluateRule suppresses an alert when dedup rejects it", async () => {
    mockFindRuleGroups.mockResolvedValue([{ group: "10.0.0.9", count: 6 }]);
    mockShouldEmit.mockResolvedValue(false);
    const triggered = await evaluateRule(loginFailureRule, "demoA");
    expect(triggered.length).toBe(0);
    expect(mockAlertsIndex).not.toHaveBeenCalled();
  });

  test("evaluateAllRules skips disabled rules", async () => {
    mockFindRuleGroups.mockResolvedValue([{ group: "x", count: 99 }]);
    const triggered = await evaluateAllRules("demoA");
    const ruleNames = triggered.map((a) => a.rule_name);
    expect(ruleNames).not.toContain("CrowdStrike Threat Burst");
  });
});
