let mockSearch = jest.fn();

jest.mock("@opensearch-project/opensearch", () => ({
  Client: jest.fn().mockImplementation(() => ({
    search: mockSearch,
  })),
}));

import { findRuleGroups } from "@/lib/ruleAggregation";

describe("findRuleGroups", () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  test("returns empty array when buckets are missing", async () => {
    mockSearch.mockResolvedValue({ body: {} });
    const result = await findRuleGroups({
      tenant: "demoA",
      matchField: "event_subtype",
      matchValue: "login_failure",
      groupBy: "src_ip",
      windowMinutes: 5,
      threshold: 3,
    });
    expect(result).toEqual([]);
  });

  test("returns empty array when aggregations are missing", async () => {
    mockSearch.mockResolvedValue({ body: { aggregations: {} } });
    const result = await findRuleGroups({
      tenant: "demoA",
      matchField: "event_subtype",
      matchValue: "login_failure",
      groupBy: "src_ip",
      windowMinutes: 5,
      threshold: 3,
    });
    expect(result).toEqual([]);
  });

  test("maps buckets to RuleGroupCount", async () => {
    mockSearch.mockResolvedValue({
      body: {
        aggregations: {
          groups: {
            buckets: [
              { key: "10.0.0.1", doc_count: 5 },
              { key: "10.0.0.2", doc_count: 3 },
            ],
          },
        },
      },
    });
    const result = await findRuleGroups({
      tenant: "demoA",
      matchField: "event_subtype",
      matchValue: "login_failure",
      groupBy: "src_ip",
      windowMinutes: 5,
      threshold: 3,
    });
    expect(result).toEqual([
      { group: "10.0.0.1", count: 5 },
      { group: "10.0.0.2", count: 3 },
    ]);
  });

  test("search body uses size 0", async () => {
    mockSearch.mockResolvedValue({ body: { aggregations: { groups: { buckets: [] } } } });
    await findRuleGroups({
      tenant: "demoA",
      matchField: "event_subtype",
      matchValue: "login_failure",
      groupBy: "src_ip",
      windowMinutes: 5,
      threshold: 3,
    });
    expect(mockSearch).toHaveBeenCalledTimes(1);
    const body = mockSearch.mock.calls[0][0].body;
    expect(body.size).toBe(0);
  });

  test("terms aggregation uses correct field and min_doc_count", async () => {
    mockSearch.mockResolvedValue({ body: { aggregations: { groups: { buckets: [] } } } });
    await findRuleGroups({
      tenant: "demoA",
      matchField: "event_subtype",
      matchValue: "login_failure",
      groupBy: "src_ip",
      windowMinutes: 10,
      threshold: 7,
    });
    const body = mockSearch.mock.calls[0][0].body;
    expect(body.aggs.groups.terms.field).toBe("src_ip");
    expect(body.aggs.groups.terms.min_doc_count).toBe(7);
    expect(body.aggs.groups.terms.size).toBe(100);
  });

  test("range gte is computed from windowMinutes", async () => {
    mockSearch.mockResolvedValue({ body: { aggregations: { groups: { buckets: [] } } } });
    const before = Date.now();
    await findRuleGroups({
      tenant: "demoA",
      matchField: "event_subtype",
      matchValue: "login_failure",
      groupBy: "src_ip",
      windowMinutes: 5,
      threshold: 3,
    });
    const after = Date.now();
    const body = mockSearch.mock.calls[0][0].body;
    const filterClauses = body.query.bool.filter;
    const rangeClause = filterClauses.find((c: Record<string, unknown>) => c.range);
    const gteStr = rangeClause.range["@timestamp"].gte;
    const gteMs = new Date(gteStr).getTime();
    expect(gteMs).toBeGreaterThanOrEqual(before - 5 * 60000 - 1000);
    expect(gteMs).toBeLessThanOrEqual(after - 5 * 60000 + 1000);
  });

  test("targets the tenant-specific index and includes the match clause", async () => {
    mockSearch.mockResolvedValue({ body: { aggregations: { groups: { buckets: [] } } } });
    await findRuleGroups({
      tenant: "prod",
      matchField: "action",
      matchValue: "block",
      groupBy: "host",
      windowMinutes: 15,
      threshold: 10,
    });
    const { index, body } = mockSearch.mock.calls[0][0];
    expect(index).toBe("logs-prod");
    const filterClauses = body.query.bool.filter;
    expect(filterClauses).toContainEqual({ term: { action: "block" } });
  });
});
