/* Datos simulados.
   Solo se usan cuando no hay proxy configurado (o si CONFIG.modoDemo === 'si').
   Sirven para dejar la pantalla montada y validada antes de tener la clave
   real: la estructura que devuelven es idéntica a la de la API de IoTsens. */

import type { Kpi, MedidaCruda, Punto } from "@/lib/tipos"

interface DefinicionDemo {
  n: string
  u: string
  base: number
  amp: number
  ruido: number
  fase: number
  suelo?: number
  acumulado?: number
}

const CATALOGO: DefinicionDemo[] = [
  { n: "Temperatura · Auditorio principal", u: "°C", base: 22.4, amp: 1.1, ruido: 0.25, fase: 0.35 },
  { n: "Temperatura · Vestíbulo", u: "°C", base: 23.6, amp: 1.8, ruido: 0.3, fase: 0.4 },
  { n: "Temperatura exterior", u: "°C", base: 27.5, amp: 5.5, ruido: 0.5, fase: 0.42 },
  { n: "Humedad relativa · Auditorio", u: "%", base: 52, amp: 7, ruido: 1.5, fase: 0.9 },
  { n: "CO₂ · Auditorio principal", u: "ppm", base: 720, amp: 340, ruido: 45, fase: 0.38 },
  { n: "CO₂ · Sala de prensa", u: "ppm", base: 560, amp: 210, ruido: 40, fase: 0.36 },
  { n: "PM2.5 · Vestíbulo", u: "µg/m³", base: 11.5, amp: 5, ruido: 1.6, fase: 0.45 },
  { n: "Nivel sonoro · Vestíbulo", u: "dB(A)", base: 52, amp: 14, ruido: 3.5, fase: 0.4 },
  { n: "Iluminación · Vestíbulo", u: "lux", base: 480, amp: 380, ruido: 30, fase: 0.44 },
  { n: "Aforo total del recinto", u: "pers.", base: 430, amp: 420, ruido: 22, fase: 0.4, suelo: 0 },
  { n: "Ocupación · Auditorio principal", u: "pers.", base: 260, amp: 250, ruido: 18, fase: 0.38, suelo: 0 },
  { n: "Potencia eléctrica instantánea", u: "kW", base: 148, amp: 95, ruido: 9, fase: 0.41 },
  { n: "Consumo eléctrico acumulado", u: "kWh", base: 1820, amp: 0, ruido: 0, fase: 0, acumulado: 96 },
  { n: "Consumo de agua", u: "m³", base: 14.6, amp: 0, ruido: 0, fase: 0, acumulado: 0.8 },
  { n: "Batería · Sensor terraza norte", u: "%", base: 87, amp: 1, ruido: 0.4, fase: 0.1 },
]

const SENSORES = CATALOGO.map((s, i) => ({
  ...s,
  uuid: `demo-${String(i + 1).padStart(2, "0")}`,
  deviceUuid: `demo-dispositivo-${Math.floor(i / 3) + 1}`,
}))

/** Ruido reproducible: la misma marca de tiempo da siempre el mismo valor,
    así la gráfica no "salta" entre refrescos. */
