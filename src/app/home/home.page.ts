import { Component, OnInit, inject } from '@angular/core';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Filler, Tooltip, Legend);
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { EmbalseService, Embalse } from '../services/embalse.service';
import { addIcons } from 'ionicons';
import { trendingUpOutline, trendingDownOutline } from 'ionicons/icons';
import { Router } from '@angular/router';

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
  public porcentajeTotal: number = 0;
  public porcentajeTotalHeader: number = 0;
  public variacionPorcentajeTotalHeader: number = 0;
  public porcentajeVariacion: number = 0;
  public variacionVolumenTotal: number = 0;
  public totalVariacion: number = 0;
  private historicoCompleto: any[] = [];
  public volumenTotalHeader: number = 0;
  public volumenMaximoCuenca: number = 1140;
  public porcentajeHeader: number = 0;
  public tendenciaPositiva: boolean = true;

  constructor(private router: Router) {
    addIcons({ arrowUpOutline, arrowDownOutline, removeOutline });
  }

  ngOnInit() {
    this.cargarDatos();
  }
 
  cargarDatos() {
    this.embalseService.getTopMovimientos().subscribe({
      next: (data: Embalse[]) => {
        // 1. Normalizamos los datos (mapeo que ya tenías)
        const datosNormalizados = data.map(e => ({
          ...e,
          idEmbalse: e.idEmbalse,
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
        this.porcentajeTotal = data.reduce((acc, e) => acc + (e.porcentaje || 0), 0);
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


   ngAfterViewInit() {
    // Esperamos 300ms para que la tarjeta gris se estire en pantalla
    setTimeout(() => {

      this.embalseService.getHistoricoCuencaSeguraList().subscribe({
        next: (datos) => {
          this.historicoCompleto = datos;
          this.updateChart('1S');
        },
        error: (err) => {
          console.error("Error al obtener el histórico", err);
        }
      });
    }, 300);
  }

  updateChart(selectedFilter: string) {
    this.filter = selectedFilter; // Para que el botón cambie a clase .active

    if (!this.historicoCompleto || this.historicoCompleto.length === 0) return;

    const ahora = new Date();
    let fechaLimite = new Date();

    fechaLimite = this.calcularFechaLimite(selectedFilter);

    // Filtramos el array maestro
    const datosFiltrados = this.historicoCompleto.filter(item => {
      const fechaItem = new Date(item.fechaRegistro);
      const volumenValido = item.volumenTotal <= this.volumenMaximoCuenca;
      return fechaItem >= fechaLimite && volumenValido;
    });

    if (datosFiltrados.length > 0) {
      const primero = datosFiltrados[0];
      const ultimo = datosFiltrados[datosFiltrados.length - 1];

      // 1. El valor principal es el último dato conocido
      this.volumenTotalHeader = ultimo.volumenTotal;
      this.porcentajeTotalHeader = ultimo.porcentajeTotal;
      this.variacionPorcentajeTotalHeader = ultimo.porcentajeTotal - primero.porcentajeTotal;

      // 2. Calculamos la variación porcentual entre el inicio del periodo y el final
      // Fórmula: ((Actual - Inicial) / Inicial) * 100
      if (primero.volumenTotal !== 0) {
        this.porcentajeVariacion = ((ultimo.volumenTotal - primero.volumenTotal) / primero.volumenTotal) * 100;
        this.variacionVolumenTotal = (ultimo.volumenTotal - primero.volumenTotal);
      } else {
        this.porcentajeVariacion = 0;
      }

      // 3. Determinamos si es positivo para el color (verde/rojo)
      this.tendenciaPositiva = this.porcentajeVariacion >= 0;
    }

    // Llamamos a initChart con los datos recortados
    this.initChart(datosFiltrados);
  }

  updateChartTopSubidas(selectedFilter: string) {
    this.filter = selectedFilter; // Para que el botón cambie a clase .active

    //this.historicoCompletoEmbalse
  }

  abrirHistoricoEmbalse(idEmbalse: number) {
    this.router.navigate(['/embalse-historico', idEmbalse]);
  }

  private calcularFechaLimite(selectedFilter: string): Date {
  const ahora = new Date();
  const fecha = new Date();

  switch (selectedFilter) {
    case '1D':
      fecha.setHours(0, 0, 0, 0);
      break;
    case '1S':
      fecha.setDate(ahora.getDate() - 7);
      break;
    case '1M':
      fecha.setDate(ahora.getDate() - 30);
      break;
    case '3M':
      fecha.setDate(ahora.getDate() - 90);
      break;
    case 'YTD':
      return new Date(ahora.getFullYear(), 0, 1);
    case '1A':
      fecha.setDate(ahora.getDate() - 365);
      break;
    case '2A':
      fecha.setDate(ahora.getDate() - 730);
      break;
    case '3A':
      fecha.setDate(ahora.getDate() - 1095);
      break;
    case '5A':
      fecha.setDate(ahora.getDate() - 1825);
      break;
    case '10A':
      fecha.setDate(ahora.getDate() - 3650);
      break;
    case 'ALL':
      fecha.setDate(ahora.getDate() - 7300);
       break;
    default:
      // Por defecto 1 año si algo falla
      fecha.setDate(ahora.getDate() - 365);
  }
  return fecha;
}

  initChart(datosReales: any[]) {
    const canvas = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!canvas || !datosReales) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = datosReales.map(item => {
      const fecha = new Date(item.fechaRegistro);

      if (this.filter === '1D') {
        // Si filtramos por día, queremos ver la hora: 14:30
        return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (this.filter === '1S') {
        // Si filtramos por la última semana vemos los días y el mes
        return fecha.toLocaleDateString([], { day: '2-digit', month: 'short' });
      } else if (this.filter === '1M' || this.filter === '3M') {
        // Si filtramos por meses, queremos ver el día y mes: 19 Dic
        return fecha.toLocaleDateString([], { day: '2-digit', month: 'short' });
      } else if (this.filter === 'YTD') {
        // Para YTD, devolvemos solo el mes: "ene", "feb", "mar"...
        return fecha.toLocaleDateString('es-ES', { month: 'short' });
      } else if (this.filter === '1A') {
        // Para 1A, devolvemos mes y anio desde hace un año
        return fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      } else if (this.filter === '2A') {
        // Para 2A, devolvemos mes y anio desde hace 2 años
        return fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      } else if (this.filter === '3A') {
        // Para 3A, devolvemos mes y anio desde hace 3 años
        return fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      } else if (this.filter === '5A') {
        // Para 5A, devolvemos mes y anio desde hace 5 años
        return fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      } else if (this.filter === '10A') {
        // Para 10A, devolvemos mes y anio desde hace 10 años
        return fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      } else if (this.filter === 'ALL') {
        // Desde el principio, devolvemos mes y anio desde hace 20 años
        return fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      }else {
        return fecha.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
      }
    });

    const valores = datosReales.map(item => item.volumenTotal || 0);
    const valoresPorcentaje = datosReales.map(item => {
        const p = item.porcentajeTotal || 0;
        return p > 100 ? 100 : (p < 0 ? 0 : p);
    });
      
      

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 255, 132, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 255, 132, 0)');

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
          label: "Volumen (hm3)",
          data: valores,
          borderColor: '#00ff84',
          borderWidth: 2,
          fill: true,
          backgroundColor: gradient,
          pointRadius: 0,
          tension: 0.4,
          yAxisID: 'y',
          },
          {
          label: 'Porcentaje (%)',
          data: valoresPorcentaje,
          borderColor: 'transparent', // Invisible para que solo usemos su escala
          pointRadius: 0,
          yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#848e9c',
              callback: (value) => value + ' hm³' // Añade la unidad al eje
            }
          },
           y1: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#848e9c',
              callback: (value) => value + ' %' // Añade la unidad al eje
            }
          }
        },
        plugins: {
          legend: { display: false },
          // Sugerencia estética: añade un tooltip personalizado
          tooltip: {
            backgroundColor: '#1e2329',
            titleColor: '#00ff84',
            bodyColor: '#fff',
            displayColors: false
          }
        }
      }
    })
  }

}