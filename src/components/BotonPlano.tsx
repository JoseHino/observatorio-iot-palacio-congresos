import { Box } from "lucide-react"

/** Enlace al plano 3D con cada sensor en su punto (public/mapa, fuera de Vite). */
export function BotonPlano() {
  return (
    <a
      href="./mapa/"
      className="inline-flex items-center gap-[0.5em] rounded-full bg-primary px-[1em] py-[0.45em] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Box className="size-[1.2em]" strokeWidth={2} aria-hidden="true" />
      Plano 3D de sensores
    </a>
  )
}
