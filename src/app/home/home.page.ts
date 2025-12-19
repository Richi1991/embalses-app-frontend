import { Component, OnInit, inject } from '@angular/core';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

// Registramos todos los componentes necesarios, especialmente CategoryScale
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Filler,
  Tooltip,
  Legend
);
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { EmbalseService, Embalse } from '../services/embalse.service';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline } from 'ionicons/icons';

addIcons({
  'trending-up-outline': trendingUpOutline,
  'trending-down-outline': trendingDownOutline
});
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
  public topSubidas: Embalse[] = [];
  public topBajadas: Embalse[] = [];
  public chart: any;
  public filter: string = '1D'; // Declaramos la propiedad que faltaba
  public volumenTotal: number = 0;
  public porcentajeMedio: number = 0;
  public totalVariacion: number = 0;

  constructor() {
    addIcons({ arrowUpOutline, arrowDownOutline, removeOutline });
  }

  ngAfterViewInit() {
    // Esperamos 300ms para que la tarjeta gris se estire en pantalla
    setTimeout(() => {
      this.initChart();
    }, 300);
  }

  ngOnInit() {
    this.cargarDatos();
  }

  // Método que faltaba para actualizar el gráfico
  updateChart(selectedFilter: string) {
    this.filter = selectedFilter;

    // Aquí podrías llamar a tu servicio para traer datos nuevos según el filtro
    // Por ahora, simulamos un cambio de datos
    const newData = selectedFilter === '1D' ? [265, 266, 267] : [240, 250, 267];

    this.chart.data.datasets[0].data = newData;
    this.chart.update();
  }

  initChart() {
    const canvas = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error("No se encontró el canvas 'evolutionChart'");
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Creamos el degradado verde neón (efecto "glow")
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 255, 132, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 255, 132, 0)');

    // Si ya existía un gráfico, lo destruimos para evitar errores
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:30'],
        datasets: [{
          data: [267.01, 267.03, 267.02, 267.05, 267.04, 267.06, 267.04, 267.05, 267.04],
          borderColor: '#00ff84',
          borderWidth: 2,
          fill: true,
          backgroundColor: gradient,
          pointRadius: 0,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category', // Forzamos el tipo de escala que daba error
            grid: { display: false },
            ticks: {
              color: '#848e9c',
              maxRotation: 45, // Rota las horas si no caben
              minRotation: 0,
              autoSkip: true,   // Oculta algunas etiquetas si hay muchas
              maxTicksLimit: 6  // Limita a 6 etiquetas en el móvil para que no se amontonen
            }
          },
          y: {
            type: 'linear', // Escala numérica
            position: 'right',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#848e9c' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
  cargarDatos() {
    this.embalseService.getTopMovimientos().subscribe({
      next: (data: Embalse[]) => {
        // 1. Normalizamos los datos (mapeo que ya tenías)
        const datosNormalizados = data.map(e => ({
          ...e,
          volumen: e.hm3,
          tendencia: e.tendencia ? e.tendencia.toLowerCase() : 'estable'
        }));

        // 2. Lógica Fintech: Separar en Top 5 Subidas y Top 5 Bajadas
        // Ordenamos por variación de mayor a menor para las subidas
        this.topSubidas = [...datosNormalizados]
          .filter(e => e.variacion > 0)
          .sort((a, b) => b.variacion - a.variacion)
          .slice(0, 5);

        // Ordenamos por variación de menor a mayor para las bajadas
        this.topBajadas = [...datosNormalizados]
          .filter(e => e.variacion < 0)
          .sort((a, b) => a.variacion - b.variacion)
          .slice(0, 5);

        // Mantenemos la lista completa por si la necesitas debajo
        this.embalses = datosNormalizados.sort((a, b) => b.hm3 - a.hm3);

        // 3. Totales para el encabezado
        this.volumenTotal = data.reduce((acc, e) => acc + (e.hm3 || 0), 0);
        this.totalVariacion = data.reduce((acc, e) => acc + (e.variacion || 0), 0);
        this.porcentajeMedio = data.length > 0
          ? (data.reduce((acc, e) => acc + (e.porcentaje || 0), 0) / data.length)
          : 0;
      },
      error: (err) => {
        console.error('Error cargando datos', err);
        this.embalses = [];
        this.topSubidas = [];
        this.topBajadas = [];
      }
    });
  }
}