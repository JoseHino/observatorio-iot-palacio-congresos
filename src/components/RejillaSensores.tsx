import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { TarjetaSensor } from "@/components/TarjetaSensor"
import { GRUPOS } from "@/lib/config"
import type { Punto, Sensor } from "@/lib/tipos"
import { cn } from "@/lib/utils"

interface Props {
  sensores: Sensor[]
  historicos: Map<string, Punto[]>
  pagina: number
  /** Se avisa hacia arriba del total de páginas, para el pie y la rotación. */
  onTotalPaginas: (total: number) => void
}

const esApaisada = () =>
  window.matchMedia("(min-aspect-ratio: 1/1)").matches && window.innerWidth > 1100

export function RejillaSensores({ sensores, historicos, pagina, onTotalPaginas }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)

  /* En una pantalla pública no vale recortar ni poner scroll: si hay más
     sensores de los que caben, se reparten en páginas que van rotando.
     null = "aún no medido, se pintan todas". */
  const [capacidad, setCapacidad] = useState<number | null>(null)
  const [paginar, setPaginar] = useState(esApaisada)
  /** Se incrementa al redimensionar, para forzar un repintado que vuelva a medir. */
  const [version, setVersion] = useState(0)

  /* Qué escenario se midió por última vez. Usar una firma —y no un efecto que
     "resetea"— evita que el efecto pasivo del cambio de sensores machaque el
     valor que acaba de calcular el efecto de layout. */
  const firma = useRef("")
  const correcciones = useRef(0)

  const porPagina = Math.max(1, capacidad ?? sensores.length)
  const totalPaginas = paginar ? Math.max(1, Math.ceil(sensores.length / porPagina)) : 1
  const indice = pagina % totalPaginas
  const visibles = paginar
    ? sensores.slice(indice * porPagina, indice * porPagina + porPagina)
    : sensores

  useEffect(() => {
    onTotalPaginas(totalPaginas)
  }, [totalPaginas, onTotalPaginas])

  useEffect(() => {
    let temp: ReturnType<typeof setTimeout>
    const alRedimensionar = () => {
      clearTimeout(temp)
      temp = setTimeout(() => {
        setPaginar(esApaisada())
        setVersion((v) => v + 1)
      }, 400)
    }
    window.addEventListener("resize", alRedimensionar)
    return () => {
      clearTimeout(temp)
      window.removeEventListener("resize", alRedimensionar)
    }
  }, [])

  /* Cuántas tarjetas caben. Se mide una vez el alto real de una cabecera, de
     una tarjeta y de los huecos, y a partir de ahí se calcula: así no hay que
     encoger de una en una repintando la pantalla decenas de veces.
     Las medidas son por elemento, así que valen aunque ya se esté pintando
     una página recortada. */
  useLayoutEffect(() => {
    const el = contenedor.current
    if (!el || !paginar || sensores.length < 2) return

    const escenario = `${sensores.length}|${window.innerWidth}x${window.innerHeight}|${version}`
    if (firma.current === escenario) return

    const seccion = el.querySelector("section")
    const cabecera = seccion?.querySelector("h2")
    const rejilla = el.querySelector<HTMLElement>("[data-rejilla]")
    const tarjeta = rejilla?.firstElementChild as HTMLElement | null | undefined
    if (!seccion || !cabecera || !rejilla || !tarjeta) return

    const estiloRejilla = getComputedStyle(rejilla)
    const columnas = Math.max(
      1,
      estiloRejilla.gridTemplateColumns.split(" ").filter(Boolean).length,
    )
    const altoTarjeta = tarjeta.offsetHeight
    const altoCabecera = cabecera.offsetHeight
    const gapTarjetas = parseFloat(estiloRejilla.rowGap) || 0
    const gapCabecera = parseFloat(getComputedStyle(seccion).rowGap) || 0
    const gapSeccion = parseFloat(getComputedStyle(el).rowGap) || 0
    const disponible = el.clientHeight
    if (!altoTarjeta || !disponible) return

    /** Alto que ocuparían las n primeras tarjetas, con sus títulos de grupo. */
    const altoDe = (n: number): number => {
      const trozo = sensores.slice(0, n)
      let alto = 0
      let primera = true
      for (const g of GRUPOS) {
        const cuenta = trozo.filter((s) => s.tipo.grupo === g.id).length
        if (!cuenta) continue
        const filas = Math.ceil(cuenta / columnas)
        alto +=
          (primera ? 0 : gapSeccion) +
          altoCabecera +
          gapCabecera +
          filas * altoTarjeta +
          (filas - 1) * gapTarjetas
        primera = false
      }
      return alto
    }

    let n = sensores.length
    while (n > 1 && altoDe(n) > disponible) n--

    firma.current = escenario
    correcciones.current = 0
    setCapacidad(n)
  })

  /* Cinturón de seguridad: si tras el cálculo aún desborda (fuentes que cargan
     tarde, nombres muy largos), quita una tarjeta más. Acotado para no
     entrar en bucle. */
  useLayoutEffect(() => {
    const el = contenedor.current
    if (!el || !paginar || capacidad === null || capacidad <= 1) return
    if (correcciones.current >= 10) return
    if (el.scrollHeight > el.clientHeight + 2) {
      correcciones.current += 1
      setCapacidad(capacidad - 1)
    }
  })

  /* Reparte el ancho sobrante de la última fila de cada grupo entre sus
     tarjetas, para que no queden huecos en la pantalla. */
  useLayoutEffect(() => {
    const el = contenedor.current
    if (!el) return
    el.querySelectorAll<HTMLElement>("[data-rejilla]").forEach((rejilla) => {
      const columnas = getComputedStyle(rejilla)
        .gridTemplateColumns.split(" ")
        .filter(Boolean).length
      const tarjetas = [...rejilla.children] as HTMLElement[]
      tarjetas.forEach((t) => (t.style.gridColumn = ""))

      const resto =
        tarjetas.length % columnas || (tarjetas.length < columnas ? tarjetas.length : 0)
      if (!resto || columnas < 2) return

      const ultimas = tarjetas.slice(tarjetas.length - resto)
      const base = Math.floor(columnas / resto)
      const extra = columnas % resto
      // Tope de 2: sin él, un grupo con una sola tarjeta la estiraba a lo
      // ancho de toda la rejilla, y una cifra suelta en una tarjeta gigante
      // se lee peor que un hueco.
      ultimas.forEach(
        (t, i) => (t.style.gridColumn = `span ${Math.min(2, base + (i < extra ? 1 : 0))}`),
      )
    })
  })

  if (!sensores.length) {
    return (
      <div ref={contenedor} className="grid h-full place-items-center">
        <p className="text-center text-[calc(var(--u)*1.8)] font-semibold text-muted-foreground">
          Sin indicadores disponibles
        </p>
      </div>
    )
  }

  return (
    <div
      ref={contenedor}
      data-indicadores
      data-capacidad={capacidad ?? "todas"}
      className={cn(
        "flex flex-col gap-[calc(var(--u)*1.8)]",
        // Solo se recorta cuando hay paginación: en vertical/estrecho la
        // columna crece y es la página la que se desplaza.
        paginar && "min-h-0 flex-1 overflow-hidden",
      )}
    >
      {GRUPOS.map((grupo) => {
        const delGrupo = visibles.filter((s) => s.tipo.grupo === grupo.id)
        if (!delGrupo.length) return null

        return (
          /* flex-none a propósito: si las secciones pudieran encogerse, las
             tarjetas se comprimirían unas sobre otras y el desbordamiento
             nunca se detectaría. */
          <section key={grupo.id} className="flex flex-none flex-col gap-[calc(var(--u)*1.1)]">
            <h2 className="flex items-center gap-[0.8em] text-[calc(var(--u)*1.5)] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {grupo.etiqueta}
              <span className="h-px flex-1 bg-border" />
            </h2>
            <div
              data-rejilla
              className="grid gap-[calc(var(--u)*1.1)] [grid-template-columns:repeat(auto-fit,minmax(calc(var(--u)*17),1fr))] [grid-auto-rows:minmax(calc(var(--u)*12.5),auto)]"
            >
              {delGrupo.map((s) => (
                <TarjetaSensor key={s.uuid} sensor={s} serie={historicos.get(s.uuid)} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
