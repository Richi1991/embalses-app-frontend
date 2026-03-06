import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UltimaLecturaCaudalDTO {
  codigo: string;
  nombre: string;
  ultimoDatoNivel: number;
  ultimoDatoCaudal: number;
  porcentajeNivel: number;
  cotaMaximaSeccion: number;
  latitud: number;
  longitud: number;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class CaudalesService {

  private http = inject(HttpClient);

  private apiUrlGetLastCaudalAndPosition = "https://embalses-api.onrender.com/api/caudales/get_last_caudales_and_position";

  getLastCaudalAndPosition(): Observable<UltimaLecturaCaudalDTO[]> {
    const url = this.apiUrlGetLastCaudalAndPosition;
    return this.http.get<UltimaLecturaCaudalDTO[]>(`${url}`);
  }

}
