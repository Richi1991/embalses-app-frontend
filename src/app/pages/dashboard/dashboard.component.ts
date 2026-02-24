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

declare var Chart: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, ]
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartCanvas') chartCanvas!: ElementRef;

  // Data
  embalses: Embalse[] = [];
  topSubidas: TopMovimiento[] = [];
  topBajadas: TopMovimiento[] = [];
  historico: HistoricoCuenca[] = [];

  // KPIs
  totalVol = 0; totalPct = 0; totalCap = 0;
  variacion24h = 0; variacion7d = 0;
  embalsesAlerta = 0; embalsesCriticos = 0; encimaMitad = 0;

  // UI
  currentTime = ''; currentDate = '';
  activePeriod = '3M';
  chartMode: 'VOL' | 'PCT' = 'VOL';
  activeTab: 'subidas' | 'bajadas' | 'todos' = 'subidas';
  lightMode = false;

  private chart: any;
  private clockSub!: Subscription;

  constructor(
    private embalseService: EmbalseService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ mapOutline, arrowBackOutline });
    // Recuperar preferencia guardada
    this.lightMode = localStorage.getItem('dashboard-theme') === 'light';
  }

  ngOnInit() { this.startClock(); this.loadData(); }

  ngAfterViewInit() { setTimeout(() => this.initChart(), 300); }

  ngOnDestroy() { this.clockSub?.unsubscribe(); if (this.chart) this.chart.destroy(); }

  toggleTheme() {
    this.lightMode = !this.lightMode;
    localStorage.setItem('dashboard-theme', this.lightMode ? 'light' : 'dark');
    // Actualizar colores del chart según el tema
    setTimeout(() => this.rebuildChart(), 50);
  }

  private startClock() {
    this.updateTime();
    this.clockSub = interval(1000).subscribe(() => this.updateTime());
  }

  private updateTime() {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    this.currentTime = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
    this.currentDate = now.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  }

  private loadData() {
    forkJoin({
      embalses: this.embalseService.getEmbalsesLastValueAndPosition(),
      topSubidas: this.embalseService.getTopMovimientos('1day'),
      historico: this.embalseService.getHistoricoCuencaSegura(),
    }).subscribe(({ embalses, topSubidas, historico }) => {
      this.embalses = embalses.sort((a, b) => b.porcentaje - a.porcentaje);
      this.topSubidas = topSubidas.filter(e => e.variacion >= 0).sort((a, b) => b.variacion - a.variacion).slice(0, 5);
      this.topBajadas = topSubidas.filter(e => e.variacion < 0).sort((a, b) => a.variacion - b.variacion).slice(0, 5);
      this.historico = historico;
      this.calcKpis();
      this.updateChart();
      this.cdr.detectChanges();
    });
  }

  private calcKpis() {
    this.totalVol = this.embalses.reduce((s, e) => s + e.hm3, 0);
    this.totalCap = this.embalses.reduce((s, e) => s + e.capacidadMaximaEmbalse, 0);
    this.totalPct = this.totalCap > 0 ? (this.totalVol / this.totalCap) * 100 : 0;
    this.variacion24h = this.embalses.reduce((s, e) => s + e.variacion, 0);
    this.embalsesAlerta = this.embalses.filter(e => e.porcentaje < 25 && e.porcentaje >= 15).length;
    this.embalsesCriticos = this.embalses.filter(e => e.porcentaje < 15).length;
    this.encimaMitad = this.embalses.filter(e => e.porcentaje >= 50).length;
  }

  // Colores del chart según tema activo
  private chartColors() {
    return this.lightMode
      ? { grid: 'rgba(0,0,0,0.05)', tick: '#8896aa', border: 'rgba(0,0,0,0.08)', tooltipBg: 'rgba(255,255,255,0.97)', tooltipTitle: '#8896aa', tooltipBody: '#0d1420' }
      : { grid: 'rgba(255,255,255,0.03)', tick: '#4a5568', border: 'rgba(255,255,255,0.06)', tooltipBg: 'rgba(13,20,32,0.95)', tooltipTitle: '#6b7a90', tooltipBody: '#e8edf5' };
  }

  private initChart() {
    if (!this.chartCanvas) return;
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    const c = this.chartColors();

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(0,212,170,0.2)');
    gradient.addColorStop(1, 'rgba(0,212,170,0)');

    this.chart = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: [], datasets: [{
          data: [], borderColor: '#00d4aa', borderWidth: 2,
          fill: true, backgroundColor: gradient, tension: 0.4,
          pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#00d4aa',
        }]
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
            callbacks: { label: (ctx: any) => this.chartMode === 'VOL' ? ` ${ctx.parsed.y.toFixed(2)} hm³` : ` ${ctx.parsed.y.toFixed(2)}%` }
          }
        },
        scales: {
          x: { grid: { color: c.grid }, border: { color: c.border }, ticks: { color: c.tick, font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 8, maxRotation: 0 } },
          y: { position: 'right', grid: { color: c.grid }, border: { color: 'transparent' }, ticks: { color: c.tick, font: { family: 'JetBrains Mono', size: 10 }, callback: (v: number) => this.chartMode === 'VOL' ? v.toFixed(0) + ' hm³' : v.toFixed(1) + '%' } }
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
    if (!this.chart || !this.historico.length) return;
    const filtered = this.filterHistorico();
    this.chart.data.labels = filtered.map(h => new Date(h.fechaRegistro).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
    this.chart.data.datasets[0].data = filtered.map(h => this.chartMode === 'VOL' ? h.volumenTotal : h.porcentaje);
    this.chart.update('active');
  }

  private filterHistorico(): HistoricoCuenca[] {
    const now = new Date();
    const days: Record<string, number> = { '1D': 1, '7D': 7, '1M': 30, '3M': 90, '6M': 180, '1A': 365, '2A': 730, '5A': 1825, '10A': 3650 };
    const from = new Date(now.getTime() - (days[this.activePeriod] || 90) * 86400000);
    return this.historico.filter(h => new Date(h.fechaRegistro) >= from);
  }

  setPeriod(period: string) { this.activePeriod = period; this.updateChart(); }
  setChartMode(mode: 'VOL' | 'PCT') { this.chartMode = mode; this.updateChart(); }

  getPctColor(pct: number): string {
    if (pct >= 60) return '#0099ff';
    if (pct >= 40) return '#00d4aa';
    if (pct >= 25) return '#ffd60a';
    return '#ff4d6d';
  }

  goToMapa() { this.router.navigate(['/mapa']); }
  goToEmbalse(id: number) { this.router.navigate(['/embalse', id]); }
}
