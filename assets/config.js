/* ------------------------------------------------------------------
   Configuracion del observatorio.
   Rellena estos cuatro datos y la pantalla pasa sola de demo a real.
   ------------------------------------------------------------------ */
window.CONFIG = {
  // URL del Worker proxy, sin barra final.
  // Ej.: 'https://iotsens-palacio-congresos.tu-cuenta.workers.dev'
  proxy: '',

  // Identificadores de la instalacion (los da IoTsens junto con la clave).
  tenantUuid: '',
  organizationUuid: '',

  // Activo que representa el Palacio de Congresos.
  // Si se deja vacio, se coge el primer activo del tenant.
  assetUuid: '',

  // Rotulos de cabecera
  titulo: 'Palacio de Congresos y Exposiciones',
  subtitulo: 'Adolfo Suárez · Marbella',

  // Comportamiento
  segundosRefresco: 60, // cada cuanto se piden los ultimos valores
  horasHistorico: 24, // ventana de las graficas
  maxGraficas: 4, // cuantas graficas se muestran en el carrusel
  segundosCarrusel: 20, // cada cuanto rota la grafica destacada
  segundosPagina: 18, // si hay mas sensores de los que caben, cada cuanto pasa de pagina
  minutosSinDatos: 90, // a partir de aqui un sensor se marca como "sin señal"

  // 'auto' = usa datos reales si hay proxy configurado, si no demo.
  // 'si'   = fuerza demo.  'no' = nunca demo (muestra el error real).
  modoDemo: 'auto',
};

/* ------------------------------------------------------------------
   Diccionario de tipos de sensor.
   La pantalla clasifica cada medida por su nombre y le asigna icono,
   unidad, grupo y umbrales de color. Si aparece un sensor nuevo que no
   encaja, se muestra igualmente en el grupo "Otros indicadores".
   ------------------------------------------------------------------ */
window.TIPOS_SENSOR = [
  {
    id: 'temperatura',
    etiqueta: 'Temperatura',
    patron: /temperat|(^|[^a-z])temp([^a-z]|$)|tª|\bt\b.*(int|ext)/i,
    unidad: '°C',
    grupo: 'confort',
    decimales: 1,
    umbrales: { optimo: [20, 25], aviso: [17, 28] },
  },
  {
    id: 'humedad',
    etiqueta: 'Humedad relativa',
    patron: /humed|humid|\bhr\b|\brh\b/i,
    unidad: '%',
    grupo: 'confort',
    decimales: 0,
    umbrales: { optimo: [40, 60], aviso: [30, 70] },
  },
  {
    id: 'co2',
    etiqueta: 'CO₂',
    patron: /co2|dioxido de carbono/i,
    unidad: 'ppm',
    grupo: 'aire',
    decimales: 0,
    umbrales: { optimo: [0, 800], aviso: [0, 1200] },
  },
  {
    id: 'pm25',
    etiqueta: 'Partículas PM2.5',
    patron: /pm\s?2[.,]?5/i,
    unidad: 'µg/m³',
    grupo: 'aire',
    decimales: 1,
    umbrales: { optimo: [0, 15], aviso: [0, 25] },
  },
  {
    id: 'pm10',
    etiqueta: 'Partículas PM10',
    patron: /pm\s?10/i,
    unidad: 'µg/m³',
    grupo: 'aire',
    decimales: 1,
    umbrales: { optimo: [0, 30], aviso: [0, 50] },
  },
  {
    id: 'cov',
    etiqueta: 'Compuestos volátiles',
    patron: /\bcov\b|\btvoc\b|\bvoc\b|volatil/i,
    unidad: 'ppb',
    grupo: 'aire',
    decimales: 0,
    umbrales: { optimo: [0, 250], aviso: [0, 500] },
  },
  {
    id: 'ruido',
    etiqueta: 'Nivel sonoro',
    patron: /ruido|sonor|noise|\bdb\b|decibel|laeq/i,
    unidad: 'dB(A)',
    grupo: 'confort',
    decimales: 0,
    umbrales: { optimo: [0, 55], aviso: [0, 70] },
  },
  {
    id: 'luminosidad',
    etiqueta: 'Iluminación',
    patron: /lumin|ilumin|\blux\b|light/i,
    unidad: 'lux',
    grupo: 'confort',
    decimales: 0,
  },
  {
    id: 'aforo',
    etiqueta: 'Ocupación',
    patron: /aforo|ocupac|occupanc|people|persona|conteo|contador de pers|footfall|visit/i,
    unidad: 'pers.',
    grupo: 'aforo',
    decimales: 0,
  },
  {
    id: 'presencia',
    etiqueta: 'Presencia',
    patron: /presenci|movimiento|\bpir\b/i,
    unidad: '',
    grupo: 'aforo',
    decimales: 0,
  },
  {
    id: 'energia',
    etiqueta: 'Consumo eléctrico',
    patron: /energ|consumo electr|\bkwh\b|electric/i,
    unidad: 'kWh',
    grupo: 'energia',
    decimales: 1,
  },
  {
    id: 'potencia',
    etiqueta: 'Potencia',
    patron: /potenc|\bkw\b|\bpower\b|\bvatio/i,
    unidad: 'kW',
    grupo: 'energia',
    decimales: 1,
  },
  {
    id: 'agua',
    etiqueta: 'Consumo de agua',
    patron: /agua|water|caudal|\bm3\b|litros/i,
    unidad: 'm³',
    grupo: 'energia',
    decimales: 2,
  },
  {
    id: 'bateria',
    etiqueta: 'Batería',
    patron: /bater|battery|\bvbat\b/i,
    unidad: '%',
    grupo: 'red',
    decimales: 0,
    umbrales: { optimo: [30, 100], aviso: [15, 100] },
  },
  {
    id: 'cobertura',
    etiqueta: 'Cobertura',
    patron: /\brssi\b|\bsnr\b|cobertura|se.al/i,
    unidad: 'dBm',
    grupo: 'red',
    decimales: 0,
  },
];

window.GRUPOS = [
  { id: 'confort', etiqueta: 'Confort ambiental' },
  { id: 'aire', etiqueta: 'Calidad del aire' },
  { id: 'aforo', etiqueta: 'Ocupación y flujo' },
  { id: 'energia', etiqueta: 'Energía y agua' },
  { id: 'red', etiqueta: 'Estado de la red' },
  { id: 'otros', etiqueta: 'Otros indicadores' },
];
