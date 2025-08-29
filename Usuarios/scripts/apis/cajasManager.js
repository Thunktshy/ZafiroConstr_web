// scripts/apis/cajasManager.js
// Envíos a la API de Cajas (usa cookies de sesión)
// Debe coincidir con el montaje del server: app.use('/cajas', CajasRouter)
const BASE = '/cajas';

/** Extrae mensaje de error útil desde { message } | { error } | texto. */
function extractErrorMessage(data, res) {
  if (data && typeof data === 'object') return data.message || data.error || `Error ${res.status}`;
  return typeof data === 'string' && data.trim() ? data : `Error ${res.status}`;
}

/** apiFetch con cookies + JSON por defecto */
async function apiFetch(path, { method = 'GET', body, bodyType } = {}) {
  const opts = { method, credentials: 'include', headers: { Accept: 'application/json' } };
  if (body != null) {
    if (!bodyType || bodyType === 'json') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    } else {
      opts.body = body; // FormData/binario
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(extractErrorMessage(data, res));
  return data;
}

export const cajasAPI = {
  // GET /cajas/all
  listAll: () => apiFetch('/all'),
  // GET /cajas/list
  list: () => apiFetch('/list'),
  // GET /cajas/por_id/:caja_id
  getOne: (caja_id) => apiFetch(`/por_id/${encodeURIComponent(Number(caja_id))}`),

  // POST /cajas/insert  (ADMIN)
  insert: ({ letra, cara, nivel }) =>
    apiFetch('/insert', { method: 'POST', body: { letra, cara: Number(cara), nivel: Number(nivel) } }),

  // POST /cajas/update  (ADMIN)
  update: ({ caja_id, letra, cara, nivel }) =>
    apiFetch('/update', { method: 'POST', body: { caja_id: Number(caja_id), letra, cara: Number(cara), nivel: Number(nivel) } }),

  // POST /cajas/delete  (ADMIN)
  remove: (caja_id) =>
    apiFetch('/delete', { method: 'POST', body: { caja_id: Number(caja_id) } })
};
