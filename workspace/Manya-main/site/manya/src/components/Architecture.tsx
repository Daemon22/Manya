import { useIntersection } from "./useIntersection";

/* ── Architecture Section ── */
export function Architecture() {
  const { ref, visible } = useIntersection();

  const pillars = [
    {
      num: "1",
      title: "Core Integration",
      desc: "Seamless integration of diverse systems into a single coherent framework.",
    },
    {
      num: "2",
      title: "Real-Time Synchronization",
      desc: "Continuous synchronization ensuring all components operate in perfect harmony.",
    },
    {
      num: "3",
      title: "Scalable Infrastructure",
      desc: "Built to grow from local initiatives to global-scale operations.",
    },
    {
      num: "4",
      title: "Adaptive Intelligence",
      desc: "Systems that learn, adapt, and optimize based on real-world conditions.",
    },
  ];

  return (
    <section className="py-24 relative" id="architecture">
      <div
        className="absolute inset-0 pointer-events-none glow-teal"
      />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div
          ref={ref}
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[hsl(var(--fg))]">
            System Architecture
          </h2>
          <p className="text-sm max-w-xl mx-auto leading-relaxed text-[hsl(var(--muted))]">
            Manya is built on a foundation of interconnected components that work in harmony, creating
            a unified platform for global coordination.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {pillars.map((p, i) => (
            <div
              key={p.num}
              className={`card-dark rounded-lg p-6 flex gap-5 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="number-badge flex-shrink-0">{p.num}</div>
              <div>
                <h3 className="font-semibold mb-2 text-[hsl(35_20%_88%)]">{p.title}</h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--muted))]">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
