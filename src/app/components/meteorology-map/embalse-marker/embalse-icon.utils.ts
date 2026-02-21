import * as L from 'leaflet';

export interface ReservoirData {
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  percentageFull: number;   // 0–100
  currentVolume: number;    // hm³
  maxVolume: number;        // hm³
}

/**
 * Returns a hex color based on reservoir fill percentage.
 * Matches the color scheme from the map precipitation markers.
 */
export function getLevelColor(pct: number): { water: string; border: string; text: string } {
  if (pct < 15) return { water: '#ff0000', border: '#fca5a5', text: '#fca5a5' };
  if (pct < 25) return { water: '#f97316', border: '#fdba74', text: '#fdba74' };
  if (pct < 40) return { water: '#b2ea08', border: '#fde047', text: '#fde047' };
  if (pct < 60) return { water: '#22c55e', border: '#86efac', text: '#86efac' };
  if (pct < 80) return { water: '#22bac5', border: '#86efac', text: '#86efac' };
  if (pct < 100) return { water: '#0019fe', border: '#86efac', text: '#86efac' };
  return { water: '#06b6d4', border: '#67e8f9', text: '#67e8f9' };
}

/**
 * Generates the SVG string for a trapezoidal dam icon.
 * @param pct       Fill percentage (0–100)
 * @param size      Icon width in px (height is auto-calculated)
 * @param uniqueId  Unique string to avoid clipPath ID collisions on the page
 */
export function buildDamSvg(pct: number, size: number = 44, uniqueId: string = ''): string {
  const c = getLevelColor(pct);
  const bodyH  = Math.round(size * 0.68);
  const topW   = Math.round(size * 0.52);
  const botW   = Math.round(size * 0.82);
  const waterH = Math.round((pct / 100) * bodyH);
  const totalH = size + 14;

  const left   = (size - botW) / 2;
  const right  = (size + botW) / 2;
  const tLeft  = (size - topW) / 2;
  const tRight = (size + topW) / 2;

  const clipId = `dam-clip-${uniqueId}`;
  const pts    = `${tLeft},0 ${tRight},0 ${right},${bodyH} ${left},${bodyH}`;

  return `
<svg width="${size}" height="${totalH}" viewBox="0 0 ${size} ${totalH}"
     xmlns="http://www.w3.org/2000/svg" overflow="visible">
  <defs>
    <clipPath id="${clipId}">
      <polygon points="${pts}"/>
    </clipPath>
  </defs>

  <!-- Dam body background -->
  <polygon points="${pts}" fill="#1e293b" stroke="${c.border}" stroke-width="1.5"/>

  <!-- Water fill -->
  <rect
    x="${left}" y="${bodyH - waterH}"
    width="${botW}" height="${waterH}"
    fill="${c.water}" opacity="0.85"
    clip-path="url(#${clipId})"
  />

  <!-- Water surface line -->
  ${waterH > 2 ? `<line
    x1="${left + 2}" y1="${bodyH - waterH}"
    x2="${right - 2}" y2="${bodyH - waterH}"
    stroke="white" stroke-width="1" opacity="0.35"
  />` : ''}

  <!-- Dam border on top -->
  <polygon points="${pts}" fill="none" stroke="${c.border}" stroke-width="1.5"/>

  <!-- Percentage label below the dam -->
  <text
    x="${size / 2}" y="${bodyH + 12}"
    text-anchor="middle"
    fill="${c.text}"
    font-size="9"
    font-weight="700"
    font-family="system-ui, sans-serif"
  >${Math.round(pct)}%</text>
</svg>`.trim();
}

/**
 * Creates a Leaflet DivIcon for a reservoir.
 * Use this as the `icon` option when adding a marker to the map.
 */
export function createReservoirIcon(reservoir: ReservoirData, size: number = 44): L.DivIcon {
  const pct       = Math.min(100, Math.max(0, reservoir.percentageFull));
  const uniqueId  = `res-${reservoir.id}`;
  const svgHtml   = buildDamSvg(pct, size, uniqueId);
  const totalH    = size + 14;

  return L.divIcon({
    html: svgHtml,
    className: 'reservoir-marker',          // add custom CSS via this class if needed
    iconSize:    [size, totalH],
    iconAnchor:  [size / 2, totalH],        // anchor at bottom-center of the icon
    popupAnchor: [0, -(totalH + 4)],        // popup appears above the icon
  });
}

/**
 * Builds a styled HTML string for the Leaflet popup.
 */
export function buildReservoirPopup(reservoir: ReservoirData): string {
  const c   = getLevelColor(reservoir.percentageFull);
  const pct = Math.round(reservoir.percentageFull);

  return `
<div style="
  font-family: system-ui, sans-serif;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
  min-width: 200px;
  border: 1px solid #334155;
">
  <div style="font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 10px;">
    💧 ${reservoir.name}
  </div>

  <!-- Progress bar -->
  <div style="background:#0f172a; border-radius:99px; height:6px; margin-bottom:8px;">
    <div style="
      width: ${pct}%;
      background: ${c.water};
      height: 6px;
      border-radius: 99px;
      transition: width 0.3s;
    "></div>
  </div>

  <div style="display:flex; justify-content:space-between; font-size:11px; color:#94a3b8;">
    <span>Actual: <strong style="color:${c.text}">${reservoir.currentVolume.toFixed(2)} hm³</strong></span>
    <span><strong style="color:${c.text}">${pct}%</strong></span>
  </div>
  <div style="font-size:11px; color:#64748b; margin-top:4px;">
    Capacidad máx: ${reservoir.maxVolume.toFixed(2)} hm³
  </div>
</div>`;
}
