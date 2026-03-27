import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST() {
  // 1. Vérifier les settings
  const supabase = getSupabaseAdmin();
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (!settings?.email_enabled) {
    return NextResponse.json({ error: "email_enabled est false dans les settings" }, { status: 400 });
  }
  if (!settings?.email_addresses?.length) {
    return NextResponse.json({ error: "Aucune adresse email dans les settings" }, { status: 400 });
  }

  // 2. Envoyer directement et retourner la réponse Resend complète
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: settings.email_addresses,
    subject: "[Test] CheckYourDrip — vérification email",
    html: "<p>Test de notification CheckYourDrip. Si vous recevez cet email, la configuration est correcte.</p>",
  });

  return NextResponse.json({
    settings_email_addresses: settings.email_addresses,
    settings_email_enabled: settings.email_enabled,
    resend_response: result,
  });
}
