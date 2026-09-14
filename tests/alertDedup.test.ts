const store = new Map<string, Record<string, unknown>>();

jest.mock("@opensearch-project/opensearch", () => ({
  Client: jest.fn().mockImplementation(() => ({
    indices: {
      exists: jest.fn().mockResolvedValue({ body: true }),
      create: jest.fn().mockResolvedValue({ body: {} }),
    },
    get: jest.fn().mockImplementation(async ({ id }: { id: string }) => {
      if (!store.has(id)) {
        const err = new Error("not found") as Error & { meta?: { statusCode: number } };
        err.meta = { statusCode: 404 };
        throw err;
      }
      return { body: { _source: store.get(id) } };
    }),
    index: jest.fn().mockImplementation(async ({ id, body, refresh }: { id: string; body: Record<string, unknown>; refresh?: boolean }) => {
      store.set(id, body);
      return { body: {} };
    }),
  })),
}));

import { shouldEmit } from "@/lib/alertDedup";

describe("alertDedup", () => {
  beforeEach(() => {
    store.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const key = { tenant: "demoA", ruleId: "rule-1", groupValue: "10.0.0.1" };
  const docId = "demoA:rule-1:10.0.0.1";

  test("first call returns true and writes state document", async () => {
    const result = await shouldEmit(key, 60);
    expect(result).toBe(true);
    expect(store.has(docId)).toBe(true);
    expect(store.get(docId)).toMatchObject({
      tenant: "demoA",
      rule_id: "rule-1",
      group_value: "10.0.0.1",
      last_triggered_at: "2026-01-15T12:00:00.000Z",
    });
  });

  test("immediate second call returns false within cooldown", async () => {
    await shouldEmit(key, 60);
    const result = await shouldEmit(key, 60);
    expect(result).toBe(false);
    expect(store.get(docId)).toMatchObject({
      last_triggered_at: "2026-01-15T12:00:00.000Z",
    });
  });

  test("call after cooldown returns true and refreshes timestamp", async () => {
    await shouldEmit(key, 60);
    jest.setSystemTime(new Date("2026-01-15T13:01:00.000Z"));
    const result = await shouldEmit(key, 60);
    expect(result).toBe(true);
    expect(store.get(docId)).toMatchObject({
      last_triggered_at: "2026-01-15T13:01:00.000Z",
    });
  });

  test("missing document (404) treated as never triggered", async () => {
    const result = await shouldEmit(key, 60);
    expect(result).toBe(true);
    expect(store.has(docId)).toBe(true);
  });

  test("different keys are independent", async () => {
    await shouldEmit(key, 60);
    const otherKey = { tenant: "demoA", ruleId: "rule-1", groupValue: "10.0.0.2" };
    const result = await shouldEmit(otherKey, 60);
    expect(result).toBe(true);
    expect(store.has("demoA:rule-1:10.0.0.2")).toBe(true);
    expect(store.has(docId)).toBe(true);
  });
});
