"use client";

import { CLASS_META } from "@/lib/constants";

type Stats = {
  totalToday: number;
  unseen: number;
  byClass: Record<string, number>;
};

export default function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-surface-card"
          />
        ))}
      </div>
    );
  }

  const topClasses = Object.entries(stats.byClass)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Infractions aujourd'hui"
        value={stats.totalToday}
        accent="text-white"
      />
      <StatCard
        label="Non consultées"
        value={stats.unseen}
        accent={stats.unseen > 0 ? "text-red-400" : "text-green-400"}
        badge={stats.unseen > 0 ? "!" : undefined}
      />
      {topClasses.map(([cls, count]) => {
        const meta = CLASS_META[cls] ?? { label: cls, color: "text-gray-400" };
        return (
          <StatCard
            key={cls}
            label={meta.label}
            value={count}
            accent={meta.color}
          />
        );
      })}
      {topClasses.length === 0 && (
        <StatCard label="Aucune infraction" value={0} accent="text-gray-500" />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  badge,
}: {
  label: string;
  value: number;
  accent: string;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-surface-card p-4">
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold tabular-nums ${accent}`}>
          {value}
        </span>
        {badge && (
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500 truncate">{label}</p>
    </div>
  );
}
