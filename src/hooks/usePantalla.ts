import { useEffect, useRef, useState } from "react"

/** Reloj de cabecera. Se refresca cada 10 s: basta para minutos. */
export function useReloj(): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 10000)
    return () => clearInterval(id)
  }, [])
  return ahora
}

/** Tema claro/oscuro. Arranca en claro salvo que se pida por URL (?tema=oscuro). */
export function useTema(): [boolean, () => void] {
  const [oscuro, setOscuro] = useState(
    () => new URLSearchParams(location.search).get("tema") === "oscuro",
  )
  useEffect(() => {
    document.documentElement.classList.toggle("dark", oscuro)
  }, [oscuro])
  return [oscuro, () => setOscuro((v) => !v)]
}

interface Atajos {
  siguienteGrafica: () => void
  anteriorGrafica: () => void
  siguientePagina: () => void
  anteriorPagina: () => void
  refrescar: () => void
  alternarTema: () => void
  alternarVista: () => void
}

/**
 * Qué se ve: el carrusel de señalética (por defecto) o el cuadro de mando
 * completo, para mantenimiento. Se fija por URL (?vista=panel) y se alterna
 * con la tecla P.
 */
export function useVista(): [Vista, () => void] {
  const [vista, setVista] = useState<Vista>(() =>
    new URLSearchParams(location.search).get("vista") === "panel" ? "panel" : "carrusel",
  )
  return [vista, () => setVista((v) => (v === "carrusel" ? "panel" : "carrusel"))]
}

export type Vista = "carrusel" | "panel"

/**
 * Atajos de teclado para operar la pantalla desde el mando o un teclado
 * conectado al reproductor de cartelería, sin necesidad de ratón.
 */
export function useAtajos(acciones: Atajos): void {
  // Ref para no re-suscribir el listener en cada render.
  const ref = useRef(acciones)
  ref.current = acciones

  useEffect(() => {
    const alPulsar = (ev: KeyboardEvent) => {
      const a = ref.current
      switch (ev.key.toLowerCase()) {
        case "arrowright":
          a.siguienteGrafica()
          break
        case "arrowleft":
          a.anteriorGrafica()
          break
        case "arrowdown":
          a.siguientePagina()
          break
        case "arrowup":
          a.anteriorPagina()
          break
        case "r":
          a.refrescar()
          break
        case "t":
          a.alternarTema()
          break
        case "p":
          a.alternarVista()
          break
        case "f":
          if (document.fullscreenElement) void document.exitFullscreen()
          else void document.documentElement.requestFullscreen()
          break
      }
    }
    document.addEventListener("keydown", alPulsar)
    return () => document.removeEventListener("keydown", alPulsar)
  }, [])
}

/**
 * Rotación automática con reinicio: cada vez que alguien avanza a mano,
 * el temporizador vuelve a empezar para no cortar la vista recién elegida.
 */
export function useRotacion(total: number, segundos: number): [number, (paso: number) => void] {
  const [indice, setIndice] = useState(0)
  const [reinicio, setReinicio] = useState(0)

  const mover = (paso: number) => {
    if (total < 2) return
    setIndice((i) => (((i + paso) % total) + total) % total)
    setReinicio((r) => r + 1)
  }

  useEffect(() => {
    if (total < 2) return
    const id = setInterval(
      () => setIndice((i) => (i + 1) % total),
      Math.max(1, segundos) * 1000,
    )
    return () => clearInterval(id)
  }, [total, segundos, reinicio])

  // Si la lista encoge (menos sensores), el índice no puede quedar fuera.
  const seguro = total > 0 ? indice % total : 0
  return [seguro, mover]
}
