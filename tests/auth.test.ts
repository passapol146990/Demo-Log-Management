import { login, findUser, verifyToken } from "@/lib/auth";

describe("Auth", () => {
  beforeAll(async () => {
    // Pre-hash passwords
  });

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
    const payload = await verifyToken(result!.token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("admin@demoA");
    expect(payload!.role).toBe("admin");
  });

  test("verifyToken returns null for invalid token", async () => {
    const payload = await verifyToken("invalid-token");
    expect(payload).toBeNull();
  });
});
