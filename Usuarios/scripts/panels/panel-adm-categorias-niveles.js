// Panel de Administración: Categorías con Niveles
// Nivel: principal (categorías con descripcion), secundaria, subcategoria
import { categoriasAPI } from "/user-resources/scripts/apis/categoriasManager.js";
import { categoriasSecundariasAPI } from "/user-resources/scripts/apis/categoriasSecundariasManager.js";
import { subcategoriasAPI } from "/user-resources/scripts/apis/subcategoriasManager.js";

/* ====== Toasts ====== */
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
  const isNet = (err && err.name === "TypeError" && /fetch/i.test(msg)) ||
                /Failed to fetch|NetworkError|ERR_NETWORK|ERR_CONNECTION|The network connection was lost/i.test(msg) ||
                (typeof navigator !== "undefined" && navigator.onLine === false);
  return msg || (isNet ? "No hay conexión con el servidor" : "No hay conexión con el servidor");
}
function assertOk(resp) {
  if (resp && typeof resp === "object" && "success" in resp) {
    if (!resp.success) throw new Error(resp.message || "Operación no exitosa");
  }
  return resp;
}

/* ====== Nivel config ====== */
const nivelSelector = document.getElementById("nivelSelector");
const grupoDescripcion = document.getElementById("grupoDescripcion");
const theadGeneral = document.getElementById("theadGeneral");
const theadPorId = document.getElementById("theadPorId");

const LEVELS = {
  principal: {
    key: "principal",
    label: "Categoría principal",
    api: categoriasAPI,
    idField: "categoria_id",
    columns: [
      { data: "categoria_id", title: "ID" },
      { data: "nombre", title: "Nombre" },
      { data: "descripcion", title: "Descripción" },
    ],
    showDescripcion: true,
    normalize(row) {
      const id  = row.categoria_id ?? row.id ?? row.categoriaId;
      const nom = row.nombre ?? row.name ?? row.Nombre;
      const des = row.descripcion ?? row.description ?? row.Descripcion ?? "";
      if (id == null || nom == null) return null;
      return { categoria_id: Number(id), nombre: String(nom), descripcion: String(des || "") };
    },
    buildPayload({ id, nombre, descripcion, mode }) {
      const payload = { nombre, descripcion };
      if (mode === "edit") payload.categoria_id = id;
      return payload;
    },
  },
  secundaria: {
    key: "secundaria",
    label: "Categoría secundaria",
    api: categoriasSecundariasAPI,
    idField: "categoria_secundaria_id",
    columns: [
      { data: "categoria_secundaria_id", title: "ID" },
      { data: "nombre", title: "Nombre" },
    ],
    showDescripcion: false,
    normalize(row) {
      const id  = row.categoria_secundaria_id ?? row.id ?? row.categoriaSecundariaId;
      const nom = row.nombre ?? row.name ?? row.Nombre;
      if (id == null || nom == null) return null;
      return { categoria_secundaria_id: Number(id), nombre: String(nom) };
    },
    buildPayload({ id, nombre, mode }) {
      const payload = { nombre };
      if (mode === "edit") payload.categoria_secundaria_id = id;
      return payload;
    },
  },
  subcategoria: {
    key: "subcategoria",
    label: "Subcategoría",
    api: subcategoriasAPI,
    idField: "subcategoria_id",
    columns: [
      { data: "subcategoria_id", title: "ID" },
      { data: "nombre", title: "Nombre" },
    ],
    showDescripcion: false,
    normalize(row) {
      const id  = row.subcategoria_id ?? row.id ?? row.subcategoriaId;
      const nom = row.nombre ?? row.name ?? row.Nombre;
      if (id == null || nom == null) return null;
      return { subcategoria_id: Number(id), nombre: String(nom) };
    },
    buildPayload({ id, nombre, mode }) {
      const payload = { nombre };
      if (mode === "edit") payload.subcategoria_id = id;
      return payload;
    },
  }
};

function getLevel() {
  const v = nivelSelector?.value || "principal";
  return LEVELS[v] || LEVELS.principal;
}

/* ====== Data helpers ====== */
function toArrayData(resp) {
  const r = resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
  if (Array.isArray(r)) return r;
  if (!r) return [];
  return [r];
}
function mapRows(resp) {
  const level = getLevel();
  return toArrayData(resp).map(level.normalize).filter(Boolean);
}

