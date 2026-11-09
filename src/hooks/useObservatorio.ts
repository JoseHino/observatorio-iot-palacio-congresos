import { useCallback, useEffect, useRef, useState } from "react"

import {
  enTanda,
  estaConfigurado,
  leerHistorico,
  leerHistoricoKpi,
  leerKpis,
  leerSensores,
} from "@/lib/api"
import { CONFIG, EN_REVISION, GRUPOS } from "@/lib/config"
import { clasificar, evaluar } from "@/lib/formato"
import type { EstadoConexion, Kpi, Punto, Sensor } from "@/lib/tipos"

/** Series diarias de indicadores agregados, por su papel en la pantalla. */
export type PapelSerie = "afluencia" | "agua"

interface Observatorio {
  sensores: Sensor[]
  kpis: Kpi[]
  /** Series de varios días de los KPI destacados (afluencia y agua). */
  seriesKpi: Map<PapelSerie, Punto[]>
  historicos: Map<string, Punto[]>
  /** CO₂ de los últimos días de cada sonda interior fiable, por uuid. */
  semanaCo2: Map<string, Punto[]>
  conexion: EstadoConexion
  aviso: string
  /** Marca de tiempo del último ciclo completado, para la barra de refresco. */
  inicioCiclo: number
  actualizar: () => void
}

const forzarDemo = () =>
  CONFIG.modoDemo === "si" ||
  (CONFIG.modoDemo === "auto" && !estaConfigurado()) ||
  new URLSearchParams(location.search).get("demo") === "1"

/** Posición del grupo en la rejilla; los desconocidos van al final. */
function orden(grupo: Sensor["tipo"]["grupo"]): number {
  const i = GRUPOS.findIndex((g) => g.id === grupo)
  return i < 0 ? GRUPOS.length : i
}

/**
 * Para la gráfica de afluencia interesa la puerta principal, que es la que
 * refleja el uso real del edificio. Si no estuviera, se recurre al indicador
 * diario de accesos con más movimiento.
 */
function elegirKpiAfluencia(kpis: Kpi[]): Kpi | undefined {
  const diarios = kpis.filter((k) => k.familia === "accesos" && k.periodo === "DAILY")
  return (
    diarios.find((k) => /PUERTA_HALL_TOTAL/.test(k.nombre)) ??
    diarios.find((k) => k.esTotal) ??
    [...diarios].sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))[0]
  )
}

const elegirKpiAgua = (kpis: Kpi[]): Kpi | undefined =>
  kpis.find((k) => k.familia === "agua" && k.periodo === "DAILY")

/**
 * Deja la serie diaria lista para pintar.
 *
 * - Agua: fuera los consumos imposibles (negativos o de millones de litros).
 *   La plataforma los ha publicado y, además de hundir la escala de la
 *   gráfica, falseaban la media sin que se notara: se compensaban entre sí.
 * - Afluencia: se añade el día en curso, que la plataforma aún no ha cerrado,
 *   con lo que va de hoy. La gráfica lo pinta aparte, en gris.
 */
function depurarSerie(papel: PapelSerie, serie: Punto[], kpi: Kpi): Punto[] {
  if (papel === "agua") {
    return serie.filter((p) => p.value >= 0 && p.value <= CONFIG.aguaMaximaDiaria)
  }
  const hoy = new Date().setHours(0, 0, 0, 0)
  const cerrados = serie.filter((p) => p.timestamp < hoy)
  return kpi.valor === null ? cerrados : [...cerrados, { timestamp: hoy, value: kpi.valor }]
}

