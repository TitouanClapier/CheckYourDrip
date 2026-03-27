"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Detection } from "@/lib/supabase";
import DetectionCard from "./DetectionCard";
import DetectionModal from "./DetectionModal";
import StatsBar from "./StatsBar";
import { CLASS_META, ALL_CLASSES } from "@/lib/constants";
import clsx from "clsx";

type Stats = {
  totalToday: number;
  unseen: number;
  byClass: Record<string, number>;
};

export default function Dashboard() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [unseenOnly, setUnseenOnly] = useState(false);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchDetections = useCallback(async () => {
    const params = new URLSearchParams({ limit: "50" });
    if (classFilter) params.set("class", classFilter);
    if (unseenOnly) params.set("unseen", "true");

    const res = await fetch(`/api/detections?${params}`);
    const json = await res.json();
    setDetections(json.detections ?? []);
    setLoading(false);
  }, [classFilter, unseenOnly]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/stats");
    setStats(await res.json());
  }, []);

  useEffect(() => {
    fetchDetections();
  }, [fetchDetections]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Supabase Realtime
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("detections-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "detections" },
        async (payload) => {
          const newRecord = payload.new as Detection;

          // Fetch enriched (with photo)
          const res = await fetch(`/api/detections?limit=1`);
          const json = await res.json();
          const enriched: Detection = json.detections?.[0] ?? newRecord;

          setDetections((prev) => [enriched, ...prev.slice(0, 99)]);
          setNewIds((prev) => new Set(prev).add(enriched.id));
          setTimeout(
            () =>
              setNewIds((prev) => {
                const next = new Set(prev);
                next.delete(enriched.id);
                return next;
              }),
            3000
          );

          const meta = CLASS_META[enriched.object_class] ?? {
            label: enriched.object_class,
          };
          showToast(
            `Nouvelle infraction : ${meta.label} (${Math.round(enriched.confidence * 100)}%)`
          );
          fetchStats();
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showToast, fetchStats]);

  async function handleMarkSeen(id: number) {
    setDetections((prev) =>
      prev.map((d) => (d.id === id ? { ...d, seen: true } : d))
    );
    await fetch(`/api/detections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seen: true }),
    });
    fetchStats();
  }

  async function handleVerify(id: number, verification: boolean) {
    setDetections((prev) =>
      prev.map((d) => (d.id === id ? { ...d, verification } : d))
    );
    await fetch(`/api/detections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verification }),
    });
  }

  async function markAllSeen() {
    const unseenIds = detections.filter((d) => !d.seen).map((d) => d.id);
    setDetections((prev) => prev.map((d) => ({ ...d, seen: true })));
    await Promise.all(
      unseenIds.map((id) =>
        fetch(`/api/detections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seen: true }),
        })
      )
    );
    fetchStats();
  }

  const unseenCount = detections.filter((d) => !d.seen).length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in rounded-xl border border-red-500/30 bg-surface-card px-4 py-3 shadow-2xl">
          <div className="flex items-center gap-2 text-sm text-white">
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-400 animate-pulse" />
            {toast}
          </div>
        </div>
      )}

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 mr-2">
          <span
            className={clsx(
              "h-2 w-2 rounded-full",
              connected ? "bg-green-400" : "bg-yellow-400 animate-pulse"
            )}
          />
          <span className="text-xs text-gray-500">
            {connected ? "Temps réel actif" : "Connexion..."}
          </span>
        </div>

        <button
          onClick={() => setClassFilter(null)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            !classFilter
              ? "bg-white text-gray-900"
              : "bg-surface-elevated text-gray-400 hover:text-white"
          )}
        >
          Toutes
        </button>

        {ALL_CLASSES.map((cls) => {
          const meta = CLASS_META[cls];
          return (
            <button
              key={cls}
              onClick={() =>
                setClassFilter(classFilter === cls ? null : cls)
              }
              className={clsx(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
                classFilter === cls
                  ? `${meta.bg} ${meta.color} ${meta.border}`
                  : "border-transparent bg-surface-elevated text-gray-400 hover:text-white"
              )}
            >
              {meta.label}
            </button>
          );
        })}

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={unseenOnly}
            onChange={(e) => setUnseenOnly(e.target.checked)}
            className="rounded"
          />
          Non consultées seulement
        </label>

        {unseenCount > 0 && (
          <button
            onClick={markAllSeen}
            className="rounded-md bg-surface-elevated px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Tout marquer vu ({unseenCount})
          </button>
        )}
      </div>

      {/* Detection feed */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-surface-card"
            />
          ))}
        </div>
      ) : detections.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-gray-700/50 bg-surface-card text-gray-500">
          Aucune infraction détectée
        </div>
      ) : (
        <div className="space-y-3">
          {detections.map((d) => (
            <DetectionCard
              key={d.id}
              detection={d}
              onMarkSeen={handleMarkSeen}
              onVerify={handleVerify}
              onOpen={setSelectedDetection}
              isNew={newIds.has(d.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedDetection && (
        <DetectionModal
          detection={detections.find((d) => d.id === selectedDetection.id) ?? selectedDetection}
          onClose={() => setSelectedDetection(null)}
          onMarkSeen={handleMarkSeen}
          onVerify={handleVerify}
        />
      )}
    </div>
  );
}
