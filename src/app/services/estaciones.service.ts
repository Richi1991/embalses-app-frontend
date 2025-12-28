import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Estacion {
  indicativo: string;
  latitud: string;
  provincia: string;
  altitud: number;
  nombre: string;
  indsinop: string;
  longitud: string;
  redOrigen: string;
  precipitacionesDTO: Precipitaciones;
  fechaActualizacion: Date;
}

export interface Precipitaciones {
  precipitacion1h: number;
  precipitacion3h: number;
  precipitacion6h: number;
  precipitacion12h: number;
  precipitacion24h: number;
  precipitacionYtd: number;
}

@Injectable({
  providedIn: 'root',
})
export class EstacionesService {
  
    private http = inject(HttpClient);

    private apiUrlObtenerEstacionesAndPrecipitaciones = 'https://embalses-api.onrender.com/api/weather/precipitaciones/get_precipitaciones_last_value';

     getEstacionesAndPrecipitaciones(): Observable<Estacion[]> {
     const url = this.apiUrlObtenerEstacionesAndPrecipitaciones;
      return this.http.get<Estacion[]>(url);
  }
}
