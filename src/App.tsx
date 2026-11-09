import { TriangleAlert } from "lucide-react"
import { useCallback, useMemo, useState, type ReactNode } from "react"

import { BandaCifras } from "@/components/BandaCifras"
import { Carrusel } from "@/components/carrusel/Carrusel"
import { GraficaCarrusel } from "@/components/GraficaCarrusel"
import { PanelAforo } from "@/components/PanelAforo"
import { PanelResumen } from "@/components/PanelResumen"
import { RejillaSensores } from "@/components/RejillaSensores"
import { Card } from "@/components/ui/card"
import { Hero195 } from "@/components/ui/hero-195"
import { useObservatorio } from "@/hooks/useObservatorio"
import { useAtajos, useReloj, useRotacion, useTema, useVista } from "@/hooks/usePantalla"
import { CONFIG } from "@/lib/config"
import { hora } from "@/lib/formato"
import type { Sensor } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/** Qué indicadores merecen gráfica destacada, por orden de interés público. */
const PRIORIDAD = ["aforo", "co2", "temperatura", "potencia", "ruido", "humedad", "pm25", "energia"]

function Panel({ titulo, children, className }: {
  titulo: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col p-[calc(var(--u)*1.8)] shadow-[var(--sombra)]",
        className,
      )}
    >
      <h2 className="mb-[0.35em] text-[calc(var(--u)*1.45)] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {titulo}
      </h2>
      {children}
    </Card>
  )
}

