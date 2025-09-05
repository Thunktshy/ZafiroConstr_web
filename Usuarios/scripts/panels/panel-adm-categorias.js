// Control de panel: Categorías (CRUD con DataTables, jQuery, modales y toasts)
import { categoriasAPI } from "/user-resources/scripts/apis/categoriasManager.js";

/* =========================
   Toasts
   ========================= */
const toastContainer = document.getElementById("toastContainer");
function showToast(message, type = "info", icon = null, timeout = 3500) {
  if (!toastContainer) return;
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", "status");
  el.innerHTML = `${icon ? `<i class="fa-solid ${icon}"></i>` : ""}<span>${message}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(4px)"; setTimeout(() => el.remove(), 180); }, timeout);
}
function friendlyError(err) {
  const msg = (err && err.message) ? String(err.message) : "";
  const isNet =
    (err && err.name === "TypeError" && /fetch/i.test(msg)) ||
    /Failed to fetch|NetworkError|ERR_NETWORK|ERR_CONNECTION|The network connection was lost/i.test(msg) ||
    (typeof navigator !== "undefined" && navigator.onLine === false);
  return msg || (isNet ? "No hay conexión con el servidor" : "No hay conexión con el servidor");
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
function normalizeCategoria(row) {
  if (!row || typeof row !== "object") return null;
  const id  = row.categoria_id ?? row.id ?? row.categoriaId;
  const nom = row.nombre ?? row.name ?? row.Nombre;
  const des = row.descripcion ?? row.description ?? row.Descripcion;
  if (id == null || nom == null) return null;
  return {
    categoria_id: Number(id),
    nombre: String(nom),
    descripcion: des != null ? String(des) : ""
  };
}
function mapCategorias(listish) { return toArrayData(listish).map(normalizeCategoria).filter(Boolean); }

function renderDataTable(selector, data, columns) {
  if ($.fn.DataTable.isDataTable(selector)) $(selector).DataTable().clear().destroy();
  return $(selector).DataTable({ data, columns, pageLength: 10, autoWidth: false });
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
const modalEl   = document.getElementById("modalCategoria");
const modalTit  = document.getElementById("modalCategoriaTitle");
const formEl    = document.getElementById("categoriaForm");
const hidId     = document.getElementById("categoria_id");
const inpNombre = document.getElementById("nombre");
const inpDesc   = document.getElementById("descripcion");
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
let currentMode = "create";
let deleteTarget = null;

function openModal(mode = "create", data = null) {
  currentMode = mode;
  modalTit.textContent = mode === "create" ? "Nueva Categoría" : "Modificar Categoría";

  if (mode === "create") {
    hidId.value = "";
    formEl.reset();
  } else if (data) {
    hidId.value     = data.categoria_id ?? "";
    inpNombre.value = data.nombre ?? "";
    inpDesc.value   = data.descripcion ?? "";
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
  deleteMsg.textContent = `¿Seguro que deseas eliminar la categoría ${item.categoria_id} — “${item.nombre}”?`;
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
  { data: "categoria_id", title: "ID" },
  { data: "nombre", title: "Nombre" },
  { data: "descripcion", title: "Descripción" },
  {
    data: null,
    title: "Acciones",
    orderable: false,
    render: (row) =>
      `<div class="btn-group">
         <button class="btn btn-warning js-modificar" data-id="${row.categoria_id}">
           <i class="fa-solid fa-pen-to-square"></i> Modificar
         </button>
         <button class="btn btn-danger js-eliminar" data-id="${row.categoria_id}" data-nombre="${row.nombre}">
           <i class="fa-solid fa-trash-can"></i> Eliminar
         </button>
       </div>`
  }
];

const columnsSoloDatos = [
  { data: "categoria_id", title: "ID" },
  { data: "nombre", title: "Nombre" },
  { data: "descripcion", title: "Descripción" }
];

/* =========================
   Listado general (get_all)
   ========================= */
async function cargarTabla() {
  try {
    const resp = assertOk(await categoriasAPI.getAll());
    const data = mapCategorias(resp);
    renderDataTable("#tablaCategorias", data, columnsGeneral);
    logPaso("Refrescar", "/get_all", resp);
  } catch (err) {
    logError("Refrescar", "/get_all", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    renderDataTable("#tablaCategorias", [], columnsGeneral);
  }
}
btnRefrescar?.addEventListener("click", cargarTabla);

/* =========================
   Agregar (insert)
   ========================= */
btnAbrirAgregar?.addEventListener("click", () => openModal("create"));

/* =========================
   Modificar & Eliminar
   ========================= */
// Delegación en tabla: Modificar
$(document).on("click", "#tablaCategorias tbody .js-modificar", async function() {
  const id = Number(this.dataset.id);
  if (!id) return;
  try {
    const resp = assertOk(await categoriasAPI.getById(id));
    const item = mapCategorias(resp)[0] || null;
    if (item) openModal("edit", item);
  } catch (err) {
    logError("Modificar (tabla)", `/por_id/${id}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

// Delegación en tabla: Eliminar
$(document).on("click", "#tablaCategorias tbody .js-eliminar", function() {
  const id = Number(this.dataset.id);
  const nombre = String(this.dataset.nombre || "");
  if (!id) return;
  openDeleteModal({ categoria_id: id, nombre });
});

// Confirmar eliminación
btnConfirmDel?.addEventListener("click", async () => {
  if (!deleteTarget) return;
  const { categoria_id } = deleteTarget;
  try {
    const resp = assertOk(await categoriasAPI.remove(categoria_id));
    logPaso("Confirmar eliminar", "/delete", resp);
    closeDeleteModal();
    await cargarTabla();
    limpiarTablaPorIdSiCoincide(categoria_id);
    showToast("Operación completada", "success", "fa-check-circle");
  } catch (err) {
    logError("Confirmar eliminar", "/delete", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Validación
   ========================= */
function validateCategoria({ categoria_id, nombre, descripcion }, mode) {
  if (mode === "edit") {
    if (!Number.isInteger(Number(categoria_id))) throw new Error("categoria_id inválido");
  }
  const n = String((nombre ?? "")).trim();
  if (n.length < 2 || n.length > 100) throw new Error("El nombre debe tener entre 2 y 100 caracteres");
  if (!/^[\p{L}0-9 .&\-]{2,100}$/u.test(n)) throw new Error("El nombre contiene caracteres inválidos");

  const d = String(descripcion ?? "").trim();
  if (d.length > 255) throw new Error("La descripción no puede exceder 255 caracteres");

  return { categoria_id: categoria_id ? Number(categoria_id) : undefined, nombre: n, descripcion: d };
}

/* =========================
   Guardar (insert/update)
   ========================= */
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const payload = validateCategoria({
      categoria_id: hidId.value ? Number(hidId.value) : undefined,
      nombre: inpNombre.value,
      descripcion: inpDesc.value
    }, currentMode);

    if (currentMode === "edit" && payload.categoria_id) {
      const resp = assertOk(await categoriasAPI.update(payload));
      logPaso("Guardar cambios (update)", "/update", resp);
      showToast("Operación completada", "success", "fa-check-circle");
    } else {
      const { categoria_id, ...createData } = payload;
      const resp = assertOk(await categoriasAPI.insert(createData));
      logPaso("Agregar (insert)", "/insert", resp);
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
   Búsqueda por ID (get_by_id)
   ========================= */
function limpiarTablaPorIdSiCoincide(id) {
  const dt = $("#tablaCategoriaPorId").DataTable();
  const rows = dt ? dt.rows().data().toArray() : [];
  if (rows.length && Number(rows[0]?.categoria_id) === Number(id)) {
    renderDataTable("#tablaCategoriaPorId", [], columnsSoloDatos);
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
    const resp = assertOk(await categoriasAPI.getById(id));
    const item = mapCategorias(resp)[0] || null;
    if (item) {
      renderDataTable("#tablaCategoriaPorId", [item], columnsSoloDatos);
    } else {
      renderDataTable("#tablaCategoriaPorId", [], columnsSoloDatos);
    }
    logPaso("Obtener por ID", `/por_id/${id}`, resp);
  } catch (err) {
    logError("Obtener por ID", `/por_id/${id}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    renderDataTable("#tablaCategoriaPorId", [], columnsSoloDatos);
  }
});

/* =========================
   Inicialización
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  renderDataTable("#tablaCategorias", [], columnsGeneral);
  renderDataTable("#tablaCategoriaPorId", [], columnsSoloDatos);
  cargarTabla();
});