function renderDataTable(selector, data, columns) {
  if ($.fn.DataTable.isDataTable(selector)) $(selector).DataTable().clear().destroy();
  return $(selector).DataTable({ data, columns, pageLength: 10, autoWidth: false });
}
function setHeaders(theadEl, columns, withActions = false) {
  theadEl.innerHTML = "";
  columns.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c.title;
    theadEl.appendChild(th);
  });
  if (withActions) {
    const thAcc = document.createElement("th");
    thAcc.textContent = "Acciones";
    theadEl.appendChild(thAcc);
  }
}

/* ====== DOM refs generales ====== */
const inputBuscarId = document.getElementById("inputBuscarId");
const btnBuscarId   = document.getElementById("btnBuscarId");
const btnRefrescar  = document.getElementById("btnRefrescar");
const btnAbrirAgregar = document.getElementById("btnAbrirAgregar");

const modalEl   = document.getElementById("modalEdit");
const modalTit  = document.getElementById("modalTitle");
const formEl    = document.getElementById("editForm");
const hidId     = document.getElementById("hidId");
const inpNombre = document.getElementById("nombre");
const inpDesc   = document.getElementById("descripcion");
const btnClose  = document.getElementById("closeModalBtn");
const btnCancel = document.getElementById("cancelModalBtn");

const modalDeleteEl = document.getElementById("modalConfirmDelete");
const btnCloseDel   = document.getElementById("closeDeleteModalBtn");
const btnCancelDel  = document.getElementById("cancelDeleteBtn");
const btnConfirmDel = document.getElementById("confirmDeleteBtn");
const deleteMsg     = document.getElementById("deleteMessage");

const mainEl = document.querySelector("main");

/* ====== Modales ====== */
let currentMode = "create";
let deleteTarget = null;

