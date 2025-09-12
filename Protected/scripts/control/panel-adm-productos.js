// Control de panel: Productos - CRUD con DataTables, jQuery, modales y toasts
import { productosAPI } from "/admin-resources/scripts/api/productosManager.js";

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

function normalizeProducto(row) {
    if (!row || typeof row !== "object") return null;
  
  const id = row.producto_id ?? row.id;
  const nombre = row.nombre ?? row.Nombre;
  const descripcion = row.descripcion ?? row.Descripcion;
  const precio = row.precio ?? row.Precio;
  const categoria_principal_id = row.categoria_principal_id ?? row.CategoriaPrincipalId;
  const categoria_principal_nombre = row.categoria_principal_nombre ?? row.CategoriaPrincipalNombre;
  const categoria_secundaria_id = row.categoria_secundaria_id ?? row.CategoriaSecundariaId;
  const categoria_secundaria_nombre = row.categoria_secundaria_nombre ?? row.CategoriaSecundariaNombre;
  const subcategoria_id = row.subcategoria_id ?? row.SubcategoriaId;
  const subcategoria_nombre = row.subcategoria_nombre ?? row.SubcategoriaNombre;
  const unit_id = row.unit_id ?? row.UnitId;
  const unit_nombre = row.unit_nombre ?? row.UnitNombre;
  const unit_value = row.unit_value ?? row.UnitValue;
  const size_id = row.size_id ?? row.SizeId;
  const size_nombre = row.size_nombre ?? row.SizeNombre;
  const size_value = row.size_value ?? row.SizeValue;
  const brand_id = row.brand_id ?? row.BrandId;
  const brand_nombre = row.brand_nombre ?? row.BrandNombre;
  const estado = row.estado ?? row.Estado;
  // Picker de caja por componentes
  const cajaLetra1 = document.getElementById("caja_letra1");
  const cajaLetra2 = document.getElementById("caja_letra2");
  const cajaCara   = document.getElementById("caja_cara");
  const cajaNivel  = document.getElementById("caja_nivel");
  const btnResolverCaja = document.getElementById("btnResolverCaja");
  const cajaIdInput = document.getElementById("caja_id");
  const cajaPreview = document.getElementById("caja_preview");

  // Stock
  const stockInicialInput = document.getElementById("stock_inicial");

  
  if (id == null || nombre == null || precio == null) return null;
  
  return {
    id: Number(id),
    nombre: String(nombre),
    descripcion: descripcion ? String(descripcion) : "",
    precio: Number(precio),
    categoria_principal_id: categoria_principal_id ? Number(categoria_principal_id) : null,
    categoria_principal_nombre: categoria_principal_nombre ? String(categoria_principal_nombre) : "",
    categoria_secundaria_id: categoria_secundaria_id ? Number(categoria_secundaria_id) : null,
    categoria_secundaria_nombre: categoria_secundaria_nombre ? String(categoria_secundaria_nombre) : "",
    subcategoria_id: subcategoria_id ? Number(subcategoria_id) : null,
    subcategoria_nombre: subcategoria_nombre ? String(subcategoria_nombre) : "",
    unit_id: unit_id ? Number(unit_id) : null,
    unit_nombre: unit_nombre ? String(unit_nombre) : "",
    unit_value: unit_value ? Number(unit_value) : null,
    size_id: size_id ? Number(size_id) : null,
    size_nombre: size_nombre ? String(size_nombre) : "",
    size_value: size_value ? String(size_value) : "",
    brand_id: brand_id ? Number(brand_id) : null,
    brand_nombre: brand_nombre ? String(brand_nombre) : "",
    estado: estado !== undefined ? Number(estado) : 1
  };
}

function mapProductos(listish) { 
  return toArrayData(listish).map(normalizeProducto).filter(Boolean); 
}

let tablaProductos = null;
let tablaBusqueda = null;
let datosRelacionados = {
  categorias: [],
  categoriasSecundarias: [],
  subcategorias: [],
  units: [],
  sizes: [],
  brands: []
};

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
const btnVerActivos = document.getElementById("btnVerActivos");

// Modal
const modalEl = document.getElementById("modalProducto");
const modalTit = document.getElementById("modalProductoTitle");
const formEl = document.getElementById("productoForm");
const hidId = document.getElementById("producto_id");
const nombreInput = document.getElementById("nombre");
const descripcionTextarea = document.getElementById("descripcion");
const precioInput = document.getElementById("precio");
const categoriaPrincipalSelect = document.getElementById("categoria_principal_id");
const categoriaSecundariaSelect = document.getElementById("categoria_secundaria_id");
const subcategoriaSelect = document.getElementById("subcategoria_id");
const unitSelect = document.getElementById("unit_id");
const unitValueInput = document.getElementById("unit_value");
const sizeSelect = document.getElementById("size_id");
const sizeValueInput = document.getElementById("size_value");
const brandSelect = document.getElementById("brand_id");
const estadoSelect = document.getElementById("estado");
const grupoEstado = document.getElementById("grupoEstado");
const btnClose = document.getElementById("closeModalBtn");
const btnCancel = document.getElementById("cancelModalBtn");
const saveBtn = document.getElementById("saveProductoBtn");

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
  { data: "descripcion", title: "Descripción" },
  { 
    data: "precio", 
    title: "Precio",
    render: function(data) {
      return `$${Number(data).toFixed(2)}`;
    }
  },
  { data: "categoria_principal_nombre", title: "Categoría" },
  { data: "brand_nombre", title: "Marca" },
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
  { 
    data: "precio", 
    title: "Precio",
    render: function(data) {
      return `$${Number(data).toFixed(2)}`;
    }
  },
  { data: "categoria_principal_nombre", title: "Categoría" },
  { data: "brand_nombre", title: "Marca" },
  { 
    data: "estado", 
    title: "Estado",
    render: function(data) {
      return data === 1 ? "Activo" : "Inactivo";
    }
  }
];

/* =========================
   Cargar datos relacionados
   ========================= */
async function cargarDatosRelacionados() {
  try {
    const [
      categoriasResp, 
      categoriasSecundariasResp, 
      subcategoriasResp, 
      unitsResp, 
      sizesResp, 
      brandsResp
    ] = await Promise.all([
      productosAPI.getCategorias(),
      productosAPI.getCategoriasSecundarias(),
      productosAPI.getSubcategorias(),
      productosAPI.getUnits(),
      productosAPI.getSizes(),
      productosAPI.getBrands()
    ]);
    
    datosRelacionados.categorias = toArrayData(categoriasResp);
    datosRelacionados.categoriasSecundarias = toArrayData(categoriasSecundariasResp);
    datosRelacionados.subcategorias = toArrayData(subcategoriasResp);
    datosRelacionados.units = toArrayData(unitsResp);
    datosRelacionados.sizes = toArrayData(sizesResp);
    datosRelacionados.brands = toArrayData(brandsResp);
    
    // Llenar selects del modal
    llenarSelect(categoriaPrincipalSelect, datosRelacionados.categorias, "categoria_id", "nombre");
    llenarSelect(categoriaSecundariaSelect, datosRelacionados.categoriasSecundarias, "categoria_secundaria_id", "nombre");
    llenarSelect(subcategoriaSelect, datosRelacionados.subcategorias, "subcategoria_id", "nombre");
    llenarSelect(unitSelect, datosRelacionados.units, "unit_id", "nombre");
    llenarSelect(sizeSelect, datosRelacionados.sizes, "size_id", "nombre");
    llenarSelect(brandSelect, datosRelacionados.brands, "brand_id", "nombre");
    
    return true;
  } catch (err) {
    console.error("Error cargando datos relacionados:", err);
    showToast("Error cargando datos relacionados", "error", "fa-circle-exclamation");
    return false;
  }
}

function llenarSelect(select, datos, valorKey, textoKey) {
  select.innerHTML = '<option value="">Seleccionar...</option>';
  datos.forEach(item => {
    const option = document.createElement("option");
    option.value = item[valorKey];
    option.textContent = item[textoKey];
    select.appendChild(option);
  });
}

function initPickerCaja() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  letras.forEach(L => {
    cajaLetra1.appendChild(new Option(L, L));
    cajaLetra2.appendChild(new Option(L, L));
  });
}

/* =========================
   Modales accesibles
   ========================= */
let currentMode = "create";
let deleteTarget = null;

