import * as L from 'leaflet';

export interface ReservoirData {
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  percentageFull: number;
  currentVolume: number;
  maxVolume: number;
}

export function palette(pct: number) {
  if (pct < 10) return { a:'#ff0000', b:'#991b1b', rim:'#fca5a5', glow:'rgba(239,68,68,0.7)',   badge:'#dc2626', text:'#fecaca' };
  if (pct < 20) return { a:'#f97316', b:'#c2410c', rim:'#fdba74', glow:'rgba(249,115,22,0.65)', badge:'#ea580c', text:'#fed7aa' };
  if (pct < 35) return { a:'#facc15', b:'#a16207', rim:'#fde047', glow:'rgba(234,179,8,0.65)',  badge:'#ca8a04', text:'#fef08a' };
  if (pct < 50) return { a:'#4ade80', b:'#15803d', rim:'#86efac', glow:'rgba(34,197,94,0.65)',  badge:'#16a34a', text:'#bbf7d0' };
  if (pct < 70) return { a:'#00eeff', b:'#15803d', rim:'#86efac', glow:'rgba(34,197,94,0.65)',  badge:'#16a34a', text:'#bbf7d0' };
  return               { a:'#0026fc', b:'#0e7490', rim:'#67e8f9', glow:'rgba(6,182,212,0.75)',  badge:'#0e7490', text:'#a5f3fc' };
  
}

export function buildCylinderSVG(pct: number, size: number): string {
  const p   = palette(Math.max(pct, 1));
  const uid = 'cy' + Math.random().toString(36).slice(2, 6);

  const VW = 44, VH = 60;
  const svgH = Math.round(size * VH / VW);

  const cx = 22, rx = 18, ry = 4;
  const top = 8, bot = 54;
  const bodyH = bot - top;

  const wh  = Math.max(0, bodyH * pct / 100);
  const wy  = bot - wh;
  const midWater = wy + wh / 2;
  const ty  = pct > 15 ? midWater + 1 : wy - 8;

  return `
<svg width="${size}" height="${svgH}" viewBox="0 0 ${VW} ${VH}"
     xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
  <defs>
    <clipPath id="cc${uid}">
      <rect x="${cx - rx}" y="${top}" width="${rx * 2}" height="${bodyH}" rx="2"/>
    </clipPath>
    <linearGradient id="wg${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${p.a}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${p.b}" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="gl${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="white" stop-opacity="0.12"/>
      <stop offset="20%"  stop-color="white" stop-opacity="0.06"/>
      <stop offset="50%"  stop-color="white" stop-opacity="0"/>
      <stop offset="80%"  stop-color="white" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="bg${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.04)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.3)"/>
    </linearGradient>
    <filter id="gw${uid}" x="-40%" y="-20%" width="180%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feFlood flood-color="${p.a}" flood-opacity="0.4" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="wglow${uid}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- sombra bajo el cilindro -->
  <ellipse cx="${cx}" cy="${bot + 3}" rx="${rx - 2}" ry="3"
           fill="${p.a}" opacity="0.25" filter="url(#gw${uid})"/>

  <!-- fondo interior -->
  <rect x="${cx - rx}" y="${top}" width="${rx * 2}" height="${bodyH}"
        fill="url(#bg${uid})" rx="2"/>

  ${pct > 0 ? `
  <!-- agua -->
  <rect x="${cx - rx}" y="${wy}" width="${rx * 2}" height="${wh}"
        fill="url(#wg${uid})" clip-path="url(#cc${uid})"
        filter="url(#wglow${uid})"/>
  <!-- burbujas -->
  <circle cx="${cx - 5}" cy="${wy + wh * 0.6}" r="1"   fill="${p.a}" opacity="0.3"  clip-path="url(#cc${uid})"/>
  <circle cx="${cx + 4}" cy="${wy + wh * 0.35}" r="0.8" fill="${p.a}" opacity="0.25" clip-path="url(#cc${uid})"/>
  <circle cx="${cx - 2}" cy="${wy + wh * 0.75}" r="0.6" fill="white" opacity="0.15" clip-path="url(#cc${uid})"/>
  <!-- superficie agua -->
  <ellipse cx="${cx}" cy="${wy}" rx="${rx - 1}" ry="${ry - 1}"
           fill="${p.a}" opacity="0.5" clip-path="url(#cc${uid})"/>
  <ellipse cx="${cx}" cy="${wy}" rx="${rx - 1}" ry="${ry - 1}"
           fill="none" stroke="${p.rim}" stroke-width="0.8" opacity="0.8"/>
  ` : ''}

  <!-- reflejo cristal -->
  <rect x="${cx - rx}" y="${top}" width="${rx * 2}" height="${bodyH}"
        fill="url(#gl${uid})" rx="2" clip-path="url(#cc${uid})"/>
  <rect x="${cx - rx + 2}" y="${top + 4}" width="3" height="${bodyH - 8}"
        fill="white" opacity="0.08" rx="1.5" clip-path="url(#cc${uid})"/>

 <!-- borde cristal -->
  <rect x="${cx - rx}" y="${top}" width="${rx * 2}" height="${bodyH}"
        fill="none" stroke="${p.rim}" stroke-width="1.8" rx="2"/>

  <!-- tapa inferior -->
  <ellipse cx="${cx}" cy="${bot}" rx="${rx}" ry="${ry}"
           fill="rgba(200,210,220,0.15)" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
  <ellipse cx="${cx}" cy="${bot}" rx="${rx - 2}" ry="${ry - 1}" fill="rgba(0,0,0,0.2)"/>

  <!-- tapa superior -->
  <ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}"
           fill="${pct >= 80 ? p.a : 'rgba(180,195,210,0.2)'}"
           opacity="${pct >= 80 ? '0.6' : '1'}"
           stroke="rgba(255,255,255,0.25)" stroke-width="0.8"/>
  <ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}"
           fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
  <ellipse cx="${cx - 3}" cy="${top - 1}" rx="${rx * 0.45}" ry="${ry * 0.4}"
           fill="white" opacity="0.2"/>

  <!-- texto % -->
  ${pct > 0 ? `
  <text x="${cx}" y="${Math.min(bot - 6, Math.max(top + 12, ty))}"
        text-anchor="middle" dominant-baseline="middle"
        fill="#000000" font-size="${size > 44 ? 10 : 8.5}" font-weight="800"
        font-family="DM Sans, system-ui, sans-serif"
        letter-spacing="-0.5"
        >${Math.round(pct)}%</text>
  ` : `
  <text x="${cx}" y="${top + bodyH / 2}"
        text-anchor="middle" dominant-baseline="middle"
        fill="rgba(255,255,255,0.15)" font-size="8" font-weight="700"
        font-family="DM Sans, system-ui, sans-serif">—</text>
  `}
</svg>`.trim();
}

