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
  public nombreEmbalse: string = '';
  public volumenTotalHeader: number = 0;
  public porcentajeVariacion: number = 0;
  public variacionPorcentajeTotalHeader: number = 0;
  public porcentajeTotal: number = 0;
  public porcentajeTotalHeader: number = 0;
  public capacidadMaxima: number = 0;
  public variacionVolumenTotal: number = 0;
  public tendenciaPositiva: boolean = true;
  public filter: string = 'ALL';

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
        case 'YTD':
          const inicioAño = new Date(ahora.getFullYear(), 0, 1);
          return fecha >= inicioAño;
        case '1A': return fecha >= new Date(ahora.getTime() - 365 * 24 * 60 * 60 * 1000);
        case '2A': return fecha >= new Date(ahora.getTime() - 730 * 24 * 60 * 60 * 1000);
        case '3A': return fecha >= new Date(ahora.getTime() - 1095 * 24 * 60 * 60 * 1000);
        case 'ALL': return fecha >= new Date(ahora.setFullYear(ahora.getFullYear() - 5));
        default: return true;
      }
    });

    // Actualizar Header con el último dato disponible
    if (this.datosFiltrados.length > 0) {
      const primero = this.datosFiltrados[0];
      const ultimo = this.datosFiltrados[this.datosFiltrados.length - 1];

      this.porcentajeTotal = this.datosFiltrados.reduce((acc, e) => acc + (e.porcentaje || 0), 0);
      
      this.volumenTotalHeader = ultimo.hm3;

      this.capacidadMaxima = (ultimo.hm3 * 100) / ultimo.porcentaje;
      this.nombreEmbalse = ultimo.nombre;

      this.variacionVolumenTotal = ultimo.hm3 - primero.hm3;
      
      this.porcentajeTotalHeader = ultimo.porcentaje;

      this.variacionPorcentajeTotalHeader = ultimo.porcentaje - primero.porcentaje;
      
      if (primero.volumen !== 0) {
        this.porcentajeVariacion = ((ultimo.porcentaje - primero.porcentaje) / primero.volumen) * 100;
      }
      
      this.tendenciaPositiva = this.variacionVolumenTotal >= 0;
    }

    this.renderChart();
  }

  renderChart() {
    if (!this.canvas || !this.canvas.nativeElement) return;

    if (this.chart) this.chart.destroy();

    // Usa la referencia canvas que definiste con @ViewChild
    const ctx = this.canvas.nativeElement.getContext('2d');

    // 1. Calculamos los límites de los datos actuales para el modo zoom
    const minVolumen = Math.min(...this.datosFiltrados.map(d => d.hm3));
    const maxVolumen = Math.max(...this.datosFiltrados.map(d => d.hm3));

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
            min: minVolumen,
            max: maxVolumen,
            grace: '5%',
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: {
              color: '#848e9c',
              callback: (value) => Number(value).toFixed(2) + ' hm³' // Añade la unidad al eje
            }
          },
          y1: {
            type: 'linear',
            position: 'left',
            min: (minVolumen * 100) / this.capacidadMaxima,
            max: (maxVolumen * 100) / this.capacidadMaxima,
            grace: '5%',
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: {
              color: '#848e9c',
              callback: (value) => Number(value).toFixed(2) + ' %' // Añade la unidad al eje
            }
          }
        }
      }
    });
  }
}
