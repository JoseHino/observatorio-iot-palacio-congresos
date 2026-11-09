/* Definición de las diapositivas del carrusel.

   Cada una responde a una pregunta sola: cuánta gente ha entrado, cómo se
   está dentro, qué aire hay, qué tiempo hace, cuánta agua se gasta. */

import { Clock, Droplets, DoorOpen, Footprints, Gauge, Sun, Thermometer, TriangleAlert, Users, Volume2, Wind } from "lucide-react"
import type { ReactNode } from "react"

import { GraficaDiaria } from "@/components/carrusel/GraficaDiaria"
import { Barras, CifraGrande, FilaCifras, RejillaLecturas, SinDatos } from "@/components/carrusel/piezas"
import { puntosDePaso } from "@/components/PanelAforo"
import { CAMARA_PUERTA_3, CO2_MAL_VENTILADA, CONFIG, EQUIPOS } from "@/lib/config"
import { esCreible, num } from "@/lib/formato"
import type { Kpi, Punto, Sensor } from "@/lib/tipos"

export interface DatosDiapositiva {
  sensores: Sensor[]
  kpis: Kpi[]
  seriesKpi: Map<string, Punto[]>
  /** CO₂ de la última semana de cada sonda interior fiable, por uuid. */
  semanaCo2: Map<string, Punto[]>
}

export interface Diapositiva {
  id: string
  titulo: string
  subtitulo: string
  /** false cuando no hay nada que enseñar: la diapositiva se salta. */
  hayDatos: (d: DatosDiapositiva) => boolean
  contenido: (d: DatosDiapositiva) => ReactNode
}

/**
 * Bloque con rótulo, para que dos columnas contiguas arranquen a la misma
 * altura. `flex-1` es imprescindible: dentro de una columna flex, sin él la
 * sección se queda con el alto del rótulo y la gráfica —que mide su
 * contenedor— no llega a dibujarse.
 */
function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h3 className="mb-[0.5em] text-[calc(var(--u)*1.5)] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </section>
  )
}

/* ---------- utilidades de selección ---------- */

/** Medidas de un equipo concreto, por su número de serie. */
const deEquipo = (sensores: Sensor[], eui: string): Sensor[] =>
  sensores.filter((s) => s.equipo === eui)

/** Sensores de espacios interiores de uso público, ya con su sala conocida. */
const deInterior = (sensores: Sensor[]): Sensor[] =>
  sensores.filter((s) => s.zona && !s.exterior)

const porTipo = (sensores: Sensor[], ...ids: string[]): Sensor[] =>
  sensores.filter((s) => ids.includes(s.tipo.id))

const kpiDiario = (kpis: Kpi[], patron: RegExp): number | null =>
  kpis.find((k) => k.periodo === "DAILY" && patron.test(k.nombre))?.valor ?? null

/** Media de las lecturas válidas. null si no hay ninguna. */
function media(sensores: Sensor[]): number | null {
  // Las lecturas imposibles (CO₂ por debajo del aire exterior) no promedian.
  // Ni las medidas en revisión (fallos comprobados en la plataforma).
  const v = sensores
    .filter((s) => !s.revision && s.valor !== null && esCreible(s.tipo, s.valor))
    .map((s) => s.valor as number)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/**
 * La cámara de la Puerta 3 se corta durante horas o días (29-10 a 5-11,
 * y otra vez 31 h el 8-11). Su total entra en el de la puerta principal, que
 * entonces se queda corto: hay que decirlo en pantalla.
 * Devuelve desde cuándo no envía, o null si envía con normalidad.
 */
function puerta3SinDatos(sensores: Sensor[]): string | null {
  const medidas = deEquipo(sensores, CAMARA_PUERTA_3)
  const ts = Math.max(0, ...medidas.map((s) => s.ts ?? 0))
  if (ts && Date.now() - ts <= CONFIG.minutosSinDatos * 60000) return null
  if (!ts) return "hoy"
  const d = new Date(ts)
  const hoy = new Date().toDateString() === d.toDateString()
  return (
    "desde " +
    (hoy ? "" : d.toLocaleDateString("es-ES", { day: "numeric", month: "numeric" }) + " ") +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  )
}

/* ---------- 1. Afluencia ---------- */

const AFLUENCIA: Diapositiva = {
  id: "afluencia",
  titulo: "Afluencia de hoy",
  subtitulo: "Entradas y salidas registradas por los contadores de paso",
  hayDatos: ({ kpis }) => puntosDePaso(kpis).length > 0,
  contenido: ({ kpis, sensores, seriesKpi }) => {
    const puntos = puntosDePaso(kpis)
    const p3 = puerta3SinDatos(sensores)
    const transito = puntos.reduce((t, p) => t + (p.entradas ?? 0) + (p.salidas ?? 0), 0)

    return (
      <>
        <FilaCifras>
          <CifraGrande
            icono={DoorOpen}
            etiqueta="Puerta principal"
            valor={kpiDiario(kpis, /^ACCESOS_DIARIO_PUERTA_HALL_TOTAL$/)}
            unidad="entradas"
            detalle={p3 ? `Hall · falta la Puerta 3 (sin datos ${p3})` : "Hall"}
          />
          <CifraGrande
            icono={Users}
            etiqueta="Prehall"
            valor={kpiDiario(kpis, /^ACCESOS_DIARIOS?_PREHALL_TOTAL$/)}
            unidad="entradas"
            detalle="Accesos 1 y 2"
          />
          <CifraGrande
            icono={Footprints}
            etiqueta="Tránsito registrado"
            valor={transito}
            unidad="pasos"
            detalle={`Entradas y salidas en ${puntos.length} puntos`}
          />
        </FilaCifras>

        <div className="grid min-h-0 flex-1 gap-[calc(var(--u)*3.5)] [grid-template-columns:1fr_1fr] max-[1100px]:grid-cols-1">
          <Bloque titulo="Por punto de paso · entradas / salidas">
            <Barras
              filas={puntos.slice(0, 6).map((p) => ({
                clave: p.lugar,
                etiqueta: p.lugar,
                a: p.entradas,
                b: p.salidas,
              }))}
            />
          </Bloque>
          <Bloque titulo={`Entradas por la puerta principal · ${CONFIG.diasHistoricoKpi} días`}>
            <GraficaDiaria serie={seriesKpi.get("afluencia") ?? []} unidad="" />
          </Bloque>
        </div>
      </>
    )
  },
}

/* ---------- 2. Confort ---------- */

const CONFORT: Diapositiva = {
  id: "confort",
  titulo: "Confort en las salas",
  subtitulo: "Temperatura, humedad y nivel sonoro en los espacios interiores",
  hayDatos: ({ sensores }) => porTipo(deInterior(sensores), "temperatura").length > 0,
  contenido: ({ sensores }) => {
    const dentro = deInterior(sensores)
    const temperaturas = porTipo(dentro, "temperatura")
    const ruidos = porTipo(dentro, "ruido")

    return (
      <>
        <FilaCifras>
          <CifraGrande
            icono={Thermometer}
            etiqueta="Temperatura media"
            valor={media(temperaturas)}
            unidad="°C"
            decimales={1}
            detalle={`Media de ${temperaturas.length} salas`}
          />
          <CifraGrande
            icono={Droplets}
            etiqueta="Humedad media"
            valor={media(porTipo(dentro, "humedad"))}
            unidad="%"
            detalle="Humedad relativa"
          />
          <CifraGrande
            icono={Volume2}
            etiqueta="Nivel sonoro medio"
            valor={media(ruidos)}
            unidad="dB(A)"
            decimales={1}
            detalle={`Media de ${ruidos.length} sonómetros`}
          />
        </FilaCifras>

        <RejillaLecturas sensores={temperaturas} />
      </>
    )
  },
}

/* ---------- 3. Calidad del aire ---------- */

const AIRE: Diapositiva = {
  id: "aire",
  titulo: "Calidad del aire",
  subtitulo: "Renovación del aire en las salas y contaminantes en el entorno",
  hayDatos: ({ sensores }) => porTipo(sensores, "co2").length > 0,
  contenido: ({ sensores }) => {
    const sondas = porTipo(deInterior(sensores), "co2")
    const estacion = deEquipo(sensores, EQUIPOS.calidadAire)

    return (
      <>
        <FilaCifras>
          <CifraGrande
            icono={Wind}
            etiqueta="CO₂ medio en salas"
            valor={media(sondas)}
            unidad="ppm"
            detalle="Por debajo de 800 ppm el aire está bien renovado"
          />
          <CifraGrande
            icono={Gauge}
            etiqueta="Partículas PM2.5"
            valor={media(porTipo(estacion, "pm25"))}
            unidad="µg/m³"
            detalle="Estación exterior"
          />
          <CifraGrande
            icono={Gauge}
            etiqueta="Partículas PM10"
            valor={media(porTipo(estacion, "pm10"))}
            unidad="µg/m³"
            detalle="Estación exterior"
          />
        </FilaCifras>

        <RejillaLecturas sensores={sondas} />
      </>
    )
  },
}

/* ---------- 4. Meteorología ---------- */

const METEO: Diapositiva = {
  id: "meteo",
  titulo: "El tiempo en el Palacio",
  subtitulo: "Estación meteorológica en la azotea",
  hayDatos: ({ sensores }) => deEquipo(sensores, EQUIPOS.meteorologia).length > 0,
  contenido: ({ sensores }) => {
    const meteo = deEquipo(sensores, EQUIPOS.meteorologia)
    const valor = (id: string) => meteo.find((s) => s.tipo.id === id)?.valor ?? null

    return (
      <>
        <FilaCifras>
          <CifraGrande
            icono={Thermometer}
            etiqueta="Temperatura"
            valor={valor("temperatura")}
            unidad="°C"
            decimales={1}
          />
          <CifraGrande icono={Droplets} etiqueta="Humedad" valor={valor("humedad")} unidad="%" />
          <CifraGrande
            icono={Wind}
            etiqueta="Viento"
            valor={valor("viento")}
            unidad="m/s"
            decimales={1}
          />
          <CifraGrande
            icono={Sun}
            etiqueta="Radiación solar"
            valor={valor("radiacion")}
            unidad="W/m²"
          />
        </FilaCifras>

        {/* Aquí el equipo es siempre el mismo, así que rotula la magnitud.
            Se descartan las derivadas (lluvia horaria, diaria, estimada):
            la plataforma publica cuatro versiones del mismo cero. */}
        <RejillaLecturas
          rotular="magnitud"
          sensores={porTipo(meteo, "presion", "lluvia", "luminosidad", "direccion_viento").filter(
            (s) => !s.matiz,
          )}
        />
      </>
    )
  },
}

/* ---------- 5. Agua ---------- */

const AGUA: Diapositiva = {
  id: "agua",
  titulo: "Consumo de agua",
  subtitulo: "Contador general del edificio",
  hayDatos: ({ kpis }) => kpis.some((k) => k.familia === "agua"),
  contenido: ({ kpis, sensores, seriesKpi }) => {
    // Ya viene sin los consumos imposibles y con cada total en su día real;
    // todos son días cerrados (la plataforma no da el de hoy hasta mañana).
    const serie = seriesKpi.get("agua") ?? []
    const cerrados = serie
    const mediaDiaria = cerrados.length
      ? cerrados.reduce((a, p) => a + p.value, 0) / cerrados.length
      : null

    const acumulado =
      deEquipo(sensores, EQUIPOS.contadorAgua).find((s) => s.tipo.id === "agua" && !s.matiz)
        ?.valor ?? null

    return (
      <>
        <FilaCifras>
          <CifraGrande
            icono={Droplets}
            etiqueta="Ayer"
            valor={kpis.find((k) => k.periodo === "DAILY" && /AGUA/.test(k.nombre))?.ayer ?? null}
            unidad="litros"
            detalle="Último día cerrado"
          />
          <CifraGrande
            icono={Droplets}
            etiqueta="Media diaria"
            valor={mediaDiaria}
            unidad="litros"
            detalle={`Últimos ${cerrados.length} días con lectura válida`}
          />
          <CifraGrande
            icono={Gauge}
            etiqueta="Lectura del contador"
            valor={acumulado}
            unidad="litros"
            detalle="Volumen total acumulado"
          />
        </FilaCifras>

        <Bloque titulo={`Consumo diario · últimos ${CONFIG.diasHistoricoKpi} días`}>
          {serie.length ? <GraficaDiaria serie={serie} unidad="L" /> : <SinDatos />}
        </Bloque>
      </>
    )
  },
}

/* ---------- 6. Ventilación de la semana ---------- */

interface ResumenSala {
  uuid: string
  sala: string
  pico: number
  cuando: number
  horasMal: number
}

/**
 * Pico de CO₂ y horas por encima del umbral de cada sala en los últimos días.
 * Las horas se miden por tiempo, no por lecturas: cada lectura alta cuenta
 * hasta la siguiente, con un tope de 30 min para no inflar los huecos.
 */
function resumirVentilacion(sensores: Sensor[], semana: Map<string, Punto[]>): ResumenSala[] {
  return sensores
    .filter((s) => semana.has(s.uuid))
    .map((s) => {
      const serie = (semana.get(s.uuid) ?? []).filter((p) => esCreible(s.tipo, p.value))
      let pico = 0
      let cuando = 0
      let ms = 0
      serie.forEach((p, i) => {
        if (p.value > pico) {
          pico = p.value
          cuando = p.timestamp
        }
        const sig = serie[i + 1]
        if (sig && p.value > CO2_MAL_VENTILADA) ms += Math.min(sig.timestamp - p.timestamp, 1800000)
      })
      return { uuid: s.uuid, sala: s.nombre, pico, cuando, horasMal: ms / 3600000 }
    })
    .filter((r) => r.pico > 0)
    .sort((a, b) => b.pico - a.pico)
}

const colorCo2 = (v: number) =>
  v > CO2_MAL_VENTILADA ? "var(--alerta-trazo)" : v > 800 ? "var(--aviso-trazo)" : "var(--ok-trazo)"

const fechaCorta = (ts: number) =>
  new Date(ts).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "numeric" }) +
  ", " +
  new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })

