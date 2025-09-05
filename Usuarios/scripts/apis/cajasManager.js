// scripts/apis/cajasManager.js
// Cliente de API para Cajas
// BASE debe coincidir con el montaje del server: app.use('/cajas', cajasRouter)
const BASE = '/cajas';

/** Extrae un mensaje de error legible desde { message } | { error } | texto. */
function extractErrorMessage(data, res) {
  if (data && typeof data === 'object') {
    return data.message || data.error || `Error ${res.status}`;
  }
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
      opts.body = body; // p.ej. FormData
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
function toIntInRangeOrThrow(v, min, max, label) {
  const n = toIntOrThrow(v, label);
  if (n < min || n > max) throw new Error(`${label} fuera de rango [${min}-${max}]`);
  return n;
}
function validarLetra(letra) {
  const s = String(letra ?? '').trim();
  if (!/^[A-Za-z]{1,2}$/.test(s)) throw new Error('letra debe ser 1–2 letras (A–Z)');
  return s.toUpperCase();
}

/**
 * Rutas del backend usadas:
 *
 * POST /cajas/insert            (auth)
 *   @params body: { letra: string(1-2), cara: int(1..2), nivel: int(>=1) }
 *   @return: { success, message, data: [{ caja_id, letra, cara, nivel, etiqueta }] }
 *
 * POST /cajas/update            (auth)
 *   @params body: { caja_id:int, letra:string, cara:int, nivel:int }
 *   @return: { success, message, data: [{ ... }] }
 *
 * POST /cajas/delete            (admin)
 *   @params body: { caja_id:int }
 *   @return: { success, message }
 *
 * GET  /cajas/get_all           (public)
 *   @return: { success, message, data: Array<{ caja_id, letra, cara, nivel, etiqueta }> }
 *
 * GET  /cajas/get_list          (public)
 *   @return: { success, message, data: Array<{ caja_id, etiqueta }> }
 *
 * GET  /cajas/por_id/:caja_id   (public)
 *   @return: { success, message, data: { caja_id, letra, cara, nivel, etiqueta } } | 404
 */
export const cajasAPI = {
  // Crear caja
  insert: ({ letra, cara, nivel }) =>
    apiFetch('/insert', {
      method: 'POST',
      body: {
        letra: validarLetra(letra),
        cara: toIntInRangeOrThrow(cara, 1, 2, 'cara'),
        nivel: toIntInRangeOrThrow(nivel, 1, 99, 'nivel')
      }
    }),

  // Actualizar caja
  update: ({ caja_id, letra, cara, nivel }) =>
    apiFetch('/update', {
      method: 'POST',
      body: {
        caja_id: toIntOrThrow(caja_id, 'caja_id'),
        letra: validarLetra(letra),
        cara: toIntInRangeOrThrow(cara, 1, 2, 'cara'),
        nivel: toIntInRangeOrThrow(nivel, 1, 99, 'nivel')
      }
    }),

  // Eliminar caja
  remove: (caja_id) =>
    apiFetch('/delete', {
      method: 'POST',
      body: { caja_id: toIntOrThrow(caja_id, 'caja_id') }
    }),

  // Listados
  getAll: () => apiFetch('/get_all'),
  getList: () => apiFetch('/get_list'),

  // Obtener por id
  getById: (caja_id) =>
    apiFetch(`/por_id/${encodeURIComponent(toIntOrThrow(caja_id, 'caja_id'))}`)
};
