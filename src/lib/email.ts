import { Resend } from "resend";
import { getSupabaseAdmin } from "./supabase";
import { CLASS_META } from "./constants";

const resend = new Resend(process.env.RESEND_API_KEY);

export type EmailDetectionPayload = {
  objectClass: string;
  confidence: number;
  detectedAt: string;
  photoUrl?: string | null;
  detectionId: number;
};

export async function sendDetectionEmail(
  payload: EmailDetectionPayload
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("email_addresses, email_enabled, min_confidence")
    .eq("id", 1)
    .single();

  if (
    !settings?.email_enabled ||
    !settings.email_addresses?.length ||
    payload.confidence < (settings.min_confidence ?? 0.5)
  )
    return;

  const classMeta = CLASS_META[payload.objectClass] || {
    label: payload.objectClass,
  };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const date = new Date(payload.detectedAt).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
  });

  const photoHtml = payload.photoUrl
    ? `<img src="${payload.photoUrl}" alt="Infraction" style="max-width:100%;border-radius:8px;margin:16px 0;" />`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#111827;color:#f9fafb;padding:32px;max-width:600px;margin:0 auto;">
  <div style="background:#1f2937;border-radius:12px;padding:24px;border:1px solid #374151;">
    <h1 style="margin:0 0 8px;font-size:20px;color:#f87171;">
      Infraction vestimentaire détectée
    </h1>
    <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;">${date}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Classe</td>
        <td style="padding:8px 0;font-weight:600;">${classMeta.label}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Confiance</td>
        <td style="padding:8px 0;font-weight:600;">${Math.round(payload.confidence * 100)}%</td>
      </tr>
    </table>

    ${photoHtml}

    <a href="${appUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;">
      Voir le dashboard
    </a>
  </div>
  <p style="margin-top:16px;color:#6b7280;font-size:12px;text-align:center;">
    CheckYourDrip — <a href="${appUrl}/settings" style="color:#6b7280;">Gérer les notifications</a>
  </p>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: settings.email_addresses,
    subject: `[CheckYourDrip] ${classMeta.label} détecté — ${Math.round(payload.confidence * 100)}% confiance`,
    html,
  });
}
