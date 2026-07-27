/**
 * Descubridor del catalogo IoTsens.
 *
 * Sirve para saber QUE hay instalado en el Palacio de Congresos: organizaciones,
 * activos (assets), dispositivos y, sobre todo, los uuid de cada sensor.
 * Con esa informacion se rellena assets/config.js y la pantalla ya tira sola.
 *
 * Uso (PowerShell):
 *   $env:IOTSENS_API_KEY="....."; $env:IOTSENS_TENANT="uuid-del-tenant"; node descubrir.mjs
 *
 * Opcional: $env:IOTSENS_ORG="uuid-de-la-organizacion"
 *
 * Deja el volcado completo en descubrimiento.json
 */

import { writeFileSync } from 'node:fs';

const API = 'https://openapi.iotsens.com';
const CLAVE = process.env.IOTSENS_API_KEY;
const TENANT = process.env.IOTSENS_TENANT;
const ORG = process.env.IOTSENS_ORG || '';

if (!CLAVE || !TENANT) {
  console.error('Faltan variables. Ejemplo en PowerShell:');
  console.error('  $env:IOTSENS_API_KEY="tu-clave"; $env:IOTSENS_TENANT="uuid"; node descubrir.mjs');
  process.exit(1);
}

async function pedir(ruta) {
  const r = await fetch(API + ruta, {
    headers: { 'X-API-KEY': CLAVE, Accept: 'application/json' },
  });
  const texto = await r.text();
  if (!r.ok) return { _error: r.status, _ruta: ruta, _cuerpo: texto.slice(0, 400) };
  try {
    return JSON.parse(texto);
  } catch {
    return { _error: 'respuesta no JSON', _ruta: ruta, _cuerpo: texto.slice(0, 400) };
  }
}

const volcado = { tenant: TENANT, organizacion: ORG || null, generado: new Date().toISOString() };

console.log(`\nTenant: ${TENANT}${ORG ? `  ·  Organizacion: ${ORG}` : ''}\n`);

const base = ORG ? `/v1/catalog/tenants/${TENANT}/organizations/${ORG}` : `/v1/catalog/tenants/${TENANT}`;

// --- Activos -------------------------------------------------------------
volcado.assets = await pedir(`${base}/assets?size=200`);
if (Array.isArray(volcado.assets)) {
  console.log(`ACTIVOS (${volcado.assets.length})`);
  for (const a of volcado.assets) {
    const uuid = a.uuid || a.assetUuid || '(sin uuid en la respuesta)';
    console.log(`  · ${a.alias || a.name || '(sin alias)'}  [${uuid}]`);
    if (a.latitude != null) console.log(`      coords: ${a.latitude}, ${a.longitude}`);
    for (const m of a.deviceMeasurements || a.assetMeasurements || []) {
      console.log(
        `      - ${m.alias || m.name}  uuid=${m.uuid}` +
          (m.unit ? `  (${m.unit})` : '') +
          (m.lastValue != null ? `  ultimo=${m.lastValue}` : '') +
          (m.deviceUuid ? `  device=${m.deviceUuid}` : '')
      );
    }
  }
} else {
  console.log('ACTIVOS: ', JSON.stringify(volcado.assets).slice(0, 300));
}

// --- Dispositivos --------------------------------------------------------
volcado.devices = await pedir(`${base}/devices?size=200&includeAsset=true`);
if (Array.isArray(volcado.devices)) {
  console.log(`\nDISPOSITIVOS (${volcado.devices.length})`);
  for (const d of volcado.devices) {
    console.log(
      `  · ${d.alias || d.serialNumber}  [${d.uuid}]  cat=${d.deviceCategory?.name || d.category?.name || '-'}`
    );
    for (const m of d.deviceMeasurements || []) {
      console.log(`      - ${m.name}  uuid=${m.uuid}  tipo=${m.measurementType?.sensor || '-'}`);
    }
  }
} else {
  console.log('\nDISPOSITIVOS: ', JSON.stringify(volcado.devices).slice(0, 300));
}

// --- Detalle de cada activo con ultimos valores ---------------------------
if (ORG && Array.isArray(volcado.assets)) {
  volcado.detalleAssets = [];
  for (const a of volcado.assets) {
    const uuid = a.uuid || a.assetUuid;
    if (!uuid) continue;
    const detalle = await pedir(`${base}/assets/${uuid}?withDeviceMeasurements=true`);
    volcado.detalleAssets.push({ uuid, detalle });
  }
  console.log(`\nDetalle con ultimos valores recuperado de ${volcado.detalleAssets.length} activos.`);
}

// --- KPIs ----------------------------------------------------------------
volcado.kpis = await pedir(`${base}/kpis?size=100`);
if (Array.isArray(volcado.kpis)) {
  console.log(`\nKPIs (${volcado.kpis.length})`);
  for (const k of volcado.kpis) console.log(`  · ${k.name}  [${k.uuid}]  ${k.description || ''}`);
}

writeFileSync('descubrimiento.json', JSON.stringify(volcado, null, 2), 'utf8');
console.log('\nVolcado completo guardado en descubrimiento.json\n');
