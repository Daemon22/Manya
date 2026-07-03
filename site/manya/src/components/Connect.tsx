import { useIntersection } from "./useIntersection";

/* ── Connect Section ── */
export function Connect() {
  const { ref, visible } = useIntersection();

  return (
    <section className="py-24 relative overflow-hidden" id="connect">
      <div
        className="absolute inset-0 pointer-events-none glow-warm"
      />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div
          ref={ref}
          className={`max-w-2xl mx-auto text-center transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div
            className="w-px h-16 mx-auto mb-10 accent-vline"
          />
          <h2 className="text-3xl md:text-4xl font-bold mb-5 text-[hsl(var(--fg))]">
            Join the Unified System
          </h2>
          <p className="text-sm leading-relaxed mb-10 text-[hsl(var(--muted))]">
            Be part of a global movement to connect, synchronize, and create impact at scale.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#" className="btn-primary">
              Get Started
            </a>
            <a href="#" className="btn-outline">
              Documentation
            </a>
          </div>
        </div>
      </div>
      <div className="section-divider mt-24" />
    </section>
  );
}