function openModal(mode = "create", data = null) {
  currentMode = mode;
  modalTit.textContent = mode === "create" ? "Nuevo Producto" : "Modificar Producto";

  if (mode === "create") {
    hidId.value = "";
    formEl.reset();
    grupoEstado.style.display = "none";
  } else if (data) {
    hidId.value = data.id ?? "";
    nombreInput.value = data.nombre || "";
    descripcionTextarea.value = data.descripcion || "";
    precioInput.value = data.precio || "";
    categoriaPrincipalSelect.value = data.categoria_principal_id || "";
    categoriaSecundariaSelect.value = data.categoria_secundaria_id || "";
    subcategoriaSelect.value = data.subcategoria_id || "";
    unitSelect.value = data.unit_id || "";
    unitValueInput.value = data.unit_value || "";
    sizeSelect.value = data.size_id || "";
    sizeValueInput.value = data.size_value || "";
    brandSelect.value = data.brand_id || "";
    estadoSelect.value = data.estado ?? "1";
    
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
  deleteMsg.textContent = `¿Seguro que deseas eliminar el producto ${item.id} — "${item.nombre}"?`;
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
async function cargarTabla(activos = false) {
  try {
    const resp = assertOk(activos ? await productosAPI.getAllActive() : await productosAPI.getAll());
    const data = mapProductos(resp);
    tablaProductos = renderDataTable("#tablaProductos", data, columnsGeneral);
    logPaso("Refrescar", activos ? "/get_all_active" : "/get_all", resp);
    showToast(`Se cargaron ${data.length} productos ${activos ? 'activos' : ''}`, "success", "fa-check-circle");
  } catch (err) {
    logError("Refrescar", activos ? "/get_all_active" : "/get_all", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    tablaProductos = renderDataTable("#tablaProductos", [], columnsGeneral);
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
$(document).on("click", "#tablaProductos tbody .js-modificar", async function() {
  const id = Number(this.dataset.id);
  if (!id) return;
  try {
    const resp = assertOk(await productosAPI.getById(id));
    const item = mapProductos(resp)[0] || null;
    if (item) openModal("edit", item);
  } catch (err) {
    logError("Modificar (tabla)", `/por_id/${id}`, err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

// Delegación en tabla: Eliminar
$(document).on("click", "#tablaProductos tbody .js-eliminar", function() {
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
    const resp = assertOk(await productosAPI.softDelete(id));
    logPaso("Confirmar eliminar", "/soft_delete", resp);
    closeDeleteModal();
    await cargarTabla();
    limpiarTablaBusquedaSiCoincide(id);
    showToast("Producto eliminado correctamente", "success", "fa-check-circle");
  } catch (err) {
    logError("Confirmar eliminar", "/soft_delete", err);
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Validación
   ========================= */
function validateProducto({ id, nombre, descripcion, precio, categoria_principal_id, categoria_secundaria_id, subcategoria_id, unit_id, unit_value, size_id, size_value, brand_id, estado }, mode) {
  if (mode === "edit") {
    if (!Number.isInteger(Number(id))) throw new Error("ID inválido");
  }
  
  if (!nombre || nombre.trim().length === 0) throw new Error("El nombre es obligatorio");
  if (nombre.length > 100) throw new Error("El nombre no puede tener más de 100 caracteres");
  
  if (descripcion && descripcion.length > 255) throw new Error("La descripción no puede tener más de 255 caracteres");
  
  if (!precio || isNaN(precio) || Number(precio) < 0) throw new Error("Precio inválido");
  
  if (!categoria_principal_id || !Number.isInteger(Number(categoria_principal_id))) throw new Error("Categoría principal inválida");
  
  if (categoria_secundaria_id && !Number.isInteger(Number(categoria_secundaria_id))) throw new Error("Categoría secundaria inválida");
  
  if (subcategoria_id && !Number.isInteger(Number(subcategoria_id))) throw new Error("Subcategoría inválida");
  
  if (!unit_id || !Number.isInteger(Number(unit_id))) throw new Error("Unidad inválida");
  
  if (!unit_value || isNaN(unit_value) || Number(unit_value) < 0) throw new Error("Valor de unidad inválido");
  
  if (!size_id || !Number.isInteger(Number(size_id))) throw new Error("Tamaño inválido");
  
  if (!size_value || size_value.trim().length === 0) throw new Error("Valor de tamaño inválido");
  if (size_value.length > 50) throw new Error("El valor de tamaño no puede tener más de 50 caracteres");
  
  if (!brand_id || !Number.isInteger(Number(brand_id))) throw new Error("Marca inválida");
  
  if (estado !== undefined && ![0, 1].includes(Number(estado))) throw new Error("Estado inválido");
  
  return { 
    producto_id: id ? Number(id) : undefined, 
    nombre: nombre.trim(),
    descripcion: descripcion ? descripcion.trim() : null,
    precio: Number(precio),
    categoria_principal_id: Number(categoria_principal_id),
    categoria_secundaria_id: categoria_secundaria_id ? Number(categoria_secundaria_id) : null,
    subcategoria_id: subcategoria_id ? Number(subcategoria_id) : null,
    unit_id: Number(unit_id),
    unit_value: Number(unit_value),
    size_id: Number(size_id),
    size_value: size_value.trim(),
    brand_id: Number(brand_id),
    estado: estado !== undefined ? Number(estado) : undefined
  };
}

btnResolverCaja?.addEventListener("click", async () => {
  try {
    const l1 = cajaLetra1.value?.trim();
    const l2 = cajaLetra2.value?.trim();
    const cara = Number(cajaCara.value);
    const nivel = Number(cajaNivel.value);

    if (!l1 || !l2 || !cara || !nivel) {
      showToast("Completa letra, cara y nivel.", "info", "fa-info-circle");
      return;
    }
    const letra = `${l1}${l2}`;
    const resp = await productosAPI.getCajaByComponents(letra, cara, nivel);
    if (!resp?.success || !resp?.data?.caja_id) {
      showToast(resp?.message || "No se encontró una caja con esos componentes.", "error", "fa-triangle-exclamation");
      cajaIdInput.value = "";
      cajaPreview.textContent = "Sin caja seleccionada.";
      return;
    }
    // Guardamos el id; si quieres mostrar etiqueta completa, podrías hacer otra llamada /cajas/por_id
    cajaIdInput.value = resp.data.caja_id;
    cajaPreview.textContent = `Caja ID: ${resp.data.caja_id} (letra ${letra}, cara ${cara}, nivel ${nivel})`;
    showToast("Caja encontrada y seleccionada.", "success", "fa-check-circle");
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Guardar (insert/update)
   ========================= */
formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const payload = {
      id: hidId.value ? Number(hidId.value) : undefined,
      nombre: nombreInput.value,
      descripcion: descripcionTextarea.value,
      precio: precioInput.value,
      categoria_principal_id: categoriaPrincipalSelect.value,
      categoria_secundaria_id: categoriaSecundariaSelect.value || null,
      subcategoria_id: subcategoriaSelect.value || null,
      unit_id: unitSelect.value,
      unit_value: unitValueInput.value,
      size_id: sizeSelect.value,
      size_value: sizeValueInput.value,
      brand_id: brandSelect.value,
      estado: estadoSelect.value
    };

    const validated = validateProducto(payload, currentMode);

    if (currentMode === "edit" && validated.producto_id) {
      const resp = assertOk(await productosAPI.update(validated));
      logPaso("Guardar cambios (update)", "/update", resp);
      showToast("Producto actualizado correctamente", "success", "fa-check-circle");
    } else {
      const { producto_id, ...createData } = validated;
      const resp = assertOk(await productosAPI.insert(createData));
      logPaso("Agregar (insert)", "/insert", resp);
      showToast("Producto creado correctamente", "success", "fa-check-circle");
    }

    closeModal();
    formEl.reset();
    await cargarTabla();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Búsqueda (por ID o Nombre)
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
      resp = assertOk(await productosAPI.getById(id));
    } else {
      resp = assertOk(await productosAPI.getByNombre(valor));
    }
    
    const items = mapProductos(resp);
    if (items.length > 0) {
      tablaBusqueda = renderDataTable("#tablaBusqueda", items, columnsBusqueda);
      showToast(`Se encontraron ${items.length} productos`, "success", "fa-check-circle");
    } else {
      showToast("No se encontraron productos.", "info", "fa-info-circle");
      tablaBusqueda = renderDataTable("#tablaBusqueda", [], columnsBusqueda);
    }
    logPaso("Buscar", tipo === "id" ? `/por_id/${valor}` : `/buscar_por_nombre/${valor}`, resp);
  } catch (err) {
    logError("Buscar", tipo === "id" ? `/por_id/${valor}` : `/buscar_por_nombre/${valor}`, err);
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

btnVerActivos?.addEventListener("click", async () => {
  await cargarTabla(true);
});

/* =========================
   Inicialización
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  // Cargar datos relacionados
  await cargarDatosRelacionados();
  
  // Inicializar tablas vacías
  tablaProductos = renderDataTable("#tablaProductos", [], columnsGeneral);
  tablaBusqueda = renderDataTable("#tablaBusqueda", [], columnsBusqueda);
  
  showToast("Panel de productos listo. Presiona 'Refrescar' para cargar los datos.", "info", "fa-info-circle");
});