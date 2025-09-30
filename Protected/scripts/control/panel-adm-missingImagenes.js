// panel-adm-missingImagenes.js
// Control de UI para asignar imágenes a productos sin imagen

import { imagenesAPI } from '/admin-resources/scripts/api/imagesManager.js';

/* =========================
   Toasts (ligeros)
   ========================= */
const toastContainer = document.getElementById('toastContainer');
function showToast(message, type = 'info', icon = null, timeout = 3500) {
  if (!toastContainer) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${icon ? `<i class="fa-solid ${icon}"></i>` : ''}<span>${message}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(4px)'; setTimeout(() => el.remove(), 180); }, timeout);
}
function friendlyError(err) {
  const msg = (err && err.message) ? String(err.message) : '';
  const isNet =
    (err && err.name === 'TypeError' && /fetch/i.test(msg)) ||
    /Failed to fetch|NetworkError|ERR_NETWORK|ERR_CONNECTION|The network connection was lost/i.test(msg) ||
    (typeof navigator !== 'undefined' && navigator.onLine === false);
  return msg || (isNet ? 'No hay conexión con el servidor' : 'No hay conexión con el servidor');
}

/* =========================
   DOM refs
   ========================= */
const tablaEl = document.getElementById('tablaFaltantes');
const btnRefrescar = document.getElementById('btnRefrescar');

// Modal
const modal = document.getElementById('modalAgregarImagen');
const modalProductoInput = document.getElementById('modal_producto_id');
const fileImagenInput = document.getElementById('fileImagen');
const btnConfirmAgregar = document.getElementById('btnConfirmAgregar');

/* =========================
   Helpers modal
   ========================= */
function openModal(producto_id) {
  modalProductoInput.value = producto_id;
  document.querySelector('main')?.setAttribute('inert', '');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  fileImagenInput.value = '';
  fileImagenInput.focus();
}
function closeModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.querySelector('main')?.removeAttribute('inert');
}
modal.addEventListener('click', e => {
  if (e.target === modal || e.target.hasAttribute('data-close')) closeModal();
});

/* =========================
   DataTable
   ========================= */
let dt;
async function cargarTabla() {
  try {
    const resp = await imagenesAPI.refreshMissingProducts(); // GET /imagenes/refresh-missing-products
    const data = Array.isArray(resp) ? resp : (resp?.data ?? []);

    if (dt) {
      dt.clear();
      dt.rows.add(data).draw();
      return;
    }

    dt = window.jQuery(tablaEl).DataTable({
      data,
      columns: [
        { data: 'producto_id', title: 'Producto ID' },
        { data: 'nombre', title: 'Nombre' },
        {
          data: null,
          title: 'Acciones',
          className: 'dt-center',
          orderable: false,
          render: (_data, _type, row) => {
            return `
              <button class="btn btn-outline" data-action="agregar" data-id="${row.producto_id}">
                <i class="fa-solid fa-image"></i> Agregar imagen
              </button>
            `;
          }
        }
      ],
      pageLength: 10,
      lengthMenu: [10, 25, 50],
      order: [[1, 'asc']],
      language: {
        url: 'https://cdn.datatables.net/plug-ins/1.13.8/i18n/es-ES.json'
      }
    });

    // Delegación para botones
    tablaEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="agregar"]');
      if (!btn) return;
      const producto_id = Number(btn.getAttribute('data-id'));
      openModal(producto_id);
    });

  } catch (err) {
    console.error(err);
    showToast(friendlyError(err), 'error', 'fa-circle-exclamation');
  }
}

/* =========================
   Subir imagen
   ========================= */
btnConfirmAgregar.addEventListener('click', async () => {
  try {
    const producto_id = Number(modalProductoInput.value);
    const file = fileImagenInput.files?.[0];
    if (!producto_id) { showToast('Producto inválido', 'error', 'fa-triangle-exclamation'); return; }
    if (!file) { showToast('Selecciona un archivo de imagen', 'info', 'fa-info-circle'); return; }

    btnConfirmAgregar.disabled = true;
    btnConfirmAgregar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';

    const resp = await imagenesAPI.insert({ producto_id, file }); // POST /imagenes
    // Se asume resp.success === true o que no lanza error si ok
    showToast('Imagen agregada correctamente', 'success', 'fa-check-circle');
    closeModal();
    await cargarTabla(); // Refrescar lista
  } catch (err) {
    console.error(err);
    showToast(friendlyError(err), 'error', 'fa-circle-exclamation');
  } finally {
    btnConfirmAgregar.disabled = false;
    btnConfirmAgregar.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Subir imagen';
  }
});

/* =========================
   Eventos
   ========================= */
btnRefrescar.addEventListener('click', cargarTabla);

/* =========================
   Init
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  cargarTabla();
});
