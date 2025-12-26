import { Component, OnInit, inject } from '@angular/core';
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Filler, Tooltip, Legend);
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { EmbalseService, Embalse } from '../services/embalse.service';
import { addIcons } from 'ionicons';
import { Router } from '@angular/router';
import { trendingUpOutline, trendingDownOutline, waterOutline } from 'ionicons/icons';
import { MeteorologyMapComponent } from '../components/meteorology-map/meteorology-map.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, MeteorologyMapComponent], // Importante para usar *ngFor y componentes de Ionic
})
export class HomePage implements OnInit {
  private embalseService: EmbalseService = inject(EmbalseService);
  public embalses: Embalse[] = [];
  public topSubidas: Embalse[] = [];
  public topBajadas: Embalse[] = [];
  public filtroSubidas: string = '1 day';
  public filtroBajadas: string = '1 day';
  public filtroIndividual: string = '1 day';
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
  public mensajeSinSubidas: string = '';
  public mensajeSinBajadas: string = '';
  filtroActual: string = '1 day';

  constructor(private router: Router) {
    addIcons({
      'trending-up-outline': trendingUpOutline,
      'trending-down-outline': trendingDownOutline,
      'water-outline': waterOutline
    });
  }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos(intervalo: string = '1 day') {
    this.filtroActual = intervalo;

    this.embalseService.getTopMovimientos(intervalo).subscribe({
      next: (data: Embalse[]) => {
        // 1. Normalización común
        const datosNormalizados = data.map(e => ({
          ...e,
          volumen: e.hm3,
          tendencia: e.tendencia ? e.tendencia.toLowerCase() : 'estable'
        }));

        // 2. Procesamiento de Listas
        this.topSubidas = [...datosNormalizados]
          .filter(e => e.variacion > 0)
          .sort((a, b) => b.variacion - a.variacion)
          .slice(0, 5);

        this.topBajadas = [...datosNormalizados]
          .filter(e => e.variacion < 0)
          .sort((a, b) => a.variacion - b.variacion)
          .slice(0, 5);

        // Lista completa ordenada por hm3 (o por variación si prefieres)
        this.embalses = [...datosNormalizados].sort((a, b) => b.variacion - a.variacion);

        // 3. Gestión de Mensajes de Estado Vacío
        const textoTiempo = this.getTextoTiempo(intervalo);
        this.mensajeSinSubidas = this.topSubidas.length === 0
          ? `Actualmente no hay ningún embalse que presente subidas en ${textoTiempo}.`
          : '';

        this.mensajeSinBajadas = this.topBajadas.length === 0
          ? `Actualmente no hay ningún embalse que presente bajadas en ${textoTiempo}.`
          : '';

        // 4. Cálculos de Totales
        this.volumenTotal = data.reduce((acc, e) => acc + (e.hm3 || 0), 0);
        this.porcentajeTotal = data.reduce((acc, e) => acc + (e.porcentaje || 0), 0);
        this.totalVariacion = data.reduce((acc, e) => acc + (e.variacion || 0), 0);
        this.porcentajeMedio = data.length > 0 ? (this.porcentajeTotal / data.length) : 0;
      },
      error: (err) => {
        console.error('Error cargando datos', err);
        this.limpiarDatos();
      }
    });
  }

  cargarSeccion(intervalo: string, seccion: 'subidas' | 'bajadas' | 'individual') {
    // Actualizamos el filtro visual de la sección específica
    if (seccion === 'subidas') this.filtroSubidas = intervalo;
    if (seccion === 'bajadas') this.filtroBajadas = intervalo;
    if (seccion === 'individual') this.filtroIndividual = intervalo;

    this.embalseService.getTopMovimientos(intervalo).subscribe({
      next: (data: Embalse[]) => {
        const datosNormalizados = data.map(e => ({
          ...e,
          volumen: e.hm3,
          tendencia: e.tendencia ? e.tendencia.toLowerCase() : 'estable'
        }));

        const textoTiempo = this.getTextoTiempo(intervalo);

        if (seccion === 'subidas') {
          this.topSubidas = datosNormalizados
            .filter(e => e.variacion > 0)
            .sort((a, b) => b.variacion - a.variacion)
            .slice(0, 5);
          this.mensajeSinSubidas = this.topSubidas.length === 0 ? `No hay subidas en ${textoTiempo}.` : '';
        }
        else if (seccion === 'bajadas') {
          this.topBajadas = datosNormalizados
            .filter(e => e.variacion < 0)
            .sort((a, b) => a.variacion - b.variacion)
            .slice(0, 5);
          this.mensajeSinBajadas = this.topBajadas.length === 0 ? `No hay bajadas en ${textoTiempo}.` : '';
        }
        else if (seccion === 'individual') {
          // Mostramos todos ordenados por volumen (hm3) de mayor a menor
          this.embalses = [...datosNormalizados].sort((a, b) => b.variacion - a.variacion);
        }
      }
    });
  }

