"use client";

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CLASS_META } from "@/lib/constants";
import type { Detection } from "@/lib/supabase";
import clsx from "clsx";

type Props = {
  detection: Detection;
  onMarkSeen: (id: number) => void;
  onVerify: (id: number, verification: boolean) => void;
  onOpen: (detection: Detection) => void;
  isNew?: boolean;
};

export default function DetectionCard({
  detection,
  onMarkSeen,
  onVerify,
  onOpen,
  isNew,
}: Props) {
  const meta = CLASS_META[detection.object_class] ?? {
    label: detection.object_class,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/30",
  };

  const timeAgo = formatDistanceToNow(new Date(detection.detected_at), {
    addSuffix: true,
    locale: fr,
  });

  const confidencePct = Math.round(detection.confidence * 100);

  return (
    <div
      onClick={() => onOpen(detection)}
      className={clsx(
        "cursor-pointer rounded-xl border bg-surface-card p-4 transition-all duration-300 hover:border-gray-500 hover:bg-gray-800",
        meta.border,
        isNew && "animate-slide-in ring-1 ring-white/10",
        detection.seen && "opacity-60"
      )}
    >
      <div className="flex gap-4">
        {/* Photo */}
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-surface-elevated">
          {detection.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detection.photo_url}
              alt={meta.label}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-gray-600">
              ?
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={clsx(
                  "inline-block rounded-md px-2 py-0.5 text-xs font-semibold",
                  meta.bg,
                  meta.color
                )}
              >
                {meta.label}
              </span>
              {!detection.seen && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {timeAgo}
            </span>
          </div>

          {/* Confidence bar */}
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>Confiance</span>
              <span
                className={
                  confidencePct >= 80
                    ? "text-green-400"
                    : confidencePct >= 60
                      ? "text-yellow-400"
                      : "text-red-400"
                }
              >
                {confidencePct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-elevated">
              <div
                className={clsx(
                  "h-full rounded-full transition-all",
                  confidencePct >= 80
                    ? "bg-green-400"
                    : confidencePct >= 60
                      ? "bg-yellow-400"
                      : "bg-red-400"
                )}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {!detection.seen && (
              <button
                onClick={() => onMarkSeen(detection.id)}
                className="rounded-md bg-surface-elevated px-3 py-1 text-xs font-medium text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Marquer vu
              </button>
            )}

            {detection.verification === null || detection.verification === false ? (
              <button
                onClick={() => onVerify(detection.id, true)}
                className="rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
              >
                Confirmer
              </button>
            ) : (
              <span className="rounded-md bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400 border border-green-500/30">
                Vérifié
              </span>
            )}

            {detection.verification === true && (
              <button
                onClick={() => onVerify(detection.id, false)}
                className="rounded-md bg-surface-elevated px-3 py-1 text-xs font-medium text-gray-400 hover:bg-gray-600 transition-colors"
              >
                Faux positif
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
