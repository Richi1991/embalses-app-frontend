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

cargarDatos() {
  this.embalseService.getTopMovimientos().subscribe({
    next: (data: Embalse[]) => {
      this.embalses = data.map((e: any) => {
        
        // 1. Calculamos la variación técnica
        let cambioHM3 = (e.volumen * (e.variacion || 0)) / 100;

        // 2. FILTRO DE ESTABILIDAD:
        // Si la variación es extremadamente pequeña (ruido de decimales), 
        // la forzamos a 0 para que no confunda al usuario.
        if (Math.abs(cambioHM3) < 0.005) {
          cambioHM3 = 0;
        }

        return {
          ...e,
          // 3. Redondeamos a 3 decimales fijos para que coincida con la CHS
          variacionHM3: Number(cambioHM3.toFixed(3))
        };
      }).sort((a, b) => b.volumen - a.volumen);

      // Totales
      this.volumenTotal = data.reduce((acc, e) => acc + e.volumen, 0);
      const sumaPct = data.reduce((acc, e) => acc + e.porcentaje, 0);
      this.porcentajeMedio = sumaPct / data.length;
    }
  });
}
}