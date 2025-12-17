import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// 1. Asegúrate de que esto tenga EXPORT
export interface Embalse {
  nombre: string;
  volumen: number;
  porcentaje: number;
  variacion: number;
  tendencia: string;
  variacionHM3?: number;
}

@Injectable({
  providedIn: 'root'
})
// 2. Asegúrate de que esto tenga EXPORT y el nombre sea idéntico
export class EmbalseService { 
  private http = inject(HttpClient);
  private apiUrl = 'https://embalses-api.onrender.com/api/v1/embalses/top-movimientos';

  getTopMovimientos(): Observable<Embalse[]> {
    return this.http.get<Embalse[]>(this.apiUrl);
  }
}
