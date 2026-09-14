import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { z, ZodError } from "zod";
import {
  getAllRules,
  createRule,
  updateRule,
  deleteRule,
  AlertRuleError,
  AlertRuleInput,
} from "@/lib/alertRulesStore";
import { MATCH_FIELD_OPTIONS, GROUP_BY_OPTIONS } from "@/lib/alertRules";

const createRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  enabled: z.boolean(),
  match_field: z.enum(MATCH_FIELD_OPTIONS),
  match_value: z.string().min(1, "Match value is required"),
  group_by: z.enum(GROUP_BY_OPTIONS),
  threshold: z.number().int().min(1, "Threshold must be at least 1"),
  window_minutes: z.number().int().min(1, "Window must be at least 1 minute"),
  cooldown_minutes: z.number().int().min(1).optional(),
  severity: z.number().int().min(0).max(10),
  webhook_url: z.string().optional(),
});

const updateRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  match_field: z.enum(MATCH_FIELD_OPTIONS).optional(),
  match_value: z.string().min(1).optional(),
  group_by: z.enum(GROUP_BY_OPTIONS).optional(),
  threshold: z.number().int().min(1).optional(),
  window_minutes: z.number().int().min(1).optional(),
  cooldown_minutes: z.number().int().min(1).optional(),
  severity: z.number().int().min(0).max(10).optional(),
  webhook_url: z.string().optional(),
});

const deleteRuleSchema = z.object({
  id: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ["admin", "viewer"]);
  if (auth instanceof Response) return auth;

  const rules = await getAllRules();
  return NextResponse.json({ rules, fieldOptions: MATCH_FIELD_OPTIONS });
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  try {
    const body = createRuleSchema.parse(await request.json()) as AlertRuleInput;
    const rule = await createRule(body);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error instanceof AlertRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  try {
    const body = updateRuleSchema.parse(await request.json());
    const { id, ...patch } = body;
    const rule = await updateRule(id, patch);
    return NextResponse.json({ rule });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error instanceof AlertRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireRole(request, ["admin"]);
  if (auth instanceof Response) return auth;

  try {
    const body = deleteRuleSchema.parse(await request.json());
    await deleteRule(body.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error instanceof AlertRuleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
