import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
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

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}