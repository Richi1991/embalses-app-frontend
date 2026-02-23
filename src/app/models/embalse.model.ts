export interface Embalse {
  idEmbalse: number;
  nombre: string;
  hm3: number;
  porcentaje: number;
  capacidadMaximaEmbalse: number;
  variacion: number;
  tendencia: string;
  fechaRegistro: Date;
  latitud: number;
  longitud: number;
}

export interface TopMovimiento {
  idEmbalse: number;
  nombre: string;
  hm3: number;
  porcentaje: number;
  capacidadMaximaEmbalse: number;
  variacion: number;
  tendencia: string;
  fechaRegistro: Date;
  latitud: number;
  longitud: number;
}