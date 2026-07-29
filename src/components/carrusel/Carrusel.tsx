import { useMemo } from "react"

import { DIAPOSITIVAS, type DatosDiapositiva } from "@/components/carrusel/diapositivas"
import { useRotacion } from "@/hooks/usePantalla"
import { CONFIG } from "@/lib/config"
import { hora } from "@/lib/formato"
import type { EstadoConexion } from "@/lib/tipos"
import { cn } from "@/lib/utils"

interface Props extends DatosDiapositiva {
  conexion: EstadoConexion
  ahora: Date
  inicioCiclo: number
}

export function Carrusel({ sensores, kpis, seriesKpi, conexion, ahora, inicioCiclo }: Props) {
  const datos: DatosDiapositiva = useMemo(
    () => ({ sensores, kpis, seriesKpi }),
    [sensores, kpis, seriesKpi],
  )

  // Una diapositiva sin datos no se enseña vacía: se salta. Así la pantalla
  // aguanta que un equipo deje de reportar sin quedarse en blanco un turno.
  const visibles = useMemo(
    () => DIAPOSITIVAS.filter((d) => d.hayDatos(datos)),
    [datos],
  )

  const [indice] = useRotacion(visibles.length, CONFIG.segundosDiapositiva)
  const actual = visibles[indice % Math.max(1, visibles.length)]

  if (!actual) {
    return (
      <div className="grid h-full place-items-center">
        <p className="text-[calc(var(--u)*2.4)] font-semibold text-muted-foreground">
          Esperando datos de la plataforma…
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-[calc(var(--u)*4)] py-[calc(var(--u)*2.5)]">
      <header className="flex items-baseline justify-between gap-[calc(var(--u)*2)]">
        <div className="min-w-0">
          <h1 className="truncate text-[calc(var(--u)*4.6)] font-bold leading-tight tracking-tight">
            {actual.titulo}
          </h1>
          <p className="truncate text-[calc(var(--u)*1.9)] font-medium text-muted-foreground">
            {actual.subtitulo}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="cifras text-[calc(var(--u)*4)] font-bold leading-none tracking-tight">
            {ahora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-[calc(var(--u)*1.5)] font-medium text-muted-foreground">
            {CONFIG.titulo}
          </div>
        </div>
      </header>

      {/* key: reinicia la animación de entrada en cada cambio de diapositiva. */}
      <main
        key={actual.id}
        className="flex min-h-0 flex-1 flex-col gap-[calc(var(--u)*2.8)] pt-[calc(var(--u)*2.5)] [animation:entrada_.5s_ease-out]"
      >
        {actual.contenido(datos)}
      </main>

      <footer className="flex items-center gap-[calc(var(--u)*2)] pt-[calc(var(--u)*1.8)] text-[calc(var(--u)*1.4)] font-medium text-muted-foreground">
        <div className="flex gap-[0.5em]" aria-hidden="true">
          {visibles.map((d, i) => (
            <i
              key={d.id}
              className={cn(
                "block h-[calc(var(--u)*0.8)] rounded-full transition-all duration-500",
                i === indice % visibles.length
                  ? "w-[calc(var(--u)*3.2)] bg-primary"
                  : "w-[calc(var(--u)*0.8)] bg-border",
              )}
            />
          ))}
        </div>
        <span className="sr-only">
          Diapositiva {(indice % visibles.length) + 1} de {visibles.length}
        </span>
        <span className="flex-1" />
        <span>
          {conexion === "demo"
            ? "DATOS SIMULADOS · sin conexión con la plataforma"
            : "Fuente: plataforma IoTsens"}
        </span>
        <span className="cifras">Actualizado {hora(inicioCiclo)}</span>
      </footer>
    </div>
  )
}