const VENTILACION: Diapositiva = {
  id: "ventilacion",
  titulo: "Ventilación esta semana",
  subtitulo: `CO₂ máximo en cada sala en los últimos ${CONFIG.diasVentilacion} días`,
  hayDatos: ({ sensores, semanaCo2 }) => resumirVentilacion(sensores, semanaCo2).length > 0,
  contenido: ({ sensores, semanaCo2 }) => {
    const salas = resumirVentilacion(sensores, semanaCo2)
    const peor = salas[0]
    const horas = salas.reduce((t, r) => t + r.horasMal, 0)
    const conProblema = salas.filter((r) => r.horasMal > 0).length
    const tope = Math.max(CO2_MAL_VENTILADA * 1.2, ...salas.map((r) => r.pico))

    return (
      <>
        <FilaCifras>
          <CifraGrande
            icono={Wind}
            etiqueta="Pico de la semana"
            valor={peor?.pico ?? null}
            unidad="ppm"
            detalle={peor ? `${peor.sala} · ${fechaCorta(peor.cuando)}` : undefined}
          />
          <CifraGrande
            icono={Clock}
            etiqueta={`Horas por encima de ${num(CO2_MAL_VENTILADA, 0)} ppm`}
            valor={horas}
            unidad="h"
            decimales={1}
            detalle={`Sumando las ${salas.length} salas con sonda fiable`}
          />
          <CifraGrande
            icono={TriangleAlert}
            etiqueta="Salas que lo superaron"
            valor={conProblema}
            unidad={`de ${salas.length}`}
            detalle="Referencia orientativa de aire mal renovado"
          />
        </FilaCifras>

        <Bloque titulo={`Máximo de CO₂ por sala · la línea marca ${num(CO2_MAL_VENTILADA, 0)} ppm`}>
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-[calc(var(--u)*2.2)]">
            {salas.map((r) => (
              <div key={r.uuid} className="grid grid-cols-[minmax(0,14em)_1fr_auto] items-center gap-x-[1em] text-[calc(var(--u)*2.4)]">
                <span className="truncate font-semibold">{r.sala}</span>
                <div className="relative h-[calc(var(--u)*2)] rounded-full bg-border/60">
                  <i
                    className="absolute inset-y-0 left-0 block rounded-full"
                    style={{ width: `${(r.pico / tope) * 100}%`, background: colorCo2(r.pico) }}
                  />
                  <i
                    className="absolute -inset-y-[0.4em] block w-[2px] bg-foreground/60"
                    style={{ left: `${(CO2_MAL_VENTILADA / tope) * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="cifras min-w-[8em] text-right font-bold tabular-nums">
                  {num(r.pico, 0)} <span className="text-[0.7em] font-medium text-muted-foreground">ppm</span>
                  {r.horasMal > 0 && (
                    <span className="ml-[0.6em] text-[0.75em] font-semibold text-[var(--alerta-trazo)]">
                      {num(r.horasMal, 1)} h
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Bloque>
      </>
    )
  },
}

export const DIAPOSITIVAS: Diapositiva[] = [AFLUENCIA, CONFORT, AIRE, VENTILACION, METEO, AGUA]
