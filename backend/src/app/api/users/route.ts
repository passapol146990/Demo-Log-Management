import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { listUsersInTenant, createUser, updateUser, deleteUser, UserManagementError } from "@/lib/users";
import { z, ZodError } from "zod";

const loginIdSchema = z
  .string()
  .min(3)
  .regex(/^[^\s@]+@[^\s@]+$/, "Must be in the form identifier@tenant, e.g. jdoe@demoA");

const createUserSchema = z.object({
  email: loginIdSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "viewer"]),
});

const updateUserSchema = z.object({
  email: loginIdSchema,
  role: z.enum(["admin", "viewer"]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

const deleteUserSchema = z.object({
  email: loginIdSchema,
});

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  const users = await listUsersInTenant(user.tenant);
  return NextResponse.json({ users, tenant: user.tenant });
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const body = createUserSchema.parse(await request.json());
    const emailTenant = body.email.split("@")[1];
    if (emailTenant !== user.tenant) {
      return NextResponse.json(
        { error: `Email must belong to your tenant (@${user.tenant})` },
        { status: 400 }
      );
    }
    const created = await createUser(user.tenant, body.email, body.password, body.role);
    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error instanceof UserManagementError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const body = updateUserSchema.parse(await request.json());
    const updated = await updateUser(user.tenant, body.email, { role: body.role, password: body.password });
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error instanceof UserManagementError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;
  const { user } = auth;

  try {
    const body = deleteUserSchema.parse(await request.json());
    await deleteUser(user.tenant, body.email, user.sub);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error instanceof UserManagementError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
