import {
  Component, OnInit, OnDestroy,
  AfterViewInit, ViewChild, ElementRef,
  NgZone, ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription, forkJoin } from 'rxjs';
import * as L from 'leaflet';
(window as any).L = L;
import { EmbalseService, Embalse } from '../../services/embalse.service';
import { EstacionesService, Estacion } from '../../services/estaciones.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mapOutline, arrowBackOutline } from 'ionicons/icons';
import 'leaflet.markercluster';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  lightMode = false;
  private tileLayer!: L.TileLayer;

  // Map
  private map!: L.Map;
  private embalseMarkers: Map<number, L.Marker> = new Map();
  private estacionMarkersList: L.Marker[] = [];
  private embalseCluster!: any;
  private estacionCluster!: any;

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

  panelOpen = window.innerWidth > 768;
  activeTab = 'embalses';
  searchQuery = '';
  currentTime = '';
  today = '';
  layers = { embalses: true, estaciones: false, cauces: false };

  // KPIs
  totalVol = 0;
  totalPct = 0;

  private clockSub!: Subscription;

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
    this.startClock();
    this.loadEmbalses();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 400);
  }

  ngOnDestroy() {
    this.clockSub?.unsubscribe();
    if (this.map) this.map.remove();
  }

  // ── CLOCK ──────────────────────────────────────────────────
  private startClock() {
    this.updateTime();
    this.clockSub = interval(1000).subscribe(() => this.updateTime());
  }

  private updateTime() {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    this.currentTime = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
    this.today = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
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
    if (this.estacionesLoaded) return; // carga lazy: solo una vez
    this.loadingEstaciones = true;
    this.cdr.detectChanges();

    this.estacionesService.getEstacionesAndPrecipitacionesUltimas24h().subscribe({
      next: (data) => {
        // Filtramos las que tienen coordenadas válidas
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
    this.tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(this.map);

    // 1. Crear clusters primero
    this.embalseCluster = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="width:42px;height:42px;border-radius:50%;background:rgba(0,212,170,0.2);border:2px solid #00d4aa;color:#00d4aa;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;box-shadow:0 2px 12px rgba(0,0,0,0.6)">${count}</div>`,
          iconSize: [42, 42], iconAnchor: [21, 21], className: ''
        });
      }
    });

    this.estacionCluster = (L as any).markerClusterGroup({
      maxClusterRadius: 30,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="width:22px;height:22px;border-radius:4px;background:rgba(0,153,255,0.2);border:1.5px solid #0099ff;color:#0099ff;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.5)">${count}</div>`,
          iconSize: [22, 22], iconAnchor: [11, 11], className: ''
        });
      }
    });

    if (this.layers.embalses) this.map.addLayer(this.embalseCluster);

    // 2. Renderizar marcadores después
    if (this.embalses.length > 0) this.renderEmbalseMarkers();
  }

  // ── MARKERS EMBALSES ───────────────────────────────────────
  private renderEmbalseMarkers() {
    // Limpiar del cluster, no del mapa directamente
    if (this.embalseCluster) this.embalseCluster.clearLayers();
    this.embalseMarkers.clear();

    this.embalses.forEach(e => {
      const color = this.getPctColor(e.porcentaje);
      const bg = this.getPctBg(e.porcentaje);
      const size = 36;

      const icon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid ${color};color:${color};display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;backdrop-filter:blur(4px);box-shadow:0 2px 12px rgba(0,0,0,0.6);cursor:pointer;">${e.porcentaje.toFixed(0)}%</div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: '',
      });

      const varStr = (e.variacion > 0 ? '+' : '') + e.variacion.toFixed(2);
      const varColor = e.variacion >= 0 ? '#00d4aa' : '#ff4d6d';

      const marker = L.marker([e.latitud, e.longitud], { icon })
        .bindPopup(`
        <div style="font-family:'Syne',sans-serif;min-width:180px;padding:4px">
          <div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#e8edf5">${e.nombre}</div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0"><span>Volumen</span><span style="color:#e8edf5">${e.hm3.toFixed(2)} hm³</span></div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0"><span>Porcentaje</span><span style="color:${color};font-weight:600">${e.porcentaje.toFixed(1)}%</span></div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0"><span>Var. 24h</span><span style="color:${varColor}">${varStr} hm³</span></div>
          <div style="height:4px;background:#111a27;border-radius:100px;overflow:hidden;margin-top:8px"><div style="height:100%;width:${e.porcentaje}%;background:${color};border-radius:100px"></div></div>
        </div>`, { className: 'custom-popup' });

      marker.on('click', () => this.zone.run(() => { this.openDetailEmbalse(e); this.cdr.detectChanges(); }));

      this.embalseCluster.addLayer(marker);
      this.embalseMarkers.set(e.idEmbalse, marker);
    });
  }

  // ── MARKERS ESTACIONES ─────────────────────────────────────
  private renderEstacionMarkers() {
    if (this.estacionCluster) this.estacionCluster.clearLayers();
    this.estacionMarkersList = [];

    this.estaciones.forEach(e => {
      const lat = parseFloat(e.latitud);
      const lng = parseFloat(e.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const precip = e.precipitacionesDTO?.precipitacion24h ?? 0;
      const precipColor = this.getPrecipColor(precip);

      const icon = L.divIcon({
        html: `<div style="
                width:18px;height:18px;border-radius:3px;
                background:rgba(0,153,255,0.15);
                border:1px solid ${precipColor};
                color:${precipColor};
                display:flex;align-items:center;justify-content:center;
                font-family:'JetBrains Mono',monospace;
                font-size:7px;font-weight:700;
                box-shadow:0 1px 4px rgba(0,0,0,0.4);
                cursor:pointer;
              ">${precip > 0 ? precip.toFixed(0) : '—'}</div>`,
        iconSize: [18, 18], iconAnchor: [9, 9], className: '',
      });

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`
          <div style="font-family:'Syne',sans-serif;min-width:200px;padding:4px">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;color:#e8edf5">${e.nombre}</div>
            <div style="font-size:10px;color:#6b7a90;margin-bottom:8px;letter-spacing:1px;text-transform:uppercase">${e.provincia} · ${e.altitud} m</div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0"><span>Precip. 1h</span><span style="color:#e8edf5">${e.precipitacionesDTO?.precipitacion1h?.toFixed(1) ?? '—'} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0"><span>Precip. 6h</span><span style="color:#e8edf5">${e.precipitacionesDTO?.precipitacion6h?.toFixed(1) ?? '—'} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0"><span>Precip. 24h</span><span style="color:${precipColor};font-weight:600">${precip.toFixed(1)} mm</span></div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0"><span>Acum. año</span><span style="color:#e8edf5">${e.precipitacionesDTO?.precipitacionYtd?.toFixed(1) ?? '—'} mm</span></div>
          </div>`, { className: 'custom-popup' });

      marker.on('click', () => this.zone.run(() => { this.openDetailEstacion(e); this.cdr.detectChanges(); }));

      this.estacionCluster.addLayer(marker);
      this.estacionMarkersList.push(marker);
    });
    if (this.layers.estaciones && !this.map.hasLayer(this.estacionCluster)) {
      this.map.addLayer(this.estacionCluster);
    }
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

  // mantener compatibilidad con el HTML que ya usa openDetail/closeDetail
  openDetail(embalse: Embalse) { this.openDetailEmbalse(embalse); }

  closeDetail() {
    this.selectedEmbalse = null;
    this.selectedEstacion = null;
  }

  get estacionesConLluvia(): number {
    return this.estaciones.filter(e => (e.precipitacionesDTO?.precipitacion24h ?? 0) > 0).length;
  }

  togglePanel() { this.panelOpen = !this.panelOpen; }

  toggleLayer(layer: 'embalses' | 'estaciones' | 'cauces') {
    this.layers[layer] = !this.layers[layer];

    if (layer === 'embalses') {
      this.layers.embalses
        ? this.map.addLayer(this.embalseCluster)
        : this.map.removeLayer(this.embalseCluster);
    }

    if (layer === 'estaciones') {
      if (this.layers.estaciones) {
        if (!this.estacionesLoaded) {
          this.loadEstaciones();
        } else {
          this.map.addLayer(this.estacionCluster);
        }
        this.activeTab = 'estaciones';
      } else {
        this.map.removeLayer(this.estacionCluster);
      }
    }
  }

  toggleTheme() {
    this.lightMode = !this.lightMode;
    localStorage.setItem('mapa-theme', this.lightMode ? 'light' : 'dark');

    const tileUrl = this.lightMode
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    this.tileLayer.setUrl(tileUrl);
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.closeDetail();
    // Si se activa el tab de estaciones y la capa está on, carga datos
    if (tab === 'estaciones' && !this.estacionesLoaded) {
      this.layers.estaciones = true;
      this.loadEstaciones();
    }
    // Sincroniza la búsqueda al cambiar de tab
    this.searchQuery = '';
    this.filteredEmbalses = [...this.embalses];
    this.filteredEstaciones = [...this.estaciones];
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
    if (pct >= 60) return 'rgba(0,212,170,0.15)';
    if (pct >= 40) return 'rgba(0,153,255,0.15)';
    if (pct >= 25) return 'rgba(255,214,10,0.15)';
    return 'rgba(255,77,109,0.15)';
  }

  getPrecipColor(mm: number): string {
    if (mm <= 0) return '#4a5568';   // sin lluvia — gris
    if (mm < 2) return '#a0c4ff';   // traza
    if (mm < 10) return '#0099ff';   // lluvia ligera — azul
    if (mm < 30) return '#0055cc';   // moderada
    return '#7b2fff';                   // intensa — violeta
  }

  getPrecipLabel(mm: number): string {
    if (mm <= 0) return 'Sin lluvia';
    if (mm < 2) return 'Traza';
    if (mm < 10) return 'Ligera';
    if (mm < 30) return 'Moderada';
    return 'Intensa';
  }
}
