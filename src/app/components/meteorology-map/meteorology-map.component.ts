import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular'; // Importante para ion-spinner
import { CommonModule } from '@angular/common'; // Opcional si usas el nuevo @if
import * as maplibregl from 'maplibre-gl';
import { EstacionesService } from '../../services/estaciones-service';

@Component({
  selector: 'app-meteorology-map',
  templateUrl: './meteorology-map.component.html',
  styleUrls: ['./meteorology-map.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class MeteorologyMapComponent implements AfterViewInit {
  private map: maplibregl.Map | undefined;
  public mapReady = false; // Variable para controlar el spinner

  constructor(private estacionesService: EstacionesService) { }

  ngAfterViewInit() {
    this.map = new maplibregl.Map({
      container: 'map-container',
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [-1.2, 38.0],
      zoom: 7,
      pitch: 0,
      bearing: 0,
      // ESTO ES CLAVE PARA MÓVIL:
      touchZoomRotate: true,
      dragRotate: false, // Evita que giren el mapa sin querer con dos dedos
      cooperativeGestures: true // Requiere dos dedos para mover el mapa, permitiendo hacer scroll con uno
    });

    this.map.on('load', () => {
      this.mapReady = true; // Ocultamos el spinner cuando el mapa carga
      this.cargarEstaciones();
    });
  }

  private cargarEstaciones() {
    this.estacionesService.getEstacionesMeteorologicas().subscribe(estaciones => {
      estaciones.forEach(est => {
        const lat = parseFloat(est.latitud.replace(',', '.'));
        const lon = parseFloat(est.longitud.replace(',', '.'));

        if (!isNaN(lat) && !isNaN(lon)) {
          // Crear un marcador moderno personalizado (un simple div con CSS)
          const el = document.createElement('div');
          el.className = 'marker-estacion';
          el.style.backgroundColor = '#00e676'; // Verde como tu gráfica
          el.style.width = '12px';
          el.style.height = '12px';
          el.style.borderRadius = '50%';
          el.style.boxShadow = '0 0 10px #00e676';

          new maplibregl.Marker(el)
            .setLngLat([lon, lat])
            .setPopup(new maplibregl.Popup({ offset: 25 })
              .setHTML(`<h3>${est.nombre}</h3><p>Altitud: ${est.altitud}m</p>`))
            .addTo(this.map!);
        }
      });
    });
  }

  ngOnDestroy() {
    this.map?.remove();
  }

}
