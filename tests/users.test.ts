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
import { createUser, updateUser, deleteUser, listUsersInTenant, UserManagementError } from "@/lib/users";

beforeEach(async () => {
  store.clear();
  store.set("admin@demoA", { email: "admin@demoA", password: await bcrypt.hash("password123", 4), role: "admin", tenant: "demoA" });
  store.set("viewer@demoA", { email: "viewer@demoA", password: await bcrypt.hash("password123", 4), role: "viewer", tenant: "demoA" });
  store.set("admin@demoB", { email: "admin@demoB", password: await bcrypt.hash("password123", 4), role: "admin", tenant: "demoB" });
});

describe("User Management", () => {
  describe("createUser", () => {
    test("creates a new user in the given tenant", async () => {
      const user = await createUser("demoA", "new@demoA", "password123", "viewer");
      expect(user).toEqual({ email: "new@demoA", role: "viewer", tenant: "demoA" });
      const users = await listUsersInTenant("demoA");
      expect(users.some((u) => u.email === "new@demoA")).toBe(true);
    });

    test("rejects duplicate email", async () => {
      await expect(createUser("demoA", "admin@demoA", "password123", "viewer")).rejects.toThrow(
        UserManagementError
      );
    });

    test("never returns the password hash", async () => {
      const user = await createUser("demoA", "new2@demoA", "password123", "admin");
      expect(user).not.toHaveProperty("password");
    });
  });

  describe("updateUser", () => {
    test("updates role for a user in the same tenant", async () => {
      const updated = await updateUser("demoA", "viewer@demoA", { role: "admin" });
      expect(updated.role).toBe("admin");
    });

    test("throws if user belongs to a different tenant", async () => {
      await expect(updateUser("demoA", "admin@demoB", { role: "viewer" })).rejects.toThrow(UserManagementError);
    });

    test("throws if user does not exist", async () => {
      await expect(updateUser("demoA", "ghost@demoA", { role: "viewer" })).rejects.toThrow(UserManagementError);
    });

    test("prevents demoting the last admin in a tenant", async () => {
      await expect(updateUser("demoA", "admin@demoA", { role: "viewer" })).rejects.toThrow(
        "Cannot demote the last admin"
      );
    });

    test("allows demoting an admin when another admin exists", async () => {
      await createUser("demoA", "admin2@demoA", "password123", "admin");
      const updated = await updateUser("demoA", "admin@demoA", { role: "viewer" });
      expect(updated.role).toBe("viewer");
    });
  });

  describe("deleteUser", () => {
    test("deletes a user in the same tenant", async () => {
      await deleteUser("demoA", "viewer@demoA", "admin@demoA");
      const users = await listUsersInTenant("demoA");
      expect(users.some((u) => u.email === "viewer@demoA")).toBe(false);
    });

    test("prevents self-deletion", async () => {
      await expect(deleteUser("demoA", "admin@demoA", "admin@demoA")).rejects.toThrow(
        "Cannot delete your own account"
      );
    });

    test("prevents deleting the last admin in a tenant", async () => {
      await expect(deleteUser("demoA", "admin@demoA", "viewer@demoA")).rejects.toThrow(
        "Cannot delete the last admin"
      );
    });

    test("throws if user belongs to a different tenant", async () => {
      await expect(deleteUser("demoA", "admin@demoB", "admin@demoA")).rejects.toThrow(UserManagementError);
    });
  });
});
