/* Acceso a la plataforma IoTsens a través del Worker proxy.
   La API exige cabecera X-API-KEY y no envía cabeceras CORS, así que el
   navegador nunca la llama directamente: siempre pasa por el Worker.

   Dos capas de datos, con papeles distintos:

   - Medidas en bruto (`/devices`): un único GET devuelve el último valor de
     todos los sensores del recinto. Es lo que alimenta la rejilla. No traen
     ubicación: la plataforma solo las identifica por el número de serie del
     equipo. Los "assets" con nombre de sala existen, pero vienen sin medidas
     asociadas, así que no hay forma de cruzarlos por API.

   - Indicadores agregados (`/kpis`): ya vienen calculados por la plataforma y
     con el sitio en el nombre (ACCESOS_DIARIOS_PREHALL_TOTAL). Son la única
     capa que sabe dónde está cada cosa, y la que da sentido a la pantalla. */

import { CODIGOS_OCULTOS, CONFIG, FAMILIAS_EQUIPO, MATICES } from "@/lib/config"
import { DEMO } from "@/lib/demo"
import type { Kpi, MedidaCruda, Punto } from "@/lib/tipos"

export const estaConfigurado = (): boolean =>
  Boolean(CONFIG.proxy && CONFIG.tenantUuid)

interface MedidaApi {
  uuid?: string
  name?: string
  alias?: string
  lastValueReported?: string | number
  dateLastValueReported?: string
  measurementType?: { sensor?: string; unit?: string }
}

interface DispositivoApi {
  uuid?: string
  deviceMeasurements?: MedidaApi[]
}

interface KpiApi {
  uuid?: string
  name?: string
  timePeriod?: string
  operation?: string
  lastValueReported?: string | number
  dateLastValueReported?: string
}

interface Pagina<T> {
  content?: T[]
}

interface PuntoApi {
  timestamp?: string
  value?: string | number
}

async function api<T>(ruta: string): Promise<T> {
  const r = await fetch(CONFIG.proxy.replace(/\/$/, "") + ruta, { cache: "no-store" })
  if (!r.ok) throw new Error(`${r.status} en ${ruta}`)
  return (await r.json()) as T
}

const baseCatalogo = (): string =>
  `/v1/catalog/tenants/${CONFIG.tenantUuid}/organizations/${CONFIG.organizationUuid}`

/**
 * Las fechas llegan como texto ('2026-07-29 13:20:23' en el catálogo,
 * '2026-07-29T13:20:23Z' en el histórico), nunca como epoch. Solo se
 * interpretan como UTC cuando la propia cadena lo indica; el catálogo las da
 * en hora del recinto y sin zona, y ahí Date.parse ya asume hora local.
 */
