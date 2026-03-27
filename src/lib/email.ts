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

  const confidencePct = Math.round(payload.confidence * 100);
  const confidenceColor =
    confidencePct >= 80 ? "#4ade80" : confidencePct >= 60 ? "#facc15" : "#f87171";
  const confidenceBarWidth = `${confidencePct}%`;

  const photoBlock = payload.photoUrl
    ? `
    <!-- Photo -->
    <div style="margin:0 0 28px;border-radius:12px;overflow:hidden;border:1px solid #374151;">
      <img
        src="${payload.photoUrl}"
        alt="Photo de l'infraction"
        width="560"
        style="display:block;width:100%;max-height:320px;object-fit:cover;"
      />
    </div>`
    : `
    <!-- No photo placeholder -->
    <div style="margin:0 0 28px;border-radius:12px;background:#1a2332;border:1px solid #374151;padding:32px;text-align:center;color:#4b5563;font-size:14px;">
      Aucune photo disponible
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Alerte CheckYourDrip</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px;">
    <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="padding:0 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                  CheckYourDrip
                </span>
              </td>
              <td align="right">
                <span style="display:inline-block;background:#ef444420;color:#f87171;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid #ef444440;letter-spacing:0.5px;">
                  ALERTE
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Card -->
      <tr>
        <td style="background:#161b22;border-radius:16px;border:1px solid #30363d;overflow:hidden;">

          <!-- Card header -->
          <div style="padding:20px 24px 0;border-bottom:1px solid #21262d;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:500;color:#8b949e;text-transform:uppercase;letter-spacing:0.8px;">
              Infraction détectée
            </p>
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;">
              ${classMeta.label}
            </h1>
            <p style="margin:0 0 16px;font-size:13px;color:#6e7681;">
              ${date}
            </p>
          </div>

          <!-- Photo -->
          <div style="padding:20px 24px;">
            ${photoBlock}

            <!-- Stats row -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <!-- Confiance -->
                <td width="50%" style="padding-right:8px;">
                  <div style="background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#6e7681;text-transform:uppercase;letter-spacing:0.6px;">Confiance</p>
                    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:${confidenceColor};">${confidencePct}%</p>
                    <div style="height:4px;background:#21262d;border-radius:2px;">
                      <div style="height:4px;width:${confidenceBarWidth};background:${confidenceColor};border-radius:2px;"></div>
                    </div>
                  </div>
                </td>
                <!-- Classe -->
                <td width="50%" style="padding-left:8px;">
                  <div style="background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#6e7681;text-transform:uppercase;letter-spacing:0.6px;">Catégorie</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#e6edf3;">${classMeta.label}</p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- CTA buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:8px;">
                  <a href="${appUrl}"
                     style="display:block;text-align:center;background:#1f6feb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">
                    Voir le dashboard
                  </a>
                </td>
                ${payload.photoUrl ? `
                <td style="padding-left:8px;">
                  <a href="${payload.photoUrl}"
                     target="_blank"
                     style="display:block;text-align:center;background:#21262d;color:#e6edf3;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;border:1px solid #30363d;">
                    Voir la photo
                  </a>
                </td>` : ""}
              </tr>
            </table>
          </div>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#484f58;">
            CheckYourDrip &mdash;
            <a href="${appUrl}/settings" style="color:#484f58;text-decoration:underline;">Gérer les notifications</a>
          </p>
        </td>
      </tr>

    </table>
    </td></tr>
  </table>

</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: settings.email_addresses,
    subject: `[CheckYourDrip] ${classMeta.label} détecté — ${Math.round(payload.confidence * 100)}% confiance`,
    html,
  });
}
