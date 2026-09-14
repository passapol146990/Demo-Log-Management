const mockCatIndices = jest.fn();

jest.mock("@opensearch-project/opensearch", () => ({
  Client: jest.fn().mockImplementation(() => ({
    cat: {
      indices: mockCatIndices,
    },
  })),
}));

import { listTenants } from "@/lib/tenants";

describe("listTenants", () => {
  beforeEach(() => {
    mockCatIndices.mockReset();
  });

  test("extracts tenant names from logs-<tenant> index names", async () => {
    mockCatIndices.mockResolvedValue({
      body: [{ index: "logs-demoa" }, { index: "logs-demob" }],
    });
    const result = await listTenants();
    expect(result.sort()).toEqual(["demoa", "demob"]);
  });

  test("deduplicates tenant names", async () => {
    mockCatIndices.mockResolvedValue({
      body: [{ index: "logs-demoa" }, { index: "logs-demoa" }],
    });
    const result = await listTenants();
    expect(result).toEqual(["demoa"]);
  });

  test("ignores index names that do not match the logs-<tenant> pattern", async () => {
    mockCatIndices.mockResolvedValue({
      body: [{ index: "alerts-demoa" }, { index: "logs-demoa" }],
    });
    const result = await listTenants();
    expect(result).toEqual(["demoa"]);
  });

  test("falls back to default tenants when no logs-* indices exist yet", async () => {
    mockCatIndices.mockResolvedValue({ body: [] });
    const result = await listTenants();
    expect(result.sort()).toEqual(["demoa", "demob"]);
  });

  test("falls back to default tenants on error", async () => {
    mockCatIndices.mockRejectedValue(new Error("index_not_found_exception"));
    const result = await listTenants();
    expect(result).toEqual(["demoa", "demob"]);
  });
});
