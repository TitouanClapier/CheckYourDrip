"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  email_addresses: string[];
  email_enabled: boolean;
  min_confidence: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [clearStatus, setClearStatus] = useState<"idle" | "confirming" | "clearing" | "ok" | "error">("idle");
  const [clearResult, setClearResult] = useState("");

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setEmailInput((data.email_addresses ?? []).join(", "));
      });
  }, []);

  async function handleTestEmail() {
    setTestStatus("sending");
    setTestError("");
    const res = await fetch("/api/notifications/test-email", { method: "POST" });
    const json = await res.json();
    if (json.ok) {
      setTestStatus("ok");
      setTimeout(() => setTestStatus("idle"), 4000);
    } else {
      setTestStatus("error");
      setTestError(json.error ?? "Erreur inconnue");
    }
  }

  async function handleClearCloudinary() {
    if (clearStatus === "idle") {
      setClearStatus("confirming");
      return;
    }
    if (clearStatus !== "confirming") return;

    setClearStatus("clearing");
    setClearResult("");
    const res = await fetch("/api/cloudinary/clear", { method: "DELETE" });
    const json = await res.json();
    if (json.ok) {
      setClearStatus("ok");
      setClearResult(
        `Supabase: ${json.supabase_deleted ?? 0} · MongoDB: ${json.mongo_deleted ?? 0} · Cloudinary: ${json.cloudinary_deleted ?? 0}`
      );
      setTimeout(() => { setClearStatus("idle"); setClearResult(""); }, 5000);
    } else {
      setClearStatus("error");
      const errors = [json.supabase_error, json.mongo_error, json.cloudinary_error].filter(Boolean);
      setClearResult(errors.join(" | ") || "Erreur inconnue");
      setTimeout(() => { setClearStatus("idle"); setClearResult(""); }, 6000);
    }
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);

    const emails = emailInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email_addresses: emails,
        email_enabled: settings.email_enabled,
        min_confidence: settings.min_confidence,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-white transition-colors"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Email notifications */}
        <section className="rounded-xl border border-gray-700/50 bg-surface-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Notifications email
          </h2>

          {!settings ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-elevated" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.email_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, email_enabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-600 bg-surface-elevated"
                />
                <span className="text-sm text-gray-300">
                  Activer les emails pour chaque infraction
                </span>
              </label>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-400">
                  Adresses email destinataires
                </label>
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@example.com, securite@example.com"
                  className="w-full rounded-lg border border-gray-600 bg-surface-elevated px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Séparer les adresses par des virgules. Avec <code className="text-gray-400">onboarding@resend.dev</code>, seule l&apos;adresse de ton compte Resend recevra les emails.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-400">
                  Confiance minimale pour envoyer un email
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.min_confidence}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        min_confidence: parseFloat(e.target.value),
                      })
                    }
                    className="flex-1 accent-blue-500"
                  />
                  <span className="w-12 text-right text-sm font-mono text-white">
                    {Math.round(settings.min_confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Cloudinary */}
        <section className="rounded-xl border border-gray-700/50 bg-surface-card p-6">
          <h2 className="mb-1 text-lg font-semibold text-white">Réinitialiser les données</h2>
          <p className="mb-4 text-sm text-gray-400">
            Supprime toutes les détections de <strong className="text-gray-300">Supabase</strong>,
            tous les logs de <strong className="text-gray-300">MongoDB</strong> et
            toutes les photos de <strong className="text-gray-300">Cloudinary</strong>.
            Cette action est irréversible.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearCloudinary}
              disabled={clearStatus === "clearing"}
              className={
                clearStatus === "confirming"
                  ? "rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                  : clearStatus === "ok"
                  ? "rounded-lg bg-green-500/20 border border-green-500/30 px-4 py-2.5 text-sm font-medium text-green-400"
                  : clearStatus === "error"
                  ? "rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400"
                  : "rounded-lg border border-red-500/40 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              }
            >
              {clearStatus === "idle" && "Réinitialiser toutes les données"}
              {clearStatus === "confirming" && "Confirmer la suppression ?"}
              {clearStatus === "clearing" && "Suppression..."}
              {clearStatus === "ok" && "Données supprimées"}
              {clearStatus === "error" && "Erreur"}
            </button>

            {clearStatus === "confirming" && (
              <button
                onClick={() => setClearStatus("idle")}
                className="rounded-lg bg-surface-elevated px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
            )}

            {(clearStatus === "ok" || clearStatus === "error") && clearResult && (
              <span className={`text-xs ${clearStatus === "ok" ? "text-green-400" : "text-red-400"}`}>
                {clearResult}
              </span>
            )}
          </div>
        </section>

        {/* Push notifications info */}
        <section className="rounded-xl border border-gray-700/50 bg-surface-card p-6">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Notifications push
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            Les notifications push sont activées depuis la barre de navigation
            en haut. Elles fonctionnent sur mobile (Android/iOS Safari 16.4+)
            et desktop.
          </p>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">
            Pour recevoir les push en temps réel, configurer un webhook dans
            Supabase :<br />
            <span className="font-mono text-xs text-blue-400">
              Database → Webhooks → Table: detections → Event: INSERT → URL:
              https://[ton-app].vercel.app/api/push/notify
            </span>
          </div>
        </section>

        {/* Save + Test */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestEmail}
              disabled={testStatus === "sending" || !settings}
              className="rounded-lg bg-surface-card border border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-50 transition-colors"
            >
              {testStatus === "sending" ? "Envoi..." : testStatus === "ok" ? "Email envoyé !" : "Tester l'email"}
            </button>
            {testStatus === "error" && (
              <span className="text-xs text-red-400">{testError}</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !settings}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Enregistrement..." : saved ? "Enregistré !" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
