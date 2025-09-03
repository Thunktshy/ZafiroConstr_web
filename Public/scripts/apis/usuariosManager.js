// scripts/apis/usuariosManager.js
// Cliente de API para Usuarios (CRUD y utilidades) — SIN auth (login/logout/status)
const BASE = '/usuarios';

/** Mensaje de error legible */
function extractErrorMessage(data, res) {
  if (data && typeof data === 'object') return data.message || data.error || `Error ${res.status}`;
  return typeof data === 'string' && data.trim() ? data : `Error ${res.status}`;
}

/** apiFetch con cookies y JSON por defecto */
async function apiFetch(path, { method = 'GET', body, bodyType } = {}) {
  const opts = { method, credentials: 'include', headers: { Accept: 'application/json' } };
  if (body != null) {
    if (!bodyType || bodyType === 'json') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    } else {
      opts.body = body;
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(extractErrorMessage(data, res));
  return data;
}

/* --------------------------- Validadores simples -------------------------- */
const toIntOrThrow = (v, label='id') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} inválido`);
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
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(String(e));

/**
 * Rutas backend esperadas:
 * POST /usuarios/insert          (auth)
 * POST /usuarios/update          (auth)
 * POST /usuarios/delete          (admin)
 * GET  /usuarios/get_all         (admin)
 * GET  /usuarios/por_id/:id      (auth)
 * GET  /usuarios/por_email/:em   (auth)
 * GET  /usuarios/login_lookup/:email   (público)
 * POST /usuarios/set_tipo        (admin)
 * POST /usuarios/set_admin       (admin)
 */
export const usuariosAPI = {
  insert: ({ nombre, contrasena, email, tipo = null }) =>
    apiFetch('/insert', {
      method: 'POST',
      body: {
        nombre: limitLen(nonEmpty(nombre, 'nombre'), 100, 'nombre'),
        contrasena: limitLen(nonEmpty(contrasena, 'contrasena'), 255, 'contrasena'),
        email: (e => { if (!emailOk(e)) throw new Error('email inválido'); return e; })(email),
        tipo: tipo == null ? null : limitLen(String(tipo), 10, 'tipo')
      }
    }),

  update: ({ usuario_id, nombre, email, tipo = null }) =>
    apiFetch('/update', {
      method: 'POST',
      body: {
        usuario_id: toIntOrThrow(usuario_id, 'usuario_id'),
        nombre: limitLen(nonEmpty(nombre, 'nombre'), 100, 'nombre'),
        email: (e => { if (!emailOk(e)) throw new Error('email inválido'); return e; })(email),
        tipo: tipo == null ? null : limitLen(String(tipo), 10, 'tipo')
      }
    }),

  remove: (usuario_id) =>
    apiFetch('/delete', {
      method: 'POST',
      body: { usuario_id: toIntOrThrow(usuario_id, 'usuario_id') }
    }),

  getAll: () => apiFetch('/get_all'),

  getById: (usuario_id) =>
    apiFetch(`/por_id/${encodeURIComponent(toIntOrThrow(usuario_id, 'usuario_id'))}`),

  getByEmail: (email) => {
    if (!emailOk(email)) throw new Error('email inválido');
    return apiFetch(`/por_email/${encodeURIComponent(email)}`);
  },

  // Público — para lookup previo a login (no devuelve contrasena en tu router)
  loginLookup: (email) => {
    if (!emailOk(email)) throw new Error('email inválido');
    return apiFetch(`/login_lookup/${encodeURIComponent(email)}`);
  },

  setTipo: ({ usuario_id, tipo }) =>
    apiFetch('/set_tipo', {
      method: 'POST',
      body: {
        usuario_id: toIntOrThrow(usuario_id, 'usuario_id'),
        tipo: limitLen(nonEmpty(tipo, 'tipo'), 10, 'tipo')
      }
    }),

  setAdmin: (usuario_id) =>
    apiFetch('/set_admin', {
      method: 'POST',
      body: { usuario_id: toIntOrThrow(usuario_id, 'usuario_id') }
    })
};
