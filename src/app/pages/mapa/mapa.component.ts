import {
  Component, OnInit, OnDestroy,
  AfterViewInit, ViewChild, ElementRef,
  NgZone, ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import * as L from 'leaflet';
import { EmbalseService, Embalse } from '../../services/embalse.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mapOutline, arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss'],
  standalone: true,
  imports: [
    CommonModule,   // ← esto incluye | number, | date, *ngIf, *ngFor etc
    FormsModule,
    IonicModule,
  ]
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  // Map
  private map!: L.Map;
  private embalseMarkers: Map<number, L.Marker> = new Map();
  private estacionMarkers: L.Marker[] = [];

  // State
  embalses: Embalse[] = [];
  filteredEmbalses: Embalse[] = [];
  selectedEmbalse: Embalse | null = null;
  panelOpen = true;
  activeTab = 'embalses';
  searchQuery = '';
  currentTime = '';
  today = '';
  layers = { embalses: true, estaciones: true, cauces: false };

  // KPIs
  totalVol = 0;
  totalPct = 0;

  private clockSub!: Subscription;

  constructor(
    private embalseService: EmbalseService,
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ mapOutline, arrowBackOutline });
  }

  ngOnInit() {
    this.startClock();
    this.loadData();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 400);
  }

  ngOnDestroy() {
    this.clockSub?.unsubscribe();
    if (this.map) this.map.remove();
  }

  // CLOCK
  private startClock() {
    this.updateTime();
    this.clockSub = interval(1000).subscribe(() => this.updateTime());
  }

  private updateTime() {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    this.currentTime = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
    this.today = now.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).toUpperCase();
  }

  // DATA
  private loadData() {
    this.embalseService.getEmbalsesLastValueAndPosition().subscribe(data => {
      this.embalses = data.sort((a, b) => b.porcentaje - a.porcentaje);
      this.filteredEmbalses = [...this.embalses];
      this.calcKpis();
      if (this.map) this.renderEmbalseMarkers();
      this.cdr.detectChanges();
    });
  }

  private calcKpis() {
    this.totalVol = this.embalses.reduce((s, e) => s + e.hm3, 0);
    const totalCap = this.embalses.reduce((s, e) => s + e.capacidadMaximaEmbalse, 0);
    this.totalPct = totalCap > 0 ? (this.totalVol / totalCap) * 100 : 0;
  }

  // MAP
  private initMap() {
    if (this.map) return;

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      // Si todavía no existe el div, reintenta
      setTimeout(() => this.initMap(), 200);
      return;
    }

    this.map = L.map('map', {
      center: [38.1, -1.5],
      zoom: 9,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(this.map);

    if (this.embalses.length > 0) this.renderEmbalseMarkers();
  }

  // MARKERS
  private renderEmbalseMarkers() {
    this.embalseMarkers.forEach(m => this.map.removeLayer(m));
    this.embalseMarkers.clear();

    this.embalses.forEach(e => {
      const color = this.getPctColor(e.porcentaje);
      const bg = this.getPctBg(e.porcentaje);
      const size = 36;

      const icon = L.divIcon({
        html: `<div style="
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${bg};
          border:2px solid ${color};
          color:${color};
          display:flex;align-items:center;justify-content:center;
          font-family:'JetBrains Mono',monospace;
          font-size:9px;font-weight:700;
          backdrop-filter:blur(4px);
          box-shadow:0 2px 12px rgba(0,0,0,0.6);
          cursor:pointer;
        ">${e.porcentaje.toFixed(0)}%</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        className: '',
      });

      const varStr = (e.variacion > 0 ? '+' : '') + e.variacion.toFixed(2);
      const varColor = e.variacion >= 0 ? '#00d4aa' : '#ff4d6d';

      const marker = L.marker([e.latitud, e.longitud], { icon })
        .bindPopup(`
          <div style="font-family:'Syne',sans-serif;min-width:180px;padding:4px">
            <div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#e8edf5">${e.nombre}</div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0">
              <span>Volumen</span><span style="color:#e8edf5">${e.hm3.toFixed(2)} hm³</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0">
              <span>Porcentaje</span><span style="color:${color};font-weight:600">${e.porcentaje.toFixed(1)}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b7a90;padding:3px 0">
              <span>Var. 24h</span><span style="color:${varColor}">${varStr} hm³</span>
            </div>
            <div style="height:4px;background:#111a27;border-radius:100px;overflow:hidden;margin-top:8px">
              <div style="height:100%;width:${e.porcentaje}%;background:${color};border-radius:100px"></div>
            </div>
          </div>
        `, { className: 'custom-popup' });

      marker.on('click', () => {
        this.zone.run(() => {
          this.openDetail(e);
          this.cdr.detectChanges();
        });
      });

      if (this.layers.embalses) marker.addTo(this.map);
      this.embalseMarkers.set(e.idEmbalse, marker);
    });
  }

  // ACTIONS
  openDetail(embalse: Embalse) {
    this.selectedEmbalse = embalse;
    if (!this.panelOpen) this.panelOpen = true;
    this.map.flyTo([embalse.latitud, embalse.longitud], 12, { duration: 1.2 });
  }

  closeDetail() {
    this.selectedEmbalse = null;
  }

  togglePanel() {
    this.panelOpen = !this.panelOpen;
  }

  toggleLayer(layer: 'embalses' | 'estaciones' | 'cauces') {
    this.layers[layer] = !this.layers[layer];

    if (layer === 'embalses') {
      this.embalseMarkers.forEach(m => {
        if (this.layers.embalses) m.addTo(this.map);
        else this.map.removeLayer(m);
      });
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.closeDetail();
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase();
    this.filteredEmbalses = this.embalses.filter(e =>
      e.nombre.toLowerCase().includes(q)
    );
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  // HELPERS
  getPctColor(pct: number): string {
    if (pct >= 60) return '#00d4aa';
    if (pct >= 40) return '#0099ff';
    if (pct >= 25) return '#ffd60a';
    return '#ff4d6d';
  }

  getPctBg(pct: number): string {
    if (pct >= 60) return 'rgba(0,212,170,0.15)';
    if (pct >= 40) return 'rgba(0,153,255,0.15)';
    if (pct >= 25) return 'rgba(255,214,10,0.15)';
    return 'rgba(255,77,109,0.15)';
  }
}