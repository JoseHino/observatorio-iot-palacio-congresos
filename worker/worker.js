/**
 * Proxy de solo lectura para la API IoTsens del Palacio de Congresos de Marbella.
 *
 * Motivo: openapi.iotsens.com exige la cabecera X-API-KEY y no envia cabeceras
 * CORS, asi que el navegador no puede llamarla directamente. Este Worker:
 *   1. Guarda la clave como secreto (nunca viaja al navegador).
 *   2. Anade CORS para que la pantalla pueda consumir los datos.
 *   3. Solo deja pasar GET sobre rutas de lectura.
 *   4. Cachea unos segundos para no castigar la API con muchas pantallas.
 *
 * Secretos / variables (wrangler.toml + `wrangler secret put`):
 *   IOTSENS_API_KEY  (secreto, obligatorio)
 *   ORIGEN_PERMITIDO (opcional, p.ej. https://josehino.github.io ; por defecto *)
 *   SEGUNDOS_CACHE   (opcional, por defecto 20)
 */

const RUTAS_PERMITIDAS = /^\/v1\/(catalog|measurements|kpis|events)\//;
const API = 'https://openapi.iotsens.com';

export default {
  async fetch(peticion, entorno, contexto) {
    const url = new URL(peticion.url);
    const cors = {
      'Access-Control-Allow-Origin': origenPermitido(peticion, entorno),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };

    if (peticion.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (peticion.method !== 'GET') return respuesta({ error: 'Solo se permite GET' }, 405, cors);

    if (url.pathname === '/' || url.pathname === '/salud') {
      return respuesta(
        { ok: true, servicio: 'proxy-iotsens', clave: Boolean(entorno.IOTSENS_API_KEY), ts: Date.now() },
        200,
        cors
      );
    }

    if (!RUTAS_PERMITIDAS.test(url.pathname)) {
      return respuesta({ error: 'Ruta no permitida por el proxy', ruta: url.pathname }, 403, cors);
    }
    if (!entorno.IOTSENS_API_KEY) {
      return respuesta({ error: 'Falta configurar el secreto IOTSENS_API_KEY' }, 500, cors);
    }

    const destino = API + url.pathname + url.search;
    const clave = new Request(destino, { method: 'GET' });
    const cache = caches.default;

    let resultado = await cache.match(clave);
    if (!resultado) {
      let origen;
      try {
        origen = await fetch(destino, {
          headers: { 'X-API-KEY': entorno.IOTSENS_API_KEY, Accept: 'application/json' },
        });
      } catch (e) {
        return respuesta({ error: 'No se pudo contactar con la API IoTsens', detalle: String(e) }, 502, cors);
      }
      resultado = new Response(origen.body, origen);
      resultado.headers.set('Cache-Control', `public, max-age=${entorno.SEGUNDOS_CACHE || 20}`);
      resultado.headers.delete('Set-Cookie');
      if (origen.ok) contexto.waitUntil(cache.put(clave, resultado.clone()));
    }

    const salida = new Response(resultado.body, resultado);
    for (const [k, v] of Object.entries(cors)) salida.headers.set(k, v);
    return salida;
  },
};

/**
 * ORIGEN_PERMITIDO admite varios dominios separados por comas. Se devuelve el
 * que ha pedido, no la lista entera: la cabecera solo acepta un valor, y
 * responder con todos equivale a no filtrar nada.
 * Un origen no autorizado recibe el primero de la lista, que su navegador
 * rechazará por no coincidir con el suyo.
 */
function origenPermitido(peticion, entorno) {
  const lista = (entorno.ORIGEN_PERMITIDO || '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (lista.includes('*')) return '*';
  const origen = peticion.headers.get('Origin');
  return origen && lista.includes(origen) ? origen : lista[0];
}

function respuesta(objeto, estado, cors) {
  return new Response(JSON.stringify(objeto, null, 2), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}
