// scripts/apis/subcategoriasManager.js
// Cliente de API para Subcategorías
// Debe coincidir con el montaje del server:
//   app.use('/subcategorias', subcategoriasRouter);
const BASE = '/subcategorias';

/** Extrae un mensaje de error legible desde { message } | { error } | texto. */
function extractErrorMessage(data, res) {
  if (data && typeof data === 'object') return data.message || data.error || `Error ${res.status}`;
  return typeof data === 'string' && data.trim() ? data : `Error ${res.status}`;
}

/**
 * apiFetch:
 * - credentials: 'include' (cookies/sesión)
 * - Content-Type JSON por defecto
 * - Parse JSON/text
 * - Lanza Error con mensaje claro si !res.ok
 */
async function apiFetch(path, { method = 'GET', body, bodyType } = {}) {
  const opts = { method, credentials: 'include', headers: { Accept: 'application/json' } };
  if (body != null) {
    if (!bodyType || bodyType === 'json') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    } else {
      opts.body = body; // FormData / binario
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(extractErrorMessage(data, res));
  return data;
}

/* --------------------------- Validadores simples -------------------------- */
function toIntOrThrow(v, label = 'id') {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} inválido`);
  return n;
}
function validarNombre(nombre) {
  const s = String(nombre ?? '').trim();
  if (!s) throw new Error('nombre es requerido');
  if (s.length > 100) throw new Error('nombre no puede exceder 100 caracteres');
  return s;
}

/**
 * Rutas del backend usadas:
 *
 * POST /subcategorias/insert          (auth)
 *   @body:  { nombre:string<=100 }
 *   @return:{ success, message, data:[{ subcategoria_id, nombre }] }
 *
 * POST /subcategorias/update          (auth)
 *   @body:  { subcategoria_id:int, nombre:string<=100 }
 *   @return:{ success, message, data:[{ subcategoria_id, nombre }] }
 *
 * POST /subcategorias/delete          (admin)
 *   @body:  { subcategoria_id:int }
 *   @return:{ success, message }
 *
 * GET  /subcategorias/get_all         (public)
 *   @return:{ success, message, data:Array<{ subcategoria_id, nombre }> }
 *
 * GET  /subcategorias/get_list        (public)
 *   @return:{ success, message, data:Array<{ subcategoria_id, nombre }> }
 *
 * GET  /subcategorias/por_id/:id      (public)
 *   @return:{ success, message, data:{ subcategoria_id, nombre } } | 404
 */
export const subcategoriasAPI = {
  // Crear
  insert: ({ nombre }) =>
    apiFetch('/insert', {
      method: 'POST',
      body: { nombre: validarNombre(nombre) }
    }),

  // Actualizar
  update: ({ subcategoria_id, nombre }) =>
    apiFetch('/update', {
      method: 'POST',
      body: {
        subcategoria_id: toIntOrThrow(subcategoria_id, 'subcategoria_id'),
        nombre: validarNombre(nombre)
      }
    }),

  // Eliminar
  remove: (subcategoria_id) =>
    apiFetch('/delete', {
      method: 'POST',
      body: { subcategoria_id: toIntOrThrow(subcategoria_id, 'subcategoria_id') }
    }),

  // Listados
  getAll:  () => apiFetch('/get_all'),
  getList: () => apiFetch('/get_list'),

  // Obtener por id
  getById: (subcategoria_id) =>
    apiFetch(`/por_id/${encodeURIComponent(toIntOrThrow(subcategoria_id, 'subcategoria_id'))}`)
};
