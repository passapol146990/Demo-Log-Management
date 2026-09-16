import bcrypt from "bcryptjs";
import { client } from "./opensearch";

const USERS_INDEX = "users";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10");

export interface UserRecord {
  email: string;
  password: string;
  role: "admin" | "viewer";
  tenant: string;
}

export interface SafeUser {
  email: string;
  role: "admin" | "viewer";
  tenant: string;
}

const DEFAULT_USERS: { email: string; password: string; role: "admin" | "viewer"; tenant: string }[] = [
  { email: "admin@demoA", password: "password123", role: "admin", tenant: "demoA" },
  { email: "viewer@demoA", password: "password123", role: "viewer", tenant: "demoA" },
  { email: "admin@demoB", password: "password123", role: "admin", tenant: "demoB" },
  { email: "viewer@demoB", password: "password123", role: "viewer", tenant: "demoB" },
];

async function ensureUsersIndex(): Promise<void> {
  const exists = await client.indices.exists({ index: USERS_INDEX });
  if (exists.body) return;
  await client.indices.create({
    index: USERS_INDEX,
    body: {
      mappings: {
        properties: {
          email: { type: "keyword" },
          password: { type: "keyword" },
          role: { type: "keyword" },
          tenant: { type: "keyword" },
        },
      },
    },
  });
}

let seeded = false;

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  await ensureUsersIndex();
  const count = await client.count({ index: USERS_INDEX });
  if ((count.body.count ?? 0) === 0) {
    for (const u of DEFAULT_USERS) {
      await client.index({
        index: USERS_INDEX,
        id: u.email,
        body: { ...u, password: await bcrypt.hash(u.password, BCRYPT_ROUNDS) },
        refresh: true,
      });
    }
  }
  seeded = true;
}

export async function findUserRecord(email: string): Promise<UserRecord | null> {
  await ensureSeeded();
  try {
    const result = await client.get({ index: USERS_INDEX, id: email });
    return result.body._source as UserRecord;
  } catch {
    return null;
  }
}

function toSafeUser(user: UserRecord): SafeUser {
  return { email: user.email, role: user.role, tenant: user.tenant };
}

export async function listUsersInTenant(tenant: string): Promise<SafeUser[]> {
  await ensureSeeded();
  const result = await client.search({
    index: USERS_INDEX,
    body: {
      size: 1000,
      query: { term: { tenant } },
      sort: [{ email: { order: "asc" } }],
    },
  });
  return result.body.hits.hits.map((hit: { _source: UserRecord }) => toSafeUser(hit._source));
}

export class UserManagementError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function createUser(
  tenant: string,
  email: string,
  password: string,
  role: "admin" | "viewer"
): Promise<SafeUser> {
  await ensureSeeded();
  const existing = await findUserRecord(email);
  if (existing) {
    throw new UserManagementError("A user with this email already exists", 409);
  }
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await client.index({
    index: USERS_INDEX,
    id: email,
    body: { email, password: hashed, role, tenant },
    refresh: true,
  });
  return { email, role, tenant };
}

export async function updateUser(
  tenant: string,
  email: string,
  patch: { role?: "admin" | "viewer"; password?: string }
): Promise<SafeUser> {
  await ensureSeeded();
  const user = await findUserRecord(email);
  if (!user || user.tenant !== tenant) {
    throw new UserManagementError("User not found in this tenant", 404);
  }
  if (patch.role && patch.role !== user.role) {
    if (user.role === "admin" && patch.role === "viewer") {
      const tenantUsers = await listUsersInTenant(tenant);
      const adminCount = tenantUsers.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        throw new UserManagementError("Cannot demote the last admin in this tenant", 409);
      }
    }
    user.role = patch.role;
  }
  if (patch.password) {
    user.password = await bcrypt.hash(patch.password, BCRYPT_ROUNDS);
  }
  await client.index({ index: USERS_INDEX, id: email, body: user, refresh: true });
  return toSafeUser(user);
}

export async function deleteUser(tenant: string, email: string, requestedBy: string): Promise<void> {
  await ensureSeeded();
  const user = await findUserRecord(email);
  if (!user || user.tenant !== tenant) {
    throw new UserManagementError("User not found in this tenant", 404);
  }
  if (email === requestedBy) {
    throw new UserManagementError("Cannot delete your own account", 409);
  }
  if (user.role === "admin") {
    const tenantUsers = await listUsersInTenant(tenant);
    const adminCount = tenantUsers.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      throw new UserManagementError("Cannot delete the last admin in this tenant", 409);
    }
  }
  await client.delete({ index: USERS_INDEX, id: email, refresh: true });
}
