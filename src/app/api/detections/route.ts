import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getLogsByIds } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");
  const classFilter = searchParams.get("class");
  const unseenOnly = searchParams.get("unseen") === "true";

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("detections")
    .select("*", { count: "exact" })
    .order("detected_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (classFilter) query = query.eq("object_class", classFilter);
  if (unseenOnly) query = query.eq("seen", false);

  const { data: detections, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mongoIds = (detections ?? [])
    .filter((d) => d.mongo_id)
    .map((d) => d.mongo_id as string);

  const logsMap = await getLogsByIds(mongoIds);

  const enriched = (detections ?? []).map((d) => {
    const log = d.mongo_id ? logsMap[d.mongo_id] : null;
    return {
      ...d,
      photo_url: log?.photo ?? null,
      verification: log?.verification ?? null,
    };
  });

  return NextResponse.json({ detections: enriched, total: count ?? 0 });
}
