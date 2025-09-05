// Panel: Consulta de Productos & Stock
// Managers esperados (con nombres típicos). Se incluyen *fallbacks* para métodos alternativos.
import { productosAPI } from "/user-resources/scripts/apis/productosManager.js";
import { cajasAPI } from "/user-resources/scripts/apis/cajasManager.js";
import { categoriasAPI } from "/user-resources/scripts/apis/categoriasManager.js";
import { categoriasSecundariasAPI } from "/user-resources/scripts/apis/categoriasSecundariasManager.js";
import { subcategoriasAPI } from "/user-resources/scripts/apis/subcategoriasManager.js";
import { unitsAPI } from "/user-resources/scripts/apis/unitsManager.js";
import { sizesAPI } from "/user-resources/scripts/apis/sizesManager.js";
import { brandsAPI as _brandsMaybe } from "/user-resources/scripts/apis/brandsManager.js";
import { bransAPI as _bransMaybe } from "/user-resources/scripts/apis/bransManager.js"; // algunos proyectos usan 'brans'
import { stockAPI } from "/user-resources/scripts/apis/stockManager.js";

/* resolver brands: brandsAPI o bransAPI */
const brandsAPI = (typeof _brandsMaybe !== "undefined" && _brandsMaybe)
  ? _brandsMaybe
  : ((typeof _bransMaybe !== "undefined" && _bransMaybe) ? _bransMaybe : null);

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
  // si viene un Error con .message del server, lo mostramos
  const msg = (err && err.message) ? String(err.message) : "";
  const isNet =
    (err && err.name === "TypeError" && /fetch/i.test(msg)) ||
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

/* =========================
   Helpers
   ========================= */
function toArrayData(resp) {
  const r = resp && typeof resp === "object" && "data" in resp ? resp.data : resp;
  if (Array.isArray(r)) return r;
  if (!r) return [];
  return [r];
}
function renderDataTable(selector, data, columns, opts={}) {
  if ($.fn.DataTable.isDataTable(selector)) $(selector).DataTable().clear().destroy();
  return $(selector).DataTable(Object.assign({ data, columns, pageLength: 10, autoWidth: false }, opts));
}
function fmtMoney(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : "";
}
const get = (id) => document.getElementById(id);