function aMilisegundos(texto: string | number | undefined | null): number | null {
  if (texto == null) return null
  if (typeof texto === "number") return Number.isFinite(texto) ? texto : null
  const limpio = String(texto).trim()
  if (!limpio) return null
  const iso = /[TZ]|[+-]\d{2}:\d{2}$/.test(limpio) ? limpio : limpio.replace(" ", "T")
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** Número de serie del equipo al que pertenece la medida. */
function extraerEquipo(nombre: string): string {
  const m = /^([0-9A-F]{12,20}|WEATHER_STATION)/i.exec(nombre)
  return m ? m[1].toUpperCase() : "SIN-EQUIPO"
}

/** 'diario' / 'horario' / 'estimado' cuando la medida es una derivada. */
function extraerMatiz(nombre: string, codigo: string, equipo: string): string {
  const resto = nombre.slice(equipo.length).replace(/^_/, "")
  if (!resto || resto.toUpperCase() === codigo.toUpperCase()) return ""
  for (const [patron, texto] of MATICES) if (patron.test(resto)) return texto
  return ""
}

/**
 * Nombre presentable de cada equipo. La plataforma no dice en qué sala está
 * cada sensor, así que se agrupan por familia y se numeran por orden de
 * aparición: "Sonda de confort 3" en vez de "24E124725F200956".
 */
interface Etiqueta {
  nombre: string
  exterior: boolean
}

function nombrarEquipos(euis: string[]): Map<string, Etiqueta> {
  const nombres = new Map<string, Etiqueta>()
  const contador = new Map<string, number>()

  for (const eui of euis) {
    const familia = FAMILIAS_EQUIPO.find((f) => f.patron.test(eui))
    if (!familia) {
      nombres.set(eui, { nombre: eui, exterior: false })
      continue
    }
    const exterior = Boolean(familia.exterior)
    if (familia.unico) {
      nombres.set(eui, { nombre: familia.nombre, exterior })
      continue
    }
    const n = (contador.get(familia.nombre) ?? 0) + 1
    contador.set(familia.nombre, n)
    nombres.set(eui, { nombre: `${familia.nombre} ${n}`, exterior })
  }
  return nombres
}

function normalizar(medidas: MedidaApi[], deviceUuid: string): MedidaCruda[] {
  // Se numera sobre la lista completa para que el número de cada equipo no
  // cambie si un día deja de reportar una de sus medidas.
  const euis = [...new Set(medidas.map((m) => extraerEquipo(m.name ?? m.alias ?? "")))]
  const nombres = nombrarEquipos(euis)

  return medidas
    .filter((m) => {
      const codigo = m.measurementType?.sensor ?? ""
      return Boolean(m.uuid) && Boolean(codigo) && !CODIGOS_OCULTOS.test(codigo)
    })
    .map((m) => {
      const nombreApi = m.name ?? m.alias ?? ""
      const codigo = m.measurementType?.sensor ?? ""
      const equipo = extraerEquipo(nombreApi)
      const matiz = extraerMatiz(nombreApi, codigo, equipo)
      const valor = parseFloat(String(m.lastValueReported))

      const etiqueta = nombres.get(equipo)

      return {
        uuid: m.uuid as string,
        deviceUuid,
        nombre: etiqueta?.nombre ?? equipo,
        unidad: m.measurementType?.unit ?? "",
        valor: Number.isFinite(valor) ? valor : null,
        ts: aMilisegundos(m.dateLastValueReported),
        codigo,
        matiz,
        equipo,
        exterior: etiqueta?.exterior ?? false,
      }
    })
}

let dispositivoResuelto = ""

async function resolverDispositivo(): Promise<string> {
  if (dispositivoResuelto) return dispositivoResuelto
  if (CONFIG.deviceUuid) {
    dispositivoResuelto = CONFIG.deviceUuid
    return dispositivoResuelto
  }
  const lista = await api<Pagina<DispositivoApi>>(`${baseCatalogo()}/devices?size=50`)
  const uuid = lista.content?.[0]?.uuid
  if (!uuid) throw new Error("La organización no devuelve ningún dispositivo")
  dispositivoResuelto = uuid
  return dispositivoResuelto
}

/**
 * Un solo GET devuelve el último valor, la fecha y la unidad de todos los
 * sensores del recinto. Es lo que hace viable refrescar cada minuto.
 */
export async function leerSensores(modoDemo: boolean): Promise<MedidaCruda[]> {
  if (modoDemo) return DEMO.ultimos()

  const uuid = await resolverDispositivo()
  const dispositivo = await api<DispositivoApi>(`${baseCatalogo()}/devices/${uuid}`)
  const lista = normalizar(dispositivo.deviceMeasurements ?? [], uuid)
  if (!lista.length) throw new Error("El dispositivo no tiene medidas asociadas")
  return lista
}

/**
 * Nombre legible de un indicador:
 * ACCESOS_DIARIOS_PREHALL_TOTAL -> "Prehall (total)".
 */
function describirKpi(nombre: string): Pick<Kpi, "etiqueta" | "familia" | "esTotal"> {
  const limpio = nombre.replace(/_/g, " ").toUpperCase().trim()

  let familia: Kpi["familia"] = "otros"
  if (/ACCESOS/.test(limpio)) familia = "accesos"
  else if (/SALIDAS/.test(limpio)) familia = "salidas"
  // 'COMSUMO' no es una errata nuestra: es como está dado de alta en la
  // plataforma (COMSUMO_AGUA_DIARIO).
  else if (/AGUA|CO[NM]SUMO/.test(limpio)) familia = "agua"

  const esTotal = /\bTOTAL\b/.test(limpio)

  const lugar = limpio
    .replace(/\bTOTAL\b/g, "")
    .replace(/\b(ACCESOS|SALIDAS|CO[NM]SUMO)\b/g, "")
    .replace(/\b(DIARIOS?|HORARIOS?)\b/g, "")
    .replace(/\bDE\b/g, "")
    .replace(/\s+/g, " ")
    .trim()

  const bonito =
    lugar
      .toLowerCase()
      .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
      .trim() || "Recinto"

  return { etiqueta: esTotal ? `${bonito} (total)` : bonito, familia, esTotal }
}

/** Indicadores ya agregados por la plataforma. Son los que traen ubicación. */
export async function leerKpis(modoDemo: boolean): Promise<Kpi[]> {
  if (modoDemo) return DEMO.kpis()

  const lista = await api<Pagina<KpiApi>>(`${baseCatalogo()}/kpis?size=500`)
  return (lista.content ?? [])
    .filter((k) => k.uuid && k.name)
    .map((k) => {
      const valor = parseFloat(String(k.lastValueReported))
      return {
        uuid: k.uuid as string,
        nombre: k.name as string,
        ...describirKpi(k.name as string),
        periodo: k.timePeriod === "HOURLY" ? ("HOURLY" as const) : ("DAILY" as const),
        valor: Number.isFinite(valor) ? valor : null,
        ts: aMilisegundos(k.dateLastValueReported),
      }
    })
}

function aSerie(datos: PuntoApi[]): Punto[] {
  return (Array.isArray(datos) ? datos : [])
    .map((d) => ({
      timestamp: aMilisegundos(d.timestamp) ?? NaN,
      value: parseFloat(String(d.value)),
    }))
    .filter((d) => Number.isFinite(d.timestamp) && Number.isFinite(d.value))
    .sort((a, b) => a.timestamp - b.timestamp)
}

/** El histórico va aparte y por sensor; el rango se pide en ms epoch. */
export async function leerHistorico(
  sensor: MedidaCruda,
  desde: number,
  hasta: number,
  modoDemo: boolean,
): Promise<Punto[]> {
  if (modoDemo) return DEMO.historico(sensor.uuid, desde, hasta)
  if (!sensor.deviceUuid) return []

  const datos = await api<PuntoApi[]>(
    `/v1/measurements/tenants/${CONFIG.tenantUuid}/devices/${sensor.deviceUuid}` +
      `/sensors/${sensor.uuid}?from=${desde}&until=${hasta}`,
  )
  return aSerie(datos)
}

/** Histórico de un indicador agregado. Cuelga de /kpis, no de /measurements. */
export async function leerHistoricoKpi(
  kpi: Kpi,
  desde: number,
  hasta: number,
  modoDemo: boolean,
): Promise<Punto[]> {
  if (modoDemo) return DEMO.historico(kpi.uuid, desde, hasta)

  const datos = await api<PuntoApi[]>(
    `/v1/kpis/tenants/${CONFIG.tenantUuid}/kpis/${kpi.uuid}?from=${desde}&until=${hasta}`,
  )
  return aSerie(datos)
}

/** Lanza las peticiones de histórico de 4 en 4 para no saturar el proxy. */
export async function enTanda<T, R>(
  elementos: T[],
  tarea: (e: T) => Promise<R>,
  tanda = 4,
): Promise<R[]> {
  const salida: R[] = []
  for (let i = 0; i < elementos.length; i += tanda) {
    salida.push(...(await Promise.all(elementos.slice(i, i + tanda).map(tarea))))
  }
  return salida
}
