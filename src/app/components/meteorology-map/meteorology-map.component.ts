import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EstacionesService, Estacion, PrecipitacionAcumulada } from '../../services/estaciones.service';
import * as L from 'leaflet';

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
  private jsonPrecipitaciones: any[] = [];
  private estacionesService: EstacionesService = inject(EstacionesService);
  private ubicacionEstaciones: L.LayerGroup = L.layerGroup();
  private colorTexto: String;

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


  cargarDatosEstaciones() {
    this.estacionesService.getEstacionesAndPrecipitacionesUltimas24h().subscribe({
      next: (estaciones) => {
        this.jsonEstaciones = estaciones;
        this.ubicacionEstaciones.clearLayers();

        this.jsonEstaciones.forEach((estacion: any) => {

          if (estacion.latitud && estacion.longitud) {

            const dto = estacion.precipitacionesDTO;
            const valor24h = dto.precipitacion24h || 0;

            this.colorTexto = '#ffffff';

            if (dto.precipitacion24h < 5) {
              this.colorTexto = '#6b6b6bff';
            }

            const colorFondo = this.getColorLluvia(valor24h);

            const customIcon = L.divIcon({
              className: 'custom-precip-icon',
              html: `
              <div class="marker-circle" style="background-color: ${colorFondo};">
                <span style="color: ${this.colorTexto} !important;">${Math.round(dto.precipitacion24h * 10) / 10}</span>
              </div>`,
              iconSize: [24, 24],
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
    if (valor < 1) return '#ffffcc';            // 0.1 a 4.99
    if (valor < 2) return '#ccff99';           // 5.0 a 9.99
    if (valor < 5) return '#99ff99';           // 5.0 a 9.99
    if (valor < 10) return '#66cccc';           // 10.0 a 19.99
    if (valor < 15) return '#0066ff';           // 20.0 a 39.99
    if (valor < 20) return '#0000ffff';           // 40.0 a 59.99
    if (valor < 40) return '#0000c5ff';           // 40.0 a 59.99
    if (valor < 50) return '#9966ff';          // 60.0 a 99.99
    if (valor < 80) return '#cc33ff';         // 100 en adelante
    if (valor < 100) return '#ff00ff';
    if (valor >= 100) return '#990033';

    return '#bdc3c7'; // Por defecto gris si algo fallara
  }

  getPrecipitationColor(valor: number, rango: '1 week' | '1 month' | '3 months' | '6 months ' | '1 year '): string {

    // 1. Definimos los umbrales para cada periodo
    const escalas: Record<string, number[]> = {
      '1 week': [100, 80, 70, 50, 40, 35, 30, 25, 20, 15, 10, 1],
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
      '#99ff99', // Verde claro
      '#ccff99', // Verde amarillento
      '#ffffcc'  // Amarillo muy pálido (Mínimo)
    ];

    // 3. Obtenemos los umbrales según el rango elegido
    const umbrales = escalas[rango];

    // 4. Buscamos el color correspondiente
    for (let i = 0; i < umbrales.length; i++) {
      if (valor > umbrales[i]) {
        return colores[i];
      }
    }

    return 'transparent'; // Si no llega al mínimo
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  mostrarHistoricoPrecipitaciones(rango: string) {

    this.estacionesService.getHistoricoPrecipitaciones(rango).subscribe({
      next: (precipitaciones) => {
        this.jsonPrecipitaciones = precipitaciones;
        this.ubicacionEstaciones.clearLayers();

        this.jsonPrecipitaciones.forEach((precipitacionAcumulada: any) => {
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
              html: `
        <div class="marker-circle" style="background-color: ${colorIconoPrecipitacion};">
          <span style="color: ${this.colorTexto} !important;">${Math.round(precipitacionAcumulada.valor_acumulado * 10) /10}</span>
        </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
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
    });

  }
}