import Chart from "chart.js/auto"
import { useEffect, useRef } from "react"

import { CONFIG } from "@/lib/config"
import { conAlfa, evaluar, hora, valorCss } from "@/lib/formato"
import type { Punto, Sensor } from "@/lib/tipos"
import { cn } from "@/lib/utils"

interface Props {
  sensor: Sensor | undefined
  serie: Punto[]
  total: number
  indice: number
  onPunto: (i: number) => void
}

export function GraficaCarrusel({ sensor, serie, total, indice, onPunto }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const grafica = useRef<Chart | null>(null)

  useEffect(() => {
    const ctx = lienzo.current?.getContext("2d")
    if (!ctx || !sensor || !serie.length) return

    const azul = valorCss("--primary")
    const rejilla = valorCss("--border", "#e4edf6")
    const suave = valorCss("--muted-foreground", "#5f7c96")
    const rojo = valorCss("--alerta-trazo", "#f15b62")

    // Los puntos fuera de umbral se marcan con forma (triángulo) además de
    // color: el color por sí solo no puede ser el único portador del dato.
    const fueraDeRango = serie.map((p) => evaluar(sensor.tipo, p.value).clase === "alerta")

    const degradado = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight || 260)
    degradado.addColorStop(0, conAlfa(azul, 0.38))
    degradado.addColorStop(1, conAlfa(azul, 0))

    grafica.current?.destroy()
    grafica.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: serie.map((p) => hora(p.timestamp)),
        datasets: [
          {
            data: serie.map((p) => p.value),
            borderColor: azul,
            backgroundColor: degradado,
            borderWidth: 2.4,
            fill: true,
            tension: 0.35,
            pointRadius: fueraDeRango.map((f) => (f ? 4.5 : 0)),
            pointStyle: fueraDeRango.map((f) => (f ? "triangle" : "circle")),
            pointBackgroundColor: rojo,
            pointBorderColor: rojo,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: {
            grid: { display: false },
            border: { color: rejilla },
            ticks: {
              color: suave,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
              font: { family: "Montserrat", size: 12, weight: 600 },
            },
          },
          y: {
            grid: { color: rejilla, drawTicks: false },
            border: { display: false },
            ticks: {
              color: suave,
              padding: 8,
              maxTicksLimit: 5,
              font: { family: "Montserrat", size: 12, weight: 600 },
            },
          },
        },
      },
    })

    return () => {
      grafica.current?.destroy()
      grafica.current = null
    }
  }, [sensor, serie])

  const unidad = sensor ? sensor.unidad || sensor.tipo.unidad || "" : ""

  return (
    <>
      <div className="truncate text-[calc(var(--u)*2.2)] font-bold leading-tight">
        {sensor ? sensor.tipo.etiqueta : "Sin histórico disponible"}
      </div>
      <div className="truncate text-[calc(var(--u)*1.35)] font-medium text-muted-foreground">
        {sensor
          ? `${sensor.nombre} · últimas ${CONFIG.horasHistorico} h${unidad ? ` · ${unidad}` : ""}`
          : ""}
      </div>

      {/* Altura mínima: sin ella la gráfica se aplasta a unos pocos píxeles
          cuando los otros paneles de la columna crecen.
          El canvas va en posición absoluta porque con maintainAspectRatio
          desactivado Chart.js lo agranda sin parar si participa del flujo. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <canvas ref={lienzo} className="absolute inset-0 !h-full !w-full" />
      </div>

      {total > 1 && (
        <div className="mt-[calc(var(--u)*1)] flex justify-center gap-[0.45em]">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPunto(i)}
              aria-label={`Ver gráfica ${i + 1} de ${total}`}
              aria-current={i === indice}
              className={cn(
                "h-[0.6em] cursor-pointer rounded-full transition-all duration-300",
                i === indice ? "w-[1.6em] bg-primary" : "w-[0.6em] bg-border",
              )}
            />
          ))}
        </div>
      )}
    </>
  )
}
