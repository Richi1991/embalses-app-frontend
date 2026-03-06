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
  precipitacion_1h: number;
  precipitacion_3h: number;
  precipitacion_6h: number;
  precipitacion_12h: number;
  precipitacion_24h: number;
  precipitacionYtd: number;
  fechaActualizacion: Date;
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
  valorAcumulado: number;
  latitud: string;
  longitud: string;
}

export const RangoTemporal = {
  ULTIMO_DIA: 'ULTIMO_DIA',
  ULTIMA_SEMANA: 'ULTIMA_SEMANA',
  ULTIMAS_DOS_SEMANAS: 'ULTIMAS_DOS_SEMANAS',
  ULTIMO_MES: 'ULTIMO_MES',
  ULTIMOS_TRES_MESES: 'ULTIMOS_TRES_MESES',
  ULTIMOS_SEIS_MESES: 'ULTIMOS_SEIS_MESES',
  ULTIMO_ANIO: 'ULTIMO_ANIO'
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

    getHistoricoPrecipitaciones(RangoTemporal: any): Observable<PrecipitacionAcumulada[]> {
      const url = this.apiUrlObtenerValoresPrecipitacionesAcumulados;
      return this.http.get<PrecipitacionAcumulada[]>(`${url}/${RangoTemporal}`);
    }

 
}
