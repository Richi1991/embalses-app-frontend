import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { EmbalseService, Embalse } from 'src/app/services/embalse.service';
import { ActivatedRoute } from '@angular/router';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Filler, Tooltip, Legend);
import { CommonModule, DecimalPipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-embalse-historico',
  imports: [
    CommonModule, 
    DecimalPipe,
    IonicModule 
  ],
  templateUrl: './embalse-historico.component.html',
  styleUrls: ['./embalse-historico.component.scss'],
})
export class EmbalseHistoricoComponent implements OnInit {

  @ViewChild('evolutionChart') canvas!: ElementRef;
  
  chart: any;
  idEmbalse: number = 0;
  historicoCompleto: Embalse[] = [];
  datosFiltrados: Embalse[] = [];
  
  // Variables para el header
  nombreEmbalse: string = '';
  volumenTotalHeader: number = 0;
  porcentajeVariacion: number = 0;
  tendenciaPositiva: boolean = true;
  filter: string = 'ALL';

  constructor(private route: ActivatedRoute, private embalseService: EmbalseService) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.idEmbalse = +idParam;
        this.cargarHistoricoEmbalse(this.idEmbalse);
      }

    });
  }

  cargarHistoricoEmbalse(id: number) {
   this.embalseService.getHistoricoEmbalse(id).subscribe(data => {
      this.historicoCompleto = data;
      setTimeout(() => {
        this.updateChart('ALL');
      }, 0);
    });
  }

  updateChart(range: string) {
    this.filter = range;
    const ahora = new Date();
    
    // Lógica de filtrado por fechas
    this.datosFiltrados = this.historicoCompleto.filter(item => {
      const fecha = new Date(item.fechaRegistro);
      switch (range) {
        case '1D': return fecha >= new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
        case '1S': return fecha >= new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '1M': return fecha >= new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
        case '3M': return fecha >= new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
        case 'YTD': return new Date(ahora.getFullYear(), 0, 1);
        case '1A': return fecha >= new Date(ahora.getTime() - 365 * 24 * 60 * 60 * 1000);
        case '2A': return fecha >= new Date(ahora.getTime() - 730 * 24 * 60 * 60 * 1000);
        case '3A': return fecha >= new Date(ahora.getTime() - 1095 * 24 * 60 * 60 * 1000);
        case 'ALL': return fecha >= new Date(ahora.setFullYear(ahora.getFullYear() - 5));
        default: return true;
      }
    });

    // Actualizar Header con el último dato disponible
    if (this.datosFiltrados.length > 0) {
      const ultimo = this.datosFiltrados[this.datosFiltrados.length - 1];
      this.nombreEmbalse = ultimo.nombre;
      this.volumenTotalHeader = ultimo.hm3;
      // Aquí podrías calcular la variación comparando con el primero del rango
      this.porcentajeVariacion = ultimo.variacion || 0; 
      this.tendenciaPositiva = this.porcentajeVariacion >= 0;
    }

    this.renderChart();
  }

  renderChart() {
    if (!this.canvas || !this.canvas.nativeElement) {
      console.warn('El canvas aún no está disponible');
      return;
    }

    if (this.chart) this.chart.destroy();

    // Usa la referencia canvas que definiste con @ViewChild
    const ctx = this.canvas.nativeElement.getContext('2d');
    
    this.chart = new Chart(ctx!, {
      type: 'line',
      data: {
        labels: this.datosFiltrados.map(d => new Date(d.fechaRegistro).toLocaleDateString()),
        datasets: [{
          data: this.datosFiltrados.map(d => d.hm3),
          borderColor: '#2962ff',
          backgroundColor: 'rgba(41, 98, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}
