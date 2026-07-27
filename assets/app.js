/* Observatorio IoT · Palacio de Congresos de Marbella
   Lee el catalogo de sensores, clasifica cada medida y pinta la pantalla.
   No hay nada especifico de una instalacion concreta: si manana anaden
   sensores nuevos, aparecen solos. */

(() => {
  const cfg = window.CONFIG;
  const TIPOS = window.TIPOS_SENSOR;
  const GRUPOS = window.GRUPOS;

  const $ = (sel) => document.querySelector(sel);
  const nfCache = new Map();

  let modoDemo = false;
  let assetResuelto = cfg.assetUuid || '';
  let sensores = [];
  let historicos = new Map();
  let indiceGrafica = 0;
  let grafica = null;
  let tempCarrusel = null;
  let tempPagina = null;
  let paginas = [];
  let indicePagina = 0;
  let inicioCiclo = Date.now();

  /* ------------------------------------------------------------------ */
  /* Iconos (trazos SVG, sin dependencias externas)                      */
  /* ------------------------------------------------------------------ */
  const ICONOS = {
    temperatura: '<path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z"/><path d="M12 9v5"/>',
    humedad: '<path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10z"/>',
    co2: '<path d="M3 8h13a3.5 3.5 0 1 0-3.5-3.5"/><path d="M3 13h16a3 3 0 1 1-3 3"/><path d="M3 18h10"/>',
    pm25: '<circle cx="7" cy="8" r="2"/><circle cx="15" cy="6" r="1.4"/><circle cx="17" cy="14" r="2.2"/><circle cx="9" cy="16" r="1.6"/>',
    pm10: '<circle cx="7" cy="8" r="2"/><circle cx="15" cy="6" r="1.4"/><circle cx="17" cy="14" r="2.2"/><circle cx="9" cy="16" r="1.6"/>',
    cov: '<path d="M4 15c2-3 4-3 6 0s4 3 6 0 2-3 4 0"/><path d="M4 9c2-3 4-3 6 0s4 3 6 0"/>',
    ruido: '<path d="M4 10v4h3l4 3.5V6.5L7 10H4z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.8 6.5a7.5 7.5 0 0 1 0 11"/>',
    luminosidad: '<circle cx="12" cy="12" r="3.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
    aforo: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6"/><path d="M17.5 14.4A5.5 5.5 0 0 1 20.5 19"/>',
    presencia: '<circle cx="12" cy="12" r="2.2"/><path d="M8 8a5.6 5.6 0 0 0 0 8"/><path d="M16 8a5.6 5.6 0 0 1 0 8"/><path d="M5.4 5.4a9.3 9.3 0 0 0 0 13.2"/><path d="M18.6 5.4a9.3 9.3 0 0 1 0 13.2"/>',
    energia: '<path d="M13 3L5 13.5h5.5L11 21l8-10.5h-5.5L13 3z"/>',
    potencia: '<path d="M13 3L5 13.5h5.5L11 21l8-10.5h-5.5L13 3z"/>',
    agua: '<path d="M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
    bateria: '<rect x="3" y="8" width="15" height="8" rx="2"/><path d="M21 11v2"/><path d="M6.5 11v2"/>',
    cobertura: '<path d="M5 18v-4M9.7 18v-7M14.3 18v-10M19 18V5"/>',
    generico: '<circle cx="12" cy="12" r="8.2"/><path d="M12 8v4l2.6 2"/>',
  };

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  function num(valor, decimales) {
    const clave = decimales;
    if (!nfCache.has(clave)) {
      nfCache.set(
        clave,
        new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
      );
    }
    return nfCache.get(clave).format(valor);
  }

  const hora = (ms) => new Date(ms).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  function haceCuanto(ms) {
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 1) return 'ahora mismo';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.floor(h / 24)} d`;
  }

  // Deja el nombre en minusculas, sin acentos y con los subindices en cifra
  // normal (CO₂ -> co2), para que los patrones del diccionario acierten.
  function normalizarTexto(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .replace(new RegExp('[\\u2080-\\u2089]', 'g'), (c) => String(c.charCodeAt(0) - 0x2080))
      .replace(new RegExp('[\\u00b9\\u00b2\\u00b3]', 'g'), (c) => ({ '¹': '1', '²': '2', '³': '3' })[c])
      .toLowerCase();
  }

  function clasificar(nombre, unidadApi) {
    const texto = normalizarTexto(`${nombre || ''} ${unidadApi || ''}`);
    const tipo = TIPOS.find((t) => t.patron.test(texto));
    if (tipo) return tipo;
    return { id: 'generico', etiqueta: 'Indicador', unidad: unidadApi || '', grupo: 'otros', decimales: 1 };
  }

  function evaluar(tipo, valor) {
    const u = tipo.umbrales;
    if (!u || !Number.isFinite(valor)) return { clase: 'neutro', color: 'var(--neutro)', etiqueta: '' };
    const dentro = (r) => valor >= r[0] && valor <= r[1];
    if (dentro(u.optimo)) return { clase: 'ok', color: 'var(--ok)', etiqueta: 'Óptimo' };
    if (!u.aviso || dentro(u.aviso)) return { clase: 'aviso', color: 'var(--aviso)', etiqueta: 'Aceptable' };
    return { clase: 'alerta', color: 'var(--alerta)', etiqueta: 'Fuera de rango' };
  }

  const severidad = { alerta: 3, aviso: 2, ok: 1, neutro: 0 };

  /* ------------------------------------------------------------------ */
  /* Acceso a datos                                                      */
  /* ------------------------------------------------------------------ */
  const configurado = () => Boolean(cfg.proxy && cfg.tenantUuid);

  async function api(ruta) {
    const r = await fetch(cfg.proxy.replace(/\/$/, '') + ruta, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status} en ${ruta}`);
    return r.json();
  }

  const baseCatalogo = () =>
    cfg.organizationUuid
      ? `/v1/catalog/tenants/${cfg.tenantUuid}/organizations/${cfg.organizationUuid}`
      : `/v1/catalog/tenants/${cfg.tenantUuid}`;

  async function resolverAsset() {
    if (assetResuelto) return assetResuelto;
    const lista = await api(`${baseCatalogo()}/assets?size=50`);
    const activos = Array.isArray(lista) ? lista : lista?.content || [];
    if (!activos.length) throw new Error('El tenant no devuelve ningún activo');
    assetResuelto = activos[0].uuid || activos[0].assetUuid;
    if (!assetResuelto) throw new Error('El activo no trae uuid; indícalo en CONFIG.assetUuid');
    return assetResuelto;
  }

  function normalizar(medidas, procedencia) {
    return (medidas || [])
      .map((m) => {
        const valor = parseFloat(m.lastValue ?? m.value);
        return {
          uuid: m.uuid,
          deviceUuid: m.deviceUuid || procedencia || '',
          nombre: m.alias || m.name || 'Sensor',
          unidad: m.unit || '',
          valor: Number.isFinite(valor) ? valor : null,
          ts: Number(m.lastValueDate || m.timestamp) || null,
        };
      })
      .filter((s) => s.uuid);
  }

  async function leerSensores() {
    if (modoDemo) return window.DEMO.ultimos();
    const uuid = await resolverAsset();
    const activo = await api(`${baseCatalogo()}/assets/${uuid}?withDeviceMeasurements=true`);
    const medidas = [...(activo.deviceMeasurements || []), ...(activo.assetMeasurements || [])];
    const lista = normalizar(medidas);
    if (!lista.length) throw new Error('El activo no tiene medidas asociadas');
    return lista;
  }

  async function leerHistorico(sensor, desde, hasta) {
    if (modoDemo) return window.DEMO.historico(sensor.uuid, desde, hasta);
    if (!sensor.deviceUuid) return [];
    const datos = await api(
      `/v1/measurements/tenants/${cfg.tenantUuid}/devices/${sensor.deviceUuid}` +
        `/sensors/${sensor.uuid}?from=${desde}&until=${hasta}`
    );
    return (Array.isArray(datos) ? datos : [])
      .map((d) => ({ timestamp: Number(d.timestamp), value: parseFloat(d.value) }))
      .filter((d) => Number.isFinite(d.timestamp) && Number.isFinite(d.value))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Lanza las peticiones de historico de 4 en 4 para no saturar el proxy.
  async function enTanda(elementos, tarea, tanda = 4) {
    const salida = [];
    for (let i = 0; i < elementos.length; i += tanda) {
      salida.push(...(await Promise.all(elementos.slice(i, i + tanda).map(tarea))));
    }
    return salida;
  }

  /* ------------------------------------------------------------------ */
  /* Pintado                                                             */
  /* ------------------------------------------------------------------ */
  function svg(contenido, clase) {
    return `<svg class="${clase}" viewBox="0 0 24 24" aria-hidden="true">${contenido}</svg>`;
  }

  function chispa(serie, color) {
    if (!serie || serie.length < 3) return '';
    const vs = serie.map((p) => p.value);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const rango = max - min || 1;
    const puntos = vs
      .map((v, i) => `${(i / (vs.length - 1)) * 100},${28 - ((v - min) / rango) * 26}`)
      .join(' ');
    return `<svg class="chispa" viewBox="0 0 100 30" preserveAspectRatio="none">
      <polyline points="${puntos}" fill="none" stroke="${color}" stroke-width="1.6"
        stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".85"/>
    </svg>`;
  }

  function tendencia(sensor) {
    const serie = historicos.get(sensor.uuid);
    if (!serie || serie.length < 4 || sensor.valor == null) return '';
    const limite = Date.now() - 3600000;
    const previo = serie.filter((p) => p.timestamp <= limite).pop() || serie[0];
    const dif = sensor.valor - previo.value;
    const base = Math.abs(previo.value) > 0.001 ? Math.abs(previo.value) : 1;
    if (Math.abs(dif) / base < 0.01) return '<span>estable · 1 h</span>';
    const sube = dif > 0;
    const flecha = sube ? 'M6 14l6-6 6 6' : 'M6 10l6 6 6-6';
    return `<span style="display:inline-flex;align-items:center;gap:.25em">
      <svg viewBox="0 0 24 24" style="width:1.15em;height:1.15em;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"><path d="${flecha}"/></svg>
      ${num(Math.abs(dif), Math.abs(dif) < 10 ? 1 : 0)} · 1 h</span>`;
  }

  function tarjeta(sensor) {
    const t = sensor.tipo;
    const est = sensor.estado;
    const desfasado = sensor.ts && Date.now() - sensor.ts > cfg.minutosSinDatos * 60000;
    const unidad = sensor.unidad || t.unidad || '';
    const cifra = sensor.valor == null ? '—' : num(sensor.valor, t.decimales ?? 1);
    return `<article class="tarjeta ${desfasado ? 'apagado' : ''}" style="--color:${est.color}">
      <div class="fila">
        ${svg(ICONOS[t.id] || ICONOS.generico, 'icono')}
        <div class="nombre">${sensor.nombre}</div>
      </div>
      <div class="valor"><span class="cifra">${cifra}</span><span class="unidad">${unidad}</span></div>
      ${chispa(historicos.get(sensor.uuid), est.color)}
      <div class="pie">
        ${est.etiqueta ? `<span class="etiqueta-estado">${est.etiqueta}</span>` : '<span></span>'}
        ${desfasado ? '<span>sin señal</span>' : tendencia(sensor) || `<span>${sensor.ts ? hora(sensor.ts) : ''}</span>`}
      </div>
    </article>`;
  }

  function maquetar(lista) {
    return GRUPOS.map((g) => {
      const delGrupo = lista.filter((s) => s.tipo.grupo === g.id);
      if (!delGrupo.length) return '';
      return `<section class="grupo"><h2>${g.etiqueta}</h2>
        <div class="rejilla">${delGrupo.map(tarjeta).join('')}</div></section>`;
    }).join('');
  }

  // En una pantalla publica no vale con recortar ni con poner scroll: si hay
  // mas sensores de los que caben, se reparten en paginas que van rotando.
  function paginar() {
    const cont = $('#indicadores');
    paginas = [];
    if (!sensores.length) {
      cont.innerHTML = '<div class="vacio">Sin indicadores disponibles</div>';
      $('#paginacion').textContent = '';
      return;
    }
    // En formato vertical o estrecho la pagina fluye y no hace falta paginar.
    if (!window.matchMedia('(min-aspect-ratio: 1/1)').matches || cont.clientHeight < 200) {
      paginas = [sensores];
    } else {
      let pendientes = sensores.slice();
      let vueltas = 0;
      while (pendientes.length && vueltas++ < 12) {
        let intento = pendientes.slice();
        cont.innerHTML = maquetar(intento);
        while (intento.length > 1 && cont.scrollHeight > cont.clientHeight + 2) {
          intento = intento.slice(0, -1);
          cont.innerHTML = maquetar(intento);
        }
        paginas.push(intento);
        pendientes = pendientes.slice(intento.length);
      }
      if (pendientes.length) paginas.push(pendientes);
    }
    pintarPagina();
  }

  // Reparte el ancho sobrante de la ultima fila de cada grupo entre sus
  // tarjetas, para que no queden huecos en la pantalla.
  function cuadrarFilas() {
    document.querySelectorAll('.rejilla').forEach((rejilla) => {
      const columnas = getComputedStyle(rejilla).gridTemplateColumns.split(' ').filter(Boolean).length;
      const tarjetas = [...rejilla.children];
      tarjetas.forEach((t) => (t.style.gridColumn = ''));
      const resto = tarjetas.length % columnas || (tarjetas.length < columnas ? tarjetas.length : 0);
      if (!resto || columnas < 2) return;
      const ultimas = tarjetas.slice(tarjetas.length - resto);
      const base = Math.floor(columnas / resto);
      const extra = columnas % resto;
      ultimas.forEach((t, i) => (t.style.gridColumn = `span ${base + (i < extra ? 1 : 0)}`));
    });
  }

  function pintarPagina() {
    if (!paginas.length) return;
    indicePagina = ((indicePagina % paginas.length) + paginas.length) % paginas.length;
    $('#indicadores').innerHTML = maquetar(paginas[indicePagina]);
    cuadrarFilas();
    $('#paginacion').textContent =
      paginas.length > 1 ? `Indicadores ${indicePagina + 1} de ${paginas.length}` : '';
  }

  function rotarPagina(paso) {
    if (paginas.length < 2) return;
    indicePagina += paso;
    pintarPagina();
  }

  function pintarResumen() {
    const conValor = sensores.filter((s) => s.valor != null);
    const enLinea = conValor.filter((s) => !s.ts || Date.now() - s.ts <= cfg.minutosSinDatos * 60000);
    const optimos = sensores.filter((s) => s.estado.clase === 'ok').length;
    const avisos = sensores.filter((s) => s.estado.clase !== 'ok' && s.estado.clase !== 'neutro').length;
    const ultima = Math.max(...sensores.map((s) => s.ts || 0));

    $('#resumen').innerHTML = `
      <div class="dato"><div class="k">Sensores en línea</div><div class="v">${enLinea.length}<span style="font-size:.55em;color:var(--texto-suave)"> / ${sensores.length}</span></div></div>
      <div class="dato"><div class="k">Última lectura</div><div class="v">${ultima ? hora(ultima) : '—'}</div></div>
      <div class="dato"><div class="k">En rango óptimo</div><div class="v" style="color:var(--ok)">${optimos}</div></div>
      <div class="dato"><div class="k">Requieren atención</div><div class="v" style="color:${avisos ? 'var(--aviso)' : 'var(--texto)'}">${avisos}</div></div>`;

    const vigilancia = [...sensores]
      .sort((a, b) => severidad[b.estado.clase] - severidad[a.estado.clase] || a.nombre.localeCompare(b.nombre))
      .slice(0, 6);
    $('#vigilancia').innerHTML = vigilancia
      .map(
        (s) => `<li>
          <span class="marca-color" style="background:${s.estado.color}"></span>
          <span class="texto">${s.nombre}</span>
          <span class="cifra">${s.valor == null ? '—' : num(s.valor, s.tipo.decimales ?? 1)} ${s.unidad || s.tipo.unidad || ''}</span>
        </li>`
      )
      .join('');
  }

  function candidatosGrafica() {
    const prioridad = ['aforo', 'co2', 'temperatura', 'potencia', 'ruido', 'humedad', 'pm25', 'energia'];
    const conSerie = sensores.filter((s) => (historicos.get(s.uuid) || []).length > 2);
    return conSerie
      .sort((a, b) => {
        const pa = prioridad.indexOf(a.tipo.id);
        const pb = prioridad.indexOf(b.tipo.id);
        return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
      })
      .slice(0, cfg.maxGraficas);
  }

  function pintarGrafica() {
    const lista = candidatosGrafica();
    const puntos = $('#puntos-carrusel');
    if (!lista.length) {
      $('#titulo-grafica').textContent = 'Sin histórico disponible';
      puntos.innerHTML = '';
      return;
    }
    indiceGrafica = indiceGrafica % lista.length;
    const sensor = lista[indiceGrafica];
    const serie = historicos.get(sensor.uuid) || [];
    const unidad = sensor.unidad || sensor.tipo.unidad || '';

    $('#titulo-grafica').textContent = sensor.nombre;
    $('#subtitulo-grafica').textContent = `Últimas ${cfg.horasHistorico} h${unidad ? ` · ${unidad}` : ''}`;
    puntos.innerHTML = lista.map((_, i) => `<span class="${i === indiceGrafica ? 'activo' : ''}"></span>`).join('');

    const etiquetas = serie.map((p) => hora(p.timestamp));
    const valores = serie.map((p) => p.value);
    const color = getComputedStyle(document.documentElement).getPropertyValue('--azul').trim() || '#2e8be6';
    const rejilla = getComputedStyle(document.documentElement).getPropertyValue('--linea').trim();
    const suave = getComputedStyle(document.documentElement).getPropertyValue('--texto-suave').trim();

    if (grafica) grafica.destroy();
    const ctx = $('#lienzo-grafica').getContext('2d');
    const degradado = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight || 260);
    degradado.addColorStop(0, 'rgba(46,139,230,.38)');
    degradado.addColorStop(1, 'rgba(46,139,230,0)');

    grafica = new Chart(ctx, {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: [
          {
            data: valores,
            borderColor: color,
            backgroundColor: degradado,
            borderWidth: 2.4,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: {
            grid: { display: false },
            border: { color: rejilla },
            ticks: {
              color: suave,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
              font: { family: 'Montserrat', size: 12, weight: '600' },
            },
          },
          y: {
            grid: { color: rejilla, drawTicks: false },
            border: { display: false },
            ticks: {
              color: suave,
              padding: 8,
              maxTicksLimit: 5,
              font: { family: 'Montserrat', size: 12, weight: '600' },
            },
          },
        },
      },
    });
  }

  function mostrarEstado(clase, texto) {
    const el = $('#estado');
    el.dataset.estado = clase;
    $('#estado-texto').textContent = texto;
  }

  function mostrarAviso(texto) {
    const el = $('#aviso');
    if (!texto) {
      el.classList.add('oculto');
      return;
    }
    $('#aviso-texto').textContent = texto;
    el.classList.remove('oculto');
  }

  /* ------------------------------------------------------------------ */
  /* Ciclo de actualizacion                                              */
  /* ------------------------------------------------------------------ */
  async function actualizar() {
    try {
      const brutos = await leerSensores();
      sensores = brutos.map((s) => {
        const tipo = clasificar(s.nombre, s.unidad);
        return { ...s, tipo, estado: evaluar(tipo, s.valor) };
      });

      const hasta = Date.now();
      const desde = hasta - cfg.horasHistorico * 3600000;
      const series = await enTanda(sensores.slice(0, 24), async (s) => {
        try {
          return [s.uuid, await leerHistorico(s, desde, hasta)];
        } catch {
          return [s.uuid, []];
        }
      });
      historicos = new Map(series);

      paginar();
      pintarResumen();
      pintarGrafica();
      mostrarEstado(modoDemo ? 'demo' : 'vivo', modoDemo ? 'Modo demostración' : 'Datos en vivo');
      $('#sello').textContent = `Actualizado ${hora(Date.now())}`;
      inicioCiclo = Date.now();
    } catch (e) {
      console.error('[observatorio]', e);
      mostrarEstado('error', 'Sin conexión con la plataforma');
      mostrarAviso(`No se han podido leer los sensores: ${e.message}. Se reintenta automáticamente.`);
      if (cfg.modoDemo === 'auto' && !modoDemo) {
        modoDemo = true;
        mostrarAviso(
          'La plataforma IoT no responde. La pantalla muestra datos de demostración hasta recuperar la conexión.'
        );
        return actualizar();
      }
    }
  }

  function animarBarra() {
    const total = cfg.segundosRefresco * 1000;
    const pct = Math.min(100, ((Date.now() - inicioCiclo) / total) * 100);
    $('#barra').style.width = `${pct}%`;
    requestAnimationFrame(animarBarra);
  }

  function tictac() {
    const ahora = new Date();
    $('#hora').textContent = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const fecha = ahora.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    $('#fecha').textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  }

  function rotarGrafica(paso) {
    const total = candidatosGrafica().length;
    if (total < 2) return;
    indiceGrafica = (indiceGrafica + paso + total) % total;
    pintarGrafica();
    reiniciarCarrusel();
  }

  function reiniciarCarrusel() {
    clearInterval(tempCarrusel);
    tempCarrusel = setInterval(() => rotarGrafica(1), cfg.segundosCarrusel * 1000);
    clearInterval(tempPagina);
    tempPagina = setInterval(() => rotarPagina(1), cfg.segundosPagina * 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Arranque                                                            */
  /* ------------------------------------------------------------------ */
  function iniciar() {
    const params = new URLSearchParams(location.search);
    if (params.get('tema')) document.documentElement.dataset.tema = params.get('tema');
    if (params.get('demo') === '1') cfg.modoDemo = 'si';

    $('#titulo').textContent = cfg.titulo;
    $('#subtitulo').textContent = cfg.subtitulo;
    document.title = `${cfg.titulo} · Observatorio IoT`;

    modoDemo = cfg.modoDemo === 'si' || (cfg.modoDemo === 'auto' && !configurado());
    if (modoDemo) {
      document.title = `[DATOS SIMULADOS] ${cfg.titulo} · Observatorio IoT`;
      mostrarAviso(
        'DATOS SIMULADOS. Esta pantalla todavía no está conectada a la plataforma IoT ' +
          'del Palacio de Congresos: ninguna de las cifras mostradas es real.'
      );
    }

    tictac();
    setInterval(tictac, 10000);
    actualizar();
    setInterval(actualizar, cfg.segundosRefresco * 1000);
    reiniciarCarrusel();
    requestAnimationFrame(animarBarra);

    document.addEventListener('keydown', (ev) => {
      const k = ev.key.toLowerCase();
      if (k === 'arrowright') rotarGrafica(1);
      else if (k === 'arrowleft') rotarGrafica(-1);
      else if (k === 'arrowdown' || k === 'arrowup') rotarPagina(k === 'arrowdown' ? 1 : -1);
      else if (k === 'r') actualizar();
      else if (k === 't')
        document.documentElement.dataset.tema =
          document.documentElement.dataset.tema === 'claro' ? 'oscuro' : 'claro';
      else if (k === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
    });

    $('#puntos-carrusel').addEventListener('click', () => rotarGrafica(1));

    let tempResize = null;
    window.addEventListener('resize', () => {
      clearTimeout(tempResize);
      tempResize = setTimeout(() => {
        indicePagina = 0;
        paginar();
      }, 400);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
