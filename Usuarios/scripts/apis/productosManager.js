// scripts/apis/productosManager.js
// Envíos a la API de Productos (usa cookies de sesión)
const BASE = '/productos';

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

export const productosAPI = {
  // Listados base
  list:        () => apiFetch('/list'),
  listAll:     () => apiFetch('/all'),
  listAllActive: () => apiFetch('/all_active'),

  // Por identificadores/relaciones
  getOne:        (producto_id) => apiFetch(`/por_id/${encodeURIComponent(Number(producto_id))}`),
  listByCategoria: (categoria_id) => apiFetch(`/por_categoria/${encodeURIComponent(Number(categoria_id))}`),
  listByCaja:      (caja_id) => apiFetch(`/por_caja/${encodeURIComponent(Number(caja_id))}`),
  getDetalleCompleto: (producto_id) => apiFetch(`/detalle_completo/${encodeURIComponent(Number(producto_id))}`),

  // Búsquedas
  searchByName: (q) => apiFetch(`/search/name?q=${encodeURIComponent(String(q ?? ''))}`),
  searchByPrice: ({ min, max } = {}) => {
    const qs = new URLSearchParams();
    if (min != null && min !== '') qs.set('min', Number(min));
    if (max != null && max !== '') qs.set('max', Number(max));
    if (![...qs.keys()].length) throw new Error('Debes enviar min y/o max');
    return apiFetch(`/search/price?${qs.toString()}`);
  },

  // Mutaciones (ADMIN)
  insert: ({ nombre, descripcion, precio, categoria_id }) =>
    apiFetch('/insert', {
      method: 'POST',
      body: { nombre, descripcion: descripcion ?? null, precio: Number(precio), categoria_id: Number(categoria_id) }
    }),

  update: ({ producto_id, nombre, descripcion, precio, categoria_id }) =>
    apiFetch('/update', {
      method: 'POST',
      body: {
        producto_id: Number(producto_id),
        nombre,
        descripcion: descripcion ?? null,
        precio: Number(precio),
        categoria_id: Number(categoria_id)
      }
    }),

  softDelete: (producto_id) =>
    apiFetch('/soft_delete', { method: 'POST', body: { producto_id: Number(producto_id) } }),

  setPrecio: ({ producto_id, precio }) =>
    apiFetch('/set_precio', { method: 'POST', body: { producto_id: Number(producto_id), precio: Number(precio) } })
};
