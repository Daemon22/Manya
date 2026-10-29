import { LogoMark } from "./Navbar";

/* ── Footer ── */
export function Footer() {
  return (
    <footer className="py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size="sm" />
          <span className="text-sm font-medium text-[hsl(30_10%_50%)]">Manya</span>
        </div>
        <p className="text-xs text-[hsl(30_10%_40%)]">
          Everything Connected. Everyone Unified.
        </p>
      </div>
    </footer>
  );
}
