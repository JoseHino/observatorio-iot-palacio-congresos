import {
  Activity,
  BatteryMedium,
  CloudFog,
  Droplet,
  Droplets,
  Factory,
  Gauge,
  Haze,
  Radar,
  SignalHigh,
  Sun,
  Thermometer,
  Users,
  Volume2,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react"

/* Una sola familia de iconos (Lucide) y un solo grosor de trazo:
   mezclar sets es lo que hace que un panel parezca improvisado. */
const ICONOS: Record<string, LucideIcon> = {
  temperatura: Thermometer,
  humedad: Droplets,
  co2: Wind,
  pm25: Haze,
  pm10: CloudFog,
  cov: Factory,
  ruido: Volume2,
  luminosidad: Sun,
  aforo: Users,
  presencia: Radar,
  energia: Zap,
  potencia: Gauge,
  agua: Droplet,
  bateria: BatteryMedium,
  cobertura: SignalHigh,
}

export function IconoSensor({ id, className }: { id: string; className?: string }) {
  const Icono = ICONOS[id] ?? Activity
  return <Icono className={className} strokeWidth={1.7} aria-hidden="true" />
}
