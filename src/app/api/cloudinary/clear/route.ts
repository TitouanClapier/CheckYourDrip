import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMongoDb } from "@/lib/mongodb";

const FOLDER = "checkyourdrip/detections";

export async function DELETE() {
  const results: Record<string, unknown> = {};

  // 1. Supabase — supprime toutes les détections
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("detections")
      .delete({ count: "exact" })
      .gte("id", 0);

    if (error) throw new Error(error.message);
    results.supabase_deleted = count ?? 0;
  } catch (err) {
    results.supabase_error = String(err);
  }

  // 2. MongoDB — supprime tous les logs
  try {
    const db = await getMongoDb();
    const res = await db.collection("Logs").deleteMany({});
    results.mongo_deleted = res.deletedCount;
  } catch (err) {
    results.mongo_error = String(err);
  }

  // 3. Cloudinary — supprime toutes les images du dossier
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) throw new Error("Variables Cloudinary manquantes");

    const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?prefix=${FOLDER}&max_results=500`,
      {
        method: "DELETE",
        headers: { Authorization: `Basic ${basicAuth}` },
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "Erreur Cloudinary");
    results.cloudinary_deleted = data.deleted ? Object.keys(data.deleted).length : 0;
  } catch (err) {
    results.cloudinary_error = String(err);
  }

  const hasError = results.supabase_error || results.mongo_error || results.cloudinary_error;

  return NextResponse.json({ ok: !hasError, ...results });
}
