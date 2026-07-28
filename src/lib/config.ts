import type { Grupo, TipoSensor } from "@/lib/tipos"

/* ------------------------------------------------------------------
   Configuración del observatorio.
   Rellena estos cuatro datos y la pantalla pasa sola de demo a real.
   ------------------------------------------------------------------ */
export const CONFIG = {
  /** URL del Worker proxy, sin barra final. Ej.: 'https://iotsens-palacio.tu-cuenta.workers.dev' */
  proxy: "",

  /** Identificadores de la instalación (los da IoTsens junto con la clave). */
  tenantUuid: "",
  organizationUuid: "",

  /** Activo que representa el Palacio. Si se deja vacío, se coge el primero del tenant. */
  assetUuid: "",

  titulo: "Palacio de Congresos y Exposiciones",
  subtitulo: "Adolfo Suárez · Marbella",

  segundosRefresco: 60,
  horasHistorico: 24,
  maxGraficas: 4,
  segundosCarrusel: 20,
  segundosPagina: 18,
  /** A partir de aquí un sensor se marca como "sin señal". */
  minutosSinDatos: 90,

  /** 'auto' = datos reales si hay proxy; si no, demo. 'si' = fuerza demo. 'no' = nunca demo. */
  modoDemo: "auto" as "auto" | "si" | "no",
}

/* ------------------------------------------------------------------
   Diccionario de tipos de sensor.
   La pantalla clasifica cada medida por su nombre y le asigna icono,
   unidad, grupo y umbrales. Si aparece un sensor nuevo que no encaja,
   se muestra igualmente dentro de "Otros indicadores".
   ------------------------------------------------------------------ */
export const TIPOS_SENSOR: TipoSensor[] = [
  {
    id: "temperatura",
    etiqueta: "Temperatura",
    patron: /temperat|(^|[^a-z])temp([^a-z]|$)|tª|\bt\b.*(int|ext)/i,
    unidad: "°C",
    grupo: "confort",
    decimales: 1,
    umbrales: { optimo: [20, 25], aviso: [17, 28] },
  },
  {
    id: "humedad",
    etiqueta: "Humedad relativa",
    patron: /humed|humid|\bhr\b|\brh\b/i,
    unidad: "%",
    grupo: "confort",
    decimales: 0,
    umbrales: { optimo: [40, 60], aviso: [30, 70] },
  },
  {
    id: "co2",
    etiqueta: "CO₂",
    patron: /co2|dioxido de carbono/i,
    unidad: "ppm",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 800], aviso: [0, 1200] },
  },
  {
    id: "pm25",
    etiqueta: "Partículas PM2.5",
    patron: /pm\s?2[.,]?5/i,
    unidad: "µg/m³",
    grupo: "aire",
    decimales: 1,
    umbrales: { optimo: [0, 15], aviso: [0, 25] },
  },
  {
    id: "pm10",
    etiqueta: "Partículas PM10",
    patron: /pm\s?10/i,
    unidad: "µg/m³",
    grupo: "aire",
    decimales: 1,
    umbrales: { optimo: [0, 30], aviso: [0, 50] },
  },
  {
    id: "cov",
    etiqueta: "Compuestos volátiles",
    patron: /\bcov\b|\btvoc\b|\bvoc\b|volatil/i,
    unidad: "ppb",
    grupo: "aire",
    decimales: 0,
    umbrales: { optimo: [0, 250], aviso: [0, 500] },
  },
  {
    id: "ruido",
    etiqueta: "Nivel sonoro",
    patron: /ruido|sonor|noise|\bdb\b|decibel|laeq/i,
    unidad: "dB(A)",
    grupo: "confort",
    decimales: 0,
    umbrales: { optimo: [0, 55], aviso: [0, 70] },
  },
  {
    id: "luminosidad",
    etiqueta: "Iluminación",
    patron: /lumin|ilumin|\blux\b|light/i,
    unidad: "lux",
    grupo: "confort",
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
    etiqueta: "Consumo de agua",
    patron: /agua|water|caudal|\bm3\b|litros/i,
    unidad: "m³",
    grupo: "energia",
    decimales: 2,
  },
  {
    id: "bateria",
    etiqueta: "Batería",
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
  { id: "energia", etiqueta: "Energía y agua" },
  { id: "red", etiqueta: "Estado de la red" },
  { id: "otros", etiqueta: "Otros indicadores" },
]
