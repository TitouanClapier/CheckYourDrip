import { NextResponse } from "next/server";
import { sendDetectionEmail } from "@/lib/email";

export async function POST() {
  try {
    await sendDetectionEmail({
      objectClass: "headwear",
      confidence: 0.85,
      detectedAt: new Date().toISOString(),
      photoUrl: null,
      detectionId: 0,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
