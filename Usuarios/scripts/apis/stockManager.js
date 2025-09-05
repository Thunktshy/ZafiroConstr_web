// scripts/apis/stockManager.js
// Cliente de API para operaciones de STOCK
// Debe coincidir con el montaje del server:
//   app.use('/stock', stockRouter);
const BASE = '/stock';

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
const toIntOrThrow = (v, label = 'id') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} inválido`);
  return n;
};
const toNonZeroInt = (v, label = 'cantidad') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n === 0) throw new Error(`${label} debe ser entero != 0`);
  return n;
};
const toPosInt = (v, label = 'cantidad') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} debe ser entero > 0`);
  return n;
};
const toNonNegInt = (v, label = 'stock') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label} debe ser entero >= 0`);
  return n;
};

/**
 * ENDPOINTS BACKEND (rutas ya creadas):
 *
 * GET  /stock/producto/:producto_id            (public)
 *   @returns: { success, message, data:[ { detalle_id, etiqueta, producto_id, stock } ] }
 *
 * GET  /stock/detalles_por_producto/:producto_id   (public)
 *   @returns: { success, message, data:[ { detalle_id, etiqueta, producto_id, stock } ] }
 *
 * GET  /stock/detalle_por_id/:detalle_id       (public)
 *   @returns: { success, message, data:{ detalle_id, caja_id, etiqueta, producto_id, stock } } | 404
 *
 * POST /stock/add       (auth)
 *   @body: { caja_id:int, producto_id:int, delta:int>0 }
 *   @returns: { success, message, data:[ { detalle_id, caja_id, producto_id, stock } ] }
 *
 * POST /stock/remove    (auth)
 *   @body: { caja_id:int, producto_id:int, delta:int>0 }
 *   @returns: { success, message, data:[ { detalle_id, caja_id, producto_id, stock } ] }
 *
 * POST /stock/set_by_detalle  (auth)
 *   @body: { detalle_id:int, producto_id:int, stock:int>=0 }
 *   @returns: { success, message, data:[ { detalle_id, etiqueta, producto_id, stock } ] }
 *
 * POST /stock/move      (auth)
 *   @body: { producto_id:int, caja_origen:int, caja_destino:int, cantidad:int>0 }
 *   @returns: { success, message, data:[
 *               { tipo:'origen',  detalle_id, etiqueta, producto_id, stock },
 *               { tipo:'destino', detalle_id, etiqueta, producto_id, stock }
 *             ] }
 */
export const stockAPI = {
  /* --------------------------------- Lecturas -------------------------------- */

  /** Stock por producto (vista consolidada por detalle/caja). */
  getByProducto: (producto_id) =>
    apiFetch(`/producto/${encodeURIComponent(toIntOrThrow(producto_id, 'producto_id'))}`),

  /** Detalles (cajas_detalles) por producto. */
  getDetallesPorProducto: (producto_id) =>
    apiFetch(`/detalles_por_producto/${encodeURIComponent(toIntOrThrow(producto_id, 'producto_id'))}`),

  /** Un detalle específico por su id. */
  getDetallePorId: (detalle_id) =>
    apiFetch(`/detalle_por_id/${encodeURIComponent(toIntOrThrow(detalle_id, 'detalle_id'))}`),

  /* ------------------------------- Mutaciones -------------------------------- */

  /**
   * Agregar unidades de un producto a una caja.
   * @param {{ caja_id:number, producto_id:number, delta:number>0 }} p
   */
  add: (p) =>
    apiFetch('/add', {
      method: 'POST',
      body: {
        caja_id: toIntOrThrow(p.caja_id, 'caja_id'),
        producto_id: toIntOrThrow(p.producto_id, 'producto_id'),
        delta: toPosInt(p.delta, 'delta') // debe ser > 0
      }
    }),

  /**
   * Retirar unidades de un producto desde una caja.
   * @param {{ caja_id:number, producto_id:number, delta:number>0 }} p
   */
  remove: (p) =>
    apiFetch('/remove', {
      method: 'POST',
      body: {
        caja_id: toIntOrThrow(p.caja_id, 'caja_id'),
        producto_id: toIntOrThrow(p.producto_id, 'producto_id'),
        delta: toPosInt(p.delta, 'delta') // debe ser > 0
      }
    }),

  /**
   * Fijar el stock exacto de un detalle (caja+producto).
   * @param {{ detalle_id:number, producto_id:number, stock:number>=0 }} p
   */
  setByDetalle: (p) =>
    apiFetch('/set_by_detalle', {
      method: 'POST',
      body: {
        detalle_id: toIntOrThrow(p.detalle_id, 'detalle_id'),
        producto_id: toIntOrThrow(p.producto_id, 'producto_id'),
        stock: toNonNegInt(p.stock, 'stock')
      }
    }),

  /**
   * Mover stock entre dos cajas para un producto.
   * @param {{ producto_id:number, caja_origen:number, caja_destino:number, cantidad:number>0 }} p
   */
  move: (p) =>
    apiFetch('/move', {
      method: 'POST',
      body: {
        producto_id: toIntOrThrow(p.producto_id, 'producto_id'),
        caja_origen: toIntOrThrow(p.caja_origen, 'caja_origen'),
        caja_destino: toIntOrThrow(p.caja_destino, 'caja_destino'),
        cantidad: toPosInt(p.cantidad, 'cantidad')
      }
    })
};
