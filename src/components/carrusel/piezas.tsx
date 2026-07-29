/* Piezas compartidas por las diapositivas.

   Todo va dimensionado en `--u` (1vh), no en píxeles: la pantalla del
   vestíbulo se ve desde varios metros y el tamaño tiene que escalar con el
   alto real del monitor, no con la resolución. */

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { num } from "@/lib/formato"
import type { Sensor } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/** Cifra grande de titular. Es lo único legible desde el fondo del vestíbulo. */
export function CifraGrande({
  valor,
  unidad,
  etiqueta,
  detalle,
  decimales = 0,
  icono: Icono,
}: {
  valor: number | null
  unidad: string
  etiqueta: string
  detalle?: string
  decimales?: number
  icono?: LucideIcon
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[0.15em]">
      <div className="flex items-center gap-[0.5em] text-[calc(var(--u)*1.7)] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {Icono && <Icono className="size-[1.5em] shrink-0" strokeWidth={1.7} aria-hidden="true" />}
        <span className="truncate">{etiqueta}</span>
      </div>
      <div className="cifras flex items-baseline gap-[0.2em]">
        <span className="text-[calc(var(--u)*8)] font-bold leading-[0.95] tracking-tight">
          {valor === null ? "—" : num(valor, decimales)}
        </span>
        <span className="text-[calc(var(--u)*2.4)] font-semibold text-muted-foreground">
          {unidad}
        </span>
      </div>
      {detalle && (
        <div className="truncate text-[calc(var(--u)*1.5)] font-medium text-muted-foreground">
          {detalle}
        </div>
      )}
    </div>
  )
}

/** Fila de titulares. Con más de cuatro, las cifras dejan de leerse de lejos. */
export function FilaCifras({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-[calc(var(--u)*2.5)] [grid-template-columns:repeat(auto-fit,minmax(calc(var(--u)*26),1fr))]">
      {children}
    </div>
  )
}

/**
 * Tarjeta media: una lectura concreta.
 *
 * Qué se pone de título depende de qué distingue a las tarjetas entre sí. En
 * una rejilla de nueve sondas de CO₂ lo que distingue es el equipo; en una de
 * la estación meteorológica, donde el equipo es siempre el mismo, la magnitud.
 */
export function Lectura({
  sensor,
  rotular = "equipo",
}: {
  sensor: Sensor
  rotular?: "equipo" | "magnitud"
}) {
  const unidad = sensor.unidad || sensor.tipo.unidad || ""
  const titulo =
    rotular === "magnitud"
      ? sensor.tipo.etiqueta + (sensor.matiz ? ` (${sensor.matiz})` : "")
      : sensor.nombre

  return (
    <Card
      style={{ ["--color" as string]: sensor.estado.color }}
      className={cn(
        // Centrado y no repartido a los extremos: cuando la tarjeta se estira
        // para llenar la diapositiva, `justify-between` dejaba el rótulo
        // arriba del todo y la cifra abajo, con un vacío enorme en medio.
        "relative flex flex-col justify-center gap-[calc(var(--u)*0.5)] overflow-hidden",
        "px-[calc(var(--u)*1.8)] py-[calc(var(--u)*1.5)] shadow-[var(--sombra)]",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--color)]",
      )}
    >
      <div className="truncate text-[calc(var(--u)*1.8)] font-semibold text-muted-foreground">
        {titulo}
      </div>
      <div className="cifras flex items-baseline gap-[0.2em]">
        <span className="text-[calc(var(--u)*5.4)] font-bold leading-none tracking-tight">
          {sensor.valor === null ? "—" : num(sensor.valor, sensor.tipo.decimales ?? 1)}
        </span>
        <span className="text-[calc(var(--u)*2)] font-semibold text-muted-foreground">
          {unidad}
        </span>
      </div>
      {sensor.estado.etiqueta && (
        <span
          className="w-fit rounded-full px-[0.7em] py-[0.2em] text-[calc(var(--u)*1.4)] font-bold text-[var(--color)]"
          style={{ background: "color-mix(in srgb, var(--color) 16%, transparent)" }}
        >
          {sensor.estado.etiqueta}
        </span>
      )}
    </Card>
  )
}

/**
 * Cuántas columnas para que la rejilla quede equilibrada.
 *
 * `auto-fit` reparte por ancho disponible y deja filas cojas (siete tarjetas
 * arriba y dos abajo con nueve sensores). Fijando las columnas según cuántos
 * hay, las filas salen parejas y las tarjetas llenan la pantalla.
 */
function columnasPara(n: number): number {
  if (n <= 4) return n
  if (n <= 9) return 3
  if (n <= 12) return 4
  return 5
}

/** Rejilla de lecturas que se reparte todo el espacio que le quede. */
export function RejillaLecturas({
  sensores,
  rotular,
}: {
  sensores: Sensor[]
  rotular?: "equipo" | "magnitud"
}) {
  if (!sensores.length) return <SinDatos />

  const columnas = columnasPara(sensores.length)
  const filas = Math.ceil(sensores.length / columnas)

  return (
    // Las filas se reparten el alto (1fr) pero con un tope: con cuatro
    // tarjetas, dejarlas crecer a placer daba fichas de media pantalla con la
    // cifra perdida en medio. `my-auto` centra lo que sobre.
    <div
      className="my-auto grid min-h-0 flex-1 gap-[calc(var(--u)*1.6)] [grid-auto-rows:1fr]"
      style={{
        gridTemplateColumns: `repeat(${columnas}, 1fr)`,
        maxHeight: `calc(var(--u) * ${filas * 24})`,
      }}
    >
      {sensores.map((s) => (
        <Lectura key={s.uuid} sensor={s} rotular={rotular} />
      ))}
    </div>
  )
}

export function SinDatos({ texto = "La plataforma no está publicando estos datos ahora mismo" }) {
  return (
    <div className="grid flex-1 place-items-center">
      <p className="text-[calc(var(--u)*2)] font-semibold text-muted-foreground">{texto}</p>
    </div>
  )
}

/** Barras comparativas con la cifra siempre al lado: el color no informa solo. */
export function Barras({
  filas,
}: {
  filas: Array<{ clave: string; etiqueta: string; a: number | null; b?: number | null }>
}) {
  if (!filas.length) return <SinDatos />
  const tope = Math.max(1, ...filas.map((f) => Math.max(f.a ?? 0, f.b ?? 0)))

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-[calc(var(--u)*1.6)]">
      {filas.map((f) => (
        <div key={f.clave} className="grid grid-cols-[1fr_auto] items-center gap-x-[1em]">
          <span className="truncate text-[calc(var(--u)*2)] font-semibold">{f.etiqueta}</span>
          <span className="cifras text-[calc(var(--u)*2)] font-bold tabular-nums">
            <span className="text-[var(--ok-trazo)]">{f.a === null ? "—" : num(f.a, 0)}</span>
            {f.b !== undefined && (
              <>
                <span className="px-[0.3em] font-medium text-muted-foreground">/</span>
                <span className="text-muted-foreground">{f.b === null ? "—" : num(f.b, 0)}</span>
              </>
            )}
          </span>
          <div className="col-span-2 flex flex-col gap-[3px]">
            <i
              className="block h-[calc(var(--u)*0.6)] rounded-full bg-[var(--ok-trazo)]"
              style={{ width: `${((f.a ?? 0) / tope) * 100}%` }}
            />
            {f.b !== undefined && (
              <i
                className="block h-[calc(var(--u)*0.6)] rounded-full bg-[var(--neutro)]"
                style={{ width: `${((f.b ?? 0) / tope) * 100}%` }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
