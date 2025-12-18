import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Embalse {
  nombre: string;
  hm3: number;        // Lo que viene del JSON
  volumen: number;    // Lo que espera el HTML
  porcentaje: number;
  variacion: number; 
  tendencia: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmbalseService { 
  private http = inject(HttpClient);
  
  // Verifica si tu Controller tiene el prefijo /v1. Si no, usa:
  // https://embalses-api.onrender.com/api/embalses/top-movimientos
  private apiUrl = 'https://embalses-api.onrender.com/api/embalses/top-movimientos';

  getTopMovimientos(): Observable<Embalse[]> {
    return this.http.get<Embalse[]>(this.apiUrl);
  }
}