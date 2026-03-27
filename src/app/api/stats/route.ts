import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ALL_CLASSES } from "@/lib/constants";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ count: totalToday }, { count: unseen }, { data: byClassRaw }] =
    await Promise.all([
      supabase
        .from("detections")
        .select("*", { count: "exact", head: true })
        .gte("detected_at", todayStart.toISOString()),
      supabase
        .from("detections")
        .select("*", { count: "exact", head: true })
        .eq("seen", false),
      supabase
        .from("detections")
        .select("object_class")
        .gte("detected_at", todayStart.toISOString()),
    ]);

  const byClass: Record<string, number> = Object.fromEntries(
    ALL_CLASSES.map((c) => [c, 0])
  );

  for (const row of byClassRaw ?? []) {
    if (row.object_class in byClass) {
      byClass[row.object_class]++;
    }
  }

  return NextResponse.json({
    totalToday: totalToday ?? 0,
    unseen: unseen ?? 0,
    byClass,
  });
}
