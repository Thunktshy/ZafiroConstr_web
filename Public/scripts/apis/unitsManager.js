// scripts/apis/unitsManager.js
// Cliente de API para Units
// Debe coincidir con el montaje del server:
//   app.use('/units', unitsRouter);
const BASE = '/units';

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
  if (s.length > 50) throw new Error('nombre no puede exceder 50 caracteres');
  return s;
}

/**
 * Rutas del backend usadas:
 *
 * POST /units/insert        (auth)
 *   @body:  { nombre:string<=50 }
 *   @return:{ success, message, data:[{ unit_id /* y/o nombre * }] }
 *
 * POST /units/update        (auth)
 *   @body:  { unit_id:int, nombre:string<=50 }
 *   @return:{ success, message }
 *
 * POST /units/delete        (admin)
 *   @body:  { unit_id:int }
 *   @return:{ success, message }
 *
 * GET  /units/get_all       (public)
 *   @return:{ success, message, data:Array<{ unit_id, nombre }> }
 *
 * GET  /units/por_id/:id    (public)
 *   @return:{ success, message, data:{ unit_id, nombre } } | 404
 */
export const unitsAPI = {
  // Crear unidad
  insert: ({ nombre }) =>
    apiFetch('/insert', {
      method: 'POST',
      body: { nombre: validarNombre(nombre) }
    }),

  // Actualizar unidad
  update: ({ unit_id, nombre }) =>
    apiFetch('/update', {
      method: 'POST',
      body: { unit_id: toIntOrThrow(unit_id, 'unit_id'), nombre: validarNombre(nombre) }
    }),

  // Eliminar unidad
  remove: (unit_id) =>
    apiFetch('/delete', {
      method: 'POST',
      body: { unit_id: toIntOrThrow(unit_id, 'unit_id') }
    }),

  // Listados
  getAll: () => apiFetch('/get_all'),

  // Obtener por id
  getById: (unit_id) =>
    apiFetch(`/por_id/${encodeURIComponent(toIntOrThrow(unit_id, 'unit_id'))}`)
};
