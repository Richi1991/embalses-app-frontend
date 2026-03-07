import {
  Component, OnInit, OnDestroy,
  AfterViewInit, ViewChild, ElementRef,
  NgZone, ChangeDetectorRef, HostBinding
} from '@angular/core';
import { Router } from '@angular/router';
import { EmbalseService, Embalse } from '../../services/embalse.service';
import { EstacionesService, Estacion, PrecipitacionAcumulada } from '../../services/estaciones.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mapOutline, arrowBackOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { CaudalComponent } from './caudal/caudal.component';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, CaudalComponent]
})
export class MapaPage implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  /** Applies .light-mode CSS class to the :host element */
  @HostBinding('class.light-mode') lightMode = false;

  private tileLayer!: L.TileLayer;

  // Map
  map!: L.Map;
  private embalseMarkers: Map<number, L.Marker> = new Map();
  private estacionMarkersList: L.Marker[] = [];
  private embalseLayer!: L.LayerGroup;
  
  private estacionLayer!: L.LayerGroup;
  private precipitacionAcumulada: PrecipitacionAcumulada[] = [];
  public mostrarCaudales = false;

  // State — embalses
  embalses: Embalse[] = [];
  filteredEmbalses: Embalse[] = [];
  selectedEmbalse: Embalse | null = null;

  // State — estaciones
  estaciones: Estacion[] = [];
  
  filteredEstaciones: Estacion[] = [];
  selectedEstacion: Estacion | null = null;
  loadingEstaciones = false;
  estacionesLoaded = false;
  sonDatosEstacionesHistoricas = false;
  activePeriod: string = 'ULTIMO_DIA';
  panelOpen = window.innerWidth > 768;
  activeTab = 'embalses';
  searchQuery = '';
  currentTime = '';
  today = '';
  layers = { embalses: true, estaciones: false, caudales: false };

  periods = [
    { label: '1D', value: 'ULTIMO_DIA' },
    { label: '1S', value: 'ULTIMA_SEMANA' },
    { label: '1M', value: 'ULTIMO_MES' },
    { label: '3M', value: 'ULTIMOS_TRES_MESES' },
    { label: '6M', value: 'ULTIMOS_SEIS_MESES' },
    { label: '1A', value: 'ULTIMO_ANIO' }
  ];


  // KPIs
  totalVol = 0;
  totalPct = 0;

  constructor(
    private embalseService: EmbalseService,
    private estacionesService: EstacionesService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ mapOutline, arrowBackOutline });
    this.lightMode = localStorage.getItem('mapa-theme') === 'light';
  }

  ngOnInit() {
    this.loadEmbalses();
  }

  async ngAfterViewInit() {
    setTimeout(() => this.initMap(), 400);
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  // ── DATA ───────────────────────────────────────────────────
  private loadEmbalses() {
    this.embalseService.getEmbalsesLastValueAndPosition().subscribe(data => {
      this.embalses = data.sort((a, b) => b.porcentaje - a.porcentaje);
      this.filteredEmbalses = [...this.embalses];
      this.calcKpis();
      if (this.map) this.renderEmbalseMarkers();
      this.cdr.detectChanges();
    });
  }

  private loadEstaciones() {
    if (this.estacionesLoaded) return;
    this.loadingEstaciones = true;
    this.cdr.detectChanges();

    this.estacionesService.getEstacionesAndPrecipitacionesUltimas24h().subscribe({
      next: (data) => {
        this.estaciones = data.filter(e => e.latitud && e.longitud);
        this.filteredEstaciones = [...this.estaciones];
        this.estacionesLoaded = true;
        this.loadingEstaciones = false;
        if (this.map) this.renderEstacionMarkers();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingEstaciones = false;
        this.cdr.detectChanges();
      }
    });
  }

  private calcKpis() {
    this.totalVol = this.embalses.reduce((s, e) => s + e.hm3, 0);
    const totalCap = this.embalses.reduce((s, e) => s + e.capacidadMaximaEmbalse, 0);
    this.totalPct = totalCap > 0 ? (this.totalVol / totalCap) * 100 : 0;
  }

  // ── MAP ────────────────────────────────────────────────────
  private initMap() {
    if (this.map) return;
    const mapContainer = document.getElementById('map');
    if (!mapContainer) { setTimeout(() => this.initMap(), 200); return; }

    this.map = L.map('map', { center: [38.1, -1.5], zoom: 9, zoomControl: true, attributionControl: false });

    // dark_nolabels: sin cuadrícula de líneas blancas, fondo muy oscuro con detalle
    const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    this.tileLayer = L.tileLayer(this.lightMode ? lightTile : darkTile, { attribution: '© CartoDB', maxZoom: 18 }).addTo(this.map);

    this.embalseLayer = L.layerGroup();
    this.estacionLayer = L.layerGroup();

    if (this.layers.embalses) this.map.addLayer(this.embalseLayer);

    this.map.on('zoomend', () => {
      if (this.embalses.length > 0) this.renderEmbalseMarkers();
      if (this.estacionesLoaded && this.layers.estaciones && !this.sonDatosEstacionesHistoricas) this.renderEstacionMarkers();
      if (this.estacionesLoaded && this.layers.estaciones && this.sonDatosEstacionesHistoricas) this.renderEstacionMarkersHistoricas();
    });

    if (this.embalses.length > 0) this.renderEmbalseMarkers();
  }

  /** Marker size scaled by zoom (base at zoom 9) */
  private getMarkerSize(baseSize: number): number {
    const zoom = this.map ? this.map.getZoom() : 9;
    const scale = Math.pow(1.18, zoom - 9);
    return Math.round(Math.max(baseSize * 0.4, Math.min(baseSize * 2.8, baseSize * scale)));
  }

  // ── MARKERS EMBALSES ───────────────────────────────────────
  private renderEmbalseMarkers() {
    if (this.embalseLayer) this.embalseLayer.clearLayers();
    this.embalseMarkers.clear();

    this.embalses.forEach(e => {
      const color = this.getPctColor(e.porcentaje);
      const bg = this.getPctBg(e.porcentaje);
      const size = this.getMarkerSize(36);

      const icon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid ${color};color:${color};display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:${Math.max(7, Math.round(size * 0.25))}px;font-weight:700;backdrop-filter:blur(4px);box-shadow:0 2px 12px rgba(0,0,0,0.45);cursor:pointer;">${e.porcentaje.toFixed(0)}%</div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: '',
      });

      const varStr = (e.variacion > 0 ? '+' : '') + e.variacion.toFixed(2);
      const varColor = e.variacion >= 0 ? '#00d4aa' : '#ff4d6d';

      // Popup adapts to current theme
      const popupText = this.lightMode ? '#1a2535' : '#e8edf5';
      const popupSub = this.lightMode ? '#6b7a90' : '#6b7a90';
      const popupBarBg = this.lightMode ? '#dde3ee' : '#111a27';

      const marker = L.marker([e.latitud, e.longitud], { icon })
        .bindPopup(`
        <div style="font-family:'Syne',sans-serif;min-width:180px;padding:4px">
          <div style="font-size:14px;font-weight:700;margin-bottom:8px;color:${popupText}">${e.nombre}</div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Volumen</span><span style="color:${popupText}">${e.hm3.toFixed(2)} hm³</span></div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Porcentaje</span><span style="color:${color};font-weight:600">${e.porcentaje.toFixed(1)}%</span></div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Var. 24h</span><span style="color:${varColor}">${varStr} hm³</span></div>
          <div style="height:4px;background:${popupBarBg};border-radius:100px;overflow:hidden;margin-top:8px"><div style="height:100%;width:${e.porcentaje}%;background:${color};border-radius:100px"></div></div>
        </div>`, { className: 'custom-popup' });

      marker.on('click', () => this.zone.run(() => { this.openDetailEmbalse(e); this.cdr.detectChanges(); }));

      this.embalseLayer.addLayer(marker);
      this.embalseMarkers.set(e.idEmbalse, marker);
    });
  }

  private renderEstacionMarkers() {
    if (this.estacionLayer) this.estacionLayer.clearLayers();
    this.estacionMarkersList = [];

    this.estaciones.forEach(e => {
      const lat = parseFloat(e.latitud);
      const lng = parseFloat(e.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const precip = e.precipitacion_24h ?? 0;
      const precipColor = this.getPrecipitationColorHistorico(precip, this.activePeriod);

      const sz = this.getMarkerSize(18);
      const icon = L.divIcon({
        html: `<div style="
                width:${sz}px;height:${sz}px;border-radius:3px;
                background:rgba(0,153,255,0.15);
                border:1px solid ${precipColor};
                color:${precipColor};
                display:flex;align-items:center;justify-content:center;
                font-family:'JetBrains Mono',monospace;
                font-size:${Math.max(6, Math.round(sz * 0.38))}px;font-weight:700;
                box-shadow:0 1px 4px rgba(0,0,0,0.35);
                cursor:pointer;
              ">${precip > 0 ? precip.toFixed(0) : '—'}</div>`,
        iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], className: '',
      });

      const popupText = this.lightMode ? '#1a2535' : '#e8edf5';
      const popupSub = '#6b7a90';

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`
          <div style="font-family:'Syne',sans-serif;min-width:200px;padding:4px">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;color:${popupText}">${e.nombre}</div>
            <div style="font-size:10px;color:${popupSub};margin-bottom:8px;letter-spacing:1px;text-transform:uppercase">${e.provincia} · ${e.altitud} m</div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Precip. 1h</span><span style="color:${popupText}">${e.precipitacion_1h?.toFixed(1) ?? '—'} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Precip. 3h</span><span style="color:${popupText}">${e.precipitacion_3h?.toFixed(1) ?? '—'} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Precip. 6h</span><span style="color:${popupText}">${e.precipitacion_6h?.toFixed(1) ?? '—'} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Precip. 12h</span><span style="color:${popupText}">${e.precipitacion_12h?.toFixed(1) ?? '—'} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Precip. 24h</span><span style="color:${precipColor};font-weight:600">${precip.toFixed(1)} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Acum. año</span><span style="color:${popupText}">${e.precipitacionYtd?.toFixed(1) ?? '—'} mm</span></div>
          </div>`, { className: 'custom-popup' });

      marker.on('click', () => this.zone.run(() => { this.openDetailEstacion(e); this.cdr.detectChanges(); }));

      this.estacionLayer.addLayer(marker);
      this.estacionMarkersList.push(marker);
    });

    if (this.layers.estaciones && !this.map.hasLayer(this.estacionLayer)) {
      this.map.addLayer(this.estacionLayer);
    }
  }

  // ── MARKERS ESTACIONES ─────────────────────────────────────
  private renderEstacionMarkersHistoricas() {

    if (this.estacionLayer) this.estacionLayer.clearLayers();
    this.estacionMarkersList = [];
    this.precipitacionAcumulada.forEach(precipAcu => {
      const lat = parseFloat(precipAcu.latitud);
      const lng = parseFloat(precipAcu.longitud);

      if (isNaN(lat) || isNaN(lng)) return;

      const valorAcumulado = precipAcu.valorAcumulado;
      const precip = precipAcu.valorAcumulado ?? 0;
      const precipColor = this.getPrecipitationColorHistorico(precip, this.activePeriod);

      const sz = this.getMarkerSize(18);
      const icon = L.divIcon({
        html: `<div style="
                width:${sz}px;height:${sz}px;border-radius:3px;
                background:rgba(0,153,255,0.15);
                border:1px solid ${precipColor};
                color:${precipColor};
                display:flex;align-items:center;justify-content:center;
                font-family:'JetBrains Mono',monospace;
                font-size:${Math.max(6, Math.round(sz * 0.38))}px;font-weight:700;
                box-shadow:0 1px 4px rgba(0,0,0,0.35);
                cursor:pointer;
              ">${precip > 0 ? precip.toFixed(0) : '—'}</div>`,
        iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], className: '',
      });

      const popupText = this.lightMode ? '#1a2535' : '#e8edf5';
      const popupSub = '#6b7a90';

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`
          <div style="font-family:'Syne',sans-serif;min-width:200px;padding:4px">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;color:${popupText}">${precipAcu.nombre}</div>
            <div style="font-size:10px;color:${popupSub};margin-bottom:8px;letter-spacing:1px;text-transform:uppercase">${precipAcu.indicativo}</div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Precip. 1h</span><span style="color:${popupText}">${valorAcumulado?.toFixed(1) ?? '—'} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:${popupSub};padding:3px 0"><span>Precip. 3h</span><span style="color:${popupText}">${this.activePeriod} meses</span></div>
          </div>`, { className: 'custom-popup' });

      marker.on('click', () => this.zone.run(() => { this.openDetailEstacionHistorica(precipAcu); this.cdr.detectChanges(); }));

      this.estacionLayer.addLayer(marker);
      this.estacionMarkersList.push(marker);
    });

    if (this.layers.estaciones && !this.map.hasLayer(this.estacionLayer)) {
      this.map.addLayer(this.estacionLayer);
    }
  }

  getPrecipitationColorHistorico(precipitacion: number, activePeriod: string): string {

    // 1. Definimos los umbrales para cada periodo
    const { escalas, colores }: { escalas: Record<string, number[]>; colores: string[]; } = this.obtenerEscalasAndColores();

    // 3. Obtenemos los umbrales según el rango elegido
    const umbrales = escalas[activePeriod];

    // 4. Buscamos el color correspondiente
    for (let i = 0; i < umbrales.length; i++) {
      if (precipitacion > umbrales[i]) {
        return colores[i];
      }
    }

    return '#b9b9b9'; // Si no llega al mínimo
  }

  private obtenerEscalasAndColores() {
    const escalas: Record<string, number[]> = {
      "ULTIMO_DIA": [100, 80, 70, 60, 50, 40, 30, 20, 10, 5, 1, 0.1, 0],
      "ULTIMA_SEMANA": [150, 125, 100, 85, 75, 60, 50, 30, 20, 10, 5, 1, 0],
      "ULTIMAS_DOS_SEMANAS": [200, 150, 130, 100, 80, 60, 50, 30, 20, 10, 5, 1, 0],
      "ULTIMO_MES": [200, 160, 130, 110, 90, 70, 50, 30, 20, 10, 5, 1, 0],
      "ULTIMOS_TRES_MESES": [350, 280, 225, 180, 150, 120, 80, 50, 30, 20, 10, 5, 0],
      "ULTIMOS_SEIS_MESES": [600, 500, 400, 350, 280, 225, 175, 125, 80, 40, 20, 10, 0],
      "ULTIMO_ANIO": [1000, 800, 700, 550, 400, 300, 200, 150, 100, 80, 50, 20, 0]
    };

    // 2. Definimos tu paleta de colores (se mantiene constante)
    const colores = [
      '#ff3366', // Rosa neón (Máximo) — en vez de granate oscuro
      '#ff66ff', // Magenta brillante
      '#cc66ff', // Violeta neón
      '#aa88ff', // Lavanda
      '#4444ff', // Azul eléctrico — en vez de azul casi negro
      '#3399ff', // Azul brillante
      '#00ccff', // Cian eléctrico
      '#00ffcc', // Verde agua neón
      '#66ffaa', // Verde menta
      '#ccff66', // Lima
      '#ffff44', // Amarillo neón
      '#b9b9b9',
      '#ffffff' // Blanco (Mínimo) — en vez de amarillo pálido
    ];
    return { escalas, colores };
  }

  // ── ACTIONS ────────────────────────────────────────────────
  openDetailEmbalse(embalse: Embalse) {
    this.selectedEmbalse = embalse;
    this.selectedEstacion = null;
    if (!this.panelOpen) this.panelOpen = true;
    this.activeTab = 'embalses';
    this.map.flyTo([embalse.latitud, embalse.longitud], 12, { duration: 1.2 });
  }

  openDetailEstacion(estacion: Estacion) {
    this.selectedEstacion = estacion;
    this.selectedEmbalse = null;
    if (!this.panelOpen) this.panelOpen = true;
    this.activeTab = 'estaciones';
    const lat = parseFloat(estacion.latitud);
    const lng = parseFloat(estacion.longitud);
    if (!isNaN(lat) && !isNaN(lng)) this.map.flyTo([lat, lng], 13, { duration: 1.2 });
  }

  openDetailEstacionHistorica(precipAcu: PrecipitacionAcumulada) {
    this.selectedEmbalse = null;
    if (!this.panelOpen) this.panelOpen = true;
    this.activeTab = 'estaciones';
    const lat = parseFloat(precipAcu.latitud);
    const lng = parseFloat(precipAcu.longitud);
    if (!isNaN(lat) && !isNaN(lng)) this.map.flyTo([lat, lng], 13, { duration: 1.2 });
  }

  openDetail(embalse: Embalse) { this.openDetailEmbalse(embalse); }

  closeDetail() {
    this.selectedEmbalse = null;
    this.selectedEstacion = null;
  }

  get estacionesConLluvia(): number {
    return this.estaciones.filter(e => (e.precipitacion_24h ?? 0) > 0).length;
  }

  togglePanel() { this.panelOpen = !this.panelOpen; }

  toggleLayer(layer: 'embalses' | 'estaciones' | 'caudales') {
    this.layers[layer] = !this.layers[layer];

    switch (layer) {
      case 'embalses':
        this.layers.embalses
          ? this.map.addLayer(this.embalseLayer)
          : this.map.removeLayer(this.embalseLayer);
          break;
      case 'estaciones':
        if (this.layers.estaciones) {
          if (!this.estacionesLoaded) {
            this.loadEstaciones();
          } else {
            this.map.addLayer(this.estacionLayer);
          }
          this.activeTab = 'estaciones';
        } else {
          this.map.removeLayer(this.estacionLayer);
        }
        break;
      case 'caudales':
        if (this.layers.caudales){
          this.mostrarCaudales = true;
        } else {
          this.mostrarCaudales = false;
        }
    }
  }

  toggleTheme() {
    this.lightMode = !this.lightMode;
    localStorage.setItem('mapa-theme', this.lightMode ? 'light' : 'dark');

    // Swap tile layer

    const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    this.tileLayer.setUrl(this.lightMode ? lightTile : darkTile);

    // Re-render markers so popup colors match the new theme
    if (this.embalses.length > 0) this.renderEmbalseMarkers();
    if (this.estacionesLoaded && this.layers.estaciones && !this.sonDatosEstacionesHistoricas) this.renderEstacionMarkers();
    if (this.estacionesLoaded && this.layers.estaciones && this.sonDatosEstacionesHistoricas) this.renderEstacionMarkersHistoricas();

    this.cdr.detectChanges();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.closeDetail();
    if (tab === 'estaciones' && !this.estacionesLoaded) {
      this.layers.estaciones = true;
      this.loadEstaciones();
    }
    this.searchQuery = '';
    this.filteredEmbalses = [...this.embalses];
    this.filteredEstaciones = [...this.estaciones];
  }

  cargarEstacionesDesdeBotoneraTiempo(period: string) {
    this.estacionesService.getHistoricoPrecipitaciones(period).subscribe({
      next: (data) => {
        this.precipitacionAcumulada = data.filter(e => e.indicativo && e.nombre && e.valorAcumulado);
        this.estacionesLoaded = true;
        this.activePeriod = period;
        this.loadingEstaciones = false;
        this.sonDatosEstacionesHistoricas = true;
        if (this.map && period !== 'ULTIMO DIA') this.renderEstacionMarkersHistoricas();
        this.cdr.detectChanges();
        if (this.map && period === 'ULTIMO DIA') this.renderEstacionMarkers();
        this.cdr.detectChanges();
      }
    });
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase();
    if (this.activeTab === 'embalses') {
      this.filteredEmbalses = this.embalses.filter(e => e.nombre.toLowerCase().includes(q));
    } else {
      this.filteredEstaciones = this.estaciones.filter(e =>
        e.nombre.toLowerCase().includes(q) || e.provincia.toLowerCase().includes(q)
      );
    }
  }

  goBack() { this.router.navigate(['/dashboard']); }

  // ── HELPERS ────────────────────────────────────────────────
  getPctColor(pct: number): string {
    if (pct >= 60) return '#0099ff';
    if (pct >= 40) return '#00d4aa';
    if (pct >= 25) return '#ffd60a';
    return '#ff4d6d';
  }

  getPctBg(pct: number): string {
    if (pct >= 60) return 'rgba(0,153,255,0.18)';
    if (pct >= 40) return 'rgba(0,212,170,0.18)';
    if (pct >= 25) return 'rgba(255,214,10,0.18)';
    return 'rgba(255,77,109,0.18)';
  }

  getPrecipLabel(mm: number): string {
    if (mm <= 0) return 'Sin lluvia';
    if (mm < 2) return 'Traza';
    if (mm < 10) return 'Ligera';
    if (mm < 30) return 'Moderada';
    return 'Intensa';
  }
}
