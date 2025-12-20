import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Embalse {
  idEmbalse: number;
  nombre: string;
  hm3: number;        // Lo que viene del JSON
  volumen: number;    // Lo que espera el HTML
  porcentaje: number;
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
  private apiUrlHistoricoEmbalse = 'https://embalses-api.onrender.com/api/embalses/obtener_historico_embalse';

  getTopMovimientos(): Observable<Embalse[]> {
    return this.http.get<Embalse[]>(this.apiUrl);
  }

  getHistoricoCuencaSeguraList(): Observable<HistoricoCuenca[]> {
    return this.http.get<HistoricoCuenca[]>(this.apiUrlHistoricoCuenca);
  }

  getHistoricoEmbalse(idEmbalse: number): Observable<Embalse[]> {
    const url = `${this.apiUrlHistoricoEmbalse}${idEmbalse}`;
    return this.http.get<Embalse[]>(url);
  }
}