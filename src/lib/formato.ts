import { TIPOS_SENSOR } from "@/lib/config"
import type { Estado, TipoSensor } from "@/lib/tipos"

const cacheFormato = new Map<number, Intl.NumberFormat>()

/** Número en formato español con los decimales que pida el tipo de sensor. */
export function num(valor: number, decimales: number): string {
  let nf = cacheFormato.get(decimales)
  if (!nf) {
    nf = new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    })
    cacheFormato.set(decimales, nf)
  }
  return nf.format(valor)
}

export const hora = (ms: number): string =>
  new Date(ms).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })

export function fechaLarga(d: Date): string {
  const texto = d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Deja el nombre en minúsculas, sin acentos y con los subíndices en cifra
 * normal (CO₂ -> co2), para que los patrones del diccionario acierten.
 */
export function normalizarTexto(texto: string): string {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[¹²³]/g, (c) => ({ "¹": "1", "²": "2", "³": "3" })[c] ?? c)
    .toLowerCase()
}

const TIPO_GENERICO = (unidad: string): TipoSensor => ({
  id: "generico",
  etiqueta: "Indicador",
  patron: /$^/,
  unidad,
  grupo: "otros",
  decimales: 1,
})

/**
 * El código exacto manda sobre el nombre. Los nombres reales llevan pegado el
 * número de serie del equipo (`0004A30B017559CE_NO2`), así que buscar por
 * texto ahí produce falsos positivos; el código (`NO2`) es inequívoco.
 * El nombre solo se usa como respaldo, sobre todo para el modo demostración.
 */
export function clasificar(codigo: string, nombre: string, unidadApi: string): TipoSensor {
  const cod = normalizarTexto(codigo)
  if (cod) {
    const porCodigo = TIPOS_SENSOR.find((t) => t.codigos?.test(cod))
    if (porCodigo) return porCodigo
  }
  const texto = normalizarTexto(`${nombre || ""} ${unidadApi || ""}`)
  return TIPOS_SENSOR.find((t) => t.patron.test(texto)) ?? TIPO_GENERICO(unidadApi || "")
}

/**
 * Los umbrales de confort (temperatura, humedad, ruido) solo tienen sentido
 * en espacios climatizados. Aplicados a la estación meteorológica o a un
 * sensor de puerta marcarían "fuera de rango" un día normal de julio.
 * Los de calidad del aire sí valen fuera: son de salud, no de confort.
 */
const esConfort = (tipo: TipoSensor): boolean => tipo.grupo === "confort"

export function evaluar(
  tipo: TipoSensor,
  valor: number | null,
  exterior = false,
): Estado {
  const u = exterior && esConfort(tipo) ? undefined : tipo.umbrales
  if (!u || valor === null || !Number.isFinite(valor)) {
    return { clase: "neutro", color: "var(--neutro)", etiqueta: "" }
  }
  const dentro = (r: [number, number]) => valor >= r[0] && valor <= r[1]
  if (dentro(u.optimo)) return { clase: "ok", color: "var(--ok)", etiqueta: "Óptimo" }
  if (!u.aviso || dentro(u.aviso)) {
    return { clase: "aviso", color: "var(--aviso)", etiqueta: "Aceptable" }
  }
  return { clase: "alerta", color: "var(--alerta)", etiqueta: "Fuera de rango" }
}

/** Color saturado equivalente, para trazos de gráfica y puntos. */
export function colorTrazo(clase: Estado["clase"]): string {
  if (clase === "ok") return "var(--ok-trazo)"
  if (clase === "aviso") return "var(--aviso-trazo)"
  if (clase === "alerta") return "var(--alerta-trazo)"
  return "var(--neutro)"
}

export const SEVERIDAD: Record<Estado["clase"], number> = {
  alerta: 3,
  aviso: 2,
  ok: 1,
  neutro: 0,
}

/** Resuelve una variable CSS a su valor real (Chart.js no entiende var()). */
export function valorCss(variable: string, respaldo = "#1a8fe3"): string {
  const nombre = variable.replace(/^var\(|\)$/g, "").trim()
  const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()
  return v || respaldo
}

/**
 * Aplica transparencia a un color hexadecimal.
 * El degradado va a un canvas, y ahí no se puede confiar en color-mix().
 */
export function conAlfa(hex: string, alfa: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  let c = m[1]
  if (c.length === 3) c = c.split("").map((x) => x + x).join("")
  const n = parseInt(c, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`
}
