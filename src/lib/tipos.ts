/* Tipos compartidos del observatorio. */

export type IdGrupo = "confort" | "aire" | "aforo" | "energia" | "red" | "otros"

export type ClaseEstado = "ok" | "aviso" | "alerta" | "neutro"

export interface Umbrales {
  /** Rango en el que el indicador se considera óptimo. */
  optimo: [number, number]
  /** Rango tolerable. Fuera de él, el indicador pasa a alerta. */
  aviso?: [number, number]
}

export interface TipoSensor {
  id: string
  etiqueta: string
  /** Patrón que se prueba contra el nombre normalizado del sensor. */
  patron: RegExp
  unidad: string
  grupo: IdGrupo
  decimales: number
  umbrales?: Umbrales
}

export interface Estado {
  clase: ClaseEstado
  /** Variable CSS del color, para texto y trazos. */
  color: string
  /** Texto visible: el color nunca informa por sí solo. */
  etiqueta: string
}

/** Medida tal y como llega de la API (o del generador de demostración). */
export interface MedidaCruda {
  uuid: string
  deviceUuid: string
  nombre: string
  unidad: string
  valor: number | null
  ts: number | null
}

/** Medida ya clasificada y evaluada, lista para pintar. */
export interface Sensor extends MedidaCruda {
  tipo: TipoSensor
  estado: Estado
}

export interface Punto {
  timestamp: number
  value: number
}

export interface Grupo {
  id: IdGrupo
  etiqueta: string
}

/** Estado de la conexión con la plataforma, para el indicador de cabecera. */
export type EstadoConexion = "vivo" | "demo" | "error" | "cargando"
