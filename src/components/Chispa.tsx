import type { Punto } from "@/lib/tipos"

/** Mini-serie dentro de la tarjeta: da contexto sin ocupar espacio. */
export function Chispa({ serie, color }: { serie: Punto[] | undefined; color: string }) {
  if (!serie || serie.length < 3) return null

  const vs = serie.map((p) => p.value)
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  const rango = max - min || 1
  const puntos = vs
    .map((v, i) => `${(i / (vs.length - 1)) * 100},${28 - ((v - min) / rango) * 26}`)
    .join(" ")

  return (
    <svg
      className="block w-full flex-[1_1_calc(var(--u)*3)] min-h-[calc(var(--u)*2.4)] max-h-[calc(var(--u)*6)] overflow-visible"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={puntos}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.85}
      />
    </svg>
  )
}