  // Métodos de apoyo para mantener el código limpio:
  private getTextoTiempo(intervalo: string): string {
    const mapeo: { [key: string]: string } = {
      '1 day': 'el último día',
      '7 days': 'la última semana',
      '30 days': 'el último mes'
    };
    return mapeo[intervalo] || 'el periodo seleccionado';
  }

  private limpiarDatos() {
    this.topSubidas = [];
    this.topBajadas = [];
    this.embalses = [];
    this.mensajeSinSubidas = 'Error al cargar datos.';
    this.mensajeSinBajadas = 'Error al cargar datos.';
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

   if (selectedFilter === '1D') {
      this.embalseService.getHistoricoCuencaSeguraDiaroList().subscribe({
        next: (datos) => {
          const fechaLimite = this.calcularFechaLimite('1D');
          // Filtramos solo las últimas 24h del diario (aunque la tabla tenga 7 días)
          const datosFiltrados = datos.filter(item => new Date(item.fechaRegistro) >= fechaLimite);
          this.procesarYRenderizar(datosFiltrados);
        }
      });
    }
    // CASO 2: Resto de filtros (Tabla Histórica Larga)
    else {
      if (!this.historicoCompleto || this.historicoCompleto.length === 0) return;

      const fechaLimite = this.calcularFechaLimite(selectedFilter);
      const datosFiltrados = this.historicoCompleto.filter(item => {
        const fechaItem = new Date(item.fechaRegistro);
        const volumenValido = item.volumenTotal <= this.volumenMaximoCuenca;
        return fechaItem >= fechaLimite && volumenValido;
      });

      this.procesarYRenderizar(datosFiltrados);
    }
  }

// Centralizamos los cálculos y el renderizado aquí
  private procesarYRenderizar(datos: any[]) {
    if (datos.length > 0) {
      const primero = datos[0];
      const ultimo = datos[datos.length - 1];

      this.volumenTotalHeader = ultimo.volumenTotal;
      this.porcentajeTotalHeader = ultimo.porcentajeTotal;
      this.variacionPorcentajeTotalHeader = ultimo.porcentajeTotal - primero.porcentajeTotal;

      if (primero.volumenTotal !== 0) {
        this.porcentajeVariacion = ((ultimo.volumenTotal - primero.volumenTotal) / primero.volumenTotal) * 100;
        this.variacionVolumenTotal = (ultimo.volumenTotal - primero.volumenTotal);
      }
      this.tendenciaPositiva = this.porcentajeVariacion >= 0;
    }
    this.initChart(datos);
  }


  abrirHistoricoEmbalse(idEmbalse: number) {
    this.router.navigate(['/embalse-historico', idEmbalse]);
  }

  private calcularFechaLimite(selectedFilter: string): Date {
    const ahora = new Date();
    const fecha = new Date();

    switch (selectedFilter) {
      case '1D':
        fecha.setDate(ahora.getDate() - 1);
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
      const isMobile = window.innerWidth < 768; // Detectamos si es móvil

      switch (this.filter) {
        case '1D':
          return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        case '1S':
        case '1M':
        case '3M':
          // Semana y meses: "19 dic"
          return fecha.toLocaleDateString([], { day: '2-digit', month: 'short' });

        case 'YTD':
          // Solo el mes corto: "ene"
          return fecha.toLocaleDateString('es-ES', { month: 'short' });

        case '1A':
        case '2A':
        case '3A':
        case '5A':
        case '10A':
        case 'ALL':
          // Lógica condicional: Solo año en móvil, Mes/Año en PC
          return isMobile
            ? fecha.getFullYear().toString()
            : fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });

        default:
          // Formato de respaldo: "19/12"
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
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
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