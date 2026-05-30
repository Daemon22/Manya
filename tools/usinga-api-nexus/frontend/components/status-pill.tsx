import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";

type Status = "active" | "degraded" | "coming soon" | string;

export function StatusPill({ status }: { status: Status }) {
  const isActive = status === "active";
  const isSoon = status === "coming soon";
  const Icon = isActive ? CheckCircle2 : isSoon ? Clock3 : TriangleAlert;
  const className = isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : isSoon
      ? "border-slate-200 bg-slate-50 text-slate-600"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${className}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}

