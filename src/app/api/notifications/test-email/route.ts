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

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY manquant dans les variables Vercel" }, { status: 500 });
  }

  // 2. Envoyer directement et retourner la réponse Resend complète
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM?.trim() || "onboarding@resend.dev",
    to: settings.email_addresses,
    subject: "[Test] CheckYourDrip — vérification email",
    html: "<p>Test de notification CheckYourDrip. Si vous recevez cet email, la configuration est correcte.</p>",
  });

  if (error) {
    return NextResponse.json({
      error: `Resend error: ${error.message}`,
      resend_error: error,
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email_sent_to: settings.email_addresses,
    resend_id: data?.id,
  });
}
