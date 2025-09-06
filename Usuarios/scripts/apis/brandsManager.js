// scripts/apis/brandsManager.js
// Envíos a la API de Brands (usa cookies de sesión)
// BASE debe coincidir con el montaje del server: app.use('/brands', brandsRouter)
const BASE = '/brands';

/** Extrae un mensaje de error útil desde { message } | { error } | texto. */
function extractErrorMessage(data, res) {
  if (data && typeof data === 'object') {
    return data.message || data.error || `Error ${res.status}`;
  }
  return typeof data === 'string' && data.trim() ? data : `Error ${res.status}`;
}

/**
 * apiFetch:
 * - credentials: 'include' (cookies de sesión)
 * - Content-Type JSON por defecto (o body raw si se indica)
 * - Parse seguro JSON/text
 * - Lanza Error con mensaje claro si !res.ok
 *
 * @param {string} path   Ruta relativa (p.ej. '/por_id/1')
 * @param {object} [opt]  { method, body, bodyType }
 * @returns {Promise<any>}
 */
async function apiFetch(path, { method = 'GET', body, bodyType } = {}) {
  const opts = { method, credentials: 'include', headers: { Accept: 'application/json' } };
  if (body != null) {
    if (!bodyType || bodyType === 'json') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    } else {
      // p.ej. FormData / binario
      opts.body = body;
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(extractErrorMessage(data, res));
  return data;
}

/** Convierte a entero seguro (o lanza). Útil porque el backend espera Number() en body/params. */
function toIntOrThrow(v, label = 'id') {
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`${label} inválido`);
  return n;
}

/**
 * Métodos disponibles (rutas del backend):
 *
 * POST /brands/insert        (auth)
 *    @params: { nombre:string<=50 }
 *    @return: { success, message, data?: [{ brand_id, nombre? }] }
 *
 * POST /brands/update        (auth)
 *    @params: { brand_id:int, nombre:string<=50 }
 *    @return: { success, message, data? }  (tu SP puede no devolver fila)
 *
 * POST /brands/delete        (admin)
 *    @params: { brand_id:int }
 *    @return: { success, message }
 *
 * GET  /brands/get_all       (public)
 *    @params: —
 *    @return: { success, message, data: Array<{ brand_id, nombre }> }
 *
 * GET  /brands/por_id/:id    (public)
 *    @params: id en URL (int)
 *    @return: { success, message, data: { brand_id, nombre } } | 404
 */
export const brandsAPI = {
  // Alta
  insert: ({ nombre }) =>
    apiFetch('/insert', { method: 'POST', body: { nombre } }),

  // Actualización
  update: ({ brand_id, nombre }) =>
    apiFetch('/update', {
      method: 'POST',
      body: { brand_id: toIntOrThrow(brand_id, 'brand_id'), nombre }
    }),

  // Baja
  remove: (brand_id) =>
    apiFetch('/delete', {
      method: 'POST',
      body: { brand_id: toIntOrThrow(brand_id, 'brand_id') }
    }),

  // Consultas
  getAll: () => apiFetch('/get_all'),

  getById: (brand_id) =>
    apiFetch(`/por_id/${encodeURIComponent(toIntOrThrow(brand_id, 'brand_id'))}`)
};
