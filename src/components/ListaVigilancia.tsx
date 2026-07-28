import { SEVERIDAD, num } from "@/lib/formato"
import type { Sensor } from "@/lib/tipos"

/** Los seis indicadores que peor están, ordenados por severidad. */
export function ListaVigilancia({ sensores }: { sensores: Sensor[] }) {
  const vigilancia = [...sensores]
    .sort(
      (a, b) =>
        SEVERIDAD[b.estado.clase] - SEVERIDAD[a.estado.clase] ||
        a.nombre.localeCompare(b.nombre),
    )
    .slice(0, 6)

  if (!vigilancia.length) {
    return <p className="text-[calc(var(--u)*1.4)] text-muted-foreground">Sin datos todavía.</p>
  }

  return (
    <ul className="flex flex-col gap-[0.5em] overflow-hidden">
      {vigilancia.map((s) => (
        <li
          key={s.uuid}
          className="flex items-center gap-[0.7em] border-b border-border py-[0.45em] text-[calc(var(--u)*1.5)] font-medium last:border-b-0"
        >
          <span
            className="size-[0.7em] shrink-0 rounded-full"
            style={{ background: s.estado.color }}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{s.nombre}</span>
          {/* El estado va también en texto: el color no informa por sí solo. */}
          <span className="sr-only">{s.estado.etiqueta}</span>
          <span className="cifras font-bold">
            {s.valor === null ? "—" : num(s.valor, s.tipo.decimales ?? 1)}{" "}
            {s.unidad || s.tipo.unidad || ""}
          </span>
        </li>
      ))}
    </ul>
  )
}
