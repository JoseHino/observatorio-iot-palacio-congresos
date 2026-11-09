import { Minus, TrendingDown, TrendingUp } from "lucide-react"

import { Chispa } from "@/components/Chispa"
import { IconoSensor } from "@/components/IconoSensor"
import { Card } from "@/components/ui/card"
import { CONFIG } from "@/lib/config"
import { colorTrazo, hora, num } from "@/lib/formato"
import type { Punto, Sensor } from "@/lib/tipos"
import { cn } from "@/lib/utils"

type Tendencia =
  | { clase: "estable" }
  | { clase: "sube" | "baja"; texto: string }
  | null

/** Variación respecto a hace una hora. Devuelve null si no hay serie suficiente. */
function calcularTendencia(sensor: Sensor, serie: Punto[] | undefined): Tendencia {
  if (!serie || serie.length < 4 || sensor.valor === null) return null

  const limite = Date.now() - 3600000
  const previo = serie.filter((p) => p.timestamp <= limite).pop() ?? serie[0]
  const dif = sensor.valor - previo.value
  const base = Math.abs(previo.value) > 0.001 ? Math.abs(previo.value) : 1

  if (Math.abs(dif) / base < 0.01) return { clase: "estable" }
  return {
    clase: dif > 0 ? "sube" : "baja",
    texto: num(Math.abs(dif), Math.abs(dif) < 10 ? 1 : 0),
  }
}

function PieTarjeta({ sensor, serie }: { sensor: Sensor; serie: Punto[] | undefined }) {
  const t = calcularTendencia(sensor, serie)

  if (t === null) return <span>{sensor.ts ? hora(sensor.ts) : ""}</span>

  if (t.clase === "estable") {
    return (
      <span className="inline-flex items-center gap-1">
        <Minus className="size-[1.15em]" aria-hidden="true" />
        estable · 1 h
      </span>
    )
  }

  const Flecha = t.clase === "sube" ? TrendingUp : TrendingDown
  return (
    <span className="cifras inline-flex items-center gap-1">
      <Flecha className="size-[1.15em]" aria-hidden="true" />
      {t.texto} · 1 h
    </span>
  )
}

export function TarjetaSensor({ sensor, serie }: { sensor: Sensor; serie: Punto[] | undefined }) {
  const { tipo, estado } = sensor
  const desfasado = sensor.ts !== null && Date.now() - sensor.ts > CONFIG.minutosSinDatos * 60000
  const unidad = sensor.unidad || tipo.unidad || ""
  const cifra = sensor.valor === null ? "—" : num(sensor.valor, tipo.decimales ?? 1)

  return (
    <Card
      style={{ ["--color" as string]: estado.color }}
      className={cn(
        "relative flex min-h-[calc(var(--u)*12.5)] flex-col justify-between gap-[calc(var(--u)*0.55)]",
        "overflow-hidden px-[calc(var(--u)*1.4)] py-[calc(var(--u)*1.2)] shadow-[var(--sombra)]",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--color)]",
        desfasado && "opacity-50",
      )}
    >
      {/* Primero qué se mide y luego dónde: la plataforma nombra los equipos
          por número de serie, así que la magnitud es lo único que orienta
          a quien mira la pantalla de paso. */}
      <div className="flex items-center gap-[0.7em]">
        <IconoSensor
          id={tipo.id}
          className="size-[calc(var(--u)*2.5)] shrink-0 text-[var(--color)]"
        />
        <div className="min-w-0">
          {/* Dos líneas: a este ancho, "Humedad relativa" o "Nivel sonoro de
              fondo" no caben en una y truncados no se entienden. */}
          <div className="line-clamp-2 text-[calc(var(--u)*1.4)] font-semibold leading-[1.15]">
            {tipo.etiqueta}
            {sensor.matiz && (
              <span className="font-medium text-muted-foreground"> · {sensor.matiz}</span>
            )}
          </div>
          <div className="truncate text-[calc(var(--u)*1.25)] font-medium leading-tight text-muted-foreground">
            {sensor.nombre}
          </div>
        </div>
      </div>

      <div className="cifras flex items-baseline gap-[0.25em]">
        <span className="text-[calc(var(--u)*3.6)] font-bold leading-none tracking-tight">
          {cifra}
        </span>
        <span className="text-[calc(var(--u)*1.5)] font-semibold text-muted-foreground">
          {unidad}
        </span>
      </div>

      <Chispa serie={serie} color={colorTrazo(estado.clase)} />

      <div className="flex items-center justify-between gap-[0.6em] text-[calc(var(--u)*1.3)] font-medium text-muted-foreground">
        {estado.etiqueta ? (
          <span
            className="rounded-full px-[0.7em] py-[0.25em] text-[0.92em] font-bold text-[var(--color)]"
            style={{ background: "color-mix(in srgb, var(--color) 16%, transparent)" }}
            title={sensor.revision}
          >
            {estado.etiqueta}
          </span>
        ) : (
          <span />
        )}
        {desfasado ? <span>sin señal</span> : <PieTarjeta sensor={sensor} serie={serie} />}
      </div>
    </Card>
  )
}
