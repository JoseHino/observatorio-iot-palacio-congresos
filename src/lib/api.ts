/* Acceso a la plataforma IoTsens a través del Worker proxy.
   La API exige cabecera X-API-KEY y no envía cabeceras CORS, así que el
   navegador nunca la llama directamente: siempre pasa por el Worker. */

import { CONFIG } from "@/lib/config"
import { DEMO } from "@/lib/demo"
import type { MedidaCruda, Punto } from "@/lib/tipos"

export const estaConfigurado = (): boolean =>
  Boolean(CONFIG.proxy && CONFIG.tenantUuid)

interface MedidaApi {
  uuid?: string
  deviceUuid?: string
  alias?: string
  name?: string
  unit?: string
  lastValue?: string | number
  value?: string | number
  lastValueDate?: string | number
  timestamp?: string | number
}

interface ActivoApi {
  uuid?: string
  assetUuid?: string
  deviceMeasurements?: MedidaApi[]
  assetMeasurements?: MedidaApi[]
}

async function api<T>(ruta: string): Promise<T> {
  const r = await fetch(CONFIG.proxy.replace(/\/$/, "") + ruta, { cache: "no-store" })
  if (!r.ok) throw new Error(`${r.status} en ${ruta}`)
  return (await r.json()) as T
}

const baseCatalogo = (): string =>
  CONFIG.organizationUuid
    ? `/v1/catalog/tenants/${CONFIG.tenantUuid}/organizations/${CONFIG.organizationUuid}`
    : `/v1/catalog/tenants/${CONFIG.tenantUuid}`

let assetResuelto = ""

async function resolverAsset(): Promise<string> {
  if (assetResuelto) return assetResuelto
  if (CONFIG.assetUuid) {
    assetResuelto = CONFIG.assetUuid
    return assetResuelto
  }
  const lista = await api<ActivoApi[] | { content?: ActivoApi[] }>(
    `${baseCatalogo()}/assets?size=50`,
  )
  const activos = Array.isArray(lista) ? lista : (lista.content ?? [])
  if (!activos.length) throw new Error("El tenant no devuelve ningún activo")
  const uuid = activos[0].uuid || activos[0].assetUuid
  if (!uuid) throw new Error("El activo no trae uuid; indícalo en CONFIG.assetUuid")
  assetResuelto = uuid
  return assetResuelto
}

function normalizar(medidas: MedidaApi[]): MedidaCruda[] {
  return medidas
    .map((m) => {
      const valor = parseFloat(String(m.lastValue ?? m.value))
      return {
        uuid: m.uuid ?? "",
        deviceUuid: m.deviceUuid ?? "",
        nombre: m.alias || m.name || "Sensor",
        unidad: m.unit ?? "",
        valor: Number.isFinite(valor) ? valor : null,
        ts: Number(m.lastValueDate ?? m.timestamp) || null,
      }
    })
    .filter((s) => s.uuid)
}

/**
 * Un solo GET devuelve lastValue + lastValueDate + unit de TODOS los
 * sensores del activo. Es el truco que hace viable refrescar cada minuto.
 */
export async function leerSensores(modoDemo: boolean): Promise<MedidaCruda[]> {
  if (modoDemo) return DEMO.ultimos()

  const uuid = await resolverAsset()
  const activo = await api<ActivoApi>(
    `${baseCatalogo()}/assets/${uuid}?withDeviceMeasurements=true`,
  )
  const medidas = [...(activo.deviceMeasurements ?? []), ...(activo.assetMeasurements ?? [])]
  const lista = normalizar(medidas)
  if (!lista.length) throw new Error("El activo no tiene medidas asociadas")
  return lista
}

/** El histórico va aparte y por sensor; las marcas de tiempo son ms epoch. */
export async function leerHistorico(
  sensor: MedidaCruda,
  desde: number,
  hasta: number,
  modoDemo: boolean,
): Promise<Punto[]> {
  if (modoDemo) return DEMO.historico(sensor.uuid, desde, hasta)
  if (!sensor.deviceUuid) return []

  const datos = await api<{ timestamp: string | number; value: string | number }[]>(
    `/v1/measurements/tenants/${CONFIG.tenantUuid}/devices/${sensor.deviceUuid}` +
      `/sensors/${sensor.uuid}?from=${desde}&until=${hasta}`,
  )
  return (Array.isArray(datos) ? datos : [])
    .map((d) => ({ timestamp: Number(d.timestamp), value: parseFloat(String(d.value)) }))
    .filter((d) => Number.isFinite(d.timestamp) && Number.isFinite(d.value))
    .sort((a, b) => a.timestamp - b.timestamp)
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
