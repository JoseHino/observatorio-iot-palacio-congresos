import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { num } from "@/lib/formato"
import type { Kpi } from "@/lib/tipos"

interface Props {
  kpis: Kpi[]
  /** Cuántos puntos de paso se listan. El resto se resume en el pie. */
  maximo?: number
}

interface Punto {
  lugar: string
  entradas: number | null
  salidas: number | null
}

/**
 * Cruza accesos y salidas del día por punto de paso.
 *
 * Se descartan los indicadores marcados como total: la plataforma publica
 * tanto las puertas sueltas (PREHALL_1, PREHALL_2) como su suma
 * (PREHALL_TOTAL), y contar ambas duplicaría el tránsito.
 */
export function puntosDePaso(kpis: Kpi[]): Punto[] {
  const diarios = kpis.filter((k) => k.periodo === "DAILY" && !k.esTotal)
  const lugares = new Map<string, Punto>()

  for (const k of diarios) {
    if (k.familia !== "accesos" && k.familia !== "salidas") continue
    const punto = lugares.get(k.etiqueta) ?? { lugar: k.etiqueta, entradas: null, salidas: null }
    if (k.familia === "accesos") punto.entradas = k.valor
    else punto.salidas = k.valor
    lugares.set(k.etiqueta, punto)
  }

  return [...lugares.values()].sort(
    (a, b) => (b.entradas ?? 0) + (b.salidas ?? 0) - ((a.entradas ?? 0) + (a.salidas ?? 0)),
  )
}

export function PanelAforo({ kpis, maximo: cuantos = 7 }: Props) {
  const todos = puntosDePaso(kpis)

  if (!todos.length) {
    return (
      <p className="text-[calc(var(--u)*1.5)] font-medium text-muted-foreground">
        La plataforma no está publicando indicadores de acceso.
      </p>
    )
  }

  const puntos = todos.slice(0, cuantos)
  const ocultos = todos.length - puntos.length
  const tope = Math.max(1, ...puntos.map((p) => Math.max(p.entradas ?? 0, p.salidas ?? 0)))

  return (
    <div className="flex min-h-0 flex-col gap-[calc(var(--u)*0.9)] overflow-hidden">
      <div className="flex items-center justify-end gap-[1.2em] text-[calc(var(--u)*1.2)] font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-[0.3em]">
          <ArrowUpRight className="size-[1.2em] text-[var(--ok-trazo)]" aria-hidden="true" />
          entradas
        </span>
        <span className="inline-flex items-center gap-[0.3em]">
          <ArrowDownRight className="size-[1.2em] text-[var(--neutro)]" aria-hidden="true" />
          salidas
        </span>
      </div>

      {puntos.map((p) => (
        <div key={p.lugar} className="grid grid-cols-[1fr_auto] items-center gap-x-[0.8em]">
          <span className="truncate text-[calc(var(--u)*1.4)] font-semibold">{p.lugar}</span>
          <span className="cifras text-[calc(var(--u)*1.4)] font-bold tabular-nums">
            <span className="text-[var(--ok-trazo)]">
              {p.entradas === null ? "—" : num(p.entradas, 0)}
            </span>
            <span className="px-[0.35em] font-medium text-muted-foreground">/</span>
            <span className="text-muted-foreground">
              {p.salidas === null ? "—" : num(p.salidas, 0)}
            </span>
          </span>

          {/* Dos barras finas: el color no informa por sí solo, siempre va
              acompañado de la cifra y de la leyenda de arriba. */}
          <div className="col-span-2 flex flex-col gap-[2px]">
            <i
              className="block h-[3px] rounded-full bg-[var(--ok-trazo)]"
              style={{ width: `${((p.entradas ?? 0) / tope) * 100}%` }}
            />
            <i
              className="block h-[3px] rounded-full bg-[var(--neutro)]"
              style={{ width: `${((p.salidas ?? 0) / tope) * 100}%` }}
            />
          </div>
        </div>
      ))}

      {ocultos > 0 && (
        <p className="text-[calc(var(--u)*1.2)] font-medium text-muted-foreground">
          y {ocultos} {ocultos === 1 ? "punto más" : "puntos más"} con menos movimiento
        </p>
      )}
    </div>
  )
}
