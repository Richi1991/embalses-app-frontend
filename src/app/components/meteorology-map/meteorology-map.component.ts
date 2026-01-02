import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EstacionesService, Estacion, PrecipitacionAcumulada } from '../../services/estaciones.service';
import * as turf from '@turf/turf';
import * as L from 'leaflet';
import { fileTray } from 'ionicons/icons';

@Component({
  selector: 'app-meteorology-map',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './meteorology-map.component.html',
  styleUrls: ['./meteorology-map.component.scss']
})
export class MeteorologyMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map!: L.Map;
  private jsonEstaciones: any[] = [];
  private estacionesService: EstacionesService = inject(EstacionesService);
  private ubicacionEstaciones: L.LayerGroup = L.layerGroup();
  private layerGroupRaster: L.LayerGroup = L.layerGroup(); // Nueva capa para el raster
  private cuencaPolygon: L.Polygon | L.GeoJSON | null = null;


  public rango: string = 'mes';

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap(): void {

    const seguraCenter: L.LatLngExpression = [38, -1.5];

    // Inicializar el objeto mapa
    this.map = L.map('mapId', {
      zoomSnap: 1,
      zoomDelta: 1,
      preferCanvas: true
    }).setView(seguraCenter, 9);

    // Añadir los "tiles" (las imágenes del mapa)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      noWrap: true,
      bounds: [[-90, -180], [90, 180]]
    }).addTo(this.map);

    // Coordenadas del centro de la Cuenca del Segura
    this.loadCuenca();

    this.cargarDatosEstaciones();

    this.map.on('zoomend moveend', () => {
      this.map.invalidateSize();
    });

    // Forzar a que Leaflet recalcule el tamaño (evita fallos de renderizado)
    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);
  }

  private loadCuenca() {
    fetch('assets/data/cuenca_segura.json')
      .then(res => res.json())
      .then(data => {
        this.cuencaPolygon = L.geoJSON(data);
        const cuencaLayer = L.geoJSON(data, {
          style: {
            color: '#00ffcc', // Color de tu dashboard
            weight: 2,
            fillOpacity: 0.1,
            fillColor: '#00ffcc'
          }
        }).addTo(this.map);

        // Ajustar la cámara automáticamente a la cuenca
        this.map.fitBounds(cuencaLayer.getBounds(), { padding: [30, 30], maxZoom: 8 });
      })
      .catch(err => console.warn('Archivo JSON no encontrado aún, cargando mapa base.'));
  }

  public cambiarRango(rango: string) {
    this.ubicacionEstaciones.clearLayers();
    this.estacionesService.getDatosMapaPrecipitaciones(rango).subscribe(
      (data) => {
        console.log('Datos recibidos:', data);
        this.pintarIsoyetas(data);
      },
      (error) => {
        console.error('Error al obtener datos', error);
      }
    );
  }



  private idw(
    lat: number,
    lng: number,
    puntos: PrecipitacionAcumulada[],
    potencia = 2
  ): number {

    let num = 0;
    let den = 0;

    for (const p of puntos) {
      const d = Math.hypot(lat - p.lat, lng - p.lng);
      if (d < 0.0001) return p.valor_acumulado;

      const w = 1 / Math.pow(d, potencia);
      num += w * p.valor_acumulado;
      den += w;
    }

    return den === 0 ? 0 : num / den;
  }

