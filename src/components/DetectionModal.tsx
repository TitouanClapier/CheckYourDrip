"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CLASS_META } from "@/lib/constants";
import type { Detection } from "@/lib/supabase";
import clsx from "clsx";

type Props = {
  detection: Detection;
  onClose: () => void;
  onMarkSeen: (id: number) => void;
  onVerify: (id: number, verification: boolean) => void;
};

export default function DetectionModal({
  detection,
  onClose,
  onMarkSeen,
  onVerify,
}: Props) {
  const meta = CLASS_META[detection.object_class] ?? {
    label: detection.object_class,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/30",
  };

  const confidencePct = Math.round(detection.confidence * 100);
  const date = format(new Date(detection.detected_at), "dd MMMM yyyy à HH:mm:ss", { locale: fr });

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg animate-slide-in rounded-2xl border border-gray-700 bg-surface-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className={clsx("rounded-md px-2.5 py-1 text-sm font-semibold", meta.bg, meta.color, "border", meta.border)}>
              {meta.label}
            </span>
            {detection.verification === true && (
              <span className="rounded-md bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400 border border-green-500/30">
                Vérifié
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-surface-elevated hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Photo */}
        <div className="relative bg-black">
          {detection.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detection.photo_url}
              alt={meta.label}
              className="max-h-80 w-full object-contain"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-600">
              Aucune photo disponible
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Date de détection</p>
              <p className="text-sm text-white">{date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Statut</p>
              <p className="text-sm">
                {detection.seen
                  ? <span className="text-gray-400">Consulté</span>
                  : <span className="text-red-400 flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse inline-block" />Non consulté</span>
                }
              </p>
            </div>
          </div>

          {/* Confidence */}
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-gray-500">
              <span>Confiance</span>
              <span className={
                confidencePct >= 80 ? "text-green-400" :
                confidencePct >= 60 ? "text-yellow-400" : "text-red-400"
              }>
                {confidencePct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-elevated">
              <div
                className={clsx(
                  "h-full rounded-full transition-all",
                  confidencePct >= 80 ? "bg-green-400" :
                  confidencePct >= 60 ? "bg-yellow-400" : "bg-red-400"
                )}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {!detection.seen && (
              <button
                onClick={() => { onMarkSeen(detection.id); onClose(); }}
                className="rounded-lg bg-surface-elevated px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Marquer vu
              </button>
            )}

            {detection.verification !== true ? (
              <button
                onClick={() => { onVerify(detection.id, true); onClose(); }}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
              >
                Confirmer l&apos;infraction
              </button>
            ) : (
              <button
                onClick={() => { onVerify(detection.id, false); onClose(); }}
                className="rounded-lg bg-surface-elevated px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-600 transition-colors"
              >
                Marquer faux positif
              </button>
            )}

            {detection.photo_url && (
              <a
                href={detection.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded-lg bg-surface-elevated px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Ouvrir photo
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
