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
      this.embalses = data.map(e => ({
        ...e,
        // Normalizamos a minúsculas para el CSS y manejamos nulos
        tendencia: e.tendencia ? e.tendencia.toLowerCase() : 'estable'
      })).sort((a, b) => b.hm3 - a.hm3);

      this.volumenTotal = data.reduce((acc, e) => acc + e.hm3, 0);
      const sumaPct = data.reduce((acc, e) => acc + e.porcentaje, 0);
      this.porcentajeMedio = sumaPct / data.length;
    }
  });
}
}