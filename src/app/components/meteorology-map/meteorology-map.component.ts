import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EstacionesService } from '../../services/estaciones.service';
import { EmbalseService } from '../../services/embalse.service';
import { Subscription } from 'rxjs';
import { ReservoirData } from './embalse-marker/embalse-icon.utils';
import { EmbalseMarkerComponent } from './embalse-marker/embalse-marker.component';

import * as L from 'leaflet';

@Component({
  selector: 'app-meteorology-map',
  standalone: true,
  imports: [CommonModule, IonicModule, EmbalseMarkerComponent],
  templateUrl: './meteorology-map.component.html',
  styleUrls: ['./meteorology-map.component.scss']
})
export class MeteorologyMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  public map!: L.Map;
  private jsonEstaciones: any[] = [];
  private jsonPrecipitaciones: any[] = [];
  private estacionesService: EstacionesService = inject(EstacionesService);
  private embalseService: EmbalseService = inject(EmbalseService);
  private ubicacionEstaciones: L.LayerGroup = L.layerGroup();
  private colorTexto: String;
  public reservoirs: ReservoirData[] = [];
  private sub!: Subscription;
  public showEmbalses: boolean = true;
  public showEstaciones: boolean = true;
  private viewMode: 'actual' | 'historico' = 'actual';
  private currentRango: string = '1 day';
  showCauces: boolean = false;
  caucesLayer: L.GeoJSON | null = null;
  caucesLoaded: boolean = false;
  private caucesData: any = null;


  @ViewChild('embalseMarker') embalseMarker!: EmbalseMarkerComponent;

  public rango: string = 'mes';

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap(): void {

    const seguraCenter: L.LatLngExpression = [37.9, -1.85];

    // Inicializar el objeto mapa
    this.map = L.map('mapId', {
      zoomSnap: 1,
      zoomDelta: 1,
      preferCanvas: true
    }).setView(seguraCenter, 8);

    // Añadir los "tiles" (las imágenes del mapa)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      noWrap: true,
      bounds: [[-90, -180], [90, 180]]
    }).addTo(this.map);

    // Coordenadas del centro de la Cuenca del Segura
    this.loadCuenca();
    this.cargarDatosEstaciones();
    this.cargarDatosEmbalses();

    this.map.on('zoomend moveend', () => {
      this.map.invalidateSize();
      if (this.showEstaciones) {
        this.refrescarMarcadores();
      }
      if (this.showEmbalses) {
        this.embalseMarker?.renderMarkers();
      }
      if (this.showCauces && this.caucesLayer) {
        this.caucesLayer.setStyle({
          weight: this.getCauceWeight()
        });
      }
    });

    // Forzar a que Leaflet recalcule el tamaño (evita fallos de renderizado)
    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);
  }


  private refrescarMarcadores() {
    if (!this.showEstaciones) return;
    if (this.viewMode === 'actual') {
      this.dibujarMarcadoresEstaciones(this.jsonEstaciones);
    } else {
      this.dibujarMarcadoresHistoricos(this.jsonPrecipitaciones, this.currentRango);
    }
  }

  toggleLayer(layer: string) {
    switch (layer) {
      case 'embalses':
        this.showEmbalses = !this.showEmbalses;
        this.showEmbalses
          ? this.embalseMarker.embalseLayerGroup?.addTo(this.map)
          : this.embalseMarker.embalseLayerGroup?.remove();
        break;
      case 'estaciones':
        this.showEstaciones = !this.showEstaciones;
        this.showEstaciones
          ? this.ubicacionEstaciones.addTo(this.map)
          : this.ubicacionEstaciones.remove();
        break;
      case 'cauces':
        this.showCauces = !this.showCauces;
        if (!this.caucesLoaded) {
          fetch('assets/data/red_hidrografica.geojson')
            .then(r => r.json())
            .then(data => {
              this.caucesData = data; // guardar referencia al data
              this.caucesLayer = L.geoJSON(data, {
                style: {
                  color: '#3b82f6',
                  weight: this.getCauceWeight(),
                  opacity: 0.8
                },
                onEachFeature: (feature, layer) => {
                  layer.bindPopup(`<b>${feature.properties.nombre}</b>`);
                }
              }).addTo(this.map);
              this.caucesLoaded = true;
            });
        } else {
          if (this.showCauces) {
            this.caucesLayer!.addTo(this.map);
          } else {
            this.map.removeLayer(this.caucesLayer!);
          }
        }
        break;
    }
  }

  private getMarkerSize(): number {
    const zoom = this.map.getZoom();
    if (zoom <= 6) return 4;
    if (zoom <= 7) return 8;
    if (zoom <= 8) return 15;
    if (zoom <= 9) return 21;
    if (zoom <= 10) return 25;
    if (zoom <= 11) return 35;
    return 40; // Zoom muy cercano
  }

  private loadCuenca() {
    fetch('assets/data/cuenca_segura.json')
      .then(res => res.json())
      .then(data => {
        const cuencaLayer = L.geoJSON(data, {
          style: {
            color: '#00ffcc', // Color de tu dashboard
            weight: 2,
            fillOpacity: 0.1,
            fillColor: '#00ffcc'
          }
        }).addTo(this.map);

        // Ajustar la cámara automáticamente a la cuenca
        this.map.fitBounds(cuencaLayer.getBounds(), { padding: [40, 40], maxZoom: 9 });
      })
      .catch(err => console.warn('Archivo JSON no encontrado aún, cargando mapa base.'));
  }

  private cargarDatosEmbalses(): void {
    this.sub = this.embalseService.getIconoEmbalse().subscribe(data => {
      this.reservoirs = data.map(emb => ({
        id: emb.idEmbalse,
        name: emb.nombre,
        lat: emb.latitud,
        lng: emb.longitud,
        percentageFull: emb.porcentaje,
        currentVolume: emb.hm3,
        maxVolume: emb.capacidadMaximaEmbalse,
      } as ReservoirData));
    });
  }

  cargarDatosEstaciones() {
    this.viewMode = 'actual';
    this.estacionesService.getEstacionesAndPrecipitacionesUltimas24h().subscribe({
      next: (estaciones) => {
        this.jsonEstaciones = estaciones;
        this.dibujarMarcadoresEstaciones(estaciones);
      }
    });
  }

  private dibujarMarcadoresEstaciones(data: any[]) {
    this.ubicacionEstaciones.clearLayers();
    const size = this.getMarkerSize();
    const fontSize = size / 2.5;

    data.forEach((estacion: any) => {
      if (estacion.latitud && estacion.longitud) {
        const valor24h = estacion.precipitacion24h || 0;
        const lat = parseFloat(estacion.latitud);
        const lng = parseFloat(estacion.longitud);

        this.colorTexto = '#ffffff';

        if (valor24h < 5) {
          this.colorTexto = '#6b6b6bff';
        }

        const colorFondo = this.getPrecipitationColor(valor24h, '1 day');
        const customIcon = L.divIcon({
          className: 'custom-precip-icon',
          html: `<div style="
            background-color: ${colorFondo};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${Math.max(8, size * 0.38)}px;
            font-weight: 700;
            color: ${this.colorTexto};
            font-family: 'DM Sans', system-ui, sans-serif;
            border: 1.5px solid rgba(0,0,0,0.25);
            box-sizing: border-box;
            white-space: nowrap;
          ">${Math.round(valor24h * 10) / 10}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marcador = L.marker([lat, lng], {
          icon: customIcon
        });

        marcador.bindPopup(`
            <div style="min-width: 150px;">
              <strong style="color: #2c3e50;">${estacion.nombre}</strong><br>
              <table style="width: 100%; margin-top: 5px; border-collapse: collapse;">
                <tr style="border-top: 1px solid #ddd;">
                  <td><b>Acumulado 24h:</b></td>
                  <td><b>${valor24h} mm</b></td>
                </tr>
                <tr>
                  <td colspan="2" style="font-size: 0.8em; color: gray;">
                    Act: ${estacion.fechaActualizacion ? new Date(estacion.fechaActualizacion).toLocaleString() : '---'}
                  </td>
                </tr>
              </table>
            </div>
          `);
        this.ubicacionEstaciones.addLayer(marcador);
      }
    });
    this.ubicacionEstaciones.addTo(this.map);
  }

  getPrecipitationColor(valor: number, rango: '1 day' | '1 week' | '1 month' | '3 months' | '6 months ' | '1 year '): string {

    // 1. Definimos los umbrales para cada periodo
    const escalas: Record<string, number[]> = {
      '1 day': [150, 100, 80, 50, 40, 30, 20, 15, 10, 5, 2, 1],
      '1 week': [200, 120, 90, 60, 50, 35, 30, 25, 20, 15, 10, 1],
      '1 month': [250, 200, 175, 150, 125, 100, 80, 60, 40, 30, 10, 1],
      '3 months': [500, 300, 250, 200, 150, 125, 100, 80, 60, 40, 10, 5],
      '6 months': [600, 400, 300, 250, 200, 150, 120, 80, 60, 40, 10, 5],
      '1 year': [650, 500, 400, 350, 325, 280, 250, 200, 180, 150, 120, 40]
    };

    // 2. Definimos tu paleta de colores (se mantiene constante)
    const colores = [
      '#990033', // Granate (Máximo)
      '#ff00ff', // Magenta
      '#cc33ff', // Morado fuerte
      '#9966ff', // Violeta
      '#0000c5ff', // Azul casi negro
      '#0000ffff', // Azul oscuro
      '#0066ff', // Azul medio
      '#3399ff', // Azul claro
      '#66cccc', // Cian
      '#72fe72', // Verde claro
      '#c6fa7d', // Verde amarillento
      '#ffff9c'  // Amarillo muy pálido (Mínimo)
    ];

    // 3. Obtenemos los umbrales según el rango elegido
    const umbrales = escalas[rango];

    // 4. Buscamos el color correspondiente
    for (let i = 0; i < umbrales.length; i++) {
      if (valor > umbrales[i]) {
        return colores[i];
      }
    }

    return '#ffffd8'; // Si no llega al mínimo
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private getCauceWeight(): number {
    const zoom = this.map.getZoom();
    if (zoom <= 6) return 0.5;
    if (zoom <= 7) return 0.8;
    if (zoom <= 8) return 1.2;
    if (zoom <= 9) return 1.8;
    if (zoom <= 10) return 2.5;
    if (zoom <= 11) return 3.5;
    return 5;
  }

  mostrarHistoricoPrecipitaciones(rango: string) {
    this.rango = rango;
    this.viewMode = 'historico';
    this.currentRango = rango;
    this.estacionesService.getHistoricoPrecipitaciones(rango).subscribe({
      next: (precipitaciones) => {
        this.jsonPrecipitaciones = precipitaciones;
        this.dibujarMarcadoresHistoricos(precipitaciones, rango);
      }
    });
  }

  private dibujarMarcadoresHistoricos(data: any[], rango: string) {
    this.ubicacionEstaciones.clearLayers();
    const size = this.getMarkerSize();
    const fontSize = size / 2.5;

    data.forEach((precipitacionAcumulada: any) => {
      if (precipitacionAcumulada.lat && precipitacionAcumulada.lng) {

        const colorIconoPrecipitacion = this.getPrecipitationColor(precipitacionAcumulada.valor_acumulado, rango as "1 week" | "1 month" | "3 months" | "6 months " | "1 year ");

        this.colorTexto = '#ffffff';

        if (precipitacionAcumulada.valor_acumulado < 20 && rango === '1 week') {
          this.colorTexto = '#6b6b6bff';
        } else if (precipitacionAcumulada.valor_acumulado < 40 && rango === '1 month') {
          this.colorTexto = '#6b6b6bff';
        } else if (precipitacionAcumulada.valor_acumulado < 60 && rango === '3 months') {
          this.colorTexto = '#6b6b6bff';
        } else if (precipitacionAcumulada.valor_acumulado < 60 && rango === '6 months') {
          this.colorTexto = '#6b6b6bff';
        } else if (precipitacionAcumulada.valor_acumulado < 180 && rango === '1 year') {
          this.colorTexto = '#6b6b6bff';
        }

        // Crear un icono HTML personalizado
        const customIcon = L.divIcon({
          className: 'custom-precip-icon',
          html: `<div style="
            background-color: ${colorIconoPrecipitacion};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${Math.max(8, size * 0.38)}px;
            font-weight: 700;
            color: ${this.colorTexto};
            font-family: 'DM Sans', system-ui, sans-serif;
            border: 1.5px solid rgba(0,0,0,0.25);
            box-sizing: border-box;
            white-space: nowrap;
          ">${Math.round(precipitacionAcumulada.valor_acumulado * 10) / 10}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marcador = L.marker([precipitacionAcumulada.lat, precipitacionAcumulada.lng], {
          icon: customIcon
        });

        marcador.bindPopup(`
            <div style="min-width: 150px;">
              <strong style="color: #2c3e50;">${precipitacionAcumulada.nombre}</strong><br>
              <table style="width: 100%; margin-top: 5px; border-collapse: collapse;">
                <tr><td><b>${rango}</b></td><td>${precipitacionAcumulada.valor_acumulado} mm</td></tr>                
              </table>
            </div>
          `);
        this.ubicacionEstaciones.addLayer(marcador);
      }
    });
    this.ubicacionEstaciones.addTo(this.map);
  }
}