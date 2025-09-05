// Panel de administración: Marcas (con eliminar, búsqueda por ID y toasts)
// Requiere: jQuery, DataTables y brandsAPI

import { brandsAPI } from "/user-resources/scripts/apis/brandsManager.js";

/* =========================
   Toasts
   ========================= */
const toastContainer = document.getElementById("toastContainer");

function showToast(message, type = "info", icon = null, timeout = 3500) {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `${icon ? `<i class="fa-solid ${icon}"></i>` : ""}<span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(4px)";
    setTimeout(() => toast.remove(), 180);
  }, timeout);
}

function friendlyError(err) {
  const msg = (err && err.message) ? String(err.message) : "";
  const isNet =
    (err && err.name === "TypeError" && /fetch/i.test(msg)) ||
    /Failed to fetch|NetworkError|ERR_NETWORK|ERR_CONNECTION|The network connection was lost/i.test(msg) ||
    (typeof navigator !== "undefined" && navigator.onLine === false);
  if (isNet) return "No hay conexión con el servidor";
  return msg || "No hay conexión con el servidor";
}

/* =========================
   Utilidades de datos
   ========================= */
function assertOk(resp) {
  if (resp && typeof resp === "object" && "success" in resp) {
    if (!resp.success) throw new Error(resp.message || "Operación no exitosa");
  }
  return resp;
}

function toArrayData(resp) {
  const r = resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
  if (Array.isArray(r)) return r;
  if (!r) return [];
  return [r];
}

function normalizeBrand(row) {
  if (!row || typeof row !== "object") return null;
  const id  = row.brand_id ?? row.id ?? row.BrandID ?? row.brandId;
  const nom = row.nombre ?? row.name ?? row.Nombre;
  if (id == null || nom == null) return null;
  return { brand_id: Number(id), nombre: String(nom) };
}

function mapBrands(listish) {
  return toArrayData(listish).map(normalizeBrand).filter(Boolean);
}

function renderDataTable(selector, data, columns) {
  if ($.fn.DataTable.isDataTable(selector)) {
    $(selector).DataTable().clear().destroy();
  }
  return $(selector).DataTable({
    data,
    columns,
    pageLength: 10,
    autoWidth: false
  });
}

function logPaso(boton, api, respuesta) {
  console.log(`se preciono el boton "${boton}" y se llamo a la api "${api}"`);
  if (respuesta !== undefined) console.log("respuesta :", respuesta);
}
function logError(boton, api, error) {
  console.log(`se preciono el boton "${boton}" y se llamo a la api "${api}"`);
  console.error("respuesta :", error?.message || error);
}

/* =========================
   Referencias DOM
   ========================= */
// Búsqueda por ID
const inputBuscarId = document.getElementById("inputBuscarId");
const btnBuscarId   = document.getElementById("btnBuscarId");

// Tabla general
const btnRefrescar    = document.getElementById("btnRefrescar");
const btnAbrirAgregar = document.getElementById("btnAbrirAgregar");

// Modal de alta / edición
const modalEl   = document.getElementById("modalBrand");
const modalTit  = document.getElementById("modalBrandTitle");
const formEl    = document.getElementById("brandForm");
const hidId     = document.getElementById("brand_id");
const inpNombre = document.getElementById("nombre");
const btnClose  = document.getElementById("closeModalBtn");
const btnCancel = document.getElementById("cancelModalBtn");

// Modal confirmación de eliminación
const modalDeleteEl = document.getElementById("modalConfirmDelete");
const btnCloseDel   = document.getElementById("closeDeleteModalBtn");
const btnCancelDel  = document.getElementById("cancelDeleteBtn");
const btnConfirmDel = document.getElementById("confirmDeleteBtn");
const deleteMsg     = document.getElementById("deleteMessage");

const mainEl = document.querySelector("main");

/* =========================
   Modales accesibles
   ========================= */
let currentMode /** @type {"create"|"edit"} */ = "create";
let deleteTarget = /** @type {{ id: number, nombre: string } | null} */ (null);

function openModal(mode = "create", data = null) {
  currentMode = mode;
  modalTit.textContent = mode === "create" ? "Nueva Marca" : "Modificar Marca";

  if (mode === "create") {
    hidId.value = "";
    formEl.reset();
  } else if (data) {
    hidId.value     = data.brand_id ?? "";
    inpNombre.value = data.nombre ?? "";
  }

  modalEl.classList.add("show");
  modalEl.setAttribute("aria-hidden", "false");
  mainEl?.setAttribute("inert", "");
  setTimeout(() => inpNombre?.focus(), 0);
}

function closeModal() {
  modalEl.classList.remove("show");
  modalEl.setAttribute("aria-hidden", "true");
  mainEl?.removeAttribute("inert");
}

function openDeleteModal(item) {
  deleteTarget = item;
  deleteMsg.textContent = `¿Seguro que deseas eliminar la marca ${item.brand_id} — “${item.nombre}”?`;
  modalDeleteEl.classList.add("show");
  modalDeleteEl.setAttribute("aria-hidden", "false");
  mainEl?.setAttribute("inert", "");
  setTimeout(() => btnConfirmDel?.focus(), 0);
}
function closeDeleteModal() {
  modalDeleteEl.classList.remove("show");
  modalDeleteEl.setAttribute("aria-hidden", "true");
  mainEl?.removeAttribute("inert");
  deleteTarget = null;
}

// Cerrar modales por click fuera / botones / Escape
modalEl?.addEventListener("click", (e) => { if (e.target === modalEl) closeModal(); });
btnClose?.addEventListener("click", closeModal);
btnCancel?.addEventListener("click", closeModal);
modalDeleteEl?.addEventListener("click", (e) => { if (e.target === modalDeleteEl) closeDeleteModal(); });
btnCloseDel?.addEventListener("click", closeDeleteModal);
btnCancelDel?.addEventListener("click", closeDeleteModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalEl.classList.contains("show")) closeModal();
  if (e.key === "Escape" && modalDeleteEl.classList.contains("show")) closeDeleteModal();
});

/* =========================
   Columnas DataTable
   ========================= */
const columnsGeneral = [
  { data: "brand_id", title: "ID" },
  { data: "nombre", title: "Nombre" },
  {
    data: null,
    title: "Acciones",
    orderable: false,
    render: (row) =>
      `<div class="btn-group">
         <button class="btn btn-warning js-modificar" data-id="${row.brand_id}">
           <i class="fa-solid fa-pen-to-square"></i> Modificar
         </button>
         <button class="btn btn-danger js-eliminar" data-id="${row.brand_id}" data-nombre="${row.nombre}">
           <i class="fa-solid fa-trash-can"></i> Eliminar
         </button>
       </div>`
  }
];

const columnsSoloDatos = [
  { data: "brand_id", title: "ID" },
  { data: "nombre", title: "Nombre" }
];

/* =========================
   2) Visualización general (get_all)
   ========================= */
async function cargarTabla() {
  try {
    const boton = "Refrescar", api = "/get_all";
    const resp = assertOk(await brandsAPI.getAll());
    const data = mapBrands(resp);
    renderDataTable("#tablaBrands", data, columnsGeneral);
    logPaso(boton, api, resp);
  } catch (err) {
    logError("Refrescar", "/get_all", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    renderDataTable("#tablaBrands", [], columnsGeneral);
  }
}
btnRefrescar?.addEventListener("click", cargarTabla);

/* =========================
   3) Agregar (insert)
   ========================= */
btnAbrirAgregar?.addEventListener("click", () => openModal("create"));

/* =========================
   4) Modificar & Eliminar
   ========================= */
// Delegación en tabla: Modificar
$(document).on("click", "#tablaBrands tbody .js-modificar", async function() {
  const id = Number(this.dataset.id);
  if (!id) return;
  try {
    const resp = assertOk(await brandsAPI.getById(id));
    const item = mapBrands(resp)[0] || null;
    if (item) openModal("edit", item);
  } catch (err) {
    logError("Modificar (tabla)", `/por_id/${id}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

// Delegación en tabla: Eliminar
$(document).on("click", "#tablaBrands tbody .js-eliminar", function() {
  const id = Number(this.dataset.id);
  const nombre = String(this.dataset.nombre || "");
  if (!id) return;
  openDeleteModal({ brand_id: id, nombre });
});

// Confirmar eliminación
btnConfirmDel?.addEventListener("click", async () => {
  if (!deleteTarget) return;
  const { brand_id } = deleteTarget;
  try {
    const boton = "Confirmar eliminar", api = "/delete";
    const resp = assertOk(await brandsAPI.remove(brand_id));
    logPaso(boton, api, resp);
    closeDeleteModal();
    await cargarTabla();
    limpiarTablaPorIdSiCoincide(brand_id);
    // Toast de éxito requerido
    showToast("Operación completada", "success", "fa-check-circle");
  } catch (err) {
    logError("Confirmar eliminar", "/delete", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   5) Validación básica
   ========================= */
function validateBrandPayload({ brand_id, nombre }, mode) {
  if (mode === "edit") {
    if (!Number.isInteger(Number(brand_id))) throw new Error("brand_id inválido");
  }
  const trimmed = (nombre ?? "").trim();
  if (trimmed.length < 2 || trimmed.length > 50) throw new Error("El nombre debe tener entre 2 y 50 caracteres");
  if (!/[\p{L}0-9 .&\-]{2,50}/u.test(trimmed) || !/^[-\p{L}0-9 .&]{2,50}$/u.test(trimmed)) {
    throw new Error("El nombre contiene caracteres inválidos");
  }
  return { brand_id: brand_id ? Number(brand_id) : undefined, nombre: trimmed };
}

/* =========================
   6) Submit (insert/update)
   ========================= */
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const payload = validateBrandPayload({
      brand_id: hidId.value ? Number(hidId.value) : undefined,
      nombre: inpNombre.value
    }, currentMode);

    if (currentMode === "edit" && payload.brand_id) {
      const boton = "Guardar cambios (update)", api = "/update";
      const resp = assertOk(await brandsAPI.update(payload));
      logPaso(boton, api, resp);
      // (Opcional) podríamos mostrar toast también aquí, pero el requerimiento pide en agregar/eliminar
    } else {
      const boton = "Agregar (insert)", api = "/insert";
      const { brand_id, ...createData } = payload;
      const resp = assertOk(await brandsAPI.insert(createData));
      logPaso(boton, api, resp);
      // Toast de éxito requerido
      showToast("Operación completada", "success", "fa-check-circle");
    }

    closeModal();
    formEl.reset();
    await cargarTabla();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   7) Búsqueda por ID (get_by_id)
   ========================= */
function limpiarTablaPorIdSiCoincide(id) {
  const dt = $("#tablaBrandPorId").DataTable();
  const rows = dt ? dt.rows().data().toArray() : [];
  if (rows.length && Number(rows[0]?.brand_id) === Number(id)) {
    renderDataTable("#tablaBrandPorId", [], columnsSoloDatos);
  }
}

btnBuscarId?.addEventListener("click", async () => {
  const raw = inputBuscarId?.value;
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) {
    showToast("Ingresa un ID válido (entero positivo).", "error", "fa-circle-exclamation");
    return;
  }
  try {
    const boton = "Obtener por ID", api = `/por_id/${id}`;
    const resp = assertOk(await brandsAPI.getById(id));
    const item = mapBrands(resp)[0] || null;
    if (item) {
      renderDataTable("#tablaBrandPorId", [item], columnsSoloDatos);
    } else {
      renderDataTable("#tablaBrandPorId", [], columnsSoloDatos);
    }
    logPaso(boton, api, resp);
  } catch (err) {
    logError("Obtener por ID", `/por_id/${id}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    renderDataTable("#tablaBrandPorId", [], columnsSoloDatos);
  }
});

/* =========================
   8) Inicialización
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  renderDataTable("#tablaBrands", [], columnsGeneral);
  renderDataTable("#tablaBrandPorId", [], columnsSoloDatos);
  cargarTabla();
});
