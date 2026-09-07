import { indexLog } from "@/lib/opensearch";

describe("OpenSearch", () => {
  test("indexLog handles connection gracefully when OpenSearch unavailable", async () => {
    const log = {
      "@timestamp": new Date().toISOString(),
      tenant: "demoA",
      source: "api",
      severity: 3,
      action: "GET",
      raw: "test",
    };
    await expect(indexLog(log)).rejects.toBeDefined();
  });
});
