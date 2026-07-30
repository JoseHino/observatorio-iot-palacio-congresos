import type { FamiliaEquipo, Grupo, TipoSensor } from "@/lib/tipos"

/* ------------------------------------------------------------------
   Configuración del observatorio.
   ------------------------------------------------------------------ */
export const CONFIG = {
  /** URL del Worker proxy, sin barra final. La clave vive allí como secreto. */
  proxy: "https://iotsens-palacio-congresos.josemariahf612.workers.dev",

  /** Identificadores de la instalación (los da IoTsens junto con la clave). */
  tenantUuid: "d494ce35-8330-4b4f-b91c-b520544ca72e",
  organizationUuid: "d127fa54-70db-4556-9c39-c600d26c956e",

  /**
   * Toda la instalación cuelga de un único dispositivo lógico, el "NodoIoT".
   * Si se deja vacío se coge el primero de la organización.
   */
  deviceUuid: "e89145a0-ba40-4a65-96ae-bd1d12119062",

  titulo: "Palacio de Congresos y Exposiciones",
  subtitulo: "Adolfo Suárez · Marbella",

  segundosRefresco: 60,
  horasHistorico: 24,
  maxGraficas: 4,
  segundosCarrusel: 20,
  segundosPagina: 18,
  /** Cuánto dura cada diapositiva del carrusel de señalética. */
  segundosDiapositiva: 15,
  /** A partir de aquí un sensor se marca como "sin señal". */
  minutosSinDatos: 90,

  /** Días de histórico que se piden a los indicadores agregados (KPI). */
  diasHistoricoKpi: 14,

  /** 'auto' = datos reales si hay proxy; si no, demo. 'si' = fuerza demo. 'no' = nunca demo. */
  modoDemo: "auto" as "auto" | "si" | "no",
}

/* ------------------------------------------------------------------
   Medidas que no se enseñan al público.
   Son diagnóstico del propio equipo o registros internos del contador:
   ocupan sitio y no dicen nada a quien mira la pantalla.
   ------------------------------------------------------------------ */
export const CODIGOS_OCULTOS =
  /^(board_voltage|status|log_time|log_volume|current_time|delta_volume_\d+|partial_counter_(in|out)\d*|sound_p\d+)$/i

/* ------------------------------------------------------------------
   Ubicación real de los equipos.

   La plataforma no publica ningún endpoint que diga en qué sala está
   cada sensor: los "assets" con nombre de sala vienen sin medidas
   asociadas. Pero el detalle de cada indicador
   (`/v1/catalog/tenants/{t}/kpis/{uuid}`, a nivel de TENANT, no de
   organización) sí trae en `measurements[]` el uuid del sensor que lo
   alimenta. Cruzando eso con el nombre del indicador
   (ACCESOS_DIARIOS_PREHALL_1) se deduce dónde está cada contador.

   Así se han localizado los 10 contadores de paso y el contador de
   agua. El resto de equipos (sondas, sonómetros, sensores de puerta)
   no lo alimenta ningún indicador, así que siguen sin ubicación: para
   esos hace falta el plano del Palacio. Cuando llegue, se añaden aquí.
   ------------------------------------------------------------------ */
export const UBICACIONES: Record<string, string> = {
  "24E124757E155727": "Prehall 1",
  "24E124757E155751": "Prehall 2",
  "24E124757E030030": "Puerta Hall 2",
  "24E124757E151915": "Puerta Hall 3",
  "24E124757E030016": "Exposiciones",
  "24E124757E150064": "Emergencia Sur Este",
  "24E124757E151912": "Escalera Norte 2",
  "24E124757D364092": "Escalera Norte 1",
  "24E124614C476665": "Escalera Sur 2",
}

/**
 * Indicadores que se descartan por duplicar a otro.
 *
 * ESCALERA_SUR_1 y ESCALERA_NORTE_1 apuntan al MISMO contador físico
 * (24E124757D364092), así que la plataforma publica dos veces el mismo
 * tránsito. Peor: SALA_AZUL los suma a los dos, y por eso da 27 accesos
 * donde los sensores solo han contado 14. Pendiente de que el proveedor
 * confirme cuál de los dos nombres es el correcto.
 */
export const KPIS_DUPLICADOS = /_ESCALERA_SUR_1$/

/* ------------------------------------------------------------------
   Familias de equipo.
   Para los equipos sin ubicación conocida, el nombre sale del tipo de
   aparato y un número por orden de aparición.
   ------------------------------------------------------------------ */
export const FAMILIAS_EQUIPO: FamiliaEquipo[] = [
  // Nombres cortos a propósito: van en tarjetas estrechas y, si no caben,
  // se truncan justo por donde distinguen ("Estación de calid...").
  { patron: /^weather_station/i, nombre: "Meteorología", unico: true, exterior: true },
  { patron: /^8c83fc/i, nombre: "Contador de agua", unico: true },
  { patron: /^0004a30b017559ce$/i, nombre: "Calidad del aire", unico: true, exterior: true },
  { patron: /^0004a30b/i, nombre: "Sonómetro exterior", exterior: true },
  { patron: /^24e124743c/i, nombre: "Sonómetro interior" },
  { patron: /^24e124725f/i, nombre: "Sonda de confort" },
  // Van en puertas y huecos de escalera, no en espacios climatizados: su
  // temperatura y su humedad no se juzgan con criterios de confort.
  { patron: /^24e124136b/i, nombre: "Sensor de puerta", exterior: true },
  { patron: /^(24e124757|24e124614c)/i, nombre: "Contador de paso" },
]

