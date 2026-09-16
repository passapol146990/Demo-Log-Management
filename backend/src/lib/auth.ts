import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { findUserRecord } from "./users";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-secret-key-must-be-at-least-32-chars";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10");

export interface TokenPayload {
  sub: string;
  role: string;
  tenant: string;
}

export async function findUser(email: string) {
  return findUserRecord(email);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<{ token: string; payload: TokenPayload } | null> {
  const user = await findUser(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  const payload: TokenPayload = { sub: user.email, role: user.role, tenant: user.tenant };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  return { token, payload };
}

export const AUTH_COOKIE_NAME = "token";

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function authenticate(request: Request): TokenPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(request: Request): { user: TokenPayload } | Response {
  const payload = authenticate(request);
  if (!payload) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  return { user: payload };
}

export function requireRole(request: Request, roles: string[]): { user: TokenPayload } | Response {
  const result = requireAuth(request);
  if (result instanceof Response) return result;
  if (!roles.includes(result.user.role)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  return result;
}

export { JWT_SECRET, BCRYPT_ROUNDS };
