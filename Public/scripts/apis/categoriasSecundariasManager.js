// scripts/apis/categoriasSecundariasManager.js
// Cliente de API para Categorías Secundarias
// Debe coincidir con el montaje del server:
//   app.use('/categorias-secundarias', categoriasSecundariasRouter);
const BASE = '/categorias-secundarias';

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
  if (!Number.isInteger(n)) throw new Error(`${label} inválido`);
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
 * POST /categorias-secundarias/insert          (auth)
 *   @body:  { nombre:string<=100 }
 *   @return:{ success, message, data:[{ categoria_secundaria_id, nombre }] }
 *
 * POST /categorias-secundarias/update          (auth)
 *   @body:  { categoria_secundaria_id:int, nombre:string<=100 }
 *   @return:{ success, message, data:[{ categoria_secundaria_id, nombre }] }
 *
 * POST /categorias-secundarias/delete          (admin)
 *   @body:  { categoria_secundaria_id:int }
 *   @return:{ success, message }
 *
 * GET  /categorias-secundarias/get_all         (public)
 *   @return:{ success, message, data:Array<{ categoria_secundaria_id, nombre }> }
 *
 * GET  /categorias-secundarias/get_list        (public)
 *   @return:{ success, message, data:Array<{ categoria_secundaria_id, nombre }> }
 *
 * GET  /categorias-secundarias/por_id/:id      (public)
 *   @return:{ success, message, data:{ categoria_secundaria_id, nombre } } | 404
 */
export const categoriasSecundariasAPI = {
  // Crear
  insert: ({ nombre }) =>
    apiFetch('/insert', {
      method: 'POST',
      body: { nombre: validarNombre(nombre) }
    }),

  // Actualizar
  update: ({ categoria_secundaria_id, nombre }) =>
    apiFetch('/update', {
      method: 'POST',
      body: {
        categoria_secundaria_id: toIntOrThrow(categoria_secundaria_id, 'categoria_secundaria_id'),
        nombre: validarNombre(nombre)
      }
    }),

  // Eliminar
  remove: (categoria_secundaria_id) =>
    apiFetch('/delete', {
      method: 'POST',
      body: { categoria_secundaria_id: toIntOrThrow(categoria_secundaria_id, 'categoria_secundaria_id') }
    }),

  // Listados
  getAll:  () => apiFetch('/get_all'),
  getList: () => apiFetch('/get_list'),

  // Obtener por id
  getById: (categoria_secundaria_id) =>
    apiFetch(`/por_id/${encodeURIComponent(toIntOrThrow(categoria_secundaria_id, 'categoria_secundaria_id'))}`)
};