function openModal(mode = "create", data = null) {
  currentMode = mode;
  const level = getLevel();
  modalTit.textContent = mode === "create" ? `Nuevo — ${level.label}` : `Modificar — ${level.label}`;
  grupoDescripcion.style.display = level.showDescripcion ? "" : "none";

  if (mode === "create") {
    hidId.value = "";
    formEl.reset();
  } else if (data) {
    const idField = level.idField;
    hidId.value = data[idField] ?? "";
    inpNombre.value = data.nombre ?? "";
    if (level.showDescripcion) {
      inpDesc.value = data.descripcion ?? "";
    }
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
  const level = getLevel();
  const idField = level.idField;
  deleteMsg.textContent = `¿Seguro que deseas eliminar ${level.label.toLowerCase()} ${item[idField]} — “${item.nombre || ""}”?`;
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

/* ====== Columnas DataTable ====== */
function columnsGeneral() {
  const level = getLevel();
  const cols = [...level.columns];
  cols.push({
    data: null,
    title: "Acciones",
    orderable: false,
    render: (row) => {
      const idField = level.idField;
      return `<div class="btn-group">
         <button class="btn btn-warning js-modificar" data-id="${row[idField]}">
           <i class="fa-solid fa-pen-to-square"></i> Modificar
         </button>
         <button class="btn btn-danger js-eliminar" data-id="${row[idField]}" data-nombre="${row.nombre ?? ""}">
           <i class="fa-solid fa-trash-can"></i> Eliminar
         </button>
       </div>`;
    }
  });
  return cols;
}
function columnsSoloDatos() {
  const level = getLevel();
  return [...level.columns];
}

/* ====== Listado (get_all) ====== */
async function cargarTabla() {
  try {
    const level = getLevel();
    const resp = assertOk(await level.api.getAll());
    const data = mapRows(resp);
    setHeaders(theadGeneral, level.columns, true);
    renderDataTable("#tablaGeneral", data, columnsGeneral());
    console.log(`se preciono el boton "Refrescar" y se llamo a la api "/get_all" (${level.key})`);
  } catch (err) {
    console.error('Error /get_all', err?.message || err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    setHeaders(theadGeneral, getLevel().columns, true);
    renderDataTable("#tablaGeneral", [], columnsGeneral());
  }
}
btnRefrescar?.addEventListener("click", cargarTabla);

/* ====== Agregar ====== */
btnAbrirAgregar?.addEventListener("click", () => openModal("create"));

/* ====== Modificar & Eliminar (delegación) ====== */
$(document).on("click", "#tablaGeneral tbody .js-modificar", async function() {
  const level = getLevel();
  const id = Number(this.dataset.id);
  if (!id) return;
  try {
    const resp = assertOk(await level.api.getById(id));
    const item = mapRows(resp)[0] || null;
    if (item) openModal("edit", item);
  } catch (err) {
    console.error('Error /por_id', err?.message || err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});
$(document).on("click", "#tablaGeneral tbody .js-eliminar", function() {
  const level = getLevel();
  const id = Number(this.dataset.id);
  const nombre = String(this.dataset.nombre || "");
  if (!id) return;
  const idField = level.idField;
  openDeleteModal({ [idField]: id, nombre });
});
btnConfirmDel?.addEventListener("click", async () => {
  if (!deleteTarget) return;
  const level = getLevel();
  const idField = level.idField;
  const id = deleteTarget[idField];
  try {
    const resp = assertOk(await level.api.remove(id));
    closeDeleteModal();
    await cargarTabla();
    limpiarTablaPorIdSiCoincide(id);
    showToast("Operación completada", "success", "fa-check-circle");
  } catch (err) {
    console.error('Error /delete', err?.message || err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* ====== Validación simple ====== */
function validate({ nombre, descripcion }, levelKey) {
  const n = String((nombre ?? "")).trim();
  if (n.length < 2 || n.length > 100) throw new Error("El nombre debe tener entre 2 y 100 caracteres");
  if (!/^[\p{L}0-9 .&\-]{2,100}$/u.test(n)) throw new Error("El nombre contiene caracteres inválidos");

  const payload = { nombre: n };
  if (levelKey === "principal") {
    const d = String((descripcion ?? "")).trim();
    if (d.length > 255) throw new Error("La descripción no puede exceder 255 caracteres");
    payload.descripcion = d;
  }
  return payload;
}

/* ====== Guardar (insert/update) ====== */
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const level = getLevel();
  try {
    const common = validate({ nombre: inpNombre.value, descripcion: inpDesc.value }, level.key);
    const idVal = hidId.value ? Number(hidId.value) : undefined;
    const payload = level.buildPayload({ id: idVal, nombre: common.nombre, descripcion: common.descripcion, mode: currentMode });

    if (currentMode === "edit" && idVal) {
      const resp = assertOk(await level.api.update(payload));
      showToast("Operación completada", "success", "fa-check-circle");
      console.log('Guardar cambios (update)', resp);
    } else {
      // insert: sin id en payload (ya se maneja en buildPayload)
      const resp = assertOk(await level.api.insert(payload));
      showToast("Operación completada", "success", "fa-check-circle");
      console.log('Agregar (insert)', resp);
    }
    closeModal();
    formEl.reset();
    await cargarTabla();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* ====== Buscar por ID ====== */
function limpiarTablaPorIdSiCoincide(id) {
  const dt = $("#tablaPorId").DataTable();
  const rows = dt ? dt.rows().data().toArray() : [];
  const level = getLevel();
  const idField = level.idField;
  if (rows.length && Number(rows[0]?.[idField]) === Number(id)) {
    renderDataTable("#tablaPorId", [], columnsSoloDatos());
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
    const level = getLevel();
    const resp = assertOk(await level.api.getById(id));
    const item = mapRows(resp)[0] || null;
    setHeaders(theadPorId, level.columns, false);
    renderDataTable("#tablaPorId", item ? [item] : [], columnsSoloDatos());
    console.log('Obtener por ID', level.key, id);
  } catch (err) {
    console.error('Error /por_id', err?.message || err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    setHeaders(theadPorId, getLevel().columns, false);
    renderDataTable("#tablaPorId", [], columnsSoloDatos());
  }
});

/* ====== Cambio de nivel ====== */
nivelSelector?.addEventListener("change", async () => {
  const level = getLevel();
  grupoDescripcion.style.display = level.showDescripcion ? "" : "none";
  setHeaders(theadGeneral, level.columns, true);
  setHeaders(theadPorId, level.columns, false);
  renderDataTable("#tablaGeneral", [], columnsGeneral());
  renderDataTable("#tablaPorId", [], columnsSoloDatos());
  await cargarTabla();
});

/* ====== Init ====== */
document.addEventListener("DOMContentLoaded", async () => {
  const level = getLevel();
  grupoDescripcion.style.display = level.showDescripcion ? "" : "none";
  setHeaders(theadGeneral, level.columns, true);
  setHeaders(theadPorId, level.columns, false);
  renderDataTable("#tablaGeneral", [], columnsGeneral());
  renderDataTable("#tablaPorId", [], columnsSoloDatos());
  await cargarTabla();
});
