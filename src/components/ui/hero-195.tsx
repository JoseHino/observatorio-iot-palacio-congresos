import { Building2 } from "lucide-react"

import { BorderBeam } from "@/components/ui/border-beam"
import { fechaLarga } from "@/lib/formato"
import type { EstadoConexion } from "@/lib/tipos"
import { cn } from "@/lib/utils"

interface Hero195Props {
  titulo: string
  subtitulo: string
  conexion: EstadoConexion
  ahora: Date
}

const ROTULO: Record<EstadoConexion, string> = {
  vivo: "Datos en vivo",
  demo: "Modo demostración",
  error: "Sin conexión con la plataforma",
  cargando: "Conectando…",
}

const COLOR_PUNTO: Record<EstadoConexion, string> = {
  vivo: "var(--ok)",
  demo: "var(--aviso)",
  error: "var(--alerta)",
  cargando: "var(--neutro)",
}

/**
 * Banda superior de la pantalla: identidad del recinto, estado de la
 * conexión y reloj.
 *
 * El haz animado (BorderBeam) aparece SOLO cuando entran datos reales.
 * Es deliberado: una animación debe expresar una relación causa-efecto,
 * no decorar. Si la plataforma cae o la pantalla está en demostración,
 * el haz desaparece y eso ya es información en sí mismo.
 */
export function Hero195({ titulo, subtitulo, conexion, ahora }: Hero195Props) {
  const enVivo = conexion === "vivo"

  // flex-wrap: en pantalla estrecha la banda se reparte en dos líneas en vez
  // de desbordar horizontalmente.
  return (
    <header className="flex flex-wrap items-center gap-x-[2vw] gap-y-[calc(var(--u)*1.2)] border-b border-border bg-card/70 px-[calc(var(--u)*2.6)] py-[calc(var(--u)*2)] backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 items-center gap-[1.1vw]">
        <div className="grid size-[calc(var(--u)*5.4)] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[#1560a8] shadow-lg shadow-primary/30">
          <Building2 className="size-[62%] text-primary-foreground" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[calc(var(--u)*2.9)] font-bold leading-tight tracking-tight max-[700px]:text-[18px]">
            {titulo}
          </h1>
          <p className="truncate text-[calc(var(--u)*1.65)] font-medium text-muted-foreground max-[700px]:text-[13px]">
            {subtitulo}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "relative flex items-center gap-[0.6vw] whitespace-nowrap rounded-full border border-border",
          "bg-card px-[1.15em] py-[0.7em] text-[calc(var(--u)*1.55)] font-semibold",
          "shadow-[var(--sombra)]",
        )}
        role="status"
        aria-live="polite"
      >
        {enVivo && <BorderBeam size={70} duration={6} colorFrom="#1a8fe3" colorTo="#35c99a" />}
        <span
          className={cn("size-[0.75em] rounded-full", conexion !== "error" && "animate-latido")}
          style={{ background: COLOR_PUNTO[conexion], color: COLOR_PUNTO[conexion] }}
          aria-hidden="true"
        />
        {ROTULO[conexion]}
      </div>

      <div className="whitespace-nowrap text-right">
        <div className="cifras text-[calc(var(--u)*3.4)] font-bold leading-none max-[700px]:text-[22px]">
          {ahora.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-[calc(var(--u)*1.5)] font-medium text-muted-foreground max-[700px]:text-[12px]">
          {fechaLarga(ahora)}
        </div>
      </div>
    </header>
  )
}
