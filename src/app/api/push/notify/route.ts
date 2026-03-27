import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push";
import { sendDetectionEmail } from "@/lib/email";
import { getLogsByIds } from "@/lib/mongodb";
import { CLASS_META } from "@/lib/constants";

/**
 * Webhook Supabase → déclenché à chaque INSERT dans `detections`.
 *
 * Configuration dans Supabase :
 *   Database → Webhooks → Create webhook
 *   Table: detections | Event: INSERT
 *   URL: https://ton-app.vercel.app/api/push/notify
 *   HTTP Headers: { "x-webhook-secret": "WEBHOOK_SECRET" }
 */
export async function POST(request: NextRequest) {
  // Validate secret
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Supabase webhook payload: { type: "INSERT", table: "detections", record: {...} }
  const record = body?.record as {
    id: number;
    object_class: string;
    confidence: number;
    detected_at: string;
    mongo_id?: string;
  } | null;

  if (!record?.id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const classMeta = CLASS_META[record.object_class] || {
    label: record.object_class,
  };
  const confidencePct = Math.round(record.confidence * 100);

  // Fetch photo from MongoDB
  let photoUrl: string | null = null;
  if (record.mongo_id) {
    const logs = await getLogsByIds([record.mongo_id]);
    photoUrl = logs[record.mongo_id]?.photo ?? null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Send push & email in parallel
  await Promise.allSettled([
    sendPushToAll({
      title: `Infraction : ${classMeta.label}`,
      body: `Confiance ${confidencePct}% — ${new Date(record.detected_at).toLocaleTimeString("fr-FR")}`,
      image: photoUrl || undefined,
      detectionId: record.id,
      url: appUrl,
    }),
    sendDetectionEmail({
      objectClass: record.object_class,
      confidence: record.confidence,
      detectedAt: record.detected_at,
      photoUrl,
      detectionId: record.id,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
