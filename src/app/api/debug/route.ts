import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export async function GET() {
  const results: Record<string, unknown> = {
    mongo_uri_set: !!process.env.MONGO_URI,
    mongo_db: process.env.MONGO_DB,
  };

  try {
    const db = await getMongoDb();
    const count = await db.collection("Logs").countDocuments();
    results.mongo_status = "OK";
    results.logs_count = count;
  } catch (err) {
    results.mongo_status = "ERREUR";
    results.mongo_error = String(err);
  }

  return NextResponse.json(results);
}
