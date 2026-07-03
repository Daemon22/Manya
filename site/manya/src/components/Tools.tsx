import { useIntersection } from "./useIntersection";

/* ── Tool Icon Components ── */

function IconUSINGA() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8l6 6M14 8l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="11" r="2.5" fill="currentColor" />
    </svg>
  );
}

function IconHelixFlow() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 8c3-5 7 1 8-3s5 0 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 14c3-5 7 1 8-3s5 0 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconHawk() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 2v3M11 17v3M2 11h3M17 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
    </svg>
  );
}

function IconCraftEngine() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 9h8M7 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 12l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconForge() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 18L11 4L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 13h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 9l2-3 2 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconStamp() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="5" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12v3M14 12v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="15" width="16" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconVault() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="1.5" fill="currentColor" />
      <path d="M11 3v3M11 16v3M3 11h3M16 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconLens() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2L4 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6L11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 11l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSignal() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M5 15a8 8 0 010-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 13a5 5 0 010-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="11" r="1.5" fill="currentColor" />
      <path d="M17 7a8 8 0 010 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 9a5 5 0 010 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPulse() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M2 11h4l3-7 4 14 3-7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Tools Data ── */
const tools = [
  {
    name: "uSINGA",
    subtitle: "API NEXUS",
    desc: "Unified API provider management and orchestration.",
    icon: <IconUSINGA />,
  },
  {
    name: "HelixFlow",
    subtitle: null,
    desc: "Visual workflow orchestration and automation engine.",
    icon: <IconHelixFlow />,
  },
  {
    name: "Hawk",
    subtitle: null,
    desc: "Device detection, fingerprinting, and environment monitoring.",
    icon: <IconHawk />,
  },
  {
    name: "Craft Engine",
    subtitle: null,
    desc: "7-fold compression and encryption pipeline for data security.",
    icon: <IconCraftEngine />,
  },
  {
    name: "Forge",
    subtitle: null,
    desc: "Build, compile, and deploy modular system components at scale.",
    icon: <IconForge />,
  },
  {
    name: "Stamp",
    subtitle: null,
    desc: "Certification, verification, and immutable record stamping.",
    icon: <IconStamp />,
  },
  {
    name: "Vault",
    subtitle: null,
    desc: "Secure key management and encrypted secrets storage.",
    icon: <IconVault />,
  },
  {
    name: "Lens",
    subtitle: null,
    desc: "Deep observability, analytics, and real-time system insights.",
    icon: <IconLens />,
  },
  {
    name: "Shield",
    subtitle: null,
    desc: "Threat detection, access control, and compliance enforcement.",
    icon: <IconShield />,
  },
  {
    name: "Signal",
    subtitle: null,
    desc: "Real-time messaging, event streaming, and notification routing.",
    icon: <IconSignal />,
  },
  {
    name: "Pulse",
    subtitle: "INDUSTRY SYNC",
    desc: "Cross-industry compliance intelligence and regulatory synchronization.",
    icon: <IconPulse />,
    highlight: true,
  },
];

/* ── Tools Section ── */
export function Tools() {
  const { ref, visible } = useIntersection();

  return (
    <section className="py-24 relative" id="tools">
      <div className="section-divider mb-24" />
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={ref}
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[hsl(var(--fg))]">
            The Tools
          </h2>
          <p className="text-sm max-w-xl mx-auto leading-relaxed text-[hsl(var(--muted))]">
            Eleven specialized components power the Manya ecosystem—from API management and workflow
            automation to compliance intelligence and real-time observability.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((tool, i) => (
            <div
              key={tool.name}
              className={`card-dark rounded-lg p-6 text-center transition-all duration-700 ${
                tool.highlight ? "ring-1 ring-[hsl(var(--accent))]/30" : ""
              } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 0.07}s` }}
            >
              <div
                className={`w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center gold-text icon-circle ${
                  tool.highlight ? "ring-1 ring-[hsl(var(--accent))]/20" : ""
                }`}
              >
                {tool.icon}
              </div>
              <h3 className="font-semibold text-lg mb-0.5 text-[hsl(35_20%_88%)]">
                {tool.name}
              </h3>
              {tool.subtitle && (
                <p className="text-xs font-medium gold-text mb-2">{tool.subtitle}</p>
              )}
              {!tool.subtitle && <div className="mb-2" />}
              <p className="text-sm text-[hsl(var(--muted))]">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
