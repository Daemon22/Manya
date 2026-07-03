import { useIntersection } from "./useIntersection";

/* ── Values Section ── */
export function Values() {
  const { ref, visible } = useIntersection();

  const values = [
    {
      title: "Ubuntu",
      subtitle: "I am because we are.",
      desc: "Interconnectedness is fundamental.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="4" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="18" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 14.5C7 12 9 11 11 11s4 1 5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: "Synchronization",
      subtitle: "All systems move in harmony.",
      desc: "Creating a unified whole.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 2v3M11 17v3M2 11h3M17 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="11" cy="11" r="5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="11" cy="11" r="2" fill="currentColor" />
        </svg>
      ),
    },
    {
      title: "Sovereignty",
      subtitle: "Built with local ownership.",
      desc: "And global reach in mind.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 2L4 7v5c0 4 3.5 7 7 8 3.5-1 7-4 7-8V7L11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 11l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-24" id="values">
      <div className="section-divider mb-24" />
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={ref}
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[hsl(var(--fg))]">
            Core Values
          </h2>
          <p className="text-sm text-[hsl(var(--muted))]">
            Manya is grounded in principles that honor both heritage and innovation.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <div
              key={v.title}
              className={`card-dark rounded-lg p-8 text-center transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              <div
                className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center gold-text icon-circle"
              >
                {v.icon}
              </div>
              <h3 className="font-semibold text-lg mb-1.5 text-[hsl(35_20%_88%)]">{v.title}</h3>
              <p className="text-sm gold-text font-medium mb-1.5">{v.subtitle}</p>
              <p className="text-sm text-[hsl(var(--muted))]">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
