import {
  Component, OnInit, OnDestroy,
  AfterViewInit, ViewChild, ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription, forkJoin } from 'rxjs';
import { EmbalseService } from '../../services/embalse.service';
import { Embalse, TopMovimiento } from '../../models/embalse.model';
import { HistoricoCuenca } from '../../models/historico.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mapOutline, arrowBackOutline } from 'ionicons/icons';
import { SplashService } from '../../services/splash.service';


declare var Chart: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon,]
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartCanvas') chartCanvas!: ElementRef;

  // Data
  embalses: Embalse[] = [];
  topSubidas: TopMovimiento[] = [];
  topBajadas: TopMovimiento[] = [];
  historico: HistoricoCuenca[] = [];
  historicoDiario: HistoricoCuenca[] = [];
  loading = true;
  loadError = false;
  loadingMsg = 'Conectando con el servidor...';

  periods = [
    { label: '1D', value: 1 },
    { label: '1S', value: 7 },
    { label: '1M', value: 30 },
    { label: '3M', value: 90 },
    { label: '6M', value: 180 },
    { label: '1A', value: 365 }
  ];

  // KPIs
  totalVol = 0; totalPct = 0; totalCap = 0;
  variacion24h = 0; variacion7d = 0;
  embalsesAlerta = 0; embalsesCriticos = 0; encimaMitad = 0; normalidad = 0;
  variacionDiaria = 0;

  // UI
  currentTime = ''; currentDate = '';
  activePeriod = '3M';
  chartMode: 'VOL' | 'PCT' = 'VOL';
  activeTab: 'subidas' | 'bajadas' | 'todos' = 'subidas';
  lightMode = false;

  private chart: any;
  constructor(
    private embalseService: EmbalseService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private splashService: SplashService
  ) {
    addIcons({ mapOutline, arrowBackOutline });
    // Recuperar preferencia guardada
    this.lightMode = localStorage.getItem('dashboard-theme') === 'light';
  }

  ngOnInit() {
     this.loadData(); 
  }

  ngAfterViewInit() { 
    this.initChart() 
  }

  ngOnDestroy() {  
    if (this.chart) this.chart.destroy(); 
  }

  toggleTheme() {
    this.lightMode = !this.lightMode;
    localStorage.setItem('dashboard-theme', this.lightMode ? 'light' : 'dark');
    // Actualizar colores del chart según el tema
    setTimeout(() => this.rebuildChart(), 50);
  }

  calcularVariacionDiaria(): void {

    const hoy = new Date().toISOString().split('T')[0];

    const datosHoy = this.historicoDiario.filter(e =>
      new Date(e.fechaRegistro).toISOString().split('T')[0] === hoy
    );

    const primero = datosHoy[0]?.volumenTotal ?? 0;
    const ultimo = datosHoy.at(-1)?.volumenTotal ?? 0;
    this.variacionDiaria = +(ultimo - primero).toFixed(3);
  }


  private loadData() {
    forkJoin({
      embalses: this.embalseService.getEmbalsesLastValueAndPosition(),
      topSubidas: this.embalseService.getTopMovimientos('1day'),
      historico: this.embalseService.getHistoricoCuencaSegura(),
      historicoDiario: this.embalseService.getHistoricoCuencaSeguraDiaro(),
    }).subscribe({
      next: ({ embalses, topSubidas, historico, historicoDiario }) => {
        this.embalses = embalses.sort((a, b) => b.porcentaje - a.porcentaje);
        this.topSubidas = topSubidas.filter(e => e.variacion >= 0).sort((a, b) => b.variacion - a.variacion).slice(0, 5);
        this.topBajadas = topSubidas.filter(e => e.variacion < 0).sort((a, b) => a.variacion - b.variacion).slice(0, 5);
        this.historico = historico;
        this.historicoDiario = historicoDiario;
        this.loading = false;
        this.calcKpis();
        this.updateChart();
        this.cdr.detectChanges();
        setTimeout(() => this.updateChart(), 0);
        this.splashService.markReady();
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
        this.cdr.detectChanges();
        this.splashService.markReady();
      }
    });
  }


  retry() {
    this.loadingMsg = 'Reintentando...';
    this.loading = true;
    this.loadError = false;
    this.loadData();
  }

  private calcKpis() {
    this.totalVol = this.historicoDiario.at(-1)?.volumenTotal ?? 0;
    this.totalCap = this.embalses.reduce((s, e) => s + e.capacidadMaximaEmbalse, 0);
    this.totalPct = this.historicoDiario.at(-1)?.porcentajeTotal ?? 0;
    this.calcularVariacionDiaria();
    this.embalsesAlerta = this.embalses.filter(e => e.porcentaje < 25 && e.porcentaje >= 15).length;
    this.embalsesCriticos = this.embalses.filter(e => e.porcentaje < 15).length;
    this.encimaMitad = this.embalses.filter(e => e.porcentaje >= 50).length;
    this.normalidad = this.embalses.filter(e => e.porcentaje < 50 && e.porcentaje >= 25).length;
  }

  // Colores del chart según tema activo
  private chartColors() {
    return this.lightMode
      ? { grid: 'rgba(0,0,0,0.05)', tick: '#4a90d9', border: 'rgba(0,0,0,0.08)', tooltipBg: 'rgba(255,255,255,0.97)', tooltipTitle: '#8896aa', tooltipBody: '#0d1420' }
      : { grid: 'rgba(255,255,255,0.03)', tick: '#c8d6e8', border: 'rgba(255,255,255,0.06)', tooltipBg: 'rgba(13,20,32,0.95)', tooltipTitle: '#6b7a90', tooltipBody: '#e8edf5' };
  }

  private formatFecha(fecha: string, periodo: string): string {
    const d = new Date(fecha);
    const periodosDias = ['1D', '7D'];
    const periodosMeses = ['1M', '3M', '6M'];
    // periodos largos: 1A, 2A, 5A, 10A → mostrar año

    if (periodo === '1D') {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (['1S', '7D', '1M', '3M', '6M'].includes(periodo)) {
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } else {
      return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }
  }

  private initChart() {
    if (!this.chartCanvas) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    const c = this.chartColors();

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(0, 148, 212, 0.2)');
    gradient.addColorStop(1, 'rgba(0,212,170,0)');

    this.chart = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            data: [], borderColor: '#00a6ff', borderWidth: 2,
            fill: true, backgroundColor: gradient, tension: 0.1,
            pointRadius: 0, pointHoverRadius: 2, pointHoverBackgroundColor: '#00a6ff',
            yAxisID: 'yVol'
          },
          {
            data: [], borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            yAxisID: 'yPct'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.tooltipBg, borderColor: c.border, borderWidth: 1,
            titleColor: c.tooltipTitle, bodyColor: c.tooltipBody,
            titleFont: { family: 'JetBrains Mono', size: 10 },
            bodyFont: { family: 'JetBrains Mono', size: 13 },
            padding: 12,
            callbacks: {
              label: (ctx: any) => {
                if (ctx.datasetIndex === 0) return ` ${ctx.parsed.y.toFixed(2)} hm³`;
                if (ctx.datasetIndex === 1) return ` ${ctx.parsed.y.toFixed(2)} %`;
                return '';
              }
            }
          }
        },
        scales: {
          x: { grid: { color: c.grid }, border: { color: c.border }, ticks: { color: c.tick, font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 12, maxRotation: 0 } },
          yVol: {
            position: 'right', grid: { color: c.grid }, border: { color: 'transparent' },
            ticks: {
              color: c.tick, font:
                { family: 'JetBrains Mono', size: 10 },
              callback: (v: number) => this.activePeriod === '1D' ? v.toFixed(2) + ' hm³' : + v.toFixed(0) + ' hm³'
            }
          },
          yPct: {
            position: 'left', grid: { display: false }, border: { color: 'transparent' },
            ticks: {
              color: c.tick, font: { family: 'JetBrains Mono', size: 10 },
              callback: (v: number) => this.activePeriod === '1D' ? v.toFixed(2) + '%' : v.toFixed(1) + '%'
            }
          }
        }
      }
    });
    this.updateChart();
  }

  private rebuildChart() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this.initChart();
  }

  private updateChart() {
    if (!this.historico.length) return;

    // Si el chart no existe aún, intentar inicializarlo
    if (!this.chart) {
      if (this.chartCanvas) {
        this.initChart();
      }
      return;
    }

    const filtered = this.filterHistorico();
    this.chart.data.labels = filtered.map(h => this.formatFecha(h.fechaRegistro as any, this.activePeriod));
    this.chart.data.datasets[0].data = filtered.map(h => h.volumenTotal);  // siempre volumen
    this.chart.data.datasets[1].data = filtered.map(h => h.porcentajeTotal);
    this.chart.update('active');
  }

  private filterHistorico(): HistoricoCuenca[] {
    const now = new Date();
    const days: Record<string, number> = { '1D': 1, '1S': 7, '7D': 7, '1M': 30, '3M': 90, '6M': 180, '1A': 365, '2A': 730, '5A': 1825, '10A': 3650 };
    const from = new Date(now.getTime() - (days[this.activePeriod] || 90) * 86400000);
    if (this.activePeriod === '1D') {
      return this.historicoDiario.filter(h => new Date(h.fechaRegistro) >= from);
    } else {
      return this.historico.filter(h => new Date(h.fechaRegistro) >= from);
    }
  }

  setPeriod(period: string) {
    this.activePeriod = period;

    if (this.chart && period === '1D') {
      const is1D = period === '1D';

      this.chart.options.scales['yVol'].ticks.maxTicksLimit = is1D ? 10 : undefined;
      this.chart.options.scales['yVol'].ticks.stepSize = is1D ? 0.05 : undefined;
      this.chart.options.scales['yPct'].ticks.maxTicksLimit = is1D ? 10 : undefined;
      this.chart.options.scales['yPct'].ticks.stepSize = is1D ? 0.005 : undefined;
    }

    if (this.chart && period === '7D') {
        this.chart.options.scales['x'].ticks.maxTicksLimit = 7;
    }


    this.updateChart();
  }

  getPctColor(pct: number): string {
    if (pct >= 50) return '#0099ff';
    if (pct < 50 && pct >= 25) return '#00d4aa';
    if (pct < 25 && pct >= 15) return '#ffd60a';
    if (pct < 15) return '#ff4d6d';
    return '#000000';
  }

  goToMapa() { this.router.navigate(['/mapa']); }
  goToEmbalse(idEmbalse: number) { 
    this.router.navigate(['/embalse', idEmbalse]); 
  }
}
