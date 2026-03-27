import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ObjectId } from "mongodb";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Sample mongo_ids from Supabase
  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from("detections")
    .select("id, mongo_id")
    .not("mongo_id", "is", null)
    .limit(3);

  results.sample_mongo_ids = rows?.map((r) => r.mongo_id);

  // Try to convert them to ObjectId
  const conversions = rows?.map((r) => {
    try {
      new ObjectId(r.mongo_id);
      return { id: r.id, mongo_id: r.mongo_id, valid: true };
    } catch {
      return { id: r.id, mongo_id: r.mongo_id, valid: false };
    }
  });
  results.objectid_valid = conversions;

  // Try fetching the first one directly
  if (rows?.[0]?.mongo_id) {
    try {
      const db = await getMongoDb();
      const doc = await db
        .collection("Logs")
        .findOne({ _id: new ObjectId(rows[0].mongo_id) });
      results.first_log = doc
        ? { found: true, has_photo: !!doc.photo, photo_url: doc.photo }
        : { found: false };
    } catch (err) {
      results.first_log_error = String(err);
    }
  }

  // Check what /api/detections actually returns for the first item
  try {
    const { getLogsByIds } = await import("@/lib/mongodb");
    const mongoIds = (rows ?? []).filter((r) => r.mongo_id).map((r) => r.mongo_id as string);
    const logsMap = await getLogsByIds(mongoIds);
    results.logs_map_keys = Object.keys(logsMap);
    results.first_photo_url = logsMap[mongoIds[0]]?.photo ?? null;
  } catch (err) {
    results.logs_map_error = String(err);
  }

  return NextResponse.json(results);
}
