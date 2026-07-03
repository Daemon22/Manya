import { useEffect, useRef } from "react";
import heroBgImg from "../assets/hero-bg.webp";

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

export function NetworkViz() {
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
      if (!ctx) return;
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

/* ── Hero Section ── */
export function Hero() {
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

        {/* Right: Network visualization */}
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
