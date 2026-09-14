const mockIndicesExists = jest.fn();
const mockIndicesCreate = jest.fn();
const mockExistsIndexTemplate = jest.fn();
const mockPutIndexTemplate = jest.fn();
const mockIndex = jest.fn();
const mockSearch = jest.fn();
const mockDeleteByQuery = jest.fn();

jest.mock("@opensearch-project/opensearch", () => ({
  Client: jest.fn().mockImplementation(() => ({
    indices: {
      exists: mockIndicesExists,
      create: mockIndicesCreate,
      existsIndexTemplate: mockExistsIndexTemplate,
      putIndexTemplate: mockPutIndexTemplate,
    },
    index: mockIndex,
    search: mockSearch,
    deleteByQuery: mockDeleteByQuery,
  })),
}));

import { indexLog, searchLogs, deleteOldLogs, deleteAllLogsAndAlerts } from "@/lib/opensearch";

describe("OpenSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIndicesExists.mockResolvedValue({ body: true });
    mockExistsIndexTemplate.mockResolvedValue({ body: true });
    mockPutIndexTemplate.mockResolvedValue({ body: {} });
    mockIndex.mockResolvedValue({ body: {} });
    mockSearch.mockResolvedValue({ body: {} });
    mockDeleteByQuery.mockResolvedValue({ body: {} });
  });

  describe("indexLog", () => {
    test("indexes a log with @timestamp and tenant defaults into per-tenant index", async () => {
      await indexLog({ source: "api", severity: 3 });
      expect(mockIndex).toHaveBeenCalledTimes(1);
      const { index, body } = mockIndex.mock.calls[0][0];
      expect(index).toBe("logs-demoa");
      expect(body.tenant).toBe("demoA");
      expect(body["@timestamp"]).toEqual(expect.any(String));
    });

    test("preserves provided @timestamp and tenant, indexes into tenant-specific index", async () => {
      await indexLog({ "@timestamp": "2024-01-15T10:30:00.000Z", tenant: "demoB", source: "api" });
      const { index, body } = mockIndex.mock.calls[0][0];
      expect(index).toBe("logs-demob");
      expect(body.tenant).toBe("demoB");
      expect(body["@timestamp"]).toBe("2024-01-15T10:30:00.000Z");
    });

    test("removes empty src_ip and dst_ip", async () => {
      await indexLog({ source: "api", src_ip: "", dst_ip: "" });
      const { body } = mockIndex.mock.calls[0][0];
      expect(body.src_ip).toBeUndefined();
      expect(body.dst_ip).toBeUndefined();
    });

    test("keeps non-empty src_ip and dst_ip", async () => {
      await indexLog({ source: "api", src_ip: "10.0.0.1", dst_ip: "10.0.0.2" });
      const { body } = mockIndex.mock.calls[0][0];
      expect(body.src_ip).toBe("10.0.0.1");
      expect(body.dst_ip).toBe("10.0.0.2");
    });

    test("creates tenant index if it does not exist", async () => {
      mockIndicesExists.mockResolvedValue({ body: false });
      await indexLog({ source: "api" });
      expect(mockIndicesCreate).toHaveBeenCalledTimes(1);
      expect(mockIndicesCreate.mock.calls[0][0].index).toBe("logs-demoa");
    });

    test("creates index template if it does not exist", async () => {
      mockExistsIndexTemplate.mockResolvedValue({ body: false });
      await indexLog({ source: "api" });
      expect(mockPutIndexTemplate).toHaveBeenCalledTimes(1);
      expect(mockPutIndexTemplate.mock.calls[0][0].body.index_patterns).toEqual(["logs-*"]);
    });
  });

  describe("searchLogs", () => {
    test("always includes tenant filter and targets the tenant-specific index", async () => {
      await searchLogs({ query: "", tenant: "demoA" });
      const { index, body } = mockSearch.mock.calls[0][0];
      expect(index).toBe("logs-demoa");
      expect(body.query.bool.must).toContainEqual({ term: { tenant: "demoA" } });
    });

    test("includes multi_match clause when query provided, excluding the ip-typed src_ip field", async () => {
      await searchLogs({ query: "DROP", tenant: "demoA" });
      const { body } = mockSearch.mock.calls[0][0];
      expect(body.query.bool.must).toContainEqual({
        multi_match: {
          query: "DROP",
          fields: ["raw", "user", "host", "action", "rule_name", "url"],
        },
      });
    });

    test("includes source filter when source provided", async () => {
      await searchLogs({ query: "", tenant: "demoA", source: "firewall" });
      const { body } = mockSearch.mock.calls[0][0];
      expect(body.query.bool.must).toContainEqual({ term: { source: "firewall" } });
    });

    test("includes date range when from/to provided", async () => {
      await searchLogs({ query: "", tenant: "demoA", from: "2024-01-01", to: "2024-01-31" });
      const { body } = mockSearch.mock.calls[0][0];
      expect(body.query.bool.must).toContainEqual({
        range: { "@timestamp": { gte: "2024-01-01", lte: "2024-01-31" } },
      });
    });

    test("omits source filter and date range when not provided", async () => {
      await searchLogs({ query: "", tenant: "demoA" });
      const { body } = mockSearch.mock.calls[0][0];
      expect(body.query.bool.must).toEqual([{ term: { tenant: "demoA" } }]);
    });

    test("includes user wildcard filter when user provided", async () => {
      await searchLogs({ query: "", tenant: "demoA", user: "alice" });
      const { body } = mockSearch.mock.calls[0][0];
      expect(body.query.bool.must).toContainEqual({
        wildcard: { user: { value: "*alice*", case_insensitive: true } },
      });
    });

    test("includes src_ip wildcard filter against the keyword sub-field when src_ip provided", async () => {
      await searchLogs({ query: "", tenant: "demoA", src_ip: "203.0.113" });
      const { body } = mockSearch.mock.calls[0][0];
      expect(body.query.bool.must).toContainEqual({
        wildcard: { "src_ip.keyword": { value: "*203.0.113*" } },
      });
    });

    test("includes severity_min range filter when provided", async () => {
      await searchLogs({ query: "", tenant: "demoA", severity_min: 7 });
      const { body } = mockSearch.mock.calls[0][0];
      expect(body.query.bool.must).toContainEqual({ range: { severity: { gte: 7 } } });
    });

    test("respects from_offset for pagination", async () => {
      await searchLogs({ query: "", tenant: "demoA", size: 20, from_offset: 40 });
      const { body } = mockSearch.mock.calls[0][0];
      expect(body.size).toBe(20);
      expect(body.from).toBe(40);
    });
  });

  describe("deleteOldLogs", () => {
    test("calls deleteByQuery across all tenant indices with cutoff date based on given days", async () => {
      const days = 10;
      const before = new Date();
      before.setDate(before.getDate() - days);

      await deleteOldLogs(days);

      expect(mockDeleteByQuery).toHaveBeenCalledTimes(1);
      const { index, body } = mockDeleteByQuery.mock.calls[0][0];
      expect(index).toBe("logs-*");
      const cutoff = new Date(body.query.range["@timestamp"].lt);
      expect(Math.abs(cutoff.getTime() - before.getTime())).toBeLessThan(5000);
    });

    test("defaults to 7 days when not specified", async () => {
      const before = new Date();
      before.setDate(before.getDate() - 7);

      await deleteOldLogs();

      const { body } = mockDeleteByQuery.mock.calls[0][0];
      const cutoff = new Date(body.query.range["@timestamp"].lt);
      expect(Math.abs(cutoff.getTime() - before.getTime())).toBeLessThan(5000);
    });
  });

  describe("deleteAllLogsAndAlerts", () => {
    test("deletes from both logs-* and alerts-* index patterns when they exist", async () => {
      mockIndicesExists.mockResolvedValue({ body: true });
      mockDeleteByQuery.mockResolvedValue({ body: { deleted: 10 } });

      const result = await deleteAllLogsAndAlerts();

      expect(mockDeleteByQuery).toHaveBeenCalledTimes(2);
      const indices = mockDeleteByQuery.mock.calls.map((call) => call[0].index);
      expect(indices).toContain("logs-*");
      expect(indices).toContain("alerts-*");
      expect(result).toEqual({ logsDeleted: 10, alertsDeleted: 10 });
    });

    test("skips indices that do not exist", async () => {
      mockIndicesExists.mockResolvedValue({ body: false });

      const result = await deleteAllLogsAndAlerts();

      expect(mockDeleteByQuery).not.toHaveBeenCalled();
      expect(result).toEqual({ logsDeleted: 0, alertsDeleted: 0 });
    });

    test("uses match_all query to delete everything regardless of tenant", async () => {
      mockIndicesExists.mockResolvedValue({ body: true });
      mockDeleteByQuery.mockResolvedValue({ body: { deleted: 5 } });

      await deleteAllLogsAndAlerts();

      const { body } = mockDeleteByQuery.mock.calls[0][0];
      expect(body.query).toEqual({ match_all: {} });
    });
  });
});
