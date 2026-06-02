import { useEffect, useRef, useState } from "react";
import heroBgImg from "./assets/hero-bg.webp";

/* ── Intersection Observer Hook ── */
function useIntersection(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Text-based "M" Logo ── */
function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
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
function Navbar() {
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

/* ── Hero ── */
function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      id="vision"
      style={{
        backgroundImage: `url(${heroBgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[rgba(5,3,2,0.48)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-16 grid md:grid-cols-2 gap-12 items-center w-full">
        {/* Left content */}
        <div>
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8 animate-fade-in-up opacity-0">
            <div className="w-8 h-px bg-[hsl(var(--accent))]" />
            <span className="text-xs font-semibold tracking-widest uppercase gold-text">
              Foundation of Unity
            </span>
          </div>

          {/* Zulu quote */}
          <p className="text-2xl md:text-3xl mb-3 leading-relaxed animate-fade-in-up delay-100 opacity-0 text-[hsl(35_20%_82%)] italic font-[var(--font-serif)]">
            Esi sisiseko somanyano, ukusukela ebantwini, ekuya ehlabathini liphela liphelele.
          </p>

          <p className="text-sm mb-8 animate-fade-in-up delay-200 opacity-0 text-[hsl(var(--muted))]">
            This is the foundation of unity, from humanity, to the whole of existence.
          </p>

          {/* Main headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 animate-fade-in-up delay-300 opacity-0">
            <span className="text-[hsl(var(--fg))]">Everything Connected.</span>
            <br />
            <span className="gold-text">Everyone Unified.</span>
          </h1>

          <p className="text-base leading-relaxed mb-10 max-w-md animate-fade-in-up delay-400 opacity-0 text-[hsl(var(--muted))]">
            Manya is a unifying system designed to connect everything and everyone from local to
            global scale. Built on principles of synchronization, it bridges technology and humanity.
          </p>

          <div className="flex flex-wrap gap-4 animate-fade-in-up delay-500 opacity-0">
            <a href="#architecture" className="btn-primary">
              Explore the System
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#tools" className="btn-outline">
              Learn More
            </a>
          </div>
        </div>

        {/* Right: Network visualization (replaces broken system-diagram image) */}
        <div className="relative flex justify-center md:justify-end animate-fade-in delay-300 animate-float opacity-0">
          <NetworkViz />
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none fade-to-bg"
      />
    </section>
  );
}

/* ── Network Visualization (Canvas) ── */
const NODES = [
  { id: "center", x: 200, y: 200, r: 10, label: "Manya" },
  { id: "n1",     x: 200, y: 80,  r: 7,  label: "Global" },
  { id: "n2",     x: 310, y: 140, r: 7,  label: "Systems" },
  { id: "n3",     x: 330, y: 270, r: 7,  label: "Data" },
  { id: "n4",     x: 200, y: 320, r: 7,  label: "People" },
  { id: "n5",     x: 80,  y: 270, r: 7,  label: "Local" },
  { id: "n6",     x: 70,  y: 140, r: 7,  label: "Values" },
  { id: "n7",     x: 200, y: 155, r: 5,  label: "" },
  { id: "n8",     x: 265, y: 185, r: 5,  label: "" },
  { id: "n9",     x: 255, y: 255, r: 5,  label: "" },
  { id: "n10",    x: 145, y: 255, r: 5,  label: "" },
  { id: "n11",    x: 135, y: 185, r: 5,  label: "" },
];

const EDGES: [string, string][] = [
  ["center","n1"],["center","n2"],["center","n3"],["center","n4"],["center","n5"],["center","n6"],
  ["center","n7"],["center","n8"],["center","n9"],["center","n10"],["center","n11"],
  ["n1","n2"],["n2","n3"],["n3","n4"],["n4","n5"],["n5","n6"],["n6","n1"],
  ["n7","n1"],["n7","n2"],["n8","n2"],["n8","n3"],["n9","n3"],["n9","n4"],
  ["n10","n4"],["n10","n5"],["n11","n5"],["n11","n6"],
];

// Pre-index nodes by id for O(1) lookups
const NODE_MAP = new Map(NODES.map((n) => [n.id, n]));

function NetworkViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 400, H = 400;
    canvas.width = W;
    canvas.height = H;

    // Actual rgba strings — CSS custom properties can't be used in canvas 2d context
    const gold = "rgba(212, 165, 116,";
    const teal = "rgba(56, 170, 160,";

    let t = 0;
    const DT = 0.016;

    const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
    const pulse = (offset: number, speed = 0.8) => 0.5 + 0.5 * Math.sin(t * speed + offset);

    function drawFrame() {
      ctx.clearRect(0, 0, W, H);

      // Edges
      for (let i = 0; i < EDGES.length; i++) {
        const a = NODE_MAP.get(EDGES[i][0])!;
        const b = NODE_MAP.get(EDGES[i][1])!;
        const p = pulse(i * 0.4, 0.5);
        const alpha = lerp(0.06, 0.28, p);

        // Base edge line
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `${gold} ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Flowing particle along edge
        const tp = (t * 0.4 + i * 0.17) % 1;
        const px = lerp(a.x, b.x, tp);
        const py = lerp(a.y, b.y, tp);
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 5);
        pg.addColorStop(0, `${gold} 0.9)`);
        pg.addColorStop(1, `${gold} 0)`);
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
      }

      // Nodes
      for (let i = 0; i < NODES.length; i++) {
        const node = NODES[i];
        const p = pulse(i * 0.7, 0.6);
        const glowR = node.r * (2.5 + p * 1.5);
        const isCenter = node.id === "center";
        const color = isCenter ? teal : gold;

        // Outer glow
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
        grd.addColorStop(0, `${color} ${isCenter ? 0.35 : 0.2})`);
        grd.addColorStop(1, `${color} 0)`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = isCenter ? `${teal} 0.9)` : `${gold} 0.85)`;
        ctx.fill();

        // Ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + 2 + p * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `${color} ${0.15 + p * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Label
        if (node.label) {
          ctx.font = isCenter ? "bold 11px Outfit, sans-serif" : "10px Outfit, sans-serif";
          ctx.fillStyle = `${color} 0.85)`;
          ctx.textAlign = "center";
          ctx.fillText(node.label, node.x, node.y + node.r + 14);
        }
      }

      // Outer orbit ring
      const orbitAlpha = 0.07 + 0.04 * pulse(0, 0.3);
      ctx.beginPath();
      ctx.arc(200, 200, 150, 0, Math.PI * 2);
      ctx.strokeStyle = `${gold} ${orbitAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Rotating orbit dot
      const angle = t * 0.4;
      ctx.beginPath();
      ctx.arc(200 + 150 * Math.cos(angle), 200 + 150 * Math.sin(angle), 3, 0, Math.PI * 2);
      ctx.fillStyle = `${gold} 0.7)`;
      ctx.fill();

      t += DT;
      frameRef.current = requestAnimationFrame(drawFrame);
    }

    frameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div
      className="relative rounded-xl overflow-hidden max-w-full network-viz-wrapper"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs tracking-widest uppercase text-[rgba(var(--accent-rgb),0.45)]">
        Live Network Sync
      </div>
    </div>
  );
}

/* ── Foundation Section ── */
function FoundationSection() {
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

/* ── Tools Section ── */
function ToolsSection() {
  const { ref, visible } = useIntersection();

  const tools = [
    {
      name: "uSINGA",
      subtitle: "API NEXUS",
      desc: "Unified API provider management and orchestration.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8l6 6M14 8l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="11" cy="11" r="2.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "HelixFlow",
      subtitle: null,
      desc: "Visual workflow orchestration and automation engine.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 8c3-5 7 1 8-3s5 0 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3 14c3-5 7 1 8-3s5 0 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="5" cy="8" r="1.5" fill="currentColor" />
          <circle cx="17" cy="14" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: "Hawk",
      subtitle: null,
      desc: "Device detection, fingerprinting, and environment monitoring.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 2v3M11 17v3M2 11h3M17 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
        </svg>
      ),
    },
    {
      name: "Craft Engine",
      subtitle: null,
      desc: "7-fold compression and encryption pipeline for data security.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 9h8M7 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 12l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

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
            Four specialized components power the Manya ecosystem—from API management to data
            security.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((tool, i) => (
            <div
              key={tool.name}
              className={`card-dark rounded-lg p-6 text-center transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div
                className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center gold-text icon-circle"
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

/* ── Architecture Section ── */
function ArchitectureSection() {
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

/* ── Values Section ── */
function ValuesSection() {
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

/* ── Connect Section ── */
function ConnectSection() {
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

/* ── Footer ── */
function Footer() {
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

/* ── App ── */
export default function App() {
  return (
    <div className="min-h-screen bg-[hsl(var(--bg))]">
      <Navbar />
      <Hero />
      <FoundationSection />
      <ToolsSection />
      <ArchitectureSection />
      <ValuesSection />
      <ConnectSection />
      <Footer />
    </div>
  );
}
