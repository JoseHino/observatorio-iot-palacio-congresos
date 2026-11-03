import type { FamiliaEquipo, Grupo, TipoSensor, Ubicacion } from "@/lib/tipos"

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
  /**
   * Consumo diario de agua por encima del cual la lectura se descarta. La
   * plataforma ha llegado a publicar ±2.000 millones de litros en un día
   * (30-10 a 1-11-2026), y el consumo real ronda los 100-6.000 L.
   */
  aguaMaximaDiaria: 100000,
  /** Cada cuánto se recalcula lo que va de día a partir de los KPI horarios. */
  minutosHoy: 10,

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
export const UBICACIONES: Record<string, Ubicacion> = {
  // Sonómetros
  "0004A30B004F7A5D": { lugar: "Puerta Exposiciones", planta: "Planta 1", zona: "Entrada Exposiciones", exterior: true },
  "0004A30B01755C3B": { lugar: "Entrada Sala Azul", planta: "Planta 1", zona: "Sala Azul" },
  "0004A30B01756006": { lugar: "Exposiciones Oeste", planta: "Planta 1", zona: "Sala Exposiciones" },
  "0004A30B0175708A": { lugar: "Exposiciones Este", planta: "Planta 1", zona: "Sala Exposiciones" },
  "0004A30B01757485": { lugar: "Hall Principal Sur", planta: "Planta Baja", zona: "Hall Principal" },
  "0004A30B0175793C": { lugar: "Hall Principal Norte", planta: "Planta Baja", zona: "Hall Principal" },
  "0004A30B01757A3A": { lugar: "Azotea Sur", planta: "Azotea", zona: "Azotea" },
  "24E124743C404424": { lugar: "Anfiteatro C", planta: "Planta Baja", zona: "Anfiteatro" },
  "24E124743C404511": { lugar: "Anfiteatro B", planta: "Planta Baja", zona: "Anfiteatro" },
  "24E124743C407378": { lugar: "Anfiteatro A", planta: "Planta Baja", zona: "Anfiteatro" },
  "24E124743C409849": { lugar: "Pre-Hall", planta: "Planta Baja", zona: "Pre-Hall" },

  // Estación de calidad del aire y meteorológica
  "0004A30B017559CE": { lugar: "Azotea Norte", planta: "Azotea", zona: "Azotea" },
  WEATHER_STATION: { lugar: "Azotea Norte", planta: "Azotea", zona: "Azotea" },

  // Sondas de ambiente (temperatura / humedad / CO₂)
  "24E124725F200956": { lugar: "Anfiteatro C", planta: "Planta Baja", zona: "Anfiteatro" },
  "24E124725F201363": { lugar: "Hall Principal", planta: "Planta Baja", zona: "Hall Principal" },
  "24E124725F202145": { lugar: "Pre-Hall", planta: "Planta Baja", zona: "Pre-Hall" },
  "24E124725F202340": { lugar: "Anfiteatro A", planta: "Planta Baja", zona: "Anfiteatro" },
  "24E124725F202568": { lugar: "Exposiciones Oeste", planta: "Planta 1", zona: "Sala Exposiciones" },
  "24E124725F204511": { lugar: "Sala Azul", planta: "Planta 1", zona: "Sala Azul" },
  "24E124725F204685": { lugar: "Exposiciones Este", planta: "Planta 1", zona: "Sala Exposiciones" },
  "24E124725F204791": { lugar: "Anfiteatro B", planta: "Planta Baja", zona: "Anfiteatro" },
  "24E124725F206227": { lugar: "Oficinas", planta: "Planta Baja", zona: "Oficinas" },

  // Sensores de apertura de puerta
  "24E124136B503960": { lugar: "Puerta 1 Exposiciones", planta: "Planta 1", zona: "Entrada Exposiciones" },
  "24E124136B503963": { lugar: "Emergencia 1 Sur-Este", planta: "Planta Baja", zona: "Puertas de emergencia" },
  "24E124136B503964": { lugar: "Emergencia 1 Norte-Este", planta: "Planta Baja", zona: "Puertas de emergencia" },
  "24E124136B504850": { lugar: "Emergencia 2 Sur-Este", planta: "Planta Baja", zona: "Puertas de emergencia" },
  "24E124136B504869": { lugar: "Puerta 2 Terraza Exposiciones", planta: "Planta 1", zona: "Entrada Exposiciones" },
  "24E124136B504870": { lugar: "Puerta 1 Terraza Exposiciones", planta: "Planta 1", zona: "Entrada Exposiciones" },
  "24E124136B504880": { lugar: "Puerta 1 Pre-Hall", planta: "Planta Baja", zona: "Pre-Hall" },
  "24E124136B504893": { lugar: "Puerta 4 Pre-Hall", planta: "Planta Baja", zona: "Pre-Hall" },
  "24E124136B504909": { lugar: "Puerta 2 Exposiciones", planta: "Planta 1", zona: "Entrada Exposiciones" },
  "24E124136B504915": { lugar: "Emergencia Pre-Hall", planta: "Planta Baja", zona: "Puertas de emergencia" },

  // Cámaras de conteo
  "24E124614C471012": { lugar: "Escaleras Norte 1", planta: "Planta 1", zona: "Sala Azul" },
  "24E124614C476665": { lugar: "Escaleras Sur 2", planta: "Planta 1", zona: "Sala Azul" },
  "24E124757D364092": { lugar: "Escaleras Sur 1", planta: "Planta 1", zona: "Sala Azul" },
  "24E124757E030016": { lugar: "Entrada Exposiciones", planta: "Planta 1", zona: "Entrada Exposiciones" },
  "24E124757E030030": { lugar: "Puerta 2 Hall", planta: "Planta Baja", zona: "Hall Principal" },
  "24E124757E150064": { lugar: "Emergencia Sur-Este", planta: "Planta Baja", zona: "Puertas de emergencia" },
  "24E124757E151912": { lugar: "Escaleras Norte 2", planta: "Planta 1", zona: "Sala Azul" },
  "24E124757E151915": { lugar: "Puerta 3 Hall", planta: "Planta Baja", zona: "Hall Principal" },
  "24E124757E155727": { lugar: "Pre-Hall 1", planta: "Planta Baja", zona: "Pre-Hall" },
  "24E124757E155751": { lugar: "Pre-Hall 2", planta: "Planta Baja", zona: "Pre-Hall" },

  // Contador general
  "8C83FC05008528B4": { lugar: "Sótano", planta: "Sótano", zona: "Sótano" },
}

