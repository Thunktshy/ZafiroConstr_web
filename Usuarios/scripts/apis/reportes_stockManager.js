// scripts/apis/reportes_stockManager.js
// Cliente de API para Reportes de Stock
// Debe coincidir con el montaje del server:
//   app.use('/reportes-stock', reportesStockRouter);
const BASE = '/reportes-stock';

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

/**
 * ENDPOINTS BACKEND (rutas ya creadas):
 *
 * GET  /reportes-stock/get_all_stock   (public)
 *   @params: —
 *   @returns: { success, message, data: Array<{ producto_id, nombre, precio, stock, valor_inventario }> }
 *
 * GET  /reportes-stock/get_stock       (public)
 *   @params: —
 *   @returns: { success, message, data: Array<{ producto_id, producto_nombre, stock_total }> }
 *
 * GET  /reportes-stock/get_stock_por_categoria/:categoria_id   (public)
 *   @params: categoria_id en URL (int)
 *   @returns: { success, message, data: Array<{ producto_id, producto_nombre, categoria_id, categoria_nombre, stock_total }> }
 */
export const reportesStockAPI = {
  /** Reporte con valor de inventario por producto (incluye precio y stock). */
  getAllStock: () => apiFetch('/get_all_stock'),

  /** Stock total (solo productos activos). */
  getStockActivos: () => apiFetch('/get_stock'),

  /** Stock total filtrado por categoría principal. */
  getStockPorCategoria: (categoria_id) =>
    apiFetch(`/get_stock_por_categoria/${encodeURIComponent(toIntOrThrow(categoria_id, 'categoria_id'))}`)
};
