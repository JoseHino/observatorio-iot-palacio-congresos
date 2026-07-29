import Chart from "chart.js/auto"
import { useEffect, useRef } from "react"

import { SinDatos } from "@/components/carrusel/piezas"
import { valorCss } from "@/lib/formato"
import type { Punto } from "@/lib/tipos"

/**
 * Barras por día. Se usa para lo que se acumula a lo largo de la jornada
 * (accesos, agua): una línea sugeriría una magnitud continua que ahí no existe.
 */
export function GraficaDiaria({ serie, unidad }: { serie: Punto[]; unidad: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const grafica = useRef<Chart | null>(null)

  useEffect(() => {
    const ctx = lienzo.current?.getContext("2d")
    if (!ctx || !serie.length) return

    const azul = valorCss("--primary")
    const rejilla = valorCss("--border", "#e4edf6")
    const suave = valorCss("--muted-foreground", "#5f7c96")
    const cuerpo = Math.max(11, Math.round(window.innerHeight * 0.015))

    // El día en curso va aparte: todavía está sumando y compararlo de igual a
    // igual con los días cerrados haría pensar en una caída de actividad.
    const hoy = new Date().setHours(0, 0, 0, 0)
    const enCurso = serie.map((p) => new Date(p.timestamp).setHours(0, 0, 0, 0) >= hoy)

    grafica.current?.destroy()
    grafica.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: serie.map((p) =>
          new Date(p.timestamp).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
        ),
        datasets: [
          {
            data: serie.map((p) => p.value),
            backgroundColor: serie.map((_, i) => (enCurso[i] ? suave : azul)),
            borderRadius: 4,
            maxBarThickness: 46,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: suave, font: { size: cuerpo, weight: 600 }, maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: rejilla },
            ticks: {
              color: suave,
              font: { size: cuerpo, weight: 600 },
              callback: (v) => `${v} ${unidad}`.trim(),
            },
          },
        },
      },
    })

    return () => {
      grafica.current?.destroy()
      grafica.current = null
    }
  }, [serie, unidad])

  if (!serie.length) return <SinDatos texto="Aún no hay histórico suficiente" />

  // Canvas absoluto dentro de un contenedor acotado: con
  // maintainAspectRatio desactivado, Chart.js lo agranda sin parar si
  // participa del flujo normal.
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <canvas ref={lienzo} className="absolute inset-0 !h-full !w-full" />
    </div>
  )
}
