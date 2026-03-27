import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { updateLogVerification } from "@/lib/mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { seen, verification } = body as {
    seen?: boolean;
    verification?: boolean;
  };

  const supabase = getSupabaseAdmin();

  // Fetch detection to get mongo_id
  const { data: detection, error: fetchError } = await supabase
    .from("detections")
    .select("mongo_id")
    .eq("id", id)
    .single();

  if (fetchError || !detection) {
    return NextResponse.json({ error: "Detection not found" }, { status: 404 });
  }

  // Update seen in Supabase
  if (seen !== undefined) {
    const { error } = await supabase
      .from("detections")
      .update({ seen })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update verification in MongoDB
  if (verification !== undefined && detection.mongo_id) {
    await updateLogVerification(detection.mongo_id, verification);
  }

  return NextResponse.json({ ok: true });
}
