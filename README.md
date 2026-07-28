# Observatorio IoT · Palacio de Congresos de Marbella

Pantalla pública con los datos en tiempo real de los sensores instalados en el
Palacio de Congresos, leídos de la plataforma IoTsens.

Ahora mismo funciona en **modo demostración** (datos simulados) porque faltan
la clave y los identificadores de la instalación. En cuanto se rellenen, pasa
sola a datos reales sin tocar una línea de código.

---

## Qué hace falta pedir a los desarrolladores

| Dato | Para qué |
|---|---|
| `X-API-KEY` | La API rechaza cualquier petición sin ella (devuelve 401). |
| `tenantUuid` | Identifica la instalación dentro de IoTsens. |
| `organizationUuid` | Opcional, pero varios endpoints solo existen a nivel de organización. |

Conviene pedir una clave **de solo lectura**, porque la misma API permite
borrar mediciones (`DELETE /v1/measurements/...`) y crear dispositivos.

---

## Por qué hay un proxy y no se llama a la API desde el HTML

Dos motivos, los dos bloqueantes:

1. **No hay CORS.** El preflight (`OPTIONS`) contra `openapi.iotsens.com`
   responde `403` sin cabeceras `Access-Control-Allow-Origin`, así que el
   navegador nunca dejaría hacer la llamada desde una página web.
2. **La clave no puede ir en el HTML.** Sería pública para cualquiera que
   abriese el código fuente de la pantalla, y con ella se pueden borrar datos.

El Worker de `worker/` resuelve las dos cosas: guarda la clave como secreto,
solo deja pasar peticiones `GET` de lectura y añade las cabeceras CORS.

---

## Puesta en marcha

### 1. Ver qué sensores hay (una sola vez)

```powershell
cd $HOME\Desktop\observatorio-palacio-congresos
$env:IOTSENS_API_KEY = "la-clave"
$env:IOTSENS_TENANT  = "el-tenant-uuid"
$env:IOTSENS_ORG     = "el-organization-uuid"   # si lo dan
node descubrir.mjs
```

Imprime los activos, dispositivos y el `uuid` de cada sensor, y deja el volcado
completo en `descubrimiento.json`. De ahí sale el `assetUuid` del Palacio.

### 2. Publicar el proxy

```powershell
cd worker
npx wrangler login
npx wrangler secret put IOTSENS_API_KEY    # pega la clave cuando la pida
npx wrangler deploy
```

Devuelve una URL del tipo
`https://iotsens-palacio-congresos.<cuenta>.workers.dev`.
Comprobación rápida: abrir esa URL en el navegador debe responder
`{"ok":true,...,"clave":true}`.

El plan gratuito de Cloudflare da 100.000 peticiones al día; una pantalla
refrescando cada minuto gasta unas 25.000 al mes.

### 3. Rellenar `src/lib/config.ts`

```ts
proxy: "https://iotsens-palacio-congresos.xxx.workers.dev",
tenantUuid: "...",
organizationUuid: "...",
assetUuid: "...",
```

Al recompilar (`npm run build`), el aviso amarillo desaparece y el indicador de
la cabecera pasa a **Datos en vivo**.

### 4. Cerrar el proxy (recomendado, una vez publicada la pantalla)

En `worker/wrangler.toml`, cambiar `ORIGEN_PERMITIDO = "*"` por el dominio real
de la pantalla y volver a desplegar. Así el proxy solo atiende a esa web.

---

## La pantalla

- **Se adapta sola a los sensores que haya.** No hay ninguna lista fija: lee el
  catálogo, clasifica cada medida por su nombre (temperatura, CO₂, aforo,
  energía…) y le pone icono, unidad y umbrales de color. Si mañana añaden
  sensores, aparecen sin tocar nada. Lo que no reconoce va a "Otros indicadores".
- **Paginación automática.** Si hay más indicadores de los que caben en la
  pantalla, se reparten en páginas que rotan cada 18 s. Nunca hay scroll ni
  recortes.
