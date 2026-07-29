/* Tipos compartidos del observatorio. */

export type IdGrupo =
  | "confort"
  | "aire"
  | "aforo"
  | "meteo"
  | "energia"
  | "red"
  | "otros"

/**
 * Tipo de equipo físico, reconocido por el prefijo de su número de serie.
 * `unico` marca los que solo hay uno: así no se numeran ("Contador general
 * de agua" en vez de "Contador general de agua 1").
 */
export interface FamiliaEquipo {
  patron: RegExp
  nombre: string
  unico?: boolean
  /**
   * El equipo mide a la intemperie o en zonas sin climatizar. A esas medidas
   * no se les aplican los umbrales de confort: 33 °C en la calle en julio es
   * lo normal, y marcarlo "fuera de rango" desinforma.
   */
  exterior?: boolean
}

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
  /**
   * Patrón para el código exacto que publica la plataforma (CO2, NO2,
   * SOUND_LAEQ...). Se prueba antes que `patron` y va anclado: los nombres
   * reales llevan pegado el identificador del equipo (`0004A30B017559CE_NO2`)
   * y ahí los límites de palabra no sirven, porque el guion bajo también
   * cuenta como carácter de palabra.
   */
  codigos?: RegExp
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
  /** Código de la magnitud medida: CO2, SOUND_LAEQ, COUNTER_IN01... */
  codigo: string
  /**
   * Precisión para las medidas derivadas que la plataforma calcula aparte:
   * 'diario', 'horario' o 'estimado'. Vacío en las medidas directas.
   */
  matiz: string
  /** Identificador del equipo físico (EUI) al que pertenece la medida. */
  equipo: string
  /** El equipo mide a la intemperie o en zonas sin climatizar. */
  exterior: boolean
}

/** Medida ya clasificada y evaluada, lista para pintar. */
export interface Sensor extends MedidaCruda {
  tipo: TipoSensor
  estado: Estado
}

/**
 * Indicador agregado por la plataforma (accesos por puerta, consumo diario...).
 * Es la única capa de datos que trae la ubicación real: las medidas en bruto
 * solo se identifican por el número de serie del equipo.
 */
export interface Kpi {
  uuid: string
  /** Nombre técnico tal cual: ACCESOS_DIARIOS_PREHALL_TOTAL. */
  nombre: string
  /** Nombre presentable: "Prehall (total)". */
  etiqueta: string
  /** Qué mide: entradas, salidas o consumo. */
  familia: "accesos" | "salidas" | "agua" | "otros"
  periodo: "DAILY" | "HOURLY"
  /** true cuando la plataforma ya suma varios accesos en un solo indicador. */
  esTotal: boolean
  valor: number | null
  ts: number | null
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
