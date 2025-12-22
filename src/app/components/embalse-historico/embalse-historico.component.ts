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
  variacionPorcentajeTotalHeader: number = 0;
  porcentajeTotal: number = 0;
  porcentajeTotalHeader: number = 0;
  variacionVolumenTotal: number = 0;
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
      const primero = this.datosFiltrados[0];
      this.nombreEmbalse = ultimo.nombre;
      this.volumenTotalHeader = ultimo.hm3;
      this.variacionVolumenTotal = (ultimo.hm3 - primero.hm3);
      this.porcentajeTotalHeader = ultimo.porcentaje;
      this.variacionPorcentajeTotalHeader = ultimo.porcentaje - primero.porcentaje;
      // Aquí podrías calcular la variación comparando con el primero del rango
      this.porcentajeTotal = this.datosFiltrados.reduce((acc, e) => acc + (e.porcentaje || 0), 0);
      this.porcentajeVariacion = ultimo.porcentaje - primero.porcentaje; 
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
     const valoresPorcentaje = this.datosFiltrados.map(item => {
        const p = item.porcentaje || 0;
        return p > 100 ? 100 : (p < 0 ? 0 : p);
      });
    
    this.chart = new Chart(ctx!, {
      type: 'line',
      data: {
        labels: this.datosFiltrados.map(d => new Date(d.fechaRegistro).toLocaleDateString()),
        datasets: [{
          label: 'Volumen (hm3)',
          data: this.datosFiltrados.map(d => d.hm3),
          borderColor: '#2962ff',
          backgroundColor: 'rgba(41, 98, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          yAxisID: 'y'
        }, 
        {
          label: 'Porcentaje (%)',
          data: valoresPorcentaje,
          borderColor: 'transparent', // Invisible para que solo usemos su escala
          pointRadius: 0,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          // Sugerencia estética: añade un tooltip personalizado
          tooltip: {
            backgroundColor: '#1e2329',
            titleColor: '#00ff84',
            bodyColor: '#fff',
            displayColors: false
          }
        },
        scales: {
          x: {
            type: 'category',
            grid: { display: false },
            ticks: {
              color: '#848e9c',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12 // Menos etiquetas para un look más limpio
            }
          },
          y: {
            type: 'linear',
            position: 'right',
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: {
              color: '#848e9c',
              callback: (value) => value + ' hm³' // Añade la unidad al eje
            }
          },
          y1: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: {
              color: '#848e9c',
              callback: (value) => value + ' %' // Añade la unidad al eje
            }
          }
        }
      }
    });
  }
}