export function useObservatorio(): Observatorio {
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [seriesKpi, setSeriesKpi] = useState<Map<PapelSerie, Punto[]>>(new Map())
  const [historicos, setHistoricos] = useState<Map<string, Punto[]>>(new Map())
  const [semanaCo2, setSemanaCo2] = useState<Map<string, Punto[]>>(new Map())
  // Las series de una semana pesan: se piden cada media hora, no cada minuto.
  const ultimaSemana = useRef(0)
  // Históricos de 24 h y series de 14 días: cambian despacio, así que se
  // piden cada `minutosHistorico` y no en cada refresco de un minuto. Antes
  // eran ~30 peticiones por minuto y por pantalla abierta.
  const ultimoHistorico = useRef(0)
  const historicosPrevios = useRef<Map<string, Punto[]>>(new Map())
  // Hora de la última lectura buena, para avisar si se corta la conexión.
  const ultimoBueno = useRef(0)
  const [conexion, setConexion] = useState<EstadoConexion>("cargando")
  const [aviso, setAviso] = useState("")
  const [inicioCiclo, setInicioCiclo] = useState(() => Date.now())

  // En una ref, no en estado: el ciclo debe poder consultarlo sin re-suscribirse.
  const modoDemo = useRef(forzarDemo())

  const actualizar = useCallback(async () => {
    try {
      const [brutos, indicadores] = await Promise.all([
        leerSensores(modoDemo.current),
        // Los indicadores agregados son un extra: si fallan, la pantalla
        // sigue funcionando con las medidas en bruto.
        leerKpis(modoDemo.current).catch(() => [] as Kpi[]),
      ])

      const clasificados: Sensor[] = brutos
        .map((s) => {
          const tipo = clasificar(s.codigo, s.nombre, s.unidad)
          const r = EN_REVISION[s.equipo.toUpperCase()]
          if (r && (!r.codigos || r.codigos.test(s.codigo))) {
            return {
              ...s,
              tipo,
              revision: r.motivo,
              estado: { clase: "neutro" as const, color: "var(--neutro)", etiqueta: "En revisión" },
            }
          }
          return { ...s, tipo, estado: evaluar(tipo, s.valor, s.exterior) }
        })
        // Ordenar por grupo es lo que hace eficiente la paginación: la
        // plataforma devuelve los sensores entremezclados, y cada corte de
        // página arrastraba entonces la cabecera de casi todos los grupos
        // más una fila a medias. Agrupados, cada página se llena.
        //
        // Dentro del grupo se ordena por equipo y no por magnitud: así cada
        // página enseña varios equipos con sus lecturas juntas, en vez de
        // dieciocho tarjetas seguidas de "Humedad relativa".
        .sort(
          (a, b) =>
            orden(a.tipo.grupo) - orden(b.tipo.grupo) ||
            a.nombre.localeCompare(b.nombre, "es", { numeric: true }) ||
            a.tipo.etiqueta.localeCompare(b.tipo.etiqueta, "es"),
        )

      const hasta = Date.now()
      const tocaHistorico = hasta - ultimoHistorico.current > CONFIG.minutosHistorico * 60000
      if (tocaHistorico) {
        ultimoHistorico.current = hasta
        const desde = hasta - CONFIG.horasHistorico * 3600000
        const series = await enTanda(clasificados.slice(0, 24), async (s) => {
          try {
            return [s.uuid, await leerHistorico(s, desde, hasta, modoDemo.current)] as const
          } catch {
            // Si falla uno, se conserva lo que ya había de ese sensor.
            return [s.uuid, historicosPrevios.current.get(s.uuid) ?? ([] as Punto[])] as const
          }
        })
        historicosPrevios.current = new Map(series)
        setHistoricos(historicosPrevios.current)
      }

      setSensores(clasificados)
      setKpis(indicadores)
      setConexion(modoDemo.current ? "demo" : "vivo")
      setInicioCiclo(Date.now())
      ultimoBueno.current = Date.now()
      if (!modoDemo.current) setAviso("")
      if (!tocaHistorico) return

      // Las series de varios días se piden aparte y sin bloquear el resto:
      // son las únicas que miran más allá de las últimas 24 h.
      const desdeDias = hasta - CONFIG.diasHistoricoKpi * 86400000
      const elegidos: Array<[PapelSerie, Kpi | undefined]> = [
        ["afluencia", elegirKpiAfluencia(indicadores)],
        ["agua", elegirKpiAgua(indicadores)],
      ]

      void Promise.all(
        elegidos.map(async ([papel, kpi]) => {
          if (!kpi) return [papel, [] as Punto[]] as const
          try {
            const serie = await leerHistoricoKpi(kpi, desdeDias, hasta, modoDemo.current)
            return [papel, depurarSerie(papel, serie, kpi)] as const
          } catch {
            return [papel, [] as Punto[]] as const
          }
        }),
      ).then((series) => setSeriesKpi(new Map(series)))

      if (hasta - ultimaSemana.current > CONFIG.minutosSemana * 60000) {
        ultimaSemana.current = hasta
        const sondas = clasificados.filter(
          (s) => s.tipo.id === "co2" && s.zona && !s.exterior && !s.revision && !s.matiz,
        )
        const desdeSemana = hasta - CONFIG.diasVentilacion * 86400000
        void enTanda(sondas, async (s) => {
          try {
            return [s.uuid, await leerHistorico(s, desdeSemana, hasta, modoDemo.current)] as const
          } catch {
            return [s.uuid, [] as Punto[]] as const
          }
        }).then((series) => setSemanaCo2(new Map(series)))
      }
    } catch (e) {
      console.error("[observatorio]", e)
      // Un fallo de conexión NO pasa nunca a datos simulados: antes bastaba un
      // solo corte para que la pantalla enseñara cifras inventadas hasta
      // recargarla. Ahora se quedan los últimos datos reales, se avisa y se
      // reintenta en el siguiente ciclo.
      setConexion("error")
      const desde = ultimoBueno.current
        ? new Date(ultimoBueno.current).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
        : ""
      setAviso(
        desde
          ? `Sin conexión con la plataforma desde las ${desde}. Se muestran los últimos datos recibidos y se reintenta cada minuto.`
          : "No se puede conectar con la plataforma de sensores. Se reintenta cada minuto.",
      )
    }
  }, [])

  useEffect(() => {
    if (modoDemo.current) {
      setAviso(
        "DATOS SIMULADOS. Esta pantalla todavía no está conectada a la plataforma IoT " +
          "del Palacio de Congresos: ninguna de las cifras mostradas es real.",
      )
    }
    void actualizar()
    const id = setInterval(() => void actualizar(), CONFIG.segundosRefresco * 1000)
    return () => clearInterval(id)
  }, [actualizar])

  // Mientras la pantalla siga en demostración no debe confundirse con datos
  // reales ni siquiera en la pestaña del navegador.
  useEffect(() => {
    const prefijo = conexion === "demo" ? "[DATOS SIMULADOS] " : ""
    document.title = `${prefijo}${CONFIG.titulo} · Observatorio IoT`
  }, [conexion])

  return {
    sensores,
    kpis,
    seriesKpi,
    historicos,
    semanaCo2,
    conexion,
    aviso,
    inicioCiclo,
    actualizar: () => void actualizar(),
  }
}
