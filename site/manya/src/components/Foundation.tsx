import { useIntersection } from "./useIntersection";
import { NetworkViz } from "./Hero";

/* ── Foundation Section ── */
export function Foundation() {
  const { ref, visible } = useIntersection();

  const features = [
    {
      title: "Global Scale",
      desc: "Connecting systems and people across continents with seamless synchronization.",
    },
    {
      title: "Unified Architecture",
      desc: "A coherent framework that brings together diverse systems into one living ecosystem.",
    },
    {
      title: "Synchronized Intelligence",
      desc: "Systems that think, adapt, and evolve together in real-time harmony.",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden" id="foundation">
      <div className="max-w-6xl mx-auto px-6">
        <div ref={ref} className="grid md:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <h2
              className={`text-3xl md:text-4xl font-bold mb-6 text-[hsl(var(--fg))] transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              The Foundation
            </h2>

            <p
              className={`text-lg italic mb-4 leading-relaxed text-[hsl(35_20%_75%)] font-[var(--font-serif)] transition-all duration-700 delay-100 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              Esi sisiseko somanyano, ukusukela ebantwini, ekuya ehlabathini liphela liphelele.
            </p>

            <p
              className={`text-sm leading-relaxed mb-10 text-[hsl(var(--muted))] transition-all duration-700 delay-200 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              This is the foundation of unity—from humanity to the whole of existence. Manya
              represents a commitment to building systems that transcend boundaries. It is rooted in
              South African values and designed for global impact.
            </p>

            <div className="flex flex-col gap-5">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`card-dark rounded-lg p-5 transition-all duration-700 ${
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: `${0.2 + i * 0.1}s` }}
                >
                  <h3 className="text-sm font-semibold mb-1.5 gold-text">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[hsl(var(--muted))]">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Animated network visualization */}
          <div
            className={`flex justify-center transition-all duration-1000 delay-300 ${
              visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <NetworkViz />
          </div>
        </div>
      </div>
    </section>
  );
}
