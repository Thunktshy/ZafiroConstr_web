// scripts/apis/categoriasManager.js
// Envíos a la API de Categorías (usa cookies de sesión)
const BASE = '/categorias';

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

export const categoriasAPI = {
  // GET /categorias/all
  listAll: () => apiFetch('/all'),
  // GET /categorias/list
  list: () => apiFetch('/list'),
  // GET /categorias/por_id/:id
  getOne: (categoria_id) => apiFetch(`/por_id/${encodeURIComponent(Number(categoria_id))}`),

  // POST /categorias/insert (ADMIN)
  insert: ({ nombre, descripcion }) =>
    apiFetch('/insert', { method: 'POST', body: { nombre, descripcion: descripcion ?? null } }),

  // POST /categorias/update (ADMIN)
  update: ({ categoria_id, nombre, descripcion }) =>
    apiFetch('/update', { method: 'POST', body: { categoria_id: Number(categoria_id), nombre, descripcion: descripcion ?? null } }),

  // POST /categorias/delete (ADMIN)
  remove: (categoria_id) =>
    apiFetch('/delete', { method: 'POST', body: { categoria_id: Number(categoria_id) } })
};
