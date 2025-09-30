// imagesManager.js
// API para gestión de imágenes de productos

const BASE = '/imagenes';

// Helper: fetch JSON with sane defaults
async function requestJSON(url, options = {}) {
  const res = await fetch(url, options);
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const msg = data?.error || data?.message || res.statusText || 'Error de red';
    throw new Error(msg);
  }
  return data;
}

const imagenesAPI = {
  /**
   * Obtener todas las imágenes
   * GET /api/imagenes
   */
  async getAll() {
    return requestJSON(`${BASE}`, { method: 'GET' });
  },

  /**
   * Obtener imágenes por producto
   * GET /api/imagenes/by-producto/:producto_id
   */
  async getByProducto(producto_id) {
    return requestJSON(`${BASE}/by-producto/${producto_id}`, { method: 'GET' });
  },

  /**
   * Subir/insertar imagen de producto (multipart)
   * POST /api/imagenes
   * form-data: { file: <binary>, producto_id: <int> }
   */
  async insert({ producto_id, file }) {
    if (!file) throw new Error('Archivo de imagen requerido');
    if (!producto_id) throw new Error('producto_id es obligatorio');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('producto_id', String(producto_id));

    // Importante: NO establecer Content-Type, fetch lo maneja con boundary
    return requestJSON(`${BASE}`, {
      method: 'POST',
      body: fd
    });
  },

  /**
   * Actualizar imagen (puede cambiar producto_id y/o reemplazar archivo)
   * PUT /api/imagenes/:imagen_id
   * form-data opcional: { file?: <binary>, producto_id?: <int> }
   */
  async update({ imagen_id, producto_id, file }) {
    if (!imagen_id) throw new Error('imagen_id es obligatorio');

    const fd = new FormData();
    if (file) fd.append('file', file);
    if (producto_id != null) fd.append('producto_id', String(producto_id));

    return requestJSON(`${BASE}/${imagen_id}`, {
      method: 'PUT',
      body: fd
    });
  },

  /**
   * Eliminar imagen
   * DELETE /api/imagenes/:imagen_id
   */
  async remove(imagen_id) {
    if (!imagen_id) throw new Error('imagen_id es obligatorio');
    return requestJSON(`${BASE}/${imagen_id}`, { method: 'DELETE' });
  },

  /**
   * Refrescar lista de productos sin imágenes (id + nombre)
   * GET /api/imagenes/refresh-missing-products
   * Respuesta: [ { producto_id, nombre }, ... ]
   */
  async refreshMissingProducts() {
    return requestJSON(`${BASE}/refresh-missing-products`, { method: 'GET' });
  }
};

export { imagenesAPI };
