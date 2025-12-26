import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Estacion {
  latitud: string;
  provincia: string;
  altitud: number;
  indicativo: string;
  nombre: string;
  indsinop: string;
  longitud: string;
  redOrigen: string;
  precipitacion1h: number; 
  precipitacion3h: number; 
  precipitacion6h: number; 
  precipitacion12h: number; 
  precipitacion24h: Number; 
  precipitacionAcumuladaAñoHidrologico: number; 
}

@Injectable({
  providedIn: 'root',
})
export class EstacionesService {
  
    private http = inject(HttpClient);

    private apiUrlObtenerEstaciones = 'https://embalses-api.onrender.com/api/weather/obtener_estaciones';


     getEstacionesMeteorologicas(): Observable<Estacion[]> {
     const url = this.apiUrlObtenerEstaciones;
      return this.http.get<Estacion[]>(url);
  }
}
