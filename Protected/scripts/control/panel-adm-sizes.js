// Control de panel: Tallas - CRUD con DataTables, jQuery, modales y toasts
import { sizesAPI } from "/admin-resources/scripts/api/sizesManager.js";

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
function normalizeTalla(row) {
  if (!row || typeof row !== "object") return null;
  const id  = row.size_id ?? row.id;
  const nombre = row.nombre ?? row.Nombre;
  
  if (id == null || nombre == null) return null;
  return {
    size_id: Number(id),
    nombre: String(nombre)
  };
}
function mapTallas(listish) { return toArrayData(listish).map(normalizeTalla).filter(Boolean); }

let tablaTallas = null;
let tablaTallaPorId = null;

function renderDataTable(selector, data, columns) {
  const table = $(selector);
  
  // Verificar si la tabla ya está inicializada
  if ($.fn.DataTable.isDataTable(selector)) {
    const dataTable = table.DataTable();
    dataTable.clear();
    if (data && data.length > 0) {
      dataTable.rows.add(data).draw();
    } else {
      dataTable.draw();
    }
    return dataTable;
  }
  
  // Si no está inicializada, crear una nueva
  return table.DataTable({ 
    data: data || [],
    columns, 
    pageLength: 10, 
    autoWidth: false,
    language: {
      "decimal":        "",
      "emptyTable":     "No hay datos disponibles en la tabla",
      "info":           "Mostrando _START_ a _END_ de _TOTAL_ registros",
      "infoEmpty":      "Mostrando 0 a 0 de 0 registros",
      "infoFiltered":   "(filtrado de _MAX_ registros totales)",
      "infoPostFix":    "",
      "thousands":      ",",
      "lengthMenu":     "Mostrar _MENU_ registros",
      "loadingRecords": "Cargando...",
      "processing":     "Procesando...",
      "search":         "Buscar:",
      "zeroRecords":    "No se encontraron registros coincidentes",
      "paginate": {
        "first":      "Primero",
        "last":       "Último",
        "next":       "Siguiente",
        "previous":   "Anterior"
      },
      "aria": {
        "sortAscending":  ": activar para ordenar la columna ascendente",
        "sortDescending": ": activar para ordenar la columna descendente"
      }
    }
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
const modalEl   = document.getElementById("modalTalla");
const modalTit  = document.getElementById("modalTallaTitle");
const formEl    = document.getElementById("tallaForm");
const hidId     = document.getElementById("talla_id");
const modalNombre = document.getElementById("modalNombre");
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
  modalTit.textContent = mode === "create" ? "Nueva Talla" : "Modificar Talla";

  if (mode === "create") {
    hidId.value = "";
    formEl.reset();
  } else if (data) {
    hidId.value = data.size_id ?? "";
    modalNombre.value = data.nombre || "";
  }

  modalEl.classList.add("show");
  modalEl.setAttribute("aria-hidden", "false");
  mainEl?.setAttribute("inert", "");
  setTimeout(() => modalNombre?.focus(), 0);
}
function closeModal() {
  modalEl.classList.remove("show");
  modalEl.setAttribute("aria-hidden", "true");
  mainEl?.removeAttribute("inert");
}

function openDeleteModal(item) {
  deleteTarget = item;
  deleteMsg.textContent = `¿Seguro que deseas eliminar la talla ${item.size_id} — "${item.nombre}"?`;
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
  { data: "size_id", title: "ID" },
  { data: "nombre", title: "Nombre" },
  {
    data: null,
    title: "Acciones",
    orderable: false,
    render: (row) =>
      `<div class="btn-group">
         <button class="btn btn-warning js-modificar" data-id="${row.size_id}">
           <i class="fa-solid fa-pen-to-square"></i> Modificar
         </button>
         <button class="btn btn-danger js-eliminar" data-id="${row.size_id}" data-nombre="${row.nombre}">
           <i class="fa-solid fa-trash-can"></i> Eliminar
         </button>
       </div>`
  }
];

const columnsSoloDatos = [
  { data: "size_id", title: "ID" },
  { data: "nombre", title: "Nombre" }
];

/* =========================
   Listado general (get_all)
   ========================= */
async function cargarTabla() {
  try {
    const resp = assertOk(await sizesAPI.getAll());
    const data = mapTallas(resp);
    tablaTallas = renderDataTable("#tablaTallas", data, columnsGeneral);
    logPaso("Refrescar", "/get_all", resp);
    showToast(`Se cargaron ${data.length} tallas`, "success", "fa-check-circle");
  } catch (err) {
    logError("Refrescar", "/get_all", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    // En caso de error, mostramos tabla vacía
    tablaTallas = renderDataTable("#tablaTallas", [], columnsGeneral);
  }
}

/* =========================
   Agregar (insert)
   ========================= */
btnAbrirAgregar?.addEventListener("click", () => openModal("create"));

/* =========================
   Modificar & Eliminar
   ========================= */
// Delegación en tabla: Modificar
$(document).on("click", "#tablaTallas tbody .js-modificar", async function() {
  const id = Number(this.dataset.id);
  if (!id) return;
  try {
    const resp = assertOk(await sizesAPI.getById(id));
    const item = mapTallas(resp)[0] || null;
    if (item) openModal("edit", item);
  } catch (err) {
    logError("Modificar (tabla)", `/por_id/${id}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

// Delegación en tabla: Eliminar
$(document).on("click", "#tablaTallas tbody .js-eliminar", function() {
  const id = Number(this.dataset.id);
  const nombre = String(this.dataset.nombre || "");
  if (!id) return;
  openDeleteModal({ size_id: id, nombre });
});

// Confirmar eliminación
btnConfirmDel?.addEventListener("click", async () => {
  if (!deleteTarget) return;
  const { size_id } = deleteTarget;
  try {
    const resp = assertOk(await sizesAPI.remove(size_id));
    logPaso("Confirmar eliminar", "/delete", resp);
    closeDeleteModal();
    await cargarTabla();
    limpiarTablaPorIdSiCoincide(size_id);
    showToast("Talla eliminada correctamente", "success", "fa-check-circle");
  } catch (err) {
    logError("Confirmar eliminar", "/delete", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Validación
   ========================= */
function validateTalla({ size_id, nombre }, mode) {
  if (mode === "edit") {
    if (!Number.isInteger(Number(size_id))) throw new Error("size_id inválido");
  }
  
  if (!nombre || nombre.trim().length === 0) throw new Error("El nombre es obligatorio");
  if (nombre.length > 50) throw new Error("El nombre no puede tener más de 50 caracteres");
  
  return { 
    size_id: size_id ? Number(size_id) : undefined, 
    nombre: nombre.trim()
  };
}

/* =========================
   Guardar (insert/update)
   ========================= */
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const payload = {
      size_id: hidId.value ? Number(hidId.value) : undefined,
      nombre: modalNombre.value
    };

    if (currentMode === "edit" && payload.size_id) {
      const resp = assertOk(await sizesAPI.update(payload));
      logPaso("Guardar cambios (update)", "/update", resp);
      showToast("Talla actualizada correctamente", "success", "fa-check-circle");
    } else {
      const { size_id, ...createData } = payload;
      const resp = assertOk(await sizesAPI.insert(createData));
      logPaso("Agregar (insert)", "/insert", resp);
      showToast("Talla creada correctamente", "success", "fa-check-circle");
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
  if (tablaTallaPorId) {
    const rows = tablaTallaPorId.rows().data().toArray();
    if (rows.length && Number(rows[0]?.size_id) === Number(id)) {
      tablaTallaPorId.clear().draw();
    }
  }
}

btnBuscarId?.addEventListener("click", async () => {
  const raw = inputBuscarId?.value;
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) {
    showToast("Ingresa un ID válido (entero positivo).", "error", "fa-circle-exclamation");
  }
  try {
    const resp = assertOk(await sizesAPI.getById(id));
    const item = mapTallas(resp)[0] || null;
    if (item) {
      tablaTallaPorId = renderDataTable("#tablaTallaPorId", [item], columnsSoloDatos);
      showToast(`Talla encontrada: ${item.nombre}`, "success", "fa-check-circle");
    } else {
      showToast("No se encontró ninguna talla con ese ID.", "info", "fa-info-circle");
      tablaTallaPorId = renderDataTable("#tablaTallaPorId", [], columnsSoloDatos);
    }
    logPaso("Obtener por ID", `/por_id/${id}`, resp);
  } catch (err) {
    logError("Obtener por ID", `/por_id/${id}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    tablaTallaPorId = renderDataTable("#tablaTallaPorId", [], columnsSoloDatos);
  }
});

/* =========================
   Refrescar tabla
   ========================= */
btnRefrescar?.addEventListener("click", async () => {
  await cargarTabla();
});

/* =========================
   Inicialización
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar tablas vacías
  tablaTallas = renderDataTable("#tablaTallas", [], columnsGeneral);
  tablaTallaPorId = renderDataTable("#tablaTallaPorId", [], columnsSoloDatos);
  
  showToast("Panel de tallas listo. Presiona 'Refrescar' para cargar los datos.", "info", "fa-info-circle");
});