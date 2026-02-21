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
  if (pct < 10) return { a: '#ff0000', rim: '#ff6666', glow: 'rgba(255,0,0,0.6)',    text: '#ffffff' };
  if (pct < 20) return { a: '#f97316', rim: '#fdba74', glow: 'rgba(249,115,22,0.6)', text: '#ffffff' };
  if (pct < 35) return { a: '#facc15', rim: '#fde047', glow: 'rgba(234,179,8,0.6)',  text: '#000000' };
  if (pct < 50) return { a: '#4ade80', rim: '#86efac', glow: 'rgba(34,197,94,0.6)',  text: '#000000' };
  if (pct < 70) return { a: '#00eeff', rim: '#67e8f9', glow: 'rgba(0,238,255,0.6)',  text: '#000000' };
  return               { a: '#0026fc', rim: '#6699ff', glow: 'rgba(0,38,252,0.6)',   text: '#ffffff' };
}

export function buildCylinderSVG(pct: number, size: number): string {
  const p   = palette(Math.max(pct, 0));
  const uid = 'cy' + Math.random().toString(36).slice(2, 6);

  const VW = 44, VH = 60;
  const svgH = Math.round(size * VH / VW);

  const cx = 22, rx = 18, ry = 4;
  const top = 8, bot = 54;
  const bodyH = bot - top;
  const textY = top + bodyH / 2 + 1;

  return `
<svg width="${size}" height="${svgH}" viewBox="0 0 ${VW} ${VH}"
     xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
  <defs>
    <clipPath id="cc${uid}">
      <rect x="${cx - rx}" y="${top}" width="${rx * 2}" height="${bodyH}" rx="2"/>
    </clipPath>
    <linearGradient id="gl${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="white" stop-opacity="0.15"/>
      <stop offset="25%"  stop-color="white" stop-opacity="0.05"/>
      <stop offset="50%"  stop-color="white" stop-opacity="0"/>
      <stop offset="75%"  stop-color="white" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.1"/>
    </linearGradient>
    <filter id="gw${uid}" x="-40%" y="-20%" width="180%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feFlood flood-color="${p.a}" flood-opacity="0.35" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- sombra bajo el cilindro -->
  <ellipse cx="${cx}" cy="${bot + 3}" rx="${rx - 2}" ry="3"
           fill="${p.a}" opacity="0.3" filter="url(#gw${uid})"/>

  <!-- borde exterior negro -->
  <rect x="${cx - rx - 2}" y="${top - 2}" width="${rx * 2 + 4}" height="${bodyH + 4}"
        fill="none" stroke="#000000" stroke-width="4" rx="5"/>

  <!-- cuerpo color sólido completo -->
  <rect x="${cx - rx}" y="${top}" width="${rx * 2}" height="${bodyH}"
        fill="${p.a}" rx="2"/>

  <!-- reflejo cristal -->
  <rect x="${cx - rx}" y="${top}" width="${rx * 2}" height="${bodyH}"
        fill="url(#gl${uid})" rx="2" clip-path="url(#cc${uid})"/>
  <rect x="${cx - rx + 2}" y="${top + 4}" width="3" height="${bodyH - 8}"
        fill="white" opacity="0.12" rx="1.5" clip-path="url(#cc${uid})"/>

  <!-- borde interior blanco -->
  <rect x="${cx - rx}" y="${top}" width="${rx * 2}" height="${bodyH}"
        fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.2" rx="2"/>

  <!-- tapa inferior -->
  <ellipse cx="${cx}" cy="${bot}" rx="${rx}" ry="${ry}"
           fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>

  <!-- tapa superior -->
  <ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}"
           fill="${p.a}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  <ellipse cx="${cx - 3}" cy="${top - 1}" rx="${rx * 0.4}" ry="${ry * 0.4}"
           fill="white" opacity="0.25"/>

  <!-- texto % -->
 <text x="${cx}" y="${textY}"
      text-anchor="middle" dominant-baseline="middle"
      fill="${p.text}" font-size="${size > 44 ? 14 : 12}" font-weight="800"
      font-family="DM Sans, system-ui, sans-serif"
      letter-spacing="-0.5">${Math.round(pct)}%</text>
</svg>`.trim();
}

export function createReservoirIcon(reservoir: ReservoirData, size: number = 44): L.DivIcon {
  const pct  = Math.min(100, Math.max(0, reservoir.percentageFull));
  const svgH = Math.round(size * 60 / 44);

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${svgH}px;">
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
    <span>Actual: <strong style="color:${p.a}">${reservoir.currentVolume.toFixed(2)} hm³</strong></span>
    <span><strong style="color:${p.a}">${pct}%</strong></span>
  </div>
  <div style="font-size:11px;color:#475569;margin-top:4px;">
    Máx: ${reservoir.maxVolume.toFixed(2)} hm³
  </div>
</div>`;
}
