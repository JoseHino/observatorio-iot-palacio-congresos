import { useCallback, useEffect, useRef, useState } from "react"

import {
  enTanda,
  estaConfigurado,
  leerHistorico,
  leerHistoricoKpi,
  leerKpis,
  leerSensores,
} from "@/lib/api"
import { CONFIG, GRUPOS } from "@/lib/config"
import { clasificar, evaluar } from "@/lib/formato"
import type { EstadoConexion, Kpi, Punto, Sensor } from "@/lib/tipos"

interface Observatorio {
  sensores: Sensor[]
  kpis: Kpi[]
  /** Serie diaria de accesos al recinto, para la gráfica de afluencia. */
  serieAforo: Punto[]
  historicos: Map<string, Punto[]>
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

export function useObservatorio(): Observatorio {
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [serieAforo, setSerieAforo] = useState<Punto[]>([])
  const [historicos, setHistoricos] = useState<Map<string, Punto[]>>(new Map())
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
      const desde = hasta - CONFIG.horasHistorico * 3600000
      const series = await enTanda(clasificados.slice(0, 24), async (s) => {
        try {
          return [s.uuid, await leerHistorico(s, desde, hasta, modoDemo.current)] as const
        } catch {
          return [s.uuid, [] as Punto[]] as const
        }
      })

      setSensores(clasificados)
      setKpis(indicadores)
      setHistoricos(new Map(series))
      setConexion(modoDemo.current ? "demo" : "vivo")
      setInicioCiclo(Date.now())

      // La afluencia diaria se pide aparte y sin bloquear el resto: es la
      // única serie que mira varios días atrás.
      const aforo = elegirKpiAfluencia(indicadores)
      if (aforo) {
        leerHistoricoKpi(
          aforo,
          hasta - CONFIG.diasHistoricoKpi * 86400000,
          hasta,
          modoDemo.current,
        )
          .then(setSerieAforo)
          .catch(() => setSerieAforo([]))
      } else {
        setSerieAforo([])
      }
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e)
      console.error("[observatorio]", e)

      // Si la plataforma falla y el modo es 'auto', la pantalla no se queda
      // en blanco: cae a demostración avisando de que las cifras no son reales.
      if (CONFIG.modoDemo === "auto" && !modoDemo.current) {
        modoDemo.current = true
        setAviso(
          "La plataforma IoT no responde. La pantalla muestra datos de demostración " +
            "hasta recuperar la conexión.",
        )
        return actualizar()
      }

      setConexion("error")
      setAviso(`No se han podido leer los sensores: ${mensaje}. Se reintenta automáticamente.`)
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
    serieAforo,
    historicos,
    conexion,
    aviso,
    inicioCiclo,
    actualizar: () => void actualizar(),
  }
}
