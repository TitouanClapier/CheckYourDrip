import Dashboard from "@/components/Dashboard";

export default function HomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          Tableau de bord — Infractions vestimentaires
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Surveillance en temps réel via YOLOv11
        </p>
      </div>
      <Dashboard />
    </div>
  );
}