- **Carrusel de gráficas** con la evolución de las últimas 24 h, priorizando
  aforo, CO₂, temperatura y potencia.
- **Si la plataforma se cae**, la pantalla no se queda en blanco: avisa y sigue
  mostrando datos de demostración hasta que vuelva.

### Ajustes en `src/lib/config.ts`

| Clave | Qué controla |
|---|---|
| `segundosRefresco` | Cada cuánto se piden datos nuevos (por defecto 60 s). |
| `horasHistorico` | Ventana de las gráficas (24 h). |
| `segundosCarrusel` / `segundosPagina` | Ritmo de rotación de gráficas e indicadores. |
| `minutosSinDatos` | Cuándo se marca un sensor como "sin señal" (90 min). |
| `modoDemo` | `'auto'`, `'si'` (forzar demo) o `'no'` (nunca demo). |

Los umbrales de color (óptimo / aceptable / fuera de rango) están en
`TIPOS_SENSOR`, en el mismo archivo. Los actuales son valores de referencia
habituales en edificios públicos; convendría contrastarlos con el criterio de
mantenimiento del Palacio.

### Atajos de teclado (para el montaje)

| Tecla | Acción |
|---|---|
| `F` | Pantalla completa |
| `←` / `→` | Cambiar de gráfica |
| `↑` / `↓` | Cambiar de página de indicadores |
| `R` | Forzar recarga de datos |
| `T` | Alternar tema claro / oscuro |

También por URL: `?tema=oscuro`, `?demo=1`. El tema claro es el de por defecto.

---

## Montaje en la pantalla del vestíbulo

Chrome en modo quiosco, arrancando solo con el equipo:

```
chrome.exe --kiosk --noerrdialogs --disable-session-crashed-bubble
  --autoplay-policy=no-user-gesture-required
  "https://<url-de-la-pantalla>/"
```

La página no necesita interacción: se refresca, rota y se recupera sola de
cortes de red.

---

## Desarrollo

La pantalla es una aplicación **React + TypeScript + Tailwind 4**, con los
componentes de interfaz de **shadcn/ui**. Requiere compilación: ya no basta con
abrir el HTML.

```powershell
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # genera dist/ , que es lo que se publica
npm run preview  # sirve dist/ para comprobarlo antes de publicar
```

---

## Estructura

```
index.html                      arranque de la aplicación
src/lib/config.ts               configuración y diccionario de sensores  ← se toca esto
src/lib/api.ts                  cliente de IoTsens (a través del proxy)
src/lib/demo.ts                 datos simulados del modo demostración
src/lib/formato.ts              clasificación por nombre, umbrales y formato de cifras
src/lib/tipos.ts                tipos compartidos
src/hooks/useObservatorio.ts    ciclo de refresco y caída a demostración
src/hooks/usePantalla.ts        reloj, tema, atajos de teclado y rotaciones
src/components/                 tarjetas, rejilla paginada, gráfica y paneles
src/components/ui/              componentes de shadcn/ui + la cabecera (hero-195)
src/index.css                   sistema de diseño: tokens de color y tema claro/oscuro
worker/worker.js                proxy de solo lectura con la clave
descubrir.mjs                   inventario de sensores de la instalación
```

### Sistema de diseño

Los colores, radios y tipografía viven como variables CSS en `src/index.css`,
en dos bloques: `:root` (tema claro, el de por defecto) y `.dark`. Cambiar la
paleta es editar esas variables; no hay colores incrustados en los componentes.

Los tonos de estado tienen dos variantes a propósito: `--ok` / `--aviso` /
`--alerta` para **texto** (contraste 4.5:1 sobre la tarjeta) y `--ok-trazo` /
`--aviso-trazo` / `--alerta-trazo`, más saturados, para **trazos de gráfica**,
donde el requisito es 3:1. El estado nunca se transmite solo con color: cada
tarjeta lleva además su etiqueta ("Óptimo", "Aceptable", "Fuera de rango").
