import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";

type Status = "active" | "degraded" | "coming soon" | string;

export function StatusPill({ status }: { status: Status }) {
  const isActive = status === "active";
  const isSoon = status === "coming soon";
  const Icon = isActive ? CheckCircle2 : isSoon ? Clock3 : TriangleAlert;
  const className = isActive
    ? "border-pulse/40 bg-pulse/10 text-pulse"
    : isSoon
      ? "border-line bg-surface text-muted"
      : "border-[#f0b83d]/40 bg-[#f0b83d]/10 text-[#f0b83d]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${className}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}