private pintarIsoyetas(puntos: PrecipitacionAcumulada[]) {
  this.layerGroupRaster.clearLayers();

  if (puntos.length < 3) {
    console.warn("Se necesitan más estaciones para crear el mapa.");
    return;
  }

  const points: any[] = [];
  const paso = 0.05; 

  // 1. Generar matriz RECTANGULAR completa (sin el filtro isPointInCuenca aquí)
  // Turf necesita la rejilla completa para que los vecinos de cada punto existan
  for (let lat = 37.2; lat <= 38.6; lat += paso) {
    for (let lng = -2.5; lng <= -0.5; lng += paso) {
      const valor = this.idw(lat, lng, puntos);
      points.push(turf.point([lng, lat], { z: valor }));
    }
  }

  const collection = turf.featureCollection(points) as any;
  const breaks = [0, 0.3, 1, 5, 10, 20, 30, 40, 60, 80, 100, 120, 150, 200];

  try {
    // 2. Generar las isobandas sobre la matriz completa
    const isobands = turf.isobands(collection, breaks, { zProperty: 'z' });

    // 3. Pintar y recortar visualmente
    const geoJsonLayer = L.geoJSON(isobands, {
      style: (feature: any) => {
        const lowerValue = parseFloat(feature.properties.z.split('-')[0]);
        return {
          fillColor: this.getPrecipitationColor(lowerValue),
          fillOpacity: 0.7,
          stroke: true,
          weight: 0.5,
          color: '#ffffffaa'
        };
      }
    });

    // 4. Recorte final: Solo añadimos al mapa si el punto está en la cuenca
    // Para un recorte perfecto, lo ideal es usar el GeoJSON como máscara
    geoJsonLayer.addTo(this.layerGroupRaster);
    this.layerGroupRaster.addTo(this.map);

  } catch (error) {
    console.error("Error generando isobandas:", error);
  }
}

  private isPointInCuenca(lat: number, lng: number): boolean {
    if (!this.cuencaPolygon) return true; // Si no ha cargado, pinta todo por defecto

    let inside = false;
    const point = L.latLng(lat, lng);

    // Recorremos las capas del GeoJSON
    (this.cuencaPolygon as L.GeoJSON).eachLayer((layer: any) => {
      if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
        // Usamos el método nativo de Leaflet si está disponible o Ray-casting
        if (this.rayCasting(point, layer.getLatLngs()[0] as L.LatLng[])) {
          inside = true;
        }
      }
    });
    return inside;
  }

  // Algoritmo Ray-casting estándar para detectar puntos en polígonos
  private rayCasting(point: L.LatLng, vs: L.LatLng[]): boolean {
    const x = point.lng, y = point.lat;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].lng, yi = vs[i].lat;
      const xj = vs[j].lng, yj = vs[j].lat;
      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }


  private cargarDatosEstaciones() {
    this.estacionesService.getEstacionesAndPrecipitaciones().subscribe({
      next: (estaciones) => {
        this.jsonEstaciones = estaciones;
        this.ubicacionEstaciones.clearLayers();

        this.jsonEstaciones.forEach((estacion: any) => {

          if (estacion.latitud && estacion.longitud) {

            const dto = estacion.precipitacionesDTO;
            const valor24h = dto.precipitacion24h || 0;
            const colorFondo = this.getColorLluvia(valor24h);

            // Crear un icono HTML personalizado
            const customIcon = L.divIcon({
              className: 'custom-precip-icon',
              html: `<div class="marker-circle" style="background-color: ${colorFondo}">
            <span>${valor24h}</span> </div>`,
              iconSize: [24, 24], // 👈 Más pequeño
              iconAnchor: [12, 12]
            });

            const marcador = L.marker([estacion.latitud, estacion.longitud], {
              icon: customIcon
            });

            marcador.bindPopup(`
            <div style="min-width: 150px;">
              <strong style="color: #2c3e50;">${estacion.nombre}</strong><br>
              <table style="width: 100%; margin-top: 5px; border-collapse: collapse;">
                <tr><td><b>1h:</b></td><td>${dto.precipitacion1h} mm</td></tr>
                <tr><td><b>3h:</b></td><td>${dto.precipitacion3h} mm</td></tr>
                <tr><td><b>6h:</b></td><td>${dto.precipitacion6h} mm</td></tr>
                <tr><td><b>12h:</b></td><td>${dto.precipitacion12h} mm</td></tr>
                <tr style="border-top: 1px solid #ddd;"><td><b>24h:</b></td><td><b>${dto.precipitacion24h} mm</b></td></tr>
              </table>
            </div>
          `);
            this.ubicacionEstaciones.addLayer(marcador);
          }
        });
        this.ubicacionEstaciones.addTo(this.map);
      }
    });
  }

  private getColorLluvia(valor: number): string {
    if (!valor || valor === 0) return '#bdc3c7'; // Gris
    if (valor < 5) return '#c9e3f5ff';            // 0.1 a 4.99
    if (valor < 10) return '#4a96c9ff';           // 5.0 a 9.99
    if (valor < 20) return '#0045f5ff';           // 10.0 a 19.99
    if (valor < 40) return '#2f0be1ff';           // 20.0 a 39.99
    if (valor < 60) return '#e500feff';           // 40.0 a 59.99
    if (valor < 100) return '#ff0000ff';          // 60.0 a 99.99
    if (valor >= 100) return '#060105ff';         // 100 en adelante

    return '#bdc3c7'; // Por defecto gris si algo fallara
  }

  getPrecipitationColor(d: number): string {
    return d > 150 ? '#990033' : // Granate
      d > 120 ? '#ff00ff' : // Magenta
        d > 100 ? '#cc33ff' : // Morado fuerte
          d > 80 ? '#9966ff' : // Violeta
            d > 60 ? '#000033' : // Azul casi negro
              d > 40 ? '#000099' : // Azul oscuro
                d > 30 ? '#0066ff' : // Azul medio
                  d > 20 ? '#3399ff' : // Azul claro
                    d > 10 ? '#66cccc' : // Cian / Azul verdoso
                      d > 5 ? '#99ff99' : // Verde claro
                        d > 1 ? '#ccff99' : // Verde amarillento
                          d > 0.3 ? '#ffffcc' : // Amarillo muy pálido
                            'transparent';
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}