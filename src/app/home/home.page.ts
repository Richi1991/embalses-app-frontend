import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { EmbalseService, Embalse } from '../services/embalse.service';
import { addIcons } from 'ionicons';
import { arrowUpOutline, arrowDownOutline, removeOutline } from 'ionicons/icons';

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

  constructor() {
    addIcons({ arrowUpOutline, arrowDownOutline, removeOutline });
  }

  // Añade estas variables dentro de la clase HomePage
public volumenTotal: number = 0;
public porcentajeMedio: number = 0;
totalVariacion: number = 0;

cargarDatos() {
  this.embalseService.getTopMovimientos().subscribe({
    next: (data: Embalse[]) => {
      // 1. Procesamos los datos para que el HTML los encuentre
      this.embalses = data.map(e => ({
        ...e,
        volumen: e.hm3, // Tu HTML usa 'volumen'
        tendencia: e.tendencia ? e.tendencia.toLowerCase() : 'estable'
      })).sort((a, b) => b.hm3 - a.hm3);

      // 2. Calculamos los totales para el encabezado
      this.volumenTotal = data.reduce((acc, e) => acc + (e.hm3 || 0), 0);
      this.totalVariacion = data.reduce((acc, e) => acc + (e.variacion || 0), 0);
      
      // 3. Porcentaje medio ponderado
      this.porcentajeMedio = data.length > 0 
        ? (data.reduce((acc, e) => acc + (e.porcentaje || 0), 0) / data.length) 
        : 0;
    },
    error: (err) => {
      console.error('Error cargando datos', err);
      // Si hay error, inicializamos vacíos para que no se rompa la vista
      this.embalses = [];
    }
  });
}
}