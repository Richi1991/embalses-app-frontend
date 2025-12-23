import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Embalse {
  idEmbalse: number;
  nombre: string;
  hm3: number;        // Lo que viene del JSON
  volumen: number;    // Lo que espera el HTML
  porcentaje: number;
  capacidadMaximaEmbalse: number;
  variacion: number;
  tendencia: string;
  fechaRegistro: Date;
}

export interface HistoricoCuenca {
  volumenTotal: number;
  porcentaje: number;
  fechaRegistro: Date;

}

@Injectable({
  providedIn: 'root'
})
export class EmbalseService {
  private http = inject(HttpClient);

  // Verifica si tu Controller tiene el prefijo /v1. Si no, usa:
  // https://embalses-api.onrender.com/api/embalses/top-movimientos
  private apiUrl = 'https://embalses-api.onrender.com/api/embalses/top-movimientos';
  private apiUrlHistoricoCuenca = 'https://embalses-api.onrender.com/api/embalses/historico-cuenca';
  private apiUrlHistoricoCuencaDiario = 'https://embalses-api.onrender.com/api/embalses/historico-cuenca-diario';
  private apiUrlHistoricoEmbalse = 'https://embalses-api.onrender.com/api/embalses/obtener_historico_embalse';

  // Variables de caché
  private cacheHistoricoLargo: HistoricoCuenca[] | null = null;
  private cacheHistoricoDiario: HistoricoCuenca[] | null = null;

  getTopMovimientos(intervalo: string = '1 day'): Observable<Embalse[]> {
    return this.http.get<Embalse[]>(`${this.apiUrl}`, {
      params: { intervalo: intervalo }
    });
  }

  getHistoricoCuencaSeguraList(): Observable<HistoricoCuenca[]> {
    if (this.cacheHistoricoLargo) return of(this.cacheHistoricoLargo);

    return this.http.get<HistoricoCuenca[]>(this.apiUrlHistoricoCuenca).pipe(
      tap(datos => this.cacheHistoricoLargo = datos)
    );
  }

    // Obtiene datos de la tabla historico_cuenca_diario (Últimos 7 días detallados)
  getHistoricoCuencaSeguraDiaroList(): Observable<HistoricoCuenca[]> {
    if (this.cacheHistoricoDiario) return of(this.cacheHistoricoDiario);

    return this.http.get<HistoricoCuenca[]>(this.apiUrlHistoricoCuencaDiario).pipe(
      tap(datos => this.cacheHistoricoDiario = datos)
    );
  }

  getHistoricoEmbalse(idEmbalse: number): Observable<Embalse[]> {
    const url = `${this.apiUrlHistoricoEmbalse}${idEmbalse}`;
    return this.http.get<Embalse[]>(url);
  }

  clearCache() {
    this.cacheHistoricoLargo = null;
    this.cacheHistoricoDiario = null;
  }
}