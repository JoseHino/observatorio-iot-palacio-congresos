import { Droplets, DoorOpen, Footprints, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { puntosDePaso } from "@/components/PanelAforo"
import { Card } from "@/components/ui/card"
import { num } from "@/lib/formato"
import type { Kpi } from "@/lib/tipos"

interface Cifra {
  clave: string
  icono: LucideIcon
  etiqueta: string
  detalle: string
  valor: number | null
  unidad: string
}

const buscar = (kpis: Kpi[], patron: RegExp): Kpi | undefined =>
  kpis.find((k) => k.periodo === "DAILY" && patron.test(k.nombre))

/**
 * Cifras del día.
 *
 * Deliberadamente NO se publica una "ocupación actual" restando salidas de
 * entradas: los contadores son de punto de paso, incluyen escaleras y salas
 * interiores, y las salidas registradas superan a las entradas, así que esa
 * resta daría un aforo negativo. Se muestra el tránsito, que es lo que los
 * sensores miden de verdad.
 */
export function cifrasDelDia(kpis: Kpi[]): Cifra[] {
  const puertaPrincipal = buscar(kpis, /^ACCESOS_DIARIO_PUERTA_HALL_TOTAL$/)
  const prehall = buscar(kpis, /^ACCESOS_DIARIOS?_PREHALL_TOTAL$/)
  const agua = buscar(kpis, /AGUA/)

  const puntos = puntosDePaso(kpis)
  const transito = puntos.reduce((t, p) => t + (p.entradas ?? 0) + (p.salidas ?? 0), 0)

  return [
    {
      clave: "principal",
      icono: DoorOpen,
      etiqueta: "Entradas por la puerta principal",
      detalle: "Hall · en lo que va de día",
      valor: puertaPrincipal?.valor ?? null,
      unidad: "personas",
    },
    {
      clave: "prehall",
      icono: Users,
      etiqueta: "Entradas por el prehall",
      detalle: "Accesos 1 y 2 · en lo que va de día",
      valor: prehall?.valor ?? null,
      unidad: "personas",
    },
    {
      clave: "transito",
      icono: Footprints,
      etiqueta: "Tránsito registrado",
      detalle: `Entradas y salidas en ${puntos.length} puntos de paso`,
      valor: puntos.length ? transito : null,
      unidad: "pasos",
    },
    {
      clave: "agua",
      icono: Droplets,
      etiqueta: "Consumo de agua",
      detalle: "Contador general · en lo que va de día",
      valor: agua?.valor ?? null,
      unidad: "litros",
    },
  ]
}

export function BandaCifras({ kpis }: { kpis: Kpi[] }) {
  const cifras = cifrasDelDia(kpis)

  return (
    <div className="grid gap-[calc(var(--u)*1.4)] [grid-template-columns:repeat(auto-fit,minmax(calc(var(--u)*24),1fr))]">
      {cifras.map((c) => (
        <Card
          key={c.clave}
          className="flex items-center gap-[calc(var(--u)*1.4)] px-[calc(var(--u)*1.8)] py-[calc(var(--u)*1.4)] shadow-[var(--sombra)]"
        >
          <c.icono
            className="size-[calc(var(--u)*3.2)] shrink-0 text-primary"
            strokeWidth={1.6}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="truncate text-[calc(var(--u)*1.35)] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {c.etiqueta}
            </div>
            <div className="cifras flex items-baseline gap-[0.3em]">
              <span className="text-[calc(var(--u)*3.4)] font-bold leading-tight tracking-tight">
                {c.valor === null ? "—" : num(c.valor, 0)}
              </span>
              <span className="text-[calc(var(--u)*1.4)] font-semibold text-muted-foreground">
                {c.unidad}
              </span>
            </div>
            <div className="truncate text-[calc(var(--u)*1.2)] font-medium text-muted-foreground">
              {c.detalle}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