// Llama el primer método disponible entre varias alternativas
async function callFirstAvailable(candidates) {
  let lastErr = null;
  for (const c of candidates) {
    const [api, fn, ...args] = c;
    try {
      if (api && typeof api[fn] === "function") {
        const r = await api[fn](...args);
        return r;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) throw lastErr;
  throw new Error("No hay método disponible para esta operación");
}

/* =========================
   DOM Refs
   ========================= */
const filtroCatP = get("filtroCatP");
const filtroCatS = get("filtroCatS");
const filtroSubc = get("filtroSubc");
const filtroCaja = get("filtroCaja");

const buscarId = get("buscarId");
const btnBuscarId = get("btnBuscarId");
const buscarNombre = get("buscarNombre");
const btnBuscarNombre = get("btnBuscarNombre");

const btnVerTodo = get("btnVerTodo");
const btnFiltrar = get("btnFiltrar");
const btnNuevoProducto = get("btnNuevoProducto");
const btnNuevaCaja = get("btnNuevaCaja");

/* Producto modal */
const modalProducto = get("modalProducto");
const modalProductoTitle = get("modalProductoTitle");
const closeProductoModalBtn = get("closeProductoModalBtn");
const cancelProductoBtn = get("cancelProductoBtn");
const productoForm = get("productoForm");
const pId = get("producto_id");
const pNombre = get("pNombre");
const pDesc = get("pDesc");
const pPrecio = get("pPrecio");
const pCatP = get("pCatP");
const pCatS = get("pCatS");
const pSubc = get("pSubc");
const pUnidad = get("pUnidad");
const pUnidadVal = get("pUnidadVal");
const pSize = get("pSize");
const pSizeVal = get("pSizeVal");
const pMarca = get("pMarca");

/* Caja modal */
const modalCaja = get("modalCaja");
const closeCajaModalBtn = get("closeCajaModalBtn");
const cancelCajaBtn = get("cancelCajaBtn");
const cajaForm = get("cajaForm");
const cajaLetra = get("cajaLetra");
const cajaCara = get("cajaCara");
const cajaNivel = get("cajaNivel");

/* Stock modal */
const modalStock = get("modalStock");
const closeStockModalBtn = get("closeStockModalBtn");
const msProductoId = get("msProductoId");
const msNombreProd = get("msNombreProd");
const msCajaAdd = get("msCajaAdd");
const msDeltaAdd = get("msDeltaAdd");
const msCajaRemove = get("msCajaRemove");
const msDeltaRemove = get("msDeltaRemove");
const msDetalleSet = get("msDetalleSet");
const msSetStock = get("msSetStock");
const msCajaOrigen = get("msCajaOrigen");
const msCajaDestino = get("msCajaDestino");
const msMoverCantidad = get("msMoverCantidad");
const btnStockAdd = get("btnStockAdd");
const btnStockRemove = get("btnStockRemove");
const btnStockSet = get("btnStockSet");
const btnStockMove = get("btnStockMove");
const btnVaciarStock = get("btnVaciarStock");

/* Confirm modal */
const modalConfirm = get("modalConfirm");
const closeConfirmModalBtn = get("closeConfirmModalBtn");
const cancelConfirmBtn = get("cancelConfirmBtn");
const okConfirmBtn = get("okConfirmBtn");
const confirmMessage = get("confirmMessage");

/* =========================
   DataTables
   ========================= */
const columnsProductos = [
  { data: "producto_id", title: "ID" },
  { data: "nombre", title: "Nombre" },
  { data: "precio", title: "Precio", render: (v)=>`$${fmtMoney(v)}` },
  { data: "brand_nombre", title: "Marca" },
  { data: "categoria_principal_nombre", title: "Cat. P" },
  { data: "categoria_secundaria_nombre", title: "Cat. S" },
  { data: "subcategoria_nombre", title: "Subcat" },
  { data: "unit_nombre", title: "Unidad" },
  { data: "unit_value", title: "Unidad valor" },
  { data: "size_nombre", title: "Size" },
  { data: "size_value", title: "Size valor" },
  {
    data: null, title: "Acciones", orderable:false,
    render: (row) => `<div class="btn-group">
      <button class="btn btn-outline-primary js-stock" data-id="${row.producto_id}" data-nombre="${row.nombre}"><i class="fa-solid fa-boxes-stacked"></i> Stock</button>
      <button class="btn btn-warning js-editar" data-id="${row.producto_id}"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
      <button class="btn btn-danger js-eliminar" data-id="${row.producto_id}"><i class="fa-solid fa-trash-can"></i> Eliminar</button>
    </div>`
  }
];
const columnsPorCaja = [
  { data: "etiqueta", title: "Caja" },
  { data: "nombre", title: "Producto" },
  { data: "stock", title: "Stock" }
];
const columnsResumen = [
  { data: "etiqueta", title: "Caja" },
  { data: "detalle_id", title: "Detalle" },
  { data: "nombre", title: "Producto" },
  { data: "stock", title: "Stock" }
];
const columnsDetallesStock = [
  { data: "detalle_id", title: "Detalle" },
  { data: "etiqueta", title: "Caja" },
  { data: "stock", title: "Stock" }
];
let dtProductos, dtPorCaja, dtResumen, dtDetalles;

/* =========================
   Normalizadores
   ========================= */
function mapProducto(row) {
  if (!row || typeof row !== 'object') return null;
  const p = {
    producto_id: row.producto_id ?? row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? null,
    precio: row.precio,
    categoria_principal_id: row.categoria_principal_id ?? row.categoria_id ?? null,
    categoria_secundaria_id: row.categoria_secundaria_id ?? null,
    subcategoria_id: row.subcategoria_id ?? null,
    unit_id: row.unit_id ?? null,
    unit_value: row.unit_value ?? null,
    size_id: row.size_id ?? null,
    size_value: row.size_value ?? null,
    brand_id: row.brand_id ?? null,

    categoria_principal_nombre: row.categoria_principal_nombre ?? row.categoria_nombre ?? null,
    categoria_secundaria_nombre: row.categoria_secundaria_nombre ?? null,
    subcategoria_nombre: row.subcategoria_nombre ?? null,
    unit_nombre: row.unit_nombre ?? null,
    size_nombre: row.size_nombre ?? null,
    brand_nombre: row.brand_nombre ?? null,
  };
  if (p.producto_id == null || p.nombre == null) return null;
  return p;
}
const mapProductos = (resp) => toArrayData(resp).map(mapProducto).filter(Boolean);

/* =========================
   Selects (catálogos)
   ========================= */
async function fillSelect(selectEl, fetcher, { valueKey='id', labelKey='nombre', includeEmpty=true, emptyLabel='— Selecciona —' } = {}) {
  try {
    const resp = assertOk(await fetcher());
    const arr = toArrayData(resp);
    selectEl.innerHTML = "";
    if (includeEmpty) {
      const op0 = document.createElement('option');
      op0.value = ""; op0.textContent = emptyLabel;
      selectEl.appendChild(op0);
    }
    for (const it of arr) {
      const v = it[valueKey] ?? it[`${labelKey}_id`] ?? it.id ?? it.caja_id ?? it.producto_id ?? it.size_id ?? it.unit_id ?? it.brand_id ?? it.categoria_id ?? it.categoria_secundaria_id ?? it.subcategoria_id;
      const l = it[labelKey] ?? it.etiqueta ?? it.nombre;
      if (v == null || l == null) continue;
      const op = document.createElement('option');
      op.value = String(v); op.textContent = String(l);
      selectEl.appendChild(op);
    }
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
}
async function cargarCatalogosParaFiltros() {
  await Promise.all([
    fillSelect(filtroCatP, () => callFirstAvailable([[categoriasAPI, "getAll"], [categoriasAPI, "getList"]])),
    fillSelect(filtroCatS, () => callFirstAvailable([[categoriasSecundariasAPI, "getAll"], [categoriasSecundariasAPI, "getList"]])),
    fillSelect(filtroSubc, () => callFirstAvailable([[subcategoriasAPI, "getAll"], [subcategoriasAPI, "getList"]])),
    fillSelect(filtroCaja, () => callFirstAvailable([[cajasAPI, "getAll"], [cajasAPI, "getList"]]), { valueKey: 'caja_id', labelKey: 'etiqueta' }),
  ]);
}
async function cargarCatalogosParaProducto() {
  const fills = [
    fillSelect(pCatP, () => callFirstAvailable([[categoriasAPI, "getAll"], [categoriasAPI, "getList"]])),
    fillSelect(pCatS, () => callFirstAvailable([[categoriasSecundariasAPI, "getAll"], [categoriasSecundariasAPI, "getList"]])),
    fillSelect(pSubc, () => callFirstAvailable([[subcategoriasAPI, "getAll"], [subcategoriasAPI, "getList"]])),
    fillSelect(pUnidad, () => callFirstAvailable([[unitsAPI, "getAll"]]), { valueKey: 'unit_id', labelKey: 'nombre', includeEmpty:false }),
    fillSelect(pSize,   () => callFirstAvailable([[sizesAPI, "getAll"]]), { valueKey: 'size_id', labelKey: 'nombre', includeEmpty:false }),
  ];
  if (brandsAPI) fills.push(fillSelect(pMarca, () => callFirstAvailable([[brandsAPI, "getAll"], [brandsAPI, "getList"]]), { valueKey:'brand_id', labelKey:'nombre', includeEmpty:false }));
  await Promise.all(fills);
}

/* =========================
   Productos: cargas
   ========================= */
async function cargarProductosAll() {
  try {
    const resp = assertOk(await callFirstAvailable([
      [productosAPI, "getAllActive"],
      [productosAPI, "getAll"]
    ]));
    const data = mapProductos(resp);
    dtProductos = renderDataTable("#tablaProductos", data, columnsProductos);
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    dtProductos = renderDataTable("#tablaProductos", [], columnsProductos);
  }
}
async function cargarProductosFiltrados() {
  // Aplica filtros de categoría y texto sobre getAll (fallback si no hay endpoints específicos)
  try {
    const base = assertOk(await callFirstAvailable([
      [productosAPI, "getAllActive"],
      [productosAPI, "getAll"]
    ]));
    let data = mapProductos(base);
    const catP = Number(filtroCatP.value || 0);
    const catS = Number(filtroCatS.value || 0);
    const subc = Number(filtroSubc.value || 0);
    const q = String(buscarNombre.value || "").trim().toLowerCase();

    if (catP) data = data.filter(x => Number(x.categoria_principal_id) === catP);
    if (catS) data = data.filter(x => Number(x.categoria_secundaria_id) === catS);
    if (subc) data = data.filter(x => Number(x.subcategoria_id) === subc);
    if (q) data = data.filter(x => (x.nombre || "").toLowerCase().includes(q));

    dtProductos = renderDataTable("#tablaProductos", data, columnsProductos);
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
}
async function cargarProductosPorCaja() {
  const id = Number(filtroCaja.value || 0);
  if (!id) { dtPorCaja = renderDataTable("#tablaPorCaja", [], columnsPorCaja); return; }
  try {
    const resp = assertOk(await callFirstAvailable([
      [stockAPI, "getProductosPorCaja", id],
      [productosAPI, "getByCaja", id]
    ]));
    const data = toArrayData(resp).map(r => ({
      etiqueta: r.etiqueta ?? r.caja_etiqueta ?? `Caja ${r.caja_id}`,
      nombre: r.nombre ?? r.producto_nombre ?? r.nombre_producto,
      stock: r.stock ?? 0
    }));
    dtPorCaja = renderDataTable("#tablaPorCaja", data, columnsPorCaja);
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    dtPorCaja = renderDataTable("#tablaPorCaja", [], columnsPorCaja);
  }
}
async function cargarResumenPorCajas() {
  try {
    const resp = assertOk(await callFirstAvailable([
      [stockAPI, "getResumenPorCajas"],
      [productosAPI, "getByCajasResumen"]
    ]));
    const data = toArrayData(resp).map(r => ({
      etiqueta: r.etiqueta ?? r.caja_etiqueta ?? `Caja ${r.caja_id}`,
      detalle_id: r.detalle_id ?? r.caja_detalle_id ?? r.id,
      nombre: r.nombre ?? r.producto_nombre ?? r.nombre_producto,
      stock: r.stock ?? 0
    }));
    dtResumen = renderDataTable("#tablaResumenCajas", data, columnsResumen);
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    dtResumen = renderDataTable("#tablaResumenCajas", [], columnsResumen);
  }
}

/* =========================
   Filtros / búsquedas
   ========================= */
btnVerTodo?.addEventListener("click", async () => {
  buscarId.value = "";
  buscarNombre.value = "";
  filtroCatP.value = "";
  filtroCatS.value = "";
  filtroSubc.value = "";
  filtroCaja.value = "";
  await cargarProductosAll();
  await cargarProductosPorCaja();
});
btnFiltrar?.addEventListener("click", async () => {
  await cargarProductosFiltrados();
  await cargarProductosPorCaja();
});
btnBuscarId?.addEventListener("click", async () => {
  const id = Number(buscarId.value || 0);
  if (!id) return showToast("Ingresa un ID válido", "error", "fa-circle-exclamation");
  try {
    const resp = assertOk(await productosAPI.getById(id));
    const data = mapProductos(resp);
    dtProductos = renderDataTable("#tablaProductos", data ? [data] : [], columnsProductos);
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});
btnBuscarNombre?.addEventListener("click", async () => {
  const s = String(buscarNombre.value || "").trim();
  if (!s) return showToast("Ingresa un texto a buscar", "error", "fa-circle-exclamation");
  try {
    const resp = assertOk(await callFirstAvailable([
      [productosAPI, "buscarPorNombre", s],
      [productosAPI, "searchByName", s],
      [productosAPI, "findByName", s],
    ]));
    const data = mapProductos(resp);
    dtProductos = renderDataTable("#tablaProductos", data, columnsProductos);
  } catch (err) {
    // Fallback a filtrar en cliente
    try {
      const base = assertOk(await callFirstAvailable([
        [productosAPI, "getAllActive"],
        [productosAPI, "getAll"]
      ]));
      const data = mapProductos(base).filter(x => (x.nombre || "").toLowerCase().includes(s.toLowerCase()));
      dtProductos = renderDataTable("#tablaProductos", data, columnsProductos);
    } catch (err2) {
      showToast(friendlyError(err2), "error", "fa-circle-exclamation");
    }
  }
});

/* =========================
   Modales: abrir/cerrar
   ========================= */
let currentMode = "create";
function openProductoModal(mode="create", data=null) {
  currentMode = mode;
  modalProductoTitle.textContent = mode === "create" ? "Nuevo producto" : "Editar producto";
  if (mode === "create") {
    pId.value = ""; productoForm.reset();
  } else if (data) {
    pId.value = data.producto_id ?? "";
    pNombre.value = data.nombre ?? "";
    pDesc.value = data.descripcion ?? "";
    pPrecio.value = data.precio ?? "";
    pCatP.value = data.categoria_principal_id ?? "";
    pCatS.value = data.categoria_secundaria_id ?? "";
    pSubc.value = data.subcategoria_id ?? "";
    pUnidad.value = data.unit_id ?? "";
    pUnidadVal.value = data.unit_value ?? "";
    pSize.value = data.size_id ?? "";
    pSizeVal.value = data.size_value ?? "";
    pMarca.value = data.brand_id ?? "";
  }
  modalProducto.classList.add("show");
  modalProducto.setAttribute("aria-hidden", "false");
}
function closeProductoModal() { modalProducto.classList.remove("show"); modalProducto.setAttribute("aria-hidden", "true"); }
closeProductoModalBtn?.addEventListener("click", closeProductoModal);
cancelProductoBtn?.addEventListener("click", closeProductoModal);
btnNuevoProducto?.addEventListener("click", () => openProductoModal("create"));

function openCajaModal() { modalCaja.classList.add("show"); modalCaja.setAttribute("aria-hidden","false"); }
function closeCajaModal() { modalCaja.classList.remove("show"); modalCaja.setAttribute("aria-hidden","true"); }
closeCajaModalBtn?.addEventListener("click", closeCajaModal);
cancelCajaBtn?.addEventListener("click", closeCajaModal);
btnNuevaCaja?.addEventListener("click", openCajaModal);

function openStockModal({ producto_id, nombre }) {
  msProductoId.value = producto_id;
  msNombreProd.textContent = `${producto_id} — ${nombre}`;
  modalStock.classList.add("show"); modalStock.setAttribute("aria-hidden","false");
  cargarDetallesStock(producto_id);
  // llenar combos
  Promise.all([
    fillSelect(msCajaAdd, () => callFirstAvailable([[cajasAPI, "getAll"], [cajasAPI, "getList"]]), { valueKey:'caja_id', labelKey:'etiqueta', includeEmpty:false }),
    fillSelect(msCajaRemove, () => callFirstAvailable([[cajasAPI, "getAll"], [cajasAPI, "getList"]]), { valueKey:'caja_id', labelKey:'etiqueta', includeEmpty:false }),
    fillSelect(msCajaOrigen, () => callFirstAvailable([[cajasAPI, "getAll"], [cajasAPI, "getList"]]), { valueKey:'caja_id', labelKey:'etiqueta', includeEmpty:false }),
    fillSelect(msCajaDestino, () => callFirstAvailable([[cajasAPI, "getAll"], [cajasAPI, "getList"]]), { valueKey:'caja_id', labelKey:'etiqueta', includeEmpty:false }),
  ]);
}
function closeStockModal() { modalStock.classList.remove("show"); modalStock.setAttribute("aria-hidden","true"); }
closeStockModalBtn?.addEventListener("click", closeStockModal);

/* =========================
   Validación & Persistencia
   ========================= */
function validateProductoPayload({ producto_id, nombre, descripcion, precio, categoria_principal_id, categoria_secundaria_id, subcategoria_id, unit_id, unit_value, size_id, size_value, brand_id }, mode) {
  const sNombre = String(nombre ?? "").trim();
  if (!sNombre || sNombre.length > 100) throw new Error("nombre es requerido (<=100)");
  const sDesc = descripcion == null ? null : String(descripcion).trim();
  if (sDesc && sDesc.length > 255) throw new Error("descripcion <=255");

  const numPrecio = Number(precio); if (!Number.isFinite(numPrecio)) throw new Error("precio inválido");
  const catP = Number(categoria_principal_id); if (!Number.isInteger(catP) || catP <= 0) throw new Error("categoria_principal_id inválido");

  const catS = categoria_secundaria_id ? Number(categoria_secundaria_id) : null;
  if (catS != null && !Number.isInteger(catS)) throw new Error("categoria_secundaria_id inválido");
  const sub  = subcategoria_id ? Number(subcategoria_id) : null;
  if (sub != null && !Number.isInteger(sub)) throw new Error("subcategoria_id inválido");

  const unitId = Number(unit_id); if (!Number.isInteger(unitId) || unitId <= 0) throw new Error("unit_id inválido");
  const unitVal = Number(unit_value); if (!Number.isFinite(unitVal)) throw new Error("unit_value inválido");
  const sizeId = Number(size_id); if (!Number.isInteger(sizeId) || sizeId <= 0) throw new Error("size_id inválido");
  const sizeVal = String(size_value ?? "").trim(); if (!sizeVal || sizeVal.length > 50) throw new Error("size_value requerido (<=50)");
  const brandId = Number(brand_id); if (brandsAPI && (!Number.isInteger(brandId) || brandId <= 0)) throw new Error("brand_id inválido");

  const payload = { nombre: sNombre, descripcion: sDesc || null, precio: numPrecio, categoria_principal_id: catP, categoria_secundaria_id: catS, subcategoria_id: sub, unit_id: unitId, unit_value: unitVal, size_id: sizeId, size_value: sizeVal };
  if (brandsAPI) payload.brand_id = brandId;
  if (mode === "edit") payload.producto_id = Number(producto_id);
  return payload;
}
productoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const payload = validateProductoPayload({
      producto_id: pId.value,
      nombre: pNombre.value,
      descripcion: pDesc.value,
      precio: pPrecio.value,
      categoria_principal_id: pCatP.value,
      categoria_secundaria_id: pCatS.value || null,
      subcategoria_id: pSubc.value || null,
      unit_id: pUnidad.value,
      unit_value: pUnidadVal.value,
      size_id: pSize.value,
      size_value: pSizeVal.value,
      brand_id: pMarca.value
    }, currentMode);

    if (currentMode === "edit" && payload.producto_id) {
      const resp = assertOk(await productosAPI.update(payload));
      showToast("Operación completada", "success", "fa-check-circle");
    } else {
      const resp = assertOk(await productosAPI.insert(payload));
      showToast("Operación completada", "success", "fa-check-circle");
    }
    closeProductoModal();
    await cargarProductosAll();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Crear Caja
   ========================= */
cajaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const letra = String(cajaLetra.value || "").trim().toUpperCase();
    const cara = Number(cajaCara.value);
    const nivel = Number(cajaNivel.value);
    if (!letra || letra.length > 2) throw new Error("Letra inválida (1–2 caracteres)");
    if (![1,2].includes(cara)) throw new Error("Cara inválida (1 o 2)");
    if (!Number.isInteger(nivel) || nivel < 1) throw new Error("Nivel inválido (>=1)");
    const resp = assertOk(await cajasAPI.insert({ letra, cara, nivel }));
    showToast("Operación completada", "success", "fa-check-circle");
    closeCajaModal();
    await cargarCatalogosParaFiltros(); // recargar lista de cajas
    await cargarProductosPorCaja();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});

/* =========================
   Editar / Eliminar / Stock (delegación)
   ========================= */
$(document).on("click", "#tablaProductos tbody .js-editar", async function() {
  const id = Number(this.dataset.id);
  if (!id) return;
  try {
    const resp = assertOk(await productosAPI.getById(id));
    const p = mapProductos(resp);
    if (p) openProductoModal("edit", p);
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});
$(document).on("click", "#tablaProductos tbody .js-eliminar", function() {
  const id = Number(this.dataset.id);
  if (!id) return;
  confirmAction(`¿Eliminar producto ${id}?`, async () => {
    try {
      const resp = assertOk(await productosAPI.remove(id));
      showToast("Operación completada", "success", "fa-check-circle");
      await cargarProductosAll();
      await cargarResumenPorCajas();
    } catch (err) {
      showToast(friendlyError(err), "error", "fa-circle-exclamation");
    }
  });
});
$(document).on("click", "#tablaProductos tbody .js-stock", function() {
  const id = Number(this.dataset.id);
  const nombre = String(this.dataset.nombre || "");
  if (!id) return;
  openStockModal({ producto_id: id, nombre });
});

/* =========================
   Stock: Detalles y operaciones
   ========================= */
async function cargarDetallesStock(producto_id) {
  try {
    const resp = assertOk(await callFirstAvailable([
      [stockAPI, "getDetallesPorProducto", producto_id],
      [stockAPI, "getDetallesByProducto", producto_id],
    ]));
    const detalles = toArrayData(resp).map(r => ({
      detalle_id: r.detalle_id ?? r.id,
      etiqueta: r.etiqueta ?? r.caja_etiqueta ?? `Caja ${r.caja_id}`,
      stock: r.stock ?? 0
    }));
    dtDetalles = renderDataTable("#tablaDetallesStock", detalles, columnsDetallesStock);
    // llenar select de detalles
    msDetalleSet.innerHTML = "";
    for (const d of detalles) {
      const op = document.createElement('option');
      op.value = String(d.detalle_id);
      op.textContent = `${d.detalle_id} — ${d.etiqueta}`;
      msDetalleSet.appendChild(op);
    }
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
    dtDetalles = renderDataTable("#tablaDetallesStock", [], columnsDetallesStock);
  }
}
btnStockAdd?.addEventListener("click", async () => {
  const producto_id = Number(msProductoId.value);
  const caja_id = Number(msCajaAdd.value);
  const delta = Number(msDeltaAdd.value);
  if (!producto_id || !caja_id || !delta) return showToast("Completa caja y cantidad", "error", "fa-circle-exclamation");
  try {
    const resp = assertOk(await stockAPI.add({ caja_id, producto_id, delta }));
    showToast("Operación completada", "success", "fa-check-circle");
    await cargarDetallesStock(producto_id);
    await cargarProductosPorCaja();
    await cargarResumenPorCajas();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});
btnStockRemove?.addEventListener("click", async () => {
  const producto_id = Number(msProductoId.value);
  const caja_id = Number(msCajaRemove.value);
  const delta = Number(msDeltaRemove.value);
  if (!producto_id || !caja_id || !delta) return showToast("Completa caja y cantidad", "error", "fa-circle-exclamation");
  try {
    const resp = assertOk(await stockAPI.remove({ caja_id, producto_id, delta }));
    showToast("Operación completada", "success", "fa-check-circle");
    await cargarDetallesStock(producto_id);
    await cargarProductosPorCaja();
    await cargarResumenPorCajas();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});
btnStockSet?.addEventListener("click", async () => {
  const producto_id = Number(msProductoId.value);
  const detalle_id = Number(msDetalleSet.value);
  const stock = Number(msSetStock.value);
  if (!producto_id || !detalle_id || stock < 0) return showToast("Completa detalle y stock >= 0", "error", "fa-circle-exclamation");
  try {
    const resp = assertOk(await stockAPI.setByDetalle({ detalle_id, producto_id, stock }));
    showToast("Operación completada", "success", "fa-check-circle");
    await cargarDetallesStock(producto_id);
    await cargarProductosPorCaja();
    await cargarResumenPorCajas();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});
btnStockMove?.addEventListener("click", async () => {
  const producto_id = Number(msProductoId.value);
  const caja_origen = Number(msCajaOrigen.value);
  const caja_destino = Number(msCajaDestino.value);
  const cantidad = Number(msMoverCantidad.value);
  if (!producto_id || !caja_origen || !caja_destino || !cantidad) return showToast("Completa origen, destino y cantidad", "error", "fa-circle-exclamation");
  try {
    const resp = assertOk(await stockAPI.move({ producto_id, caja_origen, caja_destino, cantidad }));
    showToast("Operación completada", "success", "fa-check-circle");
    await cargarDetallesStock(producto_id);
    await cargarProductosPorCaja();
    await cargarResumenPorCajas();
  } catch (err) {
    showToast(friendlyError(err), "error", "fa-circle-exclamation");
  }
});
btnVaciarStock?.addEventListener("click", async () => {
  const producto_id = Number(msProductoId.value);
  if (!producto_id) return;
  confirmAction("¿Vaciar stock del producto en todas las cajas? Se fijará en 0.", async () => {
    try {
      const resp = assertOk(await callFirstAvailable([
        [stockAPI, "getDetallesPorProducto", producto_id],
        [stockAPI, "getDetallesByProducto", producto_id],
      ]));
      const detalles = toArrayData(resp);
      for (const d of detalles) {
        const detalle_id = d.detalle_id ?? d.id;
        if (detalle_id) {
          await stockAPI.setByDetalle({ detalle_id, producto_id, stock: 0 });
        }
      }
      showToast("Operación completada", "success", "fa-check-circle");
      await cargarDetallesStock(producto_id);
      await cargarProductosPorCaja();
      await cargarResumenPorCajas();
    } catch (err) {
      showToast(friendlyError(err), "error", "fa-circle-exclamation");
    }
  });
});

/* =========================
   Confirm genérico
   ========================= */
function openConfirm(message, onOk) {
  confirmMessage.textContent = message;
  modalConfirm.classList.add("show"); modalConfirm.setAttribute("aria-hidden","false");
  okConfirmBtn.onclick = () => { closeConfirm(); onOk && onOk(); };
}
function closeConfirm() { modalConfirm.classList.remove("show"); modalConfirm.setAttribute("aria-hidden","true"); okConfirmBtn.onclick = null; }
function confirmAction(message, fn) { openConfirm(message, fn); }
closeConfirmModalBtn?.addEventListener("click", closeConfirm);
cancelConfirmBtn?.addEventListener("click", closeConfirm);

/* =========================
   Inicialización
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  // inicializar tablas vacías
  dtProductos = renderDataTable("#tablaProductos", [], columnsProductos);
  dtPorCaja   = renderDataTable("#tablaPorCaja", [], columnsPorCaja);
  dtResumen   = renderDataTable("#tablaResumenCajas", [], columnsResumen);
  dtDetalles  = renderDataTable("#tablaDetallesStock", [], columnsDetallesStock);

  // catálogos
  await cargarCatalogosParaFiltros();
  await cargarCatalogosParaProducto();

  // datos
  await cargarProductosAll();
  await cargarProductosPorCaja();
  await cargarResumenPorCajas();
});
