// scripts/apis/categoriasManager.js
// Cliente de API para Categorías
// Debe coincidir con el montaje del server:
//   app.use('/categorias', categoriasRouter);
const BASE = '/categorias';

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
function validarDescripcion(desc) {
  if (desc == null) return null;
  const s = String(desc).trim();
  if (s.length > 255) throw new Error('descripcion no puede exceder 255 caracteres');
  return s || null;
}

/**
 * Rutas del backend usadas:
 *
 * POST /categorias/insert           (auth)
 *   @body:  { nombre:string<=100, descripcion?:string<=255|null }
 *   @return:{ success, message, data:[{ categoria_id, nombre, descripcion }] }
 *
 * POST /categorias/update           (auth)
 *   @body:  { categoria_id:int, nombre:string<=100, descripcion?:string<=255|null }
 *   @return:{ success, message, data:[{ categoria_id, nombre, descripcion }] }
 *
 * POST /categorias/delete           (admin)
 *   @body:  { categoria_id:int }
 *   @return:{ success, message }
 *
 * GET  /categorias/get_all          (public)
 *   @return:{ success, message, data:Array<{ categoria_id, nombre, descripcion }> }
 *
 * GET  /categorias/get_list         (public)
 *   @return:{ success, message, data:Array<{ categoria_id, nombre }> }
 *
 * GET  /categorias/por_id/:id       (public)
 *   @return:{ success, message, data:{ categoria_id, nombre, descripcion } } | 404
 */
export const categoriasAPI = {
  // Crear
  insert: ({ nombre, descripcion }) =>
    apiFetch('/insert', {
      method: 'POST',
      body: { nombre: validarNombre(nombre), descripcion: validarDescripcion(descripcion) }
    }),

  // Actualizar
  update: ({ categoria_id, nombre, descripcion }) =>
    apiFetch('/update', {
      method: 'POST',
      body: {
        categoria_id: toIntOrThrow(categoria_id, 'categoria_id'),
        nombre: validarNombre(nombre),
        descripcion: validarDescripcion(descripcion)
      }
    }),

  // Eliminar
  remove: (categoria_id) =>
    apiFetch('/delete', {
      method: 'POST',
      body: { categoria_id: toIntOrThrow(categoria_id, 'categoria_id') }
    }),

  // Listados
  getAll:  () => apiFetch('/get_all'),
  getList: () => apiFetch('/get_list'),

  // Obtener por id
  getById: (categoria_id) =>
    apiFetch(`/por_id/${encodeURIComponent(toIntOrThrow(categoria_id, 'categoria_id'))}`)
};
