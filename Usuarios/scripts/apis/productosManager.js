// scripts/apis/productosManager.js
// Cliente de API para Productos
// Debe coincidir con el montaje del server:
//   app.use('/productos', productosRouter);
const BASE = '/productos';

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
const isInt = (v) => Number.isInteger(Number(v));
const toIntOrThrow = (v, label = 'id') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} inválido`);
  return n;
};
const toNumberOrThrow = (v, label) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${label} inválido`);
  return n;
};
const nonEmpty = (s, label) => {
  const v = String(s ?? '').trim();
  if (!v) throw new Error(`${label} es requerido`);
  return v;
};
const limitLen = (s, max, label) => {
  const v = String(s ?? '').trim();
  if (v.length > max) throw new Error(`${label} no puede exceder ${max} caracteres`);
  return v;
};
const toNullableInt = (v, label) => (v == null || v === '' ? null : toIntOrThrow(v, label));

/* ------------------------------ Normalizadores ---------------------------- */
function normalizeInsertUpdatePayload(p, { requireId = false } = {}) {
  // Campos obligatorios
  const nombre = limitLen(nonEmpty(p.nombre, 'nombre'), 100, 'nombre');
  const descripcion = p.descripcion == null ? null : limitLen(String(p.descripcion), 255, 'descripcion');
  const precio = toNumberOrThrow(p.precio, 'precio');
  const categoria_principal_id = toIntOrThrow(p.categoria_principal_id, 'categoria_principal_id');
  const categoria_secundaria_id = toNullableInt(p.categoria_secundaria_id, 'categoria_secundaria_id');
  const subcategoria_id = toNullableInt(p.subcategoria_id, 'subcategoria_id');
  const unit_id = toIntOrThrow(p.unit_id, 'unit_id');
  const unit_value = toNumberOrThrow(p.unit_value, 'unit_value');
  const size_id = toIntOrThrow(p.size_id, 'size_id');
  const size_value = limitLen(nonEmpty(p.size_value, 'size_value'), 50, 'size_value');
  const brand_id = toIntOrThrow(p.brand_id, 'brand_id');

  const payload = {
    nombre, descripcion, precio,
    categoria_principal_id, categoria_secundaria_id, subcategoria_id,
    unit_id, unit_value, size_id, size_value, brand_id
  };

  if (requireId) {
    payload.producto_id = toIntOrThrow(p.producto_id, 'producto_id');
    if (p.estado !== undefined) {
      if (!([0,1,true,false,null].includes(p.estado))) throw new Error('estado inválido');
      payload.estado = p.estado == null ? null : (p.estado ? 1 : 0);
    }
  }
  return payload;
}

/**
 * ENDPOINTS BACKEND (rutas ya creadas):
 *
 * POST /productos/insert (auth)
 *   @body: {
 *     nombre, descripcion?, precio,
 *     categoria_principal_id, categoria_secundaria_id?, subcategoria_id?,
 *     unit_id, unit_value, size_id, size_value, brand_id
 *   }
 *   @return: { success, message, data:[{ producto_id, ...uniones..., fecha_creacion }] }
 *
 * POST /productos/update (auth)
 *   @body: { producto_id, ...campos de insert..., estado? }
 *   @return: { success, message, data:[{ producto_id, ... }] }
 *
 * POST /productos/soft_delete (auth)
 *   @body: { producto_id }
 *   @return: { success, message, data:[{ producto_id, nombre, descripcion, precio, estado }] }
 *
 * POST /productos/delete (admin)
 *   @body: { producto_id, force?:bit }
 *   @return: { success, message, data:[{ producto_id, estado_operacion: 'Eliminado' }] }
 *
 * GET  /productos/get_all (public)
 * GET  /productos/get_all_active (public)
 * GET  /productos/get_list (public)
 * GET  /productos/por_id/:producto_id (public)
 * GET  /productos/por_categoria/:categoria_principal_id (public)
 * GET  /productos/por_caja/:caja_id (public)
 * GET  /productos/buscar_por_nombre/:search_term (public)
 * GET  /productos/buscar_por_precio?min=&max= (public)
 * GET  /productos/por_cajas (public)   // resumen por caja
 */
export const productosAPI = {
  /* ------------------------------ Altas/Cambios ------------------------------ */

  insert: (payload) =>
    apiFetch('/insert', {
      method: 'POST',
      body: normalizeInsertUpdatePayload(payload)
    }),

  update: (payload) =>
    apiFetch('/update', {
      method: 'POST',
      body: normalizeInsertUpdatePayload(payload, { requireId: true })
    }),

  softDelete: (producto_id) =>
    apiFetch('/soft_delete', {
      method: 'POST',
      body: { producto_id: toIntOrThrow(producto_id, 'producto_id') }
    }),

  remove: (producto_id, { force = false } = {}) =>
    apiFetch('/delete', {
      method: 'POST',
      body: { producto_id: toIntOrThrow(producto_id, 'producto_id'), force: !!force }
    }),

  /* --------------------------------- Lecturas -------------------------------- */

  getAll: () => apiFetch('/get_all'),

  getAllActive: () => apiFetch('/get_all_active'),

  getList: () => apiFetch('/get_list'),

  getById: (producto_id) =>
    apiFetch(`/por_id/${encodeURIComponent(toIntOrThrow(producto_id, 'producto_id'))}`),

  getByCategoria: (categoria_principal_id) =>
    apiFetch(`/por_categoria/${encodeURIComponent(toIntOrThrow(categoria_principal_id, 'categoria_principal_id'))}`),

  getByCaja: (caja_id) =>
    apiFetch(`/por_caja/${encodeURIComponent(toIntOrThrow(caja_id, 'caja_id'))}`),

  buscarPorNombre: (search_term) => {
    const term = limitLen(nonEmpty(search_term, 'search_term'), 100, 'search_term');
    return apiFetch(`/buscar_por_nombre/${encodeURIComponent(term)}`);
  },

  buscarPorPrecio: ({ min = null, max = null } = {}) => {
    const qs = new URLSearchParams();
    if (min != null) {
      const n = toNumberOrThrow(min, 'min');
      if (n < 0) throw new Error('min debe ser >= 0');
      qs.set('min', String(n));
    }
    if (max != null) {
      const n = toNumberOrThrow(max, 'max');
      if (n < 0) throw new Error('max debe ser >= 0');
      qs.set('max', String(n));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch(`/buscar_por_precio${suffix}`);
  },

  // Resumen por cajas (valor por caja, etc.)
  getByCajasResumen: () => apiFetch('/por_cajas')
};

/* --------------------------------- Helpers --------------------------------- */
/**
 * Ejemplo de payload válido para insert/update:
 * {
 *   nombre: "Café 500g",
 *   descripcion: "Grano",
 *   precio: 120.50,
 *   categoria_principal_id: 1,
 *   categoria_secundaria_id: null,
 *   subcategoria_id: null,
 *   unit_id: 1, unit_value: 1,
 *   size_id: 1, size_value: "500g",
 *   brand_id: 1,
 *   // en update opcional: estado: true|false
 * }
 */
