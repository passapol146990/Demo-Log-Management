const store = new Map<string, Record<string, unknown>>();

jest.mock("@opensearch-project/opensearch", () => ({
  Client: jest.fn().mockImplementation(() => ({
    indices: {
      exists: jest.fn().mockResolvedValue({ body: true }),
      create: jest.fn().mockResolvedValue({ body: {} }),
    },
    count: jest.fn().mockImplementation(async () => ({ body: { count: store.size } })),
    get: jest.fn().mockImplementation(async ({ id }: { id: string }) => {
      if (!store.has(id)) {
        const err = new Error("not found") as Error & { statusCode: number };
        err.statusCode = 404;
        throw err;
      }
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
    search: jest.fn().mockImplementation(async ({ body }: { body: { query: { term: { tenant: string } } } }) => {
      const tenant = body.query.term.tenant;
      const hits = Array.from(store.values())
        .filter((u) => u.tenant === tenant)
        .sort((a, b) => (a.email as string).localeCompare(b.email as string))
        .map((_source) => ({ _source }));
      return { body: { hits: { hits } } };
    }),
  })),
}));

import bcrypt from "bcryptjs";
import { login, findUser, verifyToken } from "@/lib/auth";
import { listUsersInTenant } from "@/lib/users";

beforeEach(async () => {
  store.clear();
  store.set("admin@demoA", { email: "admin@demoA", password: await bcrypt.hash("password123", 4), role: "admin", tenant: "demoA" });
  store.set("viewer@demoA", { email: "viewer@demoA", password: await bcrypt.hash("password123", 4), role: "viewer", tenant: "demoA" });
  store.set("admin@demoB", { email: "admin@demoB", password: await bcrypt.hash("password123", 4), role: "admin", tenant: "demoB" });
});

describe("Auth", () => {
  test("login returns token for valid credentials", async () => {
    const result = await login("admin@demoA", "password123");
    expect(result).not.toBeNull();
    expect(result!.token).toBeDefined();
    expect(result!.payload.sub).toBe("admin@demoA");
    expect(result!.payload.role).toBe("admin");
    expect(result!.payload.tenant).toBe("demoA");
  });

  test("login returns null for invalid password", async () => {
    const result = await login("admin@demoA", "wrongpassword");
    expect(result).toBeNull();
  });

  test("login returns null for nonexistent user", async () => {
    const result = await login("nonexistent@test.com", "password123");
    expect(result).toBeNull();
  });

  test("verifyToken returns payload for valid token", async () => {
    const result = await login("admin@demoA", "password123");
    expect(result).not.toBeNull();
    const payload = verifyToken(result!.token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("admin@demoA");
    expect(payload!.role).toBe("admin");
  });

  test("verifyToken returns null for invalid token", async () => {
    const payload = verifyToken("invalid-token");
    expect(payload).toBeNull();
  });

  test("findUser returns the stored record", async () => {
    const user = await findUser("admin@demoA");
    expect(user).not.toBeNull();
    expect(user!.tenant).toBe("demoA");
  });

  test("listUsersInTenant only returns users from the given tenant", async () => {
    const usersA = await listUsersInTenant("demoA");
    expect(usersA.length).toBe(2);
    expect(usersA.every((u) => u.tenant === "demoA")).toBe(true);
    expect(usersA.some((u) => u.tenant === "demoB")).toBe(false);
  });

  test("listUsersInTenant never leaks password hashes", async () => {
    const usersA = await listUsersInTenant("demoA");
    for (const user of usersA) {
      expect(user).not.toHaveProperty("password");
    }
  });

  test("listUsersInTenant returns empty array for unknown tenant", async () => {
    const users = await listUsersInTenant("demoZ");
    expect(users).toEqual([]);
  });
});
