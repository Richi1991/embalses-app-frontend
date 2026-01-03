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

export interface HistoricoPrecipitaciones {
  indicativo: string;
  nombre: string;
  valor_24h: number;
  fecha_registro: Date;
  tmax: number;
  tmin: number;
  tmed: number;
  estacion: Estacion;
}

export interface PrecipitacionAcumulada {
  indicativo: string;
  nombre: string;
  valor_acumulado: number;
  lat: number;
  lng: number;
}

export interface PrecipitacionMapa {
  getRes_geometry: string;
  getRes_indicativo: string;
  getRes_nombre: string;
  getRes_mm_acumulados: string;
  getRes_tipo: string;
}

interface PuntoIDW {
  lat: number;
  lng: number;
  mm: number;
}

@Injectable({
  providedIn: 'root',
})
export class EstacionesService {
  
    private http = inject(HttpClient);

    private apiUrlObtenerEstacionesAndPrecipitacionesLast24hours = 'https://embalses-api.onrender.com/api/weather/precipitaciones/get_precipitaciones_last_value';

    private apiUrlObtenerValoresPrecipitacionesAcumulados = 'https://embalses-api.onrender.com/api/weather/historicoprecipitaciones/obtener_valores_precipitaciones_acumulados';

    getEstacionesAndPrecipitacionesUltimas24h(): Observable<Estacion[]> {
     const url = this.apiUrlObtenerEstacionesAndPrecipitacionesLast24hours;
      return this.http.get<Estacion[]>(url);
    }

    getHistoricoPrecipitaciones(rango: string): Observable<PrecipitacionAcumulada[]> {
      const url = this.apiUrlObtenerValoresPrecipitacionesAcumulados;
      return this.http.get<PrecipitacionAcumulada[]>(`${url}/${rango}`);
    }
}