/** Zonas a la intemperie: ahí no se juzga el confort. */
export const ZONAS_EXTERIORES = /azotea/i

/**
 * Equipos únicos a los que la pantalla apunta por su nombre propio.
 * Se referencian por número de serie y no por su rótulo porque dos de ellos
 * comparten sitio —la estación de aire y la meteorológica están las dos en
 * "Azotea Norte"— y buscarlos por texto los confundiría.
 */
export const EQUIPOS = {
  calidadAire: "0004A30B017559CE",
  meteorologia: "WEATHER_STATION",
  contadorAgua: "8C83FC05008528B4",
} as const

/**
 * Indicadores que se descartan por duplicar a otro.
 *
 * Los cuatro KPI de ESCALERA_NORTE_1 están cableados al sensor
 * 24E124757D364092, que según el inventario del Palacio es la cámara de
 * "escaleras Sur 1" — la misma que alimenta los KPI de ESCALERA_SUR_1. O sea
 * que el tránsito de esa escalera se publica por duplicado y con un nombre
 * equivocado, y SALA_AZUL, que suma ambos, sale por el doble.
 *
 * Se descartan los de NORTE_1 (que son los mal etiquetados) y se conservan
 * los de SUR_1, que sí corresponden al sensor que los alimenta. La cámara de
 * escaleras Norte 1 de verdad (24E124614C471012) no la recoge ningún KPI.
 */
export const KPIS_DUPLICADOS = /_ESCALERA_NORTE_1$/

/* ------------------------------------------------------------------
   Familias de equipo.
   Para los equipos sin ubicación conocida, el nombre sale del tipo de
   aparato y un número por orden de aparición.
   ------------------------------------------------------------------ */
export const FAMILIAS_EQUIPO: FamiliaEquipo[] = [
  // Nombres cortos a propósito: van en tarjetas estrechas y, si no caben,
  // se truncan justo por donde distinguen ("Estación de calid...").
  // Ya no llevan marca de intemperie: eso lo decide la zona del equipo, y en
  // la misma familia hay sonómetros en la azotea y otros en el Hall.
  { patron: /^weather_station/i, nombre: "Meteorología", unico: true },
  { patron: /^8c83fc/i, nombre: "Contador de agua", unico: true },
  { patron: /^0004a30b017559ce$/i, nombre: "Calidad del aire", unico: true },
  { patron: /^0004a30b/i, nombre: "Sonómetro" },
  { patron: /^24e124743c/i, nombre: "Sonómetro" },
  { patron: /^24e124725f/i, nombre: "Sonda de ambiente" },
  // Van montados en el marco de la puerta: su temperatura y su humedad no
  // describen el confort del espacio, así que no se juzgan, esté donde esté.
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
    // El aire exterior ya tiene unas 420 ppm: en una sala no se puede bajar
    // de ahí. Se deja margen para la tolerancia de las sondas (±30-50 ppm).
    creible: [380, 10000],
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
