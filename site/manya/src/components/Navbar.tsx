import { useEffect, useState } from "react";

/* ── Text-based "M" Logo ── */
export function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  return (
    <div
      className={`${dim} rounded-md flex items-center justify-center font-bold gold-text logo-mark`}
    >
      M
    </div>
  );
}

/* ── Navbar ── */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Vision", href: "#vision" },
    { label: "Tools", href: "#tools" },
    { label: "Architecture", href: "#architecture" },
    { label: "Industries", href: "#industries" },
    { label: "Connect", href: "#connect" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[rgba(13,8,4,0.92)] backdrop-blur-xl border-b border-white/[0.06]" : ""
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <LogoMark />
          <span className="text-lg font-semibold tracking-wide text-[hsl(var(--fg))]">
            Manya
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-[hsl(var(--muted))] hover:text-[hsl(var(--fg))] transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 bg-[hsl(var(--fg))] transition-all duration-200" />
          <span className="block w-5 h-0.5 bg-[hsl(var(--fg))] transition-all duration-200" />
          <span className="block w-5 h-0.5 bg-[hsl(var(--fg))] transition-all duration-200" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-4 bg-[rgba(13,8,4,0.96)]">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium py-1 text-[hsl(var(--muted-light))]"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
