import { useIntersection } from "./useIntersection";

/* ── Industry Icons ── */

function IconHealthcare() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M9 2h4v7h7v4h-7v7H9v-7H2V9h7V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconFinance() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 10h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLegal() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2L3 7v1c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V7L11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11 8v4M11 14v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconIoT() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 8.5l2 5M13.5 8.5l-2 5M9.5 7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconGovernment() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 18h16M5 18V10l6-6 6 6v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 18v-4h4v4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 6v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconEducation() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 3L2 8l9 5 9-5-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 10v5c0 2 3 4 6 4s6-2 6-4v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconRetail() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 8h14l-1 9H5L4 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 8V5a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconEnergy() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M12 2L5 12h5l-1 8 7-10h-5l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconTelecom() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M6 3v4a5 5 0 0010 0V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 12v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 16l-1 3h12l-1-3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconGaming() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="6" width="18" height="10" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10v2M6 11h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <circle cx="13" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

/* ── Industries Data ── */
const industries = [
  {
    name: "Healthcare",
    compliance: "HIPAA / HITECH",
    desc: "Patient data protection, EHR integration, and telehealth compliance.",
    icon: <IconHealthcare />,
  },
  {
    name: "Finance",
    compliance: "PCI DSS / SOX",
    desc: "Transaction security, fraud detection, and regulatory reporting.",
    icon: <IconFinance />,
  },
  {
    name: "Legal",
    compliance: "GDPR / ABA",
    desc: "Data sovereignty, privilege management, and e-discovery compliance.",
    icon: <IconLegal />,
  },
  {
    name: "IoT & Manufacturing",
    compliance: "ISO 27001 / IEC 62443",
    desc: "Device authentication, supply chain integrity, and OT security.",
    icon: <IconIoT />,
  },
  {
    name: "Government & Defense",
    compliance: "FedRAMP / ITAR",
    desc: "Classification handling, zero-trust architecture, and sovereign cloud.",
    icon: <IconGovernment />,
  },
  {
    name: "Education",
    compliance: "FERPA / COPPA",
    desc: "Student privacy, accessibility standards, and institutional integration.",
    icon: <IconEducation />,
  },
  {
    name: "Retail & E-Commerce",
    compliance: "PCI DSS / CCPA",
    desc: "Payment security, consumer privacy, and omnichannel compliance.",
    icon: <IconRetail />,
  },
  {
    name: "Energy & Utilities",
    compliance: "NERC CIP / IEC 62351",
    desc: "Critical infrastructure protection and grid cybersecurity.",
    icon: <IconEnergy />,
  },
  {
    name: "Telecommunications",
    compliance: "FCC / 3GPP",
    desc: "Network slicing security, 5G compliance, and data retention.",
    icon: <IconTelecom />,
  },
  {
    name: "Gaming & Entertainment",
    compliance: "COPPA / GDPR-K",
    desc: "Age-gate compliance, in-app purchase transparency, and content moderation.",
    icon: <IconGaming />,
  },
];

/* ── Industries Section ── */
export function Industries() {
  const { ref, visible } = useIntersection();

  return (
    <section className="py-24 relative" id="industries">
      <div className="section-divider mb-24" />
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={ref}
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[hsl(var(--fg))]">
            Industry Coverage
          </h2>
          <p className="text-sm max-w-xl mx-auto leading-relaxed text-[hsl(var(--muted))]">
            Pulse delivers compliance intelligence and regulatory synchronization across ten
            critical industries—each with its own frameworks, standards, and requirements.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {industries.map((ind, i) => (
            <div
              key={ind.name}
              className={`card-dark rounded-lg p-5 text-center transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 0.07}s` }}
            >
              <div
                className="w-11 h-11 rounded-full mx-auto mb-4 flex items-center justify-center gold-text icon-circle"
              >
                {ind.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1 text-[hsl(35_20%_88%)]">
                {ind.name}
              </h3>
              <p className="text-[10px] font-medium tracking-wider uppercase teal-text mb-2">
                {ind.compliance}
              </p>
              <p className="text-xs leading-relaxed text-[hsl(var(--muted))]">
                {ind.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Pulse callout */}
        <div
          className={`mt-10 card-dark rounded-lg p-6 flex flex-col md:flex-row items-center gap-6 text-center md:text-left transition-all duration-700 delay-500 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center gold-text icon-circle ring-1 ring-[hsl(var(--accent))]/20">
            <svg width="26" height="26" viewBox="0 0 22 22" fill="none">
              <path d="M2 11h4l3-7 4 14 3-7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1 text-[hsl(35_20%_88%)]">
              Powered by <span className="gold-text">Pulse</span>
            </h3>
            <p className="text-sm leading-relaxed text-[hsl(var(--muted))]">
              Pulse continuously monitors regulatory changes across all ten industries, automatically
              synchronizing compliance requirements with your systems—so you stay ahead of every update.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
