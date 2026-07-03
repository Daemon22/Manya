/**
 * Manya CLI — Manya Weaver visualization HTML generator (Interactive v2).
 *
 * Generates a self-contained HTML file with an interactive force-directed
 * graph that:
 *   - Keeps nodes within a soft circular boundary (order amidst chaos)
 *   - Lets users drag nodes together to probe potential connections
 *   - Checks canConnect() in real-time as nodes approach each other
 *   - Attracts nodes when a connection is possible (establishes on release)
 *   - Repels nodes when a connection is impossible
 *   - Strengthens established connections over time
 *
 * The rules engine (weaver-rules.js) is embedded directly so the
 * visualization works offline with no external dependencies.
 */

import { canConnect, buildContext } from './weaver-rules.js';

/**
 * Generates the interactive Weaver HTML.
 * @param {object} input
 * @param {Array} input.tools - Registered tools.
 * @param {Array} input.identities - Federated identities.
 * @param {Array} input.channels - Sync channels (unused, kept for API compat).
 * @returns {string} Self-contained HTML.
 */
export function generateWeaveHtml({ tools, identities, channels }) {
  // Build nodes
  const nodes = [];
  const edges = [];

  for (const tool of tools) {
    nodes.push({
      id: `tool:${tool.toolId}`,
      label: tool.name || tool.toolId,
      kind: 'tool',
      toolId: tool.toolId,
      capabilities: tool.owns || [],
      handsOff: tool.handsOff || [],
      syncChannels: tool.syncChannels || [],
      radius: 28 + (tool.owns?.length || 0) * 2,
    });
  }

  // Sync-channel edges
  const channelsMap = new Map();
  for (const tool of tools) {
    for (const ch of tool.syncChannels || []) {
      if (!channelsMap.has(ch)) channelsMap.set(ch, []);
      channelsMap.get(ch).push(tool.toolId);
    }
  }
  for (const [channel, owners] of channelsMap) {
    if (owners.length < 2) continue;
    for (let i = 0; i < owners.length; i++) {
      for (let j = i + 1; j < owners.length; j++) {
        edges.push({ from: `tool:${owners[i]}`, to: `tool:${owners[j]}`, kind: 'sync-channel', label: channel, established: true, strength: 1.0 });
      }
    }
  }

  // Identity nodes
  for (const identity of identities) {
    nodes.push({
      id: `identity:${identity.id}`,
      label: identity.metadata?.name || identity.id.slice(0, 12),
      kind: 'identity',
      identityId: identity.id,
      primaryType: identity.primary.type,
      linkedTypes: (identity.linked || []).map(l => l.type),
      linkedSources: (identity.linked || []).map(l => l.source).filter(Boolean),
      radius: 8,
    });
  }

  // Type nodes
  const typesUsed = new Set();
  for (const identity of identities) {
    typesUsed.add(identity.primary.type);
    for (const link of identity.linked || []) typesUsed.add(link.type);
  }
  for (const type of typesUsed) {
    nodes.push({ id: `type:${type}`, label: type, kind: 'type', typeId: type, radius: 12 });
  }

  // Identity → type edges
  for (const identity of identities) {
    edges.push({ from: `identity:${identity.id}`, to: `type:${identity.primary.type}`, kind: 'primary', established: true, strength: 1.0 });
    for (const link of identity.linked || []) {
      edges.push({ from: `identity:${identity.id}`, to: `type:${link.type}`, kind: 'linked', established: true, strength: 0.8 });
    }
  }

  // Build context for canConnect
  const context = buildContext(tools, identities);
  // Add handsOff info to context for tool-to-tool checks
  context.capabilitiesByTool = {};
  for (const tool of tools) {
    context.capabilitiesByTool[tool.toolId] = tool.owns || [];
  }
  // Add identity links from linked sources
  context.identityLinks = {};
  for (const identity of identities) {
    for (const link of identity.linked || []) {
      if (link.source) {
        if (!context.identityLinks[link.source]) context.identityLinks[link.source] = [];
        if (!context.identityLinks[link.source].includes(identity.id)) {
          context.identityLinks[link.source].push(identity.id);
        }
      }
    }
  }

  const dataJson = JSON.stringify({ nodes, edges, context }, null, 2);
  const rulesJson = JSON.stringify({
    canConnectFn: canConnect.toString(),
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Manya Weaver — Interactive Connection Former</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1410; color: #f5ede0; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #canvas { display: block; width: 100%; height: 100%; cursor: grab; }
  #canvas:active { cursor: grabbing; }
  .panel { position: fixed; top: 16px; left: 16px; background: rgba(26, 20, 16, 0.92); border: 1px solid rgba(212, 165, 116, 0.25); border-radius: 12px; padding: 16px 20px; backdrop-filter: blur(12px); max-width: 340px; z-index: 10; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); }
  .panel h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; background: linear-gradient(135deg, #f4c430, #d4a574); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .panel .subtitle { font-size: 12px; color: #a89a85; margin-bottom: 12px; }
  .panel .stat { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-top: 1px solid rgba(212, 165, 116, 0.08); }
  .panel .stat:first-of-type { border-top: none; }
  .panel .stat .label { color: #a89a85; }
  .panel .stat .value { color: #f5ede0; font-weight: 600; }
  .legend { position: fixed; bottom: 16px; left: 16px; background: rgba(26, 20, 16, 0.92); border: 1px solid rgba(212, 165, 116, 0.25); border-radius: 12px; padding: 12px 16px; backdrop-filter: blur(12px); z-index: 10; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 3px 0; color: #f5ede0; }
  .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
  .legend-dot.tool { background: #d4a574; box-shadow: 0 0 8px #d4a574; }
  .legend-dot.identity { background: #38aaa0; box-shadow: 0 0 8px #38aaa0; }
  .legend-dot.type { background: #7fb069; box-shadow: 0 0 8px #7fb069; }
  .legend-line { width: 16px; height: 2px; }
  .legend-line.established { background: rgba(212, 165, 116, 0.6); }
  .legend-line.potential { background: rgba(244, 196, 48, 0.6); border-top: 1px dashed rgba(244, 196, 48, 0.8); height: 0; }
  .legend-line.rejected { background: rgba(224, 120, 86, 0.3); border-top: 1px dotted rgba(224, 120, 86, 0.6); height: 0; }
  .controls { position: fixed; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 10; }
  .controls button { background: rgba(26, 20, 16, 0.92); border: 1px solid rgba(212, 165, 116, 0.25); color: #f5ede0; padding: 8px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; backdrop-filter: blur(12px); transition: all 0.2s; font-weight: 600; }
  .controls button:hover { background: rgba(212, 165, 116, 0.2); border-color: #d4a574; }
  .tooltip { position: fixed; background: rgba(26, 20, 16, 0.96); border: 1px solid rgba(212, 165, 116, 0.5); border-radius: 8px; padding: 10px 14px; font-size: 12px; pointer-events: none; z-index: 20; max-width: 320px; display: none; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5); }
  .tooltip .title { font-weight: 700; margin-bottom: 4px; color: #f4c430; }
  .tooltip .row { color: #a89a85; }
  .tooltip .row b { color: #f5ede0; }
  .tooltip .rule { margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(212, 165, 116, 0.15); color: #f5ede0; font-size: 11px; }
  .tooltip .rule.possible { color: #4caf50; }
  .tooltip .rule.impossible { color: #e07856; }
  .footer { position: fixed; bottom: 16px; right: 16px; font-size: 11px; color: #6b5f50; z-index: 10; }
  .footer .gradient-text { background: linear-gradient(135deg, #f4c430, #d4a574); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; }
  .hint { position: fixed; bottom: 80px; right: 16px; background: rgba(26, 20, 16, 0.92); border: 1px solid rgba(212, 165, 116, 0.25); border-radius: 8px; padding: 10px 14px; font-size: 11px; color: #a89a85; max-width: 240px; z-index: 10; backdrop-filter: blur(12px); }
  .hint b { color: #f4c430; }
</style>
</head>
<body>
<canvas id="canvas"></canvas>
<div class="panel">
  <h1>Manya Weaver</h1>
  <div class="subtitle">Interactive Connection Former — drag to probe, release to establish</div>
  <div class="stat"><span class="label">Tools</span><span class="value" id="stat-tools">0</span></div>
  <div class="stat"><span class="label">Identities</span><span class="value" id="stat-identities">0</span></div>
  <div class="stat"><span class="label">Types</span><span class="value" id="stat-types">0</span></div>
  <div class="stat"><span class="label">Established</span><span class="value" id="stat-established">0</span></div>
  <div class="stat"><span class="label">Probing</span><span class="value" id="stat-probing">0</span></div>
  <div class="stat"><span class="label">Rejected</span><span class="value" id="stat-rejected">0</span></div>
</div>
<div class="legend">
  <div class="legend-item"><span class="legend-dot tool"></span>Tool</div>
  <div class="legend-item"><span class="legend-dot identity"></span>Identity</div>
  <div class="legend-item"><span class="legend-dot type"></span>Identifier type</div>
  <div class="legend-item"><span class="legend-line established"></span>Established connection</div>
  <div class="legend-item"><span class="legend-line potential"></span>Potential (drag together)</div>
  <div class="legend-item"><span class="legend-line rejected"></span>Cannot connect</div>
</div>
<div class="controls">
  <button id="btn-reheat">Reheat</button>
  <button id="btn-center">Center</button>
  <button id="btn-show-potentials">Show all potentials</button>
</div>
<div class="tooltip" id="tooltip"></div>
<div class="hint"><b>Drag</b> nodes together to probe connections.<br>Valid connections <b>attract</b> and establish on release.<br>Invalid connections <b>repel</b>.</div>
<div class="footer"><span class="gradient-text">Manya</span> Weaver v0.9.0</div>
<script>
const DATA = ${dataJson};
const RULES = ${rulesJson};

// Reconstruct canConnect from its stringified source
const canConnect = eval('(' + RULES.canConnectFn + ')');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
let width, height, dpr, cx, cy, boundaryRadius;

function resize() {
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = width / 2;
  cy = height / 2;
  boundaryRadius = Math.min(width, height) * 0.42;
}
resize();
window.addEventListener('resize', resize);

// Stats
function updateStats() {
  document.getElementById('stat-tools').textContent = DATA.nodes.filter(n => n.kind === 'tool').length;
  document.getElementById('stat-identities').textContent = DATA.nodes.filter(n => n.kind === 'identity').length;
  document.getElementById('stat-types').textContent = DATA.nodes.filter(n => n.kind === 'type').length;
  document.getElementById('stat-established').textContent = DATA.edges.filter(e => e.established).length;
  document.getElementById('stat-probing').textContent = DATA.edges.filter(e => e.kind === 'potential').length;
  document.getElementById('stat-rejected').textContent = DATA.edges.filter(e => e.kind === 'rejected').length;
}

// Initialize positions
DATA.nodes.forEach((n, i) => {
  const angle = (i / DATA.nodes.length) * Math.PI * 2;
  n.x = cx + Math.cos(angle) * boundaryRadius * 0.5 + (Math.random() - 0.5) * 50;
  n.y = cy + Math.sin(angle) * boundaryRadius * 0.5 + (Math.random() - 0.5) * 50;
  n.vx = 0;
  n.vy = 0;
});

// Build node index
const nodeIndex = new Map();
DATA.nodes.forEach(n => nodeIndex.set(n.id, n));

// Existing edge set (for quick lookup)
const edgeSet = new Set();
DATA.edges.forEach(e => { edgeSet.add(e.from + '|' + e.to); edgeSet.add(e.to + '|' + e.from); });

// Potential/rejected edges (transient, recomputed each frame for nearby pairs)
let transientEdges = [];
let showAllPotentials = false;

// Force simulation
function tick() {
  // 1. Repulsion (Coulomb) between all nodes
  for (let i = 0; i < DATA.nodes.length; i++) {
    for (let j = i + 1; j < DATA.nodes.length; j++) {
      const a = DATA.nodes[i], b = DATA.nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = 2000 / (dist * dist);
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      a.vx -= fx; a.vy -= fy;
      b.vx += fx; b.vy += fy;
    }
  }

  // 2. Attraction (springs) along established edges
  for (const edge of DATA.edges) {
    if (!edge.established) continue;
    const a = nodeIndex.get(edge.from), b = nodeIndex.get(edge.to);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const targetDist = edge.kind === 'sync-channel' ? 240 : edge.kind === 'primary' ? 60 : 90;
    const force = (dist - targetDist) * 0.03 * (edge.strength || 1.0);
    const fx = (dx / dist) * force, fy = (dy / dist) * force;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  // 3. Probe nearby pairs for potential connections
  transientEdges = [];
  const probeRadius = 180; // distance at which probing starts
  for (let i = 0; i < DATA.nodes.length; i++) {
    for (let j = i + 1; j < DATA.nodes.length; j++) {
      const a = DATA.nodes[i], b = DATA.nodes[j];
      if (a === dragNode || b === dragNode) {
        // Only probe when one node is being dragged
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < probeRadius) {
          const key = a.id + '|' + b.id;
          if (edgeSet.has(key)) continue; // already established
          const rule = canConnect(a, b, DATA.context);
          if (rule.possible) {
            transientEdges.push({ from: a.id, to: b.id, kind: 'potential', reason: rule.reason, edgeType: rule.edgeType, strength: rule.strength, dist });
            // Attract: pull the non-dragged node toward the dragged one
            const attractForce = (1 - dist / probeRadius) * 0.5;
            const fx = (dx / dist) * attractForce, fy = (dy / dist) * attractForce;
            if (a === dragNode) { b.vx += fx; b.vy += fy; }
            else { a.vx -= fx; a.vy -= fy; }
          } else {
            transientEdges.push({ from: a.id, to: b.id, kind: 'rejected', reason: rule.reason, dist });
            // Repel: push the non-dragged node away
            const repelForce = (1 - dist / probeRadius) * 0.8;
            const fx = (dx / dist) * repelForce, fy = (dy / dist) * repelForce;
            if (a === dragNode) { b.vx -= fx; b.vy -= fy; }
            else { a.vx += fx; a.vy += fy; }
          }
        }
      }
    }
  }

  // 4. Show all potentials mode (when not dragging)
  if (showAllPotentials && !dragNode) {
    for (let i = 0; i < DATA.nodes.length; i++) {
      for (let j = i + 1; j < DATA.nodes.length; j++) {
        const a = DATA.nodes[i], b = DATA.nodes[j];
        const key = a.id + '|' + b.id;
        if (edgeSet.has(key)) continue;
        const rule = canConnect(a, b, DATA.context);
        if (rule.possible) {
          transientEdges.push({ from: a.id, to: b.id, kind: 'potential', reason: rule.reason, edgeType: rule.edgeType, strength: rule.strength, dist: 0 });
        }
      }
    }
  }

  // 5. Centering
  for (const n of DATA.nodes) {
    n.vx += (cx - n.x) * 0.001;
    n.vy += (cy - n.y) * 0.001;
  }

  // 6. Boundary containment — soft circular wall
  for (const n of DATA.nodes) {
    const dx = n.x - cx, dy = n.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > boundaryRadius) {
      const overshoot = dist - boundaryRadius;
      const fx = (dx / dist) * overshoot * 0.1;
      const fy = (dy / dist) * overshoot * 0.1;
      n.vx -= fx; n.vy -= fy;
    }
  }

  // 7. Apply velocity with damping
  for (const n of DATA.nodes) {
    n.vx *= 0.85;
    n.vy *= 0.85;
    n.x += n.vx;
    n.y += n.vy;
    // Hard boundary
    const dx = n.x - cx, dy = n.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > boundaryRadius + 30) {
      n.x = cx + (dx / dist) * (boundaryRadius + 30);
      n.y = cy + (dy / dist) * (boundaryRadius + 30);
    }
  }

  updateStats();
}

// Render
let hoverNode = null;
let dragNode = null;
let mouseX = 0, mouseY = 0;
let probeInfo = null;

function render() {
  ctx.clearRect(0, 0, width, height);

  // Boundary circle (subtle)
  ctx.beginPath();
  ctx.arc(cx, cy, boundaryRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 165, 116, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Background glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, boundaryRadius);
  grad.addColorStop(0, 'rgba(212, 165, 116, 0.04)');
  grad.addColorStop(1, 'rgba(26, 20, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Draw established edges
  for (const edge of DATA.edges) {
    if (!edge.established) continue;
    const a = nodeIndex.get(edge.from), b = nodeIndex.get(edge.to);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    if (edge.kind === 'sync-channel') { ctx.strokeStyle = 'rgba(212, 165, 116, 0.3)'; ctx.lineWidth = 1.5; }
    else if (edge.kind === 'primary') { ctx.strokeStyle = 'rgba(56, 170, 160, 0.6)'; ctx.lineWidth = 2; }
    else { ctx.strokeStyle = 'rgba(56, 170, 160, 0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw transient edges (potential + rejected)
  for (const edge of transientEdges) {
    const a = nodeIndex.get(edge.from), b = nodeIndex.get(edge.to);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    if (edge.kind === 'potential') {
      const alpha = Math.max(0.2, 1 - edge.dist / 180);
      ctx.strokeStyle = 'rgba(244, 196, 48, ' + alpha + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
    } else {
      const alpha = Math.max(0.15, 1 - edge.dist / 180) * 0.6;
      ctx.strokeStyle = 'rgba(224, 120, 86, ' + alpha + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw nodes
  for (const n of DATA.nodes) {
    const isHovered = (n === hoverNode);
    const isDragged = (n === dragNode);

    // Glow
    let glowColor;
    if (n.kind === 'tool') glowColor = 'rgba(212, 165, 116, ' + (isHovered || isDragged ? '0.5' : '0.25') + ')';
    else if (n.kind === 'identity') glowColor = 'rgba(56, 170, 160, ' + (isHovered || isDragged ? '0.6' : '0.3') + ')';
    else glowColor = 'rgba(127, 176, 105, ' + (isHovered || isDragged ? '0.5' : '0.25') + ')';
    const glowR = n.radius * (isHovered || isDragged ? 2.5 : 2);
    const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, glowColor.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    if (n.kind === 'tool') {
      const g = ctx.createRadialGradient(n.x - n.radius/3, n.y - n.radius/3, 0, n.x, n.y, n.radius);
      g.addColorStop(0, '#f4c430'); g.addColorStop(1, '#b8860b');
      ctx.fillStyle = g;
    } else if (n.kind === 'identity') {
      const g = ctx.createRadialGradient(n.x - n.radius/3, n.y - n.radius/3, 0, n.x, n.y, n.radius);
      g.addColorStop(0, '#5cc4ba'); g.addColorStop(1, '#2a7a72');
      ctx.fillStyle = g;
    } else {
      const g = ctx.createRadialGradient(n.x - n.radius/3, n.y - n.radius/3, 0, n.x, n.y, n.radius);
      g.addColorStop(0, '#9bc47f'); g.addColorStop(1, '#3a6a35');
      ctx.fillStyle = g;
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 237, 224, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#f5ede0';
    ctx.font = n.kind === 'tool' ? '700 12px Outfit, Inter, sans-serif' : '11px Outfit, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (n.kind === 'tool') ctx.fillText(n.label, n.x, n.y + n.radius + 14);
    else if (n.kind === 'type') ctx.fillText(n.label, n.x, n.y + n.radius + 12);
    else { ctx.font = '9px Outfit, Inter, sans-serif'; ctx.fillStyle = 'rgba(245, 237, 224, 0.6)'; ctx.fillText(n.label, n.x, n.y + n.radius + 10); }
  }
}

function nodeAt(x, y) {
  for (let i = DATA.nodes.length - 1; i >= 0; i--) {
    const n = DATA.nodes[i];
    const dx = x - n.x, dy = y - n.y;
    if (dx * dx + dy * dy <= n.radius * n.radius) return n;
  }
  return null;
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  if (dragNode) {
    dragNode.x = mouseX;
    dragNode.y = mouseY;
    dragNode.vx = 0; dragNode.vy = 0;
  } else {
    hoverNode = nodeAt(mouseX, mouseY);
    if (hoverNode) {
      canvas.style.cursor = 'pointer';
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 14) + 'px';
      tooltip.style.top = (e.clientY + 14) + 'px';
      let html = '';
      if (hoverNode.kind === 'tool') {
        html = '<div class="title">' + hoverNode.label + '</div>';
        html += '<div class="row">id: <b>' + hoverNode.toolId + '</b></div>';
        html += '<div class="row">capabilities: <b>' + hoverNode.capabilities.length + '</b></div>';
        html += '<div class="row">sync channels: <b>' + hoverNode.syncChannels.length + '</b></div>';
      } else if (hoverNode.kind === 'identity') {
        html = '<div class="title">' + hoverNode.label + '</div>';
        html += '<div class="row">id: <b>' + hoverNode.identityId + '</b></div>';
        html += '<div class="row">primary: <b>' + hoverNode.primaryType + '</b></div>';
        html += '<div class="row">linked: <b>' + hoverNode.linkedTypes.length + '</b></div>';
      } else {
        html = '<div class="title">Identifier Type</div><div class="row">type: <b>' + hoverNode.typeId + '</b></div>';
      }
      // Show connection rule for the nearest other node
      let nearest = null, nearestDist = Infinity;
      for (const n of DATA.nodes) {
        if (n === hoverNode) continue;
        const dx = n.x - hoverNode.x, dy = n.y - hoverNode.y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist && d < 200 * 200) { nearestDist = d; nearest = n; }
      }
      if (nearest) {
        const rule = canConnect(hoverNode, nearest, DATA.context);
        const cls = rule.possible ? 'possible' : 'impossible';
        const icon = rule.possible ? '✓' : '✗';
        html += '<div class="rule ' + cls + '">' + icon + ' ' + rule.reason + '</div>';
      }
      tooltip.innerHTML = html;
    } else {
      canvas.style.cursor = 'grab';
      tooltip.style.display = 'none';
    }
  }
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  dragNode = nodeAt(x, y);
});

canvas.addEventListener('mouseup', (e) => {
  if (!dragNode) return;
  // On release: check if any potential connection is close enough to establish
  const dropX = e.clientX - canvas.getBoundingClientRect().left;
  const dropY = e.clientY - canvas.getBoundingClientRect().top;
  let nearest = null, nearestDist = Infinity;
  for (const n of DATA.nodes) {
    if (n === dragNode) continue;
    const dx = n.x - dragNode.x, dy = n.y - dragNode.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nearestDist && d < (dragNode.radius + n.radius + 20)) { nearestDist = d; nearest = n; }
  }
  if (nearest) {
    const key = dragNode.id + '|' + nearest.id;
    if (!edgeSet.has(key)) {
      const rule = canConnect(dragNode, nearest, DATA.context);
      if (rule.possible) {
        // Establish the connection!
        DATA.edges.push({ from: dragNode.id, to: nearest.id, kind: rule.edgeType || 'established', established: true, strength: rule.strength, reason: rule.reason });
        edgeSet.add(key);
        edgeSet.add(nearest.id + '|' + dragNode.id);
      }
    }
  }
  dragNode = null;
});

canvas.addEventListener('mouseleave', () => { dragNode = null; hoverNode = null; tooltip.style.display = 'none'; });

document.getElementById('btn-reheat').addEventListener('click', () => {
  DATA.nodes.forEach(n => { n.vx = (Math.random() - 0.5) * 20; n.vy = (Math.random() - 0.5) * 20; });
});
document.getElementById('btn-center').addEventListener('click', () => {
  DATA.nodes.forEach(n => { n.x = cx + (Math.random() - 0.5) * 100; n.y = cy + (Math.random() - 0.5) * 100; n.vx = 0; n.vy = 0; });
});
document.getElementById('btn-show-potentials').addEventListener('click', (e) => {
  showAllPotentials = !showAllPotentials;
  e.target.textContent = showAllPotentials ? 'Hide potentials' : 'Show all potentials';
});

function loop() {
  for (let i = 0; i < 3; i++) tick();
  render();
  requestAnimationFrame(loop);
}
loop();
updateStats();
</script>
</body>
</html>`;
}
