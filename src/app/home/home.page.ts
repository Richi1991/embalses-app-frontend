import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { EmbalseService, Embalse } from '../services/embalse.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule], // Importante para usar *ngFor y componentes de Ionic
})
export class HomePage implements OnInit {
  private embalseService: EmbalseService = inject(EmbalseService);
  public embalses: Embalse[] = [];

  ngOnInit() {
    this.cargarDatos();
  }

  // Añade estas variables dentro de la clase HomePage
public volumenTotal: number = 0;
public porcentajeMedio: number = 0;
totalVariacion: number = 0;

cargarDatos() {
  this.embalseService.getTopMovimientos().subscribe({
    next: (data: Embalse[]) => {
      this.embalses = data.map(e => ({
        ...e,
        // Creamos 'volumen' para que el HTML lo encuentre
        volumen: e.hm3, 
        tendencia: e.tendencia ? e.tendencia.toLowerCase() : 'estable'
      })).sort((a, b) => b.hm3 - a.hm3);

      this.volumenTotal = data.reduce((acc, e) => acc + e.hm3, 0);
      this.porcentajeMedio = data.length > 0 ? (data.reduce((acc, e) => acc + e.porcentaje, 0) / data.length) : 0;
      this.totalVariacion = data.reduce((acc, e) => acc + (e.variacion || 0), 0);
      
    },
    error: (err) => console.error('Error cargando datos', err)
  });
}
}