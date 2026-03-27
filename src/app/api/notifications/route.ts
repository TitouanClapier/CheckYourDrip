import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const DEFAULTS = {
  id: 1,
  email_addresses: [] as string[],
  email_enabled: false,
  min_confidence: 0.5,
};

export async function GET() {
  const supabase = getSupabaseAdmin();

  // Upsert pour créer la ligne si elle n'existe pas
  await supabase
    .from("notification_settings")
    .upsert(DEFAULTS, { onConflict: "id", ignoreDuplicates: true });

  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json(DEFAULTS);
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { email_addresses, email_enabled, min_confidence } = body as {
    email_addresses?: string[];
    email_enabled?: boolean;
    min_confidence?: number;
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("notification_settings")
    .update({
      ...(email_addresses !== undefined && { email_addresses }),
      ...(email_enabled !== undefined && { email_enabled }),
      ...(min_confidence !== undefined && { min_confidence }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
