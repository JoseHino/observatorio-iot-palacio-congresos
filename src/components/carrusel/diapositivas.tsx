/* Definición de las diapositivas del carrusel.

   Cada una responde a una pregunta sola: cuánta gente ha entrado, cómo se
   está dentro, qué aire hay, qué tiempo hace, cuánta agua se gasta. */

import { Droplets, DoorOpen, Footprints, Gauge, Sun, Thermometer, Users, Volume2, Wind } from "lucide-react"
import type { ReactNode } from "react"

import { GraficaDiaria } from "@/components/carrusel/GraficaDiaria"
import { Barras, CifraGrande, FilaCifras, RejillaLecturas, SinDatos } from "@/components/carrusel/piezas"
import { puntosDePaso } from "@/components/PanelAforo"
import { CONFIG, EQUIPOS } from "@/lib/config"
import { esCreible } from "@/lib/formato"
import type { Kpi, Punto, Sensor } from "@/lib/tipos"

export interface DatosDiapositiva {
  sensores: Sensor[]
  kpis: Kpi[]
  seriesKpi: Map<string, Punto[]>
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
  const v = sensores
    .filter((s) => s.valor !== null && esCreible(s.tipo, s.valor))
    .map((s) => s.valor as number)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/* ---------- 1. Afluencia ---------- */

const AFLUENCIA: Diapositiva = {
  id: "afluencia",
  titulo: "Afluencia de hoy",
  subtitulo: "Entradas y salidas registradas por los contadores de paso",
  hayDatos: ({ kpis }) => puntosDePaso(kpis).length > 0,
  contenido: ({ kpis, seriesKpi }) => {
    const puntos = puntosDePaso(kpis)
    const transito = puntos.reduce((t, p) => t + (p.entradas ?? 0) + (p.salidas ?? 0), 0)

    return (
      <>
        <FilaCifras>
          <CifraGrande
            icono={DoorOpen}
            etiqueta="Puerta principal"
            valor={kpiDiario(kpis, /^ACCESOS_DIARIO_PUERTA_HALL_TOTAL$/)}
            unidad="entradas"
            detalle="Hall"
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

export const DIAPOSITIVAS: Diapositiva[] = [AFLUENCIA, CONFORT, AIRE, METEO, AGUA]
