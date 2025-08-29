// scripts/apis/stockManager.js
// Envíos a la API de Stock (usa cookies de sesión)
const BASE = '/stock';

function extractErrorMessage(data, res) {
  if (data && typeof data === 'object') return data.message || data.error || `Error ${res.status}`;
  return typeof data === 'string' && data.trim() ? data : `Error ${res.status}`;
}

async function apiFetch(path, { method = 'GET', body, bodyType } = {}) {
  const opts = { method, credentials: 'include', headers: { Accept: 'application/json' } };
  if (body != null) {
    if (!bodyType || bodyType === 'json') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    } else {
      opts.body = body;
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(extractErrorMessage(data, res));
  return data;
}

export const stockAPI = {
  // Lecturas
  listAll:       () => apiFetch('/all'),
  byProducto:    (producto_id) => apiFetch(`/producto/${encodeURIComponent(Number(producto_id))}`),
  detalleById:   (detalle_id) => apiFetch(`/detalle/${encodeURIComponent(Number(detalle_id))}`),

  // Nuevas lecturas
  byCategoria:   (categoria_id) => apiFetch(`/categoria/${encodeURIComponent(Number(categoria_id))}`),
  auditBajo:     () => apiFetch('/audit/bajo'),
  auditSin:      () => apiFetch('/audit/sin'),
  resumen:       () => apiFetch('/resumen'),
  detallesByProducto: (producto_id) => apiFetch(`/detalles/por_producto/${encodeURIComponent(Number(producto_id))}`),

  // Mutaciones
  add: ({ caja_id, producto_id, delta }) =>
    apiFetch('/add', {
      method: 'POST',
      body: { caja_id: Number(caja_id), producto_id: Number(producto_id), delta: Number(delta) }
    }),

  remove: ({ caja_id, producto_id, delta }) =>
    apiFetch('/remove', {
      method: 'POST',
      body: { caja_id: Number(caja_id), producto_id: Number(producto_id), delta: Number(delta) }
    }),

  move: ({ caja_origen, caja_destino, producto_id, delta }) =>
    apiFetch('/move', {
      method: 'POST',
      body: {
        caja_origen: Number(caja_origen),
        caja_destino: Number(caja_destino),
        producto_id: Number(producto_id),
        delta: Number(delta)
      }
    }),

  setByDetalle: ({ detalle_id, caja_id, producto_id, stock }) =>
    apiFetch('/set_by_detalle', {
      method: 'POST',
      body: {
        detalle_id: Number(detalle_id),
        caja_id: Number(caja_id),
        producto_id: Number(producto_id),
        stock: Number(stock)
      }
    }),

  detalleDelete: (detalle_id) =>
    apiFetch('/detalle_delete', { method: 'POST', body: { detalle_id: Number(detalle_id) } }),

  // Nueva creación de detalle
  detalleInsert: ({ caja_id, producto_id, stock }) =>
    apiFetch('/detalle_insert', {
      method: 'POST',
      body: { caja_id: Number(caja_id), producto_id: Number(producto_id), stock: Number(stock) }
    })
};

