import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { validateStructural } from "@/lib/validate-questions";
import type { DbQuestion } from "@/lib/types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (data?.role !== "admin") return null;
  return { session, supabase };
}

export async function GET(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");

  let query = ctx.supabase.from("questions").select("*").order("id");
  if (section) query = query.eq("section_id", section);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, section_id, question, answer, choices, explanation, difficulty } = body;

  // Structural validation
  const q: DbQuestion = { id, section_id, question, answer, choices, explanation, difficulty: difficulty ?? 5 };
  const validation = validateStructural(q);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 }
    );
  }

  const { data, error } = await ctx.supabase
    .from("questions")
    .insert(q)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