/** Matices que la plataforma añade al nombre de algunas medidas derivadas. */
export const MATICES: Array<[RegExp, string]> = [
  [/daily/i, "diario"],
  [/hourly/i, "horario"],
  [/estimated/i, "estimado"],
]

/* ------------------------------------------------------------------
   Diccionario de tipos de sensor.
   Cada medida se clasifica primero por su código exacto (CO2, NO2,
   SOUND_LAEQ...) y, si no encaja, por el texto del nombre. Así sigue
   funcionando el modo demostración, que usa nombres en español.
   ------------------------------------------------------------------ */
export const TIPOS_SENSOR: TipoSensor[] = [
  {
    id: "temperatura",
    etiqueta: "Temperatura",
    codigos: /^temperature$/,
    patron: /temperat|(^|[^a-z])temp([^a-z]|$)|tª|\bt\b.*(int|ext)/i,
    unidad: "°C",
    grupo: "confort",
    decimales: 1,
    umbrales: { optimo: [20, 25], aviso: [17, 28] },
  },
  {
    id: "humedad",
    etiqueta: "Humedad relativa",
    codigos: /^humidity$/,
    patron: /humed|humid|\bhr\b|\brh\b/i,
    unidad: "%",
    grupo: "confort",
    decimales: 0,
    umbrales: { optimo: [40, 60], aviso: [30, 70] },
  },
  {
    id: "co2",
    etiqueta: "CO₂",
    codigos: /^co2$/,
    patron: /co2|dioxido de carbono/i,
    unidad: "ppm",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 800], aviso: [0, 1200] },
  },
  {
    id: "pm1",
    etiqueta: "Partículas PM1",
    codigos: /^pm[_ ]?1[.,]0$/,
    patron: /pm\s?1[.,]0/i,
    unidad: "µg/m³",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 10], aviso: [0, 20] },
  },
  {
    id: "pm25",
    // El decodificador de la plataforma publica este canal como PM_2.4,
    // pero es el tramo fino habitual (1.0 / 2.5 / 10) de la misma sonda.
    etiqueta: "Partículas PM2.5",
    codigos: /^pm[_ ]?2[.,][45]$/,
    patron: /pm\s?2[.,]?5/i,
    unidad: "µg/m³",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 15], aviso: [0, 25] },
  },
  {
    id: "pm10",
    etiqueta: "Partículas PM10",
    codigos: /^pm[_ ]?10$/,
    patron: /pm\s?10/i,
    unidad: "µg/m³",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 30], aviso: [0, 50] },
  },
  {
    id: "cov",
    etiqueta: "Compuestos volátiles",
    codigos: /^tvoc(_index)?$/,
    patron: /\bcov\b|\btvoc\b|\bvoc\b|volatil/i,
    unidad: "índice",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 250], aviso: [0, 400] },
  },
  {
    id: "co",
    etiqueta: "Monóxido de carbono",
    codigos: /^co$/,
    patron: /monoxido de carbono/i,
    unidad: "ppb",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 4000], aviso: [0, 9000] },
  },
  {
    id: "no2",
    etiqueta: "Dióxido de nitrógeno",
    codigos: /^no2$/,
    patron: /dioxido de nitrogeno/i,
    unidad: "ppb",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 53], aviso: [0, 100] },
  },
  {
    id: "no",
    etiqueta: "Monóxido de nitrógeno",
    codigos: /^no$/,
    patron: /monoxido de nitrogeno/i,
    unidad: "ppb",
    grupo: "aire",
    decimales: 0,
  },
  {
    id: "so2",
    etiqueta: "Dióxido de azufre",
    codigos: /^so2$/,
    patron: /dioxido de azufre/i,
    unidad: "ppb",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 35], aviso: [0, 75] },
  },
  {
    id: "h2s",
    etiqueta: "Sulfuro de hidrógeno",
    codigos: /^h2s$/,
    patron: /sulfuro de hidrogeno|acido sulfhidrico/i,
    unidad: "ppb",
    grupo: "aire",
    decimales: 0,
  },
  {
    id: "ozono",
    etiqueta: "Ozono",
    codigos: /^ox$/,
    patron: /ozono|\bo3\b/i,
    unidad: "ppb",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 50], aviso: [0, 70] },
  },
  {
    id: "ruido",
    etiqueta: "Nivel sonoro",
    codigos: /^sound_(laeq|leq|spl)$/,
    patron: /ruido|sonor|noise|\bdb\b|decibel|laeq/i,
    unidad: "dB(A)",
    grupo: "confort",
    decimales: 1,
    umbrales: { optimo: [0, 55], aviso: [0, 70] },
  },
  {
    id: "ruido_max",
    etiqueta: "Nivel sonoro máximo",
    codigos: /^sound_max$/,
    patron: /ruido maximo|pico sonoro/i,
    unidad: "dB(A)",
    grupo: "confort",
    decimales: 1,
    umbrales: { optimo: [0, 70], aviso: [0, 85] },
  },
  {
    id: "ruido_min",
    etiqueta: "Nivel sonoro de fondo",
    codigos: /^sound_min$/,
    patron: /ruido de fondo/i,
    unidad: "dB(A)",
    grupo: "confort",
    decimales: 1,
  },
  {
    id: "entradas",
    etiqueta: "Entradas acumuladas",
    codigos: /^counter_in\d*$/,
    patron: /entradas/i,
    unidad: "pers.",
    grupo: "aforo",
    decimales: 0,
  },
  {
    id: "salidas",
    etiqueta: "Salidas acumuladas",
    codigos: /^counter_out\d*$/,
    patron: /salidas/i,
    unidad: "pers.",
    grupo: "aforo",
    decimales: 0,
  },
  {
    id: "aforo",
    etiqueta: "Ocupación",
    patron: /aforo|ocupac|occupanc|people|persona|conteo|contador de pers|footfall|visit/i,
    unidad: "pers.",
    grupo: "aforo",
    decimales: 0,
  },
  {
    id: "puerta",
    etiqueta: "Estado de la puerta",
    codigos: /^contact_status$/,
    patron: /apertura|puerta abierta/i,
    unidad: "",
    grupo: "aforo",
    decimales: 0,
  },
  {
    id: "presencia",
    etiqueta: "Presencia",
    patron: /presenci|movimiento|\bpir\b/i,
    unidad: "",
    grupo: "aforo",
    decimales: 0,
  },
  {
    id: "energia",
    etiqueta: "Consumo eléctrico",
    patron: /energ|consumo electr|\bkwh\b|electric/i,
    unidad: "kWh",
    grupo: "energia",
    decimales: 1,
  },
  {
    id: "potencia",
    etiqueta: "Potencia",
    patron: /potenc|\bkw\b|\bpower\b|\bvatio/i,
    unidad: "kW",
    grupo: "energia",
    decimales: 1,
  },
  {
    id: "agua",
    etiqueta: "Volumen de agua",
    codigos: /^current_volume$/,
    patron: /agua|water|caudal|\bm3\b|litros/i,
    unidad: "L",
    grupo: "energia",
    decimales: 0,
  },
  {
    id: "luminosidad",
    etiqueta: "Iluminación",
    codigos: /^illumination$/,
    patron: /lumin|ilumin|\blux\b|light/i,
    unidad: "lux",
    grupo: "meteo",
    decimales: 0,
  },
  {
    id: "presion",
    etiqueta: "Presión atmosférica",
    codigos: /^pressure$/,
    patron: /presion/i,
    unidad: "hPa",
    grupo: "meteo",
    decimales: 0,
  },
  {
    id: "viento",
    etiqueta: "Velocidad del viento",
    codigos: /^speed_avg$/,
    patron: /viento|wind/i,
    unidad: "m/s",
    grupo: "meteo",
    decimales: 1,
  },
  {
    id: "direccion_viento",
    etiqueta: "Dirección del viento",
    codigos: /^angle_avg$/,
    patron: /direccion del viento/i,
    unidad: "°",
    grupo: "meteo",
    decimales: 0,
  },
  {
    id: "lluvia",
    etiqueta: "Precipitación",
    codigos: /^rainfall$/,
    patron: /lluvia|precipitac/i,
    unidad: "mm",
    grupo: "meteo",
    decimales: 1,
  },
  {
    id: "radiacion",
    etiqueta: "Radiación solar",
    codigos: /^solar_radiation$/,
    patron: /radiacion solar/i,
    unidad: "W/m²",
    grupo: "meteo",
    decimales: 0,
  },
  {
    id: "bateria",
    etiqueta: "Batería",
    codigos: /^battery$/,
    patron: /bater|battery|\bvbat\b/i,
    unidad: "%",
    grupo: "red",
    decimales: 0,
    umbrales: { optimo: [30, 100], aviso: [15, 100] },
  },
  {
    id: "cobertura",
    etiqueta: "Cobertura",
    patron: /\brssi\b|\bsnr\b|cobertura|se.al/i,
    unidad: "dBm",
    grupo: "red",
    decimales: 0,
  },
]

export const GRUPOS: Grupo[] = [
  { id: "confort", etiqueta: "Confort ambiental" },
  { id: "aire", etiqueta: "Calidad del aire" },
  { id: "aforo", etiqueta: "Ocupación y flujo" },
  { id: "meteo", etiqueta: "Meteorología" },
  { id: "energia", etiqueta: "Energía y agua" },
  { id: "red", etiqueta: "Estado de la red" },
  { id: "otros", etiqueta: "Otros indicadores" },
]
