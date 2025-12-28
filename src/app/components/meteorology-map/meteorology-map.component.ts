import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { EstacionesService, Estacion } from '../../services/estaciones.service';
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

  ngAfterViewInit() {
    this.initMap();
  }

  private initMap(): void {

    const seguraCenter: L.LatLngExpression = [38, -1.5];

    // Inicializar el objeto mapa
    this.map = L.map('mapId').setView(seguraCenter, 9);

    // Añadir los "tiles" (las imágenes del mapa)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      noWrap: true,
      bounds: [[-90, -180], [90, 180]]
    }).addTo(this.map);

    // Coordenadas del centro de la Cuenca del Segura
    this.loadCuenca();

    this.cargarDatosEstaciones();


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

  private cargarDatosEstaciones() {
    this.estacionesService.getEstacionesAndPrecipitaciones().subscribe({
      next: (estaciones) => {
        this.jsonEstaciones = estaciones;
        this.ubicacionEstaciones.clearLayers();

        // Generamos un array temporal para procesar más rápido
        const nuevosMarcadores: L.Layer[] = [];

        this.jsonEstaciones.forEach((estacion: any) => {

          if (estacion.latitud && estacion.longitud) {

            const dto = estacion.precipitacionesDTO;

            const marcador = L.circleMarker([estacion.latitud, estacion.longitud], {
              radius: 7,
              fillColor: this.getColorLluvia(dto.precipitacion24h),
              fillOpacity: 0.8,
              stroke: true,
              color: '#ffffff', // Borde blanco fino para que resalten
              weight: 1
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


  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}