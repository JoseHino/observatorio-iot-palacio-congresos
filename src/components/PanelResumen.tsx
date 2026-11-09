import { CONFIG } from "@/lib/config"
import { hora } from "@/lib/formato"
import type { Sensor } from "@/lib/tipos"

function Dato({ etiqueta, valor, sufijo, color }: {
  etiqueta: string
  valor: string | number
  sufijo?: string
  color?: string
}) {
  return (
    <div className="rounded-[10px] bg-muted px-[calc(var(--u)*1)] py-[calc(var(--u)*0.9)]">
      <div className="text-[calc(var(--u)*1.05)] font-semibold uppercase leading-tight tracking-[0.04em] text-muted-foreground">
        {etiqueta}
      </div>
      <div
        className="cifras text-[calc(var(--u)*2.2)] font-bold leading-tight"
        style={color ? { color } : undefined}
      >
        {valor}
        {sufijo && <span className="text-[0.55em] text-muted-foreground">{sufijo}</span>}
      </div>
    </div>
  )
}

export function PanelResumen({ sensores }: { sensores: Sensor[] }) {
  const conValor = sensores.filter((s) => s.valor !== null)
  const enLinea = conValor.filter(
    (s) => !s.ts || Date.now() - s.ts <= CONFIG.minutosSinDatos * 60000,
  )
  const optimos = sensores.filter((s) => s.estado.clase === "ok").length
  // Lo que está fuera de rango y lo que está en revisión (fallo comprobado
  // en la plataforma) requiere atención por igual.
  const avisos = sensores.filter(
    (s) => s.revision || (s.estado.clase !== "ok" && s.estado.clase !== "neutro"),
  ).length
  const ultima = Math.max(0, ...sensores.map((s) => s.ts ?? 0))

  return (
    // Cuatro columnas y no dos: en la columna lateral el alto es el recurso
    // escaso, y esta fila se lo estaba quitando al panel de accesos.
    <div className="grid grid-cols-4 gap-[calc(var(--u)*0.9)] max-[1100px]:grid-cols-2">
      <Dato etiqueta="Sensores en línea" valor={enLinea.length} sufijo={` / ${sensores.length}`} />
      <Dato etiqueta="Última lectura" valor={ultima ? hora(ultima) : "—"} />
      <Dato etiqueta="En rango óptimo" valor={optimos} color="var(--ok)" />
      <Dato
        etiqueta="Requieren atención"
        valor={avisos}
        color={avisos ? "var(--aviso)" : undefined}
      />
    </div>
  )
}