export function createReservoirIcon(reservoir: ReservoirData, size: number = 44): L.DivIcon {
  const pct  = Math.min(100, Math.max(0, reservoir.percentageFull));
  const p    = palette(Math.max(pct, 1));
  const svgH = Math.round(size * 60 / 44);

  const badge = `<div style="
    position:absolute; top:-5px; right:-6px;
    width:15px; height:15px; border-radius:50%;
    background:${p.badge}; color:#fff;
    display:flex; align-items:center; justify-content:center;
    font-size:8px; font-weight:800;
    font-family:'DM Sans',system-ui,sans-serif;
    border:2px solid #080b12; z-index:10;">
  </div>`;

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${svgH}px;">
             ${badge}
             ${buildCylinderSVG(pct, size)}
           </div>`,
    className:   'reservoir-marker',
    iconSize:    [size, svgH],
    iconAnchor:  [size / 2, svgH],
    popupAnchor: [0, -(svgH + 4)],
  });
}

export function buildReservoirPopup(reservoir: ReservoirData): string {
  const p   = palette(reservoir.percentageFull);
  const pct = Math.round(reservoir.percentageFull);
  return `
<div style="font-family:'DM Sans',system-ui,sans-serif;
            background:#0e1520; color:#e2e8f0;
            border-radius:14px; padding:14px 16px;
            min-width:200px; border:1px solid rgba(255,255,255,0.08);">
  <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:10px;">
    💧 ${reservoir.name}
  </div>
  <div style="background:#0f172a;border-radius:99px;height:5px;margin-bottom:8px;">
    <div style="width:${pct}%;background:${p.a};height:5px;border-radius:99px;
                box-shadow:0 0 8px ${p.a};"></div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
    <span>Actual: <strong style="color:${p.text}">${reservoir.currentVolume.toFixed(2)} hm³</strong></span>
    <span><strong style="color:${p.text}">${pct}%</strong></span>
  </div>
  <div style="font-size:11px;color:#475569;margin-top:4px;">
    Máx: ${reservoir.maxVolume.toFixed(2)} hm³
  </div>
</div>`;
}
