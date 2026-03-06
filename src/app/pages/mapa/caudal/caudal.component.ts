import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CaudalesService } from 'src/app/services/caudales.service';
import { UltimaLecturaCaudalDTO } from '../../../services/caudales.service';
import { Map, Marker } from 'leaflet';
import * as L from 'leaflet';
import { min } from 'rxjs';

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

  constructor(
    private caudalesService: CaudalesService,
    private cdr: ChangeDetectorRef) {
  }


  ngOnInit() {
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

  ngOnDestroy() {
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
    if (porcentajeNivel <= 0) return '#444444';
    if (porcentajeNivel <= 10) return '#66ccff';
    if (porcentajeNivel <= 20) return '#0099ff';
    if (porcentajeNivel <= 40) return '#0055ff';
    if (porcentajeNivel <= 60) return '#0000cc';
    if (porcentajeNivel <= 80) return '#ffea00';
    return '#ff4444';
  }

  private getColorParaTramo(feature: any): string {
    const cauce = this.getCauceMasCercano(feature, 5);
    if (!cauce) return '#444444';
    return this.getColorPorPorcentaje(cauce.porcentajeNivel);
  }

  private getCauceMasCercano(feature: any, maxKm: number): UltimaLecturaCaudalDTO | null {
    const coords: number[][] = feature.geometry.coordinates;

    const mid = coords[Math.floor(coords.length / 2)];
    const tramLng = mid[0];
    const tramLat = mid[1];

    let closest: UltimaLecturaCaudalDTO | null = null;
    let minDist = Infinity;

    for (const cauce of this.caudales) {
      const dist = this.haversine(tramLat, tramLng, cauce.latitud, cauce.longitud);
      if (dist < minDist) {
        minDist = dist;
        closest = cauce;
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
