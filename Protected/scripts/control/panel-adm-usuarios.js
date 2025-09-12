// Control de panel: Usuarios - CRUD con DataTables, jQuery, modales y toasts
import { usuariosAPI } from "/admin-resources/scripts/api/usuariosManager.js";

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

function normalizeUsuario(row) {
  if (!row || typeof row !== "object") return null;
  
  const id = row.usuario_id ?? row.id;
  const nombre = row.nombre ?? row.Nombre;
  const email = row.email ?? row.Email;
  const fecha_registro = row.fecha_registro ?? row.FechaRegistro;
  const tipo = row.tipo ?? row.Tipo;
  const estado = row.estado ?? row.Estado;
  
  if (id == null || nombre == null || email == null) return null;
  
  return {
    id: Number(id),
    nombre: String(nombre),
    email: String(email),
    fecha_registro: fecha_registro ? String(fecha_registro) : null,
    tipo: tipo ? String(tipo) : "user",
    estado: estado !== undefined ? Number(estado) : 1
  };
}

function mapUsuarios(listish) { 
  return toArrayData(listish).map(normalizeUsuario).filter(Boolean); 
}

let tablaUsuarios = null;
let tablaBusqueda = null;

function renderDataTable(selector, data, columns) {
  const table = $(selector);
  
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
const inputBuscar = document.getElementById("inputBuscar");
const tipoBusqueda = document.getElementById("tipoBusqueda");
const btnBuscar = document.getElementById("btnBuscar");
const btnRefrescar = document.getElementById("btnRefrescar");
const btnAbrirAgregar = document.getElementById("btnAbrirAgregar");

// Modal
const modalEl = document.getElementById("modalUsuario");
const modalTit = document.getElementById("modalUsuarioTitle");
const formEl = document.getElementById("usuarioForm");
const hidId = document.getElementById("usuario_id");
const nombreInput = document.getElementById("nombre");
const emailInput = document.getElementById("email");
const contrasenaInput = document.getElementById("contrasena");
const tipoSelect = document.getElementById("tipo");
const estadoSelect = document.getElementById("estado");
const grupoContrasena = document.getElementById("grupoContrasena");
const grupoEstado = document.getElementById("grupoEstado");
const btnClose = document.getElementById("closeModalBtn");
const btnCancel = document.getElementById("cancelModalBtn");
const saveBtn = document.getElementById("saveUsuarioBtn");

// Modal confirmación de eliminación
const modalDeleteEl = document.getElementById("modalConfirmDelete");
const btnCloseDel = document.getElementById("closeDeleteModalBtn");
const btnCancelDel = document.getElementById("cancelDeleteBtn");
const btnConfirmDel = document.getElementById("confirmDeleteBtn");
const deleteMsg = document.getElementById("deleteMessage");

const mainEl = document.querySelector("main");

/* =========================
   Columnas DataTable
   ========================= */
const columnsGeneral = [
  { data: "id", title: "ID" },
  { data: "nombre", title: "Nombre" },
  { data: "email", title: "Email" },
  { data: "fecha_registro", title: "Fecha Registro" },
  { 
    data: "tipo", 
    title: "Tipo",
    render: function(data) {
      return data === "admin" ? "Administrador" : "Usuario";
    }
  },
  { 
    data: "estado", 
    title: "Estado",
    render: function(data) {
      return data === 1 ? "Activo" : "Inactivo";
    }
  },
  {
    data: null,
    title: "Acciones",
    orderable: false,
    render: (row) =>
      `<div class="btn-group">
         <button class="btn btn-warning js-modificar" data-id="${row.id}" data-nombre="${row.nombre}">
           <i class="fa-solid fa-pen-to-square"></i> Modificar
         </button>
         <button class="btn btn-danger js-eliminar" data-id="${row.id}" data-nombre="${row.nombre}">
           <i class="fa-solid fa-trash-can"></i> Eliminar
         </button>
       </div>`
  }
];

const columnsBusqueda = [
  { data: "id", title: "ID" },
  { data: "nombre", title: "Nombre" },
  { data: "email", title: "Email" },
  { 
    data: "tipo", 
    title: "Tipo",
    render: function(data) {
      return data === "admin" ? "Administrador" : "Usuario";
    }
  },
  { 
    data: "estado", 
    title: "Estado",
    render: function(data) {
      return data === 1 ? "Activo" : "Inactivo";
    }
  }
];

/* =========================
   Modales accesibles
   ========================= */
let currentMode = "create";
let deleteTarget = null;

function openModal(mode = "create", data = null) {
  currentMode = mode;
  modalTit.textContent = mode === "create" ? "Nuevo Usuario" : "Modificar Usuario";

  if (mode === "create") {
    hidId.value = "";
    formEl.reset();
    grupoContrasena.style.display = "block";
    grupoEstado.style.display = "none";
  } else if (data) {
    hidId.value = data.id ?? "";
    nombreInput.value = data.nombre || "";
    emailInput.value = data.email || "";
    tipoSelect.value = data.tipo || "";
    estadoSelect.value = data.estado ?? "1";
    contrasenaInput.value = "";
    
    grupoContrasena.style.display = "none";
    grupoEstado.style.display = "block";
  }

  modalEl.classList.add("show");
  modalEl.setAttribute("aria-hidden", "false");
  mainEl?.setAttribute("inert", "");
  setTimeout(() => nombreInput?.focus(), 0);
}

function closeModal() {
  modalEl.classList.remove("show");
  modalEl.setAttribute("aria-hidden", "true");
  mainEl?.removeAttribute("inert");
}

function openDeleteModal(item) {
  deleteTarget = item;
  deleteMsg.textContent = `¿Seguro que deseas eliminar el usuario ${item.id} — "${item.nombre}"?`;
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
   Listado general (get_all)
   ========================= */
async function cargarTabla() {
  try {
    const resp = assertOk(await usuariosAPI.getAll());
    const data = mapUsuarios(resp);
    tablaUsuarios = renderDataTable("#tablaUsuarios", data, columnsGeneral);
    logPaso("Refrescar", "/get_all", resp);
    showToast(`Se cargaron ${data.length} usuarios`, "success", "fa-check-circle");
  } catch (err) {
    logError("Refrescar", "/get_all", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    tablaUsuarios = renderDataTable("#tablaUsuarios", [], columnsGeneral);
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
$(document).on("click", "#tablaUsuarios tbody .js-modificar", async function() {
  const id = Number(this.dataset.id);
  if (!id) return;
  try {
    const resp = assertOk(await usuariosAPI.getById(id));
    const item = mapUsuarios(resp)[0] || null;
    if (item) openModal("edit", item);
  } catch (err) {
    logError("Modificar (tabla)", `/por_id/${id}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

// Delegación en tabla: Eliminar
$(document).on("click", "#tablaUsuarios tbody .js-eliminar", function() {
  const id = Number(this.dataset.id);
  const nombre = String(this.dataset.nombre || "");
  if (!id) return;
  openDeleteModal({ id, nombre });
});

// Confirmar eliminación
btnConfirmDel?.addEventListener("click", async () => {
  if (!deleteTarget) return;
  const { id } = deleteTarget;
  try {
    const resp = assertOk(await usuariosAPI.remove(id));
    logPaso("Confirmar eliminar", "/delete", resp);
    closeDeleteModal();
    await cargarTabla();
    limpiarTablaBusquedaSiCoincide(id);
    showToast("Usuario eliminado correctamente", "success", "fa-check-circle");
  } catch (err) {
    logError("Confirmar eliminar", "/delete", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Validación
   ========================= */
function validateUsuario({ id, nombre, email, contrasena, tipo, estado }, mode) {
  if (mode === "edit") {
    if (!Number.isInteger(Number(id))) throw new Error("ID inválido");
  }
  
  if (!nombre || nombre.trim().length === 0) throw new Error("El nombre es obligatorio");
  if (nombre.length > 100) throw new Error("El nombre no puede tener más de 100 caracteres");
  
  if (!email || email.trim().length === 0) throw new Error("El email es obligatorio");
  if (email.length > 150) throw new Error("El email no puede tener más de 150 caracteres");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El formato del email es inválido");
  
  if (mode === "create" && (!contrasena || contrasena.length < 8)) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }
  
  if (tipo && !["admin", "user"].includes(tipo)) throw new Error("Tipo de usuario inválido");
  
  if (estado !== undefined && ![0, 1].includes(Number(estado))) throw new Error("Estado inválido");
  
  return { 
    usuario_id: id ? Number(id) : undefined, 
    nombre: nombre.trim(),
    email: email.trim(),
    contrasena: contrasena || undefined,
    tipo: tipo || undefined,
    estado: estado !== undefined ? Number(estado) : undefined
  };
}

/* =========================
   Guardar (insert/update)
   ========================= */
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const payload = {
      id: hidId.value ? Number(hidId.value) : undefined,
      nombre: nombreInput.value,
      email: emailInput.value,
      contrasena: contrasenaInput.value,
      tipo: tipoSelect.value,
      estado: estadoSelect.value
    };

    const validated = validateUsuario(payload, currentMode);

    if (currentMode === "edit" && validated.usuario_id) {
      const resp = assertOk(await usuariosAPI.update(validated));
      logPaso("Guardar cambios (update)", "/update", resp);
      showToast("Usuario actualizado correctamente", "success", "fa-check-circle");
    } else {
      const { usuario_id, ...createData } = validated;
      const resp = assertOk(await usuariosAPI.insert(createData));
      logPaso("Agregar (insert)", "/insert", resp);
      showToast("Usuario creado correctamente", "success", "fa-check-circle");
    }

    closeModal();
    formEl.reset();
    await cargarTabla();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Búsqueda (por ID o Email)
   ========================= */
function limpiarTablaBusquedaSiCoincide(id) {
  if (tablaBusqueda) {
    const rows = tablaBusqueda.rows().data().toArray();
    if (rows.length && Number(rows[0]?.id) === Number(id)) {
      tablaBusqueda.clear().draw();
    }
  }
}

btnBuscar?.addEventListener("click", async () => {
  const valor = inputBuscar?.value.trim();
  const tipo = tipoBusqueda?.value;
  
  if (!valor) {
    showToast("Ingresa un valor para buscar.", "error", "fa-circle-exclamation");
    return;
  }
  
  try {
    let resp;
    if (tipo === "id") {
      const id = Number(valor);
      if (!Number.isInteger(id) || id <= 0) {
        showToast("Ingresa un ID válido (entero positivo).", "error", "fa-circle-exclamation");
        return;
      }
      resp = assertOk(await usuariosAPI.getById(id));
    } else {
      resp = assertOk(await usuariosAPI.getByEmail(valor));
    }
    
    const item = mapUsuarios(resp)[0] || null;
    if (item) {
      tablaBusqueda = renderDataTable("#tablaBusqueda", [item], columnsBusqueda);
      showToast(`Usuario encontrado: ${item.nombre}`, "success", "fa-check-circle");
    } else {
      showToast("No se encontró ningún usuario.", "info", "fa-info-circle");
      tablaBusqueda = renderDataTable("#tablaBusqueda", [], columnsBusqueda);
    }
    logPaso("Buscar", tipo === "id" ? `/por_id/${valor}` : `/por_email/${valor}`, resp);
  } catch (err) {
    logError("Buscar", tipo === "id" ? `/por_id/${valor}` : `/por_email/${valor}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    tablaBusqueda = renderDataTable("#tablaBusqueda", [], columnsBusqueda);
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
  tablaUsuarios = renderDataTable("#tablaUsuarios", [], columnsGeneral);
  tablaBusqueda = renderDataTable("#tablaBusqueda", [], columnsBusqueda);
  
  showToast("Panel de usuarios listo. Presiona 'Refrescar' para cargar los datos.", "info", "fa-info-circle");
});