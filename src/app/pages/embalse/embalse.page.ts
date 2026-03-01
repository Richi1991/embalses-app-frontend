import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Embalse } from '../../models/embalse.model';
import { ActivatedRoute } from '@angular/router';
import { EmbalseService } from '../../services/embalse.service';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-embalse',
  templateUrl: './embalse.page.html',
  styleUrls: ['./embalse.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class EmbalsePage implements OnInit {

  @ViewChild('chartCanvas') chartCanvas!: ElementRef;

  embalses: Embalse[] = [];
  idEmbalse: number;
  lightMode = false;
  nombreEmbalse = '';
  activePeriod = '1M';
  private chart: any;

  constructor(private embalseService: EmbalseService, private route: ActivatedRoute) {

  }

  ngOnInit() {
    this.idEmbalse = Number(this.route.snapshot.paramMap.get('id'));
    this.obtenerHistoricoEmbalse(this.idEmbalse);
  }


  private obtenerHistoricoEmbalse(idEmbalse: number) {
    this.embalseService.getHistoricoEmbalse(idEmbalse).subscribe({
      next: (data) => {
        this.embalses = data;
        this.nombreEmbalse = data[0].nombre;
        this.loadGrafico();
      },
    });
  }

  private chartColors() {
    return this.lightMode
      ? { grid: 'rgba(0,0,0,0.05)', tick: '#4a90d9', border: 'rgba(0,0,0,0.08)', tooltipBg: 'rgba(255,255,255,0.97)', tooltipTitle: '#8896aa', tooltipBody: '#0d1420' }
      : { grid: 'rgba(255,255,255,0.03)', tick: '#c8d6e8', border: 'rgba(255,255,255,0.06)', tooltipBg: 'rgba(13,20,32,0.95)', tooltipTitle: '#6b7a90', tooltipBody: '#e8edf5' };
  }

  private loadGrafico() {
    if (!this.chartCanvas) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    const c = this.chartColors();

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(0, 148, 212, 0.2)');   // 👈 añade estas dos líneas
    gradient.addColorStop(1, 'rgba(0, 212, 170, 0)');

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
        maintainAspectRatio: false,
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

  private filterHistorico(): Embalse[] {
    const now = new Date();
    const days: Record<string, number> = {
      '1D': 1, '7D': 7, '1M': 30, '3M': 90,
      '6M': 180, '1A': 365, '2A': 730, '5A': 1825, '10A': 3650
    };
    const from = new Date(now.getTime() - (days[this.activePeriod] || 30) * 86400000);
    return this.embalses.filter(h => new Date(h.fechaRegistro) >= from);
  }

  private formatFecha(fecha: any, periodo: string): string {
    const d = new Date(fecha);
    if (periodo === '1D') {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (['7D', '1S', '1M', '3M', '6M'].includes(periodo)) {
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } else {
      return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }
  }

  private updateChart() {
    if (!this.chart) {
      if (this.chartCanvas) this.loadGrafico();
      return;
    }

    const filtered = this.filterHistorico();
    this.chart.data.labels = filtered.map(h => this.formatFecha(h.fechaRegistro, this.activePeriod));
    this.chart.data.datasets[0].data = filtered.map(h => h.hm3);
    this.chart.data.datasets[1].data = filtered.map(h => h.porcentaje);
    this.chart.update('active');
  }
}