function pseudoAleatorio(semilla: number): number {
  const x = Math.sin(semilla * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Curva diaria: valle de madrugada y picos de mañana/tarde, propios de un
    palacio de congresos con sesiones de 10:00 a 14:00 y de 16:00 a 19:00. */
function curva(def: DefinicionDemo, ms: number): number {
  const d = new Date(ms)
  const h = d.getHours() + d.getMinutes() / 60

  if (def.acumulado != null) {
    const dias = Math.floor(ms / 86400000)
    return def.base + def.acumulado * (h / 24) + ((dias % 7) * def.acumulado) / 3
  }

  const manana = Math.exp(-Math.pow(h - 11.5, 2) / 5.5)
  const tarde = Math.exp(-Math.pow(h - 17.5, 2) / 6.5) * 0.85
  const actividad = Math.max(manana, tarde)
  const oscilacion = Math.sin(((h - 6) / 24) * Math.PI * 2) * def.fase

  let v = def.base + def.amp * actividad + def.amp * 0.25 * oscilacion
  v += (pseudoAleatorio(ms / 600000 + def.n.length) - 0.5) * 2 * def.ruido
  if (def.suelo != null) v = Math.max(def.suelo, v)
  return v
}

/** Indicadores agregados de mentira, con la misma forma que los reales. */
const KPIS_DEMO: Array<Pick<Kpi, "nombre" | "etiqueta" | "familia" | "periodo" | "esTotal">> = [
  { nombre: "ACCESOS_DIARIOS_PREHALL_TOTAL", etiqueta: "Prehall (total)", familia: "accesos", periodo: "DAILY", esTotal: true },
  { nombre: "SALIDAS_DIARIO_PREHALL_TOTAL", etiqueta: "Prehall (total)", familia: "salidas", periodo: "DAILY", esTotal: true },
  { nombre: "ACCESOS_DIARIO_PUERTA_HALL_TOTAL", etiqueta: "Puerta Hall (total)", familia: "accesos", periodo: "DAILY", esTotal: true },
  { nombre: "SALIDAS_DIARIO_PUERTA_HALL_TOTAL", etiqueta: "Puerta Hall (total)", familia: "salidas", periodo: "DAILY", esTotal: true },
  { nombre: "ACCESOS_DIARIO_EXPOSICIONES", etiqueta: "Exposiciones", familia: "accesos", periodo: "DAILY", esTotal: false },
  { nombre: "SALIDAS_DIARIO_EXPOSICIONES", etiqueta: "Exposiciones", familia: "salidas", periodo: "DAILY", esTotal: false },
  { nombre: "ACCESOS_DIARIO_SALA_AZUL", etiqueta: "Sala Azul", familia: "accesos", periodo: "DAILY", esTotal: false },
  { nombre: "SALIDAS_DIARIO_SALA_AZUL", etiqueta: "Sala Azul", familia: "salidas", periodo: "DAILY", esTotal: false },
  { nombre: "COMSUMO_AGUA_DIARIO", etiqueta: "Agua", familia: "agua", periodo: "DAILY", esTotal: false },
]

export const DEMO = {
  ultimos(): MedidaCruda[] {
    const ahora = Date.now()
    return SENSORES.map((s) => ({
      uuid: s.uuid,
      deviceUuid: s.deviceUuid,
      nombre: s.n,
      unidad: s.u,
      valor: curva(s, ahora),
      ts: ahora - Math.floor(pseudoAleatorio(s.uuid.length + ahora / 3600000) * 240000),
      codigo: "",
      matiz: "",
      equipo: s.deviceUuid,
      zona: "",
      exterior: /exterior/i.test(s.n),
    }))
  },

  kpis(): Kpi[] {
    const ahora = Date.now()
    const inicioDia = new Date(ahora).setHours(0, 0, 0, 0)
    return KPIS_DEMO.map((k, i) => ({
      ...k,
      operacion: k.esTotal ? "SUM" : "INCREMENT",
      uuid: `demo-kpi-${String(i + 1).padStart(2, "0")}`,
      valor: Math.round(
        k.familia === "agua"
          ? 1500 + pseudoAleatorio(i + 7) * 1800
          : 40 + pseudoAleatorio(i + 1) * 480,
      ),
      ts: inicioDia,
    }))
  },

  historico(uuid: string, desde: number, hasta: number): Punto[] {
    // Los indicadores agregados van por día, no por lectura suelta.
    if (uuid.startsWith("demo-kpi-")) {
      const serie: Punto[] = []
      const dia = 86400000
      for (let t = Math.ceil(desde / dia) * dia; t <= hasta; t += dia) {
        const finde = [0, 6].includes(new Date(t).getDay())
        serie.push({
          timestamp: t,
          value: Math.round((finde ? 90 : 420) * (0.6 + pseudoAleatorio(t / dia + uuid.length))),
        })
      }
      return serie
    }

    const def = SENSORES.find((s) => s.uuid === uuid)
    if (!def) return []
    const paso = Math.max(300000, Math.round((hasta - desde) / 140))
    const serie: Punto[] = []
    for (let t = desde; t <= hasta; t += paso) {
      serie.push({ timestamp: t, value: curva(def, t) })
    }
    return serie
  },
}