export default function App() {
  const { sensores, kpis, seriesKpi, historicos, semanaCo2, conexion, aviso, inicioCiclo, actualizar } =
    useObservatorio()
  const ahora = useReloj()
  const [, alternarTema] = useTema()
  const [vista, alternarVista] = useVista()
  const [totalPaginas, setTotalPaginas] = useState(1)

  const candidatos: Sensor[] = useMemo(
    () =>
      sensores
        .filter((s) => (historicos.get(s.uuid) ?? []).length > 2)
        .sort((a, b) => {
          const pa = PRIORIDAD.indexOf(a.tipo.id)
          const pb = PRIORIDAD.indexOf(b.tipo.id)
          return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb)
        })
        .slice(0, CONFIG.maxGraficas),
    [sensores, historicos],
  )

  const [iGrafica, moverGrafica] = useRotacion(candidatos.length, CONFIG.segundosCarrusel)
  const [iPagina, moverPagina] = useRotacion(totalPaginas, CONFIG.segundosPagina)

  useAtajos({
    siguienteGrafica: () => moverGrafica(1),
    anteriorGrafica: () => moverGrafica(-1),
    siguientePagina: () => moverPagina(1),
    anteriorPagina: () => moverPagina(-1),
    refrescar: actualizar,
    alternarTema,
    alternarVista,
  })

  const alTotalPaginas = useCallback((n: number) => setTotalPaginas(n), [])
  const sensorGrafica = candidatos[iGrafica]

  // Vista por defecto en la pantalla del vestíbulo: una cosa cada vez y
  // cifras grandes. El cuadro de mando completo queda a una tecla (P).
  if (vista === "carrusel") {
    return (
      <Carrusel
        sensores={sensores}
        kpis={kpis}
        seriesKpi={seriesKpi}
        semanaCo2={semanaCo2}
        conexion={conexion}
        ahora={ahora}
        inicioCiclo={inicioCiclo}
      />
    )
  }

  return (
    // h-full fija la pantalla al monitor (señalética, sin scroll). En vertical
    // o estrecho se libera para que la página fluya y se pueda desplazar.
    <div className="flex h-full flex-col max-[1100px]:h-auto max-[1100px]:min-h-full">
      <Hero195
        titulo={CONFIG.titulo}
        subtitulo={CONFIG.subtitulo}
        conexion={conexion}
        ahora={ahora}
      />

      {aviso && (
        <div
          role="alert"
          className="mx-[calc(var(--u)*2.6)] mt-[calc(var(--u)*2)] flex items-center gap-[0.8em] rounded-[var(--radius)] border px-[calc(var(--u)*1.8)] py-[calc(var(--u)*1.4)] text-[calc(var(--u)*1.55)] font-semibold"
          style={{
            borderColor: "color-mix(in srgb, var(--aviso) 40%, transparent)",
            background: "color-mix(in srgb, var(--aviso) 12%, transparent)",
          }}
        >
          <TriangleAlert
            className="size-[calc(var(--u)*2.4)] shrink-0 text-[var(--aviso)]"
            strokeWidth={1.8}
          />
          {aviso}
        </div>
      )}

      {/* Los indicadores agregados son la única capa de datos que sabe dónde
          está cada cosa, así que abren la pantalla. */}
      <div className="px-[calc(var(--u)*2.6)] pt-[calc(var(--u)*2)]">
        <BandaCifras kpis={kpis} />
      </div>

      <main className="grid min-h-0 flex-1 gap-[calc(var(--u)*2)] px-[calc(var(--u)*2.6)] py-[calc(var(--u)*2)] [grid-template-columns:1fr_minmax(360px,31%)] max-[1100px]:grid-cols-1 max-[1100px]:overflow-y-auto">
        <RejillaSensores
          sensores={sensores}
          historicos={historicos}
          pagina={iPagina}
          onTotalPaginas={alTotalPaginas}
        />

        {/* Filas explícitas: accesos y estado de la red ocupan lo suyo y la
            gráfica se queda con el resto. Con flex, la gráfica pedía más alto
            del disponible y se desbordaba sobre el panel de abajo.
            Tres paneles como máximo: con cuatro, el contenido se recortaba
            y el de accesos llegaba a enseñar una sola fila. */}
        <aside className="grid min-h-0 gap-[calc(var(--u)*1.5)] [grid-template-rows:auto_minmax(calc(var(--u)*22),1fr)_auto] max-[1100px]:flex max-[1100px]:flex-col">
          <Panel
            titulo="Accesos de hoy por punto de paso"
            className="min-h-0 overflow-hidden max-[1100px]:overflow-visible"
          >
            <PanelAforo kpis={kpis} />
          </Panel>

          <Panel
            titulo="Evolución"
            className="min-h-0 overflow-hidden max-[1100px]:h-[45vh]"
          >
            <GraficaCarrusel
              sensor={sensorGrafica}
              serie={sensorGrafica ? (historicos.get(sensorGrafica.uuid) ?? []) : []}
              total={candidatos.length}
              indice={iGrafica}
              onPunto={(i) => moverGrafica(i - iGrafica)}
            />
          </Panel>

          <Panel titulo="Estado de la red de sensores">
            <PanelResumen sensores={sensores} />
          </Panel>
        </aside>
      </main>

      <footer className="flex flex-wrap items-center gap-x-[1.4vw] gap-y-2 border-t border-border bg-card/70 px-[calc(var(--u)*2.6)] py-[calc(var(--u)*1.2)] text-[calc(var(--u)*1.4)] font-medium text-muted-foreground backdrop-blur-sm max-[700px]:text-[12px]">
        <span>Fuente: plataforma IoTsens · Palacio de Congresos de Marbella</span>
        <span className="flex-1" />
        {totalPaginas > 1 && (
          <span>
            Indicadores {(iPagina % totalPaginas) + 1} de {totalPaginas}
          </span>
        )}
        <span className="cifras">Actualizado {hora(inicioCiclo)}</span>
        <div className="h-[5px] w-[12vw] min-w-[60px] overflow-hidden rounded-full bg-border">
          {/* La clave reinicia la animación en cada ciclo de refresco. */}
          <i
            key={inicioCiclo}
            className="block h-full rounded-full bg-primary"
            style={{ animation: `barra ${CONFIG.segundosRefresco}s linear forwards` }}
          />
        </div>
      </footer>
    </div>
  )
}
