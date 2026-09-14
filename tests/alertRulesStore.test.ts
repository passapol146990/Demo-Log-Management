const store = new Map<string, Record<string, unknown>>();

jest.mock("@opensearch-project/opensearch", () => ({
  Client: jest.fn().mockImplementation(() => ({
    indices: {
      exists: jest.fn().mockResolvedValue({ body: true }),
      create: jest.fn().mockResolvedValue({ body: {} }),
    },
    count: jest.fn().mockImplementation(async () => ({ body: { count: store.size } })),
    get: jest.fn().mockImplementation(async ({ id }: { id: string }) => {
      if (!store.has(id)) throw new Error("not found");
      return { body: { _source: store.get(id) } };
    }),
    index: jest.fn().mockImplementation(async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      store.set(id, body);
      return { body: {} };
    }),
    delete: jest.fn().mockImplementation(async ({ id }: { id: string }) => {
      store.delete(id);
      return { body: {} };
    }),
    search: jest.fn().mockImplementation(async () => ({
      body: { hits: { hits: Array.from(store.values()).map((_source) => ({ _source })) } },
    })),
  })),
}));

import { getAllRules, getEnabledRules, createRule, updateRule, deleteRule, AlertRuleError } from "@/lib/alertRulesStore";
import { AlertRuleInput } from "@/lib/alertRulesStore";

const sampleRule: AlertRuleInput = {
  name: "Custom Rule",
  description: "custom test rule",
  enabled: true,
  match_field: "source",
  match_value: "aws",
  group_by: "user",
  threshold: 3,
  window_minutes: 10,
  severity: 7,
};

describe("Alert Rules Store", () => {
  beforeEach(() => {
    store.clear();
  });

  test("seeds default rules on first access", async () => {
    const rules = await getAllRules();
    expect(rules.length).toBe(2);
    expect(rules.some((r) => r.name === "Login Failures")).toBe(true);
  });

  test("createRule adds a new rule with a generated id", async () => {
    const rule = await createRule(sampleRule);
    expect(rule.id).toBeDefined();
    expect(rule.name).toBe("Custom Rule");
    const all = await getAllRules();
    expect(all.some((r) => r.id === rule.id)).toBe(true);
  });

  test("getEnabledRules only returns enabled rules", async () => {
    await createRule({ ...sampleRule, enabled: false, name: "Disabled Rule" });
    const enabled = await getEnabledRules();
    expect(enabled.every((r) => r.enabled)).toBe(true);
    expect(enabled.some((r) => r.name === "Disabled Rule")).toBe(false);
  });

  test("updateRule patches fields and preserves id", async () => {
    const rule = await createRule(sampleRule);
    const updated = await updateRule(rule.id, { threshold: 10, enabled: false });
    expect(updated.id).toBe(rule.id);
    expect(updated.threshold).toBe(10);
    expect(updated.enabled).toBe(false);
    expect(updated.name).toBe("Custom Rule");
  });

  test("updateRule throws for unknown id", async () => {
    await expect(updateRule("does-not-exist", { threshold: 1 })).rejects.toThrow(AlertRuleError);
  });

  test("deleteRule removes the rule", async () => {
    const rule = await createRule(sampleRule);
    await deleteRule(rule.id);
    const all = await getAllRules();
    expect(all.some((r) => r.id === rule.id)).toBe(false);
  });

  test("deleteRule throws for unknown id", async () => {
    await expect(deleteRule("does-not-exist")).rejects.toThrow(AlertRuleError);
  });
});
