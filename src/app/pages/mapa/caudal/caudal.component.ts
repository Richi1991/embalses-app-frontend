import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CaudalesService } from 'src/app/services/caudales.service';
import { UltimaLecturaCaudalDTO } from '../../../services/caudales.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-caudal',
  templateUrl: './caudal.component.html',
  standalone: true,
  styleUrls: ['./caudal.component.scss'],
})
export class CaudalComponent implements OnInit {
  @Input() mapa: L.Map;

  private redHidroGraficaLayer!: L.GeoJSON;
  private caudalesLayer!: L.LayerGroup;
  caudales: UltimaLecturaCaudalDTO[] = [];

  layers = { caudales: false };

  private tramoEstacionMap = new Map<number, UltimaLecturaCaudalDTO | null>();

  constructor(
    private caudalesService: CaudalesService,
    private cdr: ChangeDetectorRef) {
  }

  ngOnInit() {
    this.layers.caudales = true;
    this.loadCaudales();
  }

  private loadCaudales() {
    this.caudalesService.getLastCaudalAndPosition().subscribe({
      next: (data) => {
        this.caudales = data;
        this.cargarGeoJSON();
        this.renderCaudalesMarkers();
        this.cdr.detectChanges();
      }
    })
  }

  private cargarGeoJSON() {
    fetch('assets/red_hidrografica.geojson')
      .then(response => response.json())
      .then(data => {
        
        this.preComputeTramoEstacionMap(data.features);

        this.redHidroGraficaLayer = L.geoJSON(data, {
          style: (feature) => {
            const color = this.getColorParaTramo(feature);
            return {
              color,
              weight: color === '#444444' ? 1 : 3,
              opacity: color === '#444444' ? 0.4 : 0.9
            };
          },
          onEachFeature: (feature, layer) => {
            const cauce = this.getCauceMasCercano(feature, 15);
            const nombre = feature?.properties?.nombre ?? 'Cauce desconocido';
            if (cauce) {
              layer.bindPopup(`
              <div style="font-family:'JetBrains Mono',monospace;min-width:160px">
                <div style="font-weight:700;margin-bottom:6px">${nombre}</div>
                <div>Estación: ${cauce.nombre}</div>
                <div>Caudal: <b>${cauce.ultimoDatoCaudal.toFixed(2)} m³/s</b></div>
                <div>Nivel: ${cauce.porcentajeNivel.toFixed(1)}%</div>
              </div>
            `);
            } else {
              layer.bindPopup(`<div style="font-family:'JetBrains Mono',monospace">${nombre}<br><small>Sin estación cercana</small></div>`);
            }
          }
        }).addTo(this.mapa);
      });
  }

  private preComputeTramoEstacionMap(features: any[]) {
    const MAX_KM = 5;

    features.forEach((feature, idx) => {
      feature.properties._idx = idx;

      const coords: number[][] = feature.geometry?.coordinates ?? [];
      if (coords.length === 0) {
        this.tramoEstacionMap.set(idx, null);
        return;
      }

      let closest: UltimaLecturaCaudalDTO | null = null;
      let minDist = Infinity;

      const step = Math.max(1, Math.floor(coords.length / 20));

      for (let i = 0; i < coords.length; i += step) {
        const [lng, lat] = coords[i];
        for (const estacion of this.caudales) {
          const dist = this.haversine(lat, lng, estacion.latitud, estacion.longitud);
          if (dist < minDist) {
            minDist = dist;
            closest = estacion;
          }
        }
      }

      this.tramoEstacionMap.set(idx, minDist <= MAX_KM ? closest: null);

    });
  }

  ngOnDestroy() {
    this.layers.caudales = false;
    if (this.redHidroGraficaLayer) {
      this.mapa.removeLayer(this.redHidroGraficaLayer);
    }

    if (this.caudalesLayer) {
      this.mapa.removeLayer(this.caudalesLayer);
    }
    this.cdr.detectChanges();
  }



  private renderCaudalesMarkers() {
    this.caudalesLayer = L.layerGroup().addTo(this.mapa);

    this.caudales.forEach(cauce => {
      const color = this.getColorPorPorcentaje(cauce.porcentajeNivel);
      const sz = 14;
      const icon = L.divIcon({
        html: `<div style="
          width:${sz}px;height:${sz}px;border-radius:50%;
          background:${color};border:2px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,0.5);
        "></div>`,
        iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], className: ''
      });

      L.marker([cauce.latitud, cauce.longitud], { icon })
        .bindPopup(`
          <div style="font-family:'JetBrains Mono',monospace;min-width:160px">
            <div style="font-weight:700;margin-bottom:6px">${cauce.nombre}</div>
            <div>Caudal: <b>${cauce.ultimoDatoCaudal.toFixed(2)} m³/s</b></div>
            <div>Nivel: ${cauce.ultimoDatoNivel.toFixed(2)} m</div>
            <div>Porcentaje Nivel: ${cauce.porcentajeNivel.toFixed(2)} %</div>
            <div>Cota Máxima Sección: ${cauce.cotaMaximaSeccion.toFixed(2)} m</div>
          </div>
        `)
        .addTo(this.caudalesLayer);
    });
  }

  private getColorPorPorcentaje(porcentajeNivel: number): string {
    if (porcentajeNivel <= 0) return '#bcbcbcb3';
    if (porcentajeNivel > 0 && porcentajeNivel <= 20) return '#9cdeff';
    if (porcentajeNivel >= 20 && porcentajeNivel <= 35) return '#0099ff';
    if (porcentajeNivel <= 35 && porcentajeNivel <= 50) return '#0055ff';
    if (porcentajeNivel <= 50 && porcentajeNivel <= 65) return '#0000cc';
    if (porcentajeNivel <= 65 && porcentajeNivel <= 90) return '#ffea00';
    if (porcentajeNivel <= 90 && porcentajeNivel <= 100) return '#ff4444';
    return '#ff4444';
  }

  private getColorParaTramo(feature: any): string {
    const cauce = this.tramoEstacionMap.get(feature.properties._idx) ?? null;
    if (!cauce) return '#444444';
    return this.getColorPorPorcentaje(cauce.porcentajeNivel);
  }

  private getCauceMasCercano(feature: any, maxKm: number): UltimaLecturaCaudalDTO | null {
    const coords: number[][] = feature.geometry.coordinates;

    // FIX 2: Sample multiple points along the river segment (start, 25%, mid, 75%, end)
    // instead of only the midpoint — avoids misses on long river segments
    const sampleIndices = [
      0,
      Math.floor(coords.length * 0.25),
      Math.floor(coords.length * 0.5),
      Math.floor(coords.length * 0.75),
      coords.length - 1,
    ];

    let closest: UltimaLecturaCaudalDTO | null = null;
    let minDist = Infinity;

    for (const idx of sampleIndices) {
      const point = coords[idx];
      const tramLng = point[0];
      const tramLat = point[1];

      for (const cauce of this.caudales) {
        const dist = this.haversine(tramLat, tramLng, cauce.latitud, cauce.longitud);
        if (dist < minDist) {
          minDist = dist;
          closest = cauce;
        }
      }
    }
    return minDist <= maxKm ? closest : null;
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

}
