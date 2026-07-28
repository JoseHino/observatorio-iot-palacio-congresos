import { useCallback, useEffect, useRef, useState } from "react"

import { enTanda, estaConfigurado, leerHistorico, leerSensores } from "@/lib/api"
import { CONFIG } from "@/lib/config"
import { clasificar, evaluar } from "@/lib/formato"
import type { EstadoConexion, Punto, Sensor } from "@/lib/tipos"

interface Observatorio {
  sensores: Sensor[]
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

export function useObservatorio(): Observatorio {
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [historicos, setHistoricos] = useState<Map<string, Punto[]>>(new Map())
  const [conexion, setConexion] = useState<EstadoConexion>("cargando")
  const [aviso, setAviso] = useState("")
  const [inicioCiclo, setInicioCiclo] = useState(() => Date.now())

  // En una ref, no en estado: el ciclo debe poder consultarlo sin re-suscribirse.
  const modoDemo = useRef(forzarDemo())

  const actualizar = useCallback(async () => {
    try {
      const brutos = await leerSensores(modoDemo.current)
      const clasificados: Sensor[] = brutos.map((s) => {
        const tipo = clasificar(s.nombre, s.unidad)
        return { ...s, tipo, estado: evaluar(tipo, s.valor) }
      })

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
      setHistoricos(new Map(series))
      setConexion(modoDemo.current ? "demo" : "vivo")
      setInicioCiclo(Date.now())
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

  return { sensores, historicos, conexion, aviso, inicioCiclo, actualizar: () => void actualizar() }
}
