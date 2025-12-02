// /admin-resources/scripts/panel-adm-productos-cards.js

// Importamos todas las APIs necesarias
import { productosAPI } from "/admin-resources/scripts/api/productosManager.js";
import { imagenesAPI } from "/admin-resources/scripts/api/imagesManager.js";
import { categoriasAPI } from "/admin-resources/scripts/api/categoriasManager.js";
import { cajasAPI } from "/admin-resources/scripts/api/cajasManager.js";

// Elementos DOM
const ui = {
    grid: document.getElementById('productsGrid'),
    loading: document.getElementById('loadingState'),
    empty: document.getElementById('emptyState'),
    count: document.getElementById('resultCount'),
    
    // Filtros
    search: document.getElementById('searchInput'),
    catPri: document.getElementById('filterCatPri'),
    catSec: document.getElementById('filterCatSec'),
    subCat: document.getElementById('filterSubCat'),
    caja:   document.getElementById('filterCaja'),
    
    // Botones
    btnReset: document.getElementById('btnResetFilters'),
    btnRefresh: document.getElementById('btnRefresh')
};

// Estado Global
let state = {
    products: [],      // Productos crudos
    images: [],        // Lista de imagenes
    categoriesL1: [],  // Categorias Nivel 1
    categoriesL2: [],  // Categorias Nivel 2
    categoriesL3: [],  // Categorias Nivel 3
    cajas: [],         // Cajas
    mergedProducts: [] // Productos con imagen y nombres normalizados
};

/* =========================
   Inicialización
   ========================= */
document.addEventListener("DOMContentLoaded", init);

async function init() {
    await loadData();
    setupEventListeners();
}

/* =========================
   Carga de Datos
   ========================= */
async function loadData() {
    setLoading(true);
    try {
        console.log("Iniciando carga de datos...");

        // Ejecutamos peticiones en paralelo. 
        const [
            prodResp, 
            imgResp, 
            cat1Resp, 
            cat2Resp, 
            cat3Resp, 
            cajaResp
        ] = await Promise.all([
            productosAPI.getAll(),
            
            // Si falla la API de imágenes, retornamos array vacío
            imagenesAPI.getAll().catch(err => { 
                console.warn("Advertencia: No se pudieron cargar las imágenes.", err);
                return []; 
            }),
            
            categoriasAPI.principalesGetAll(),
            categoriasAPI.secundariasGetAll(),
            categoriasAPI.subcategoriasGetAll(),
            
            cajasAPI.getAll()
        ]);

        // --- LOGS DE DEPURACIÓN SOLICITADOS ---
        console.group("🔍 Inspección de Datos Recibidos");
        console.log("Productos (Raw):", prodResp);
        console.log("Categorías L1:", cat1Resp);
        console.log("Categorías L2:", cat2Resp);
        console.log("Categorías L3:", cat3Resp);
        console.log("Cajas:", cajaResp);
        console.groupEnd();

        // Extracción robusta de datos
        state.products = Array.isArray(prodResp) ? prodResp : (prodResp.data || []);
        state.images = Array.isArray(imgResp) ? imgResp : (imgResp.data || []);
        
        state.categoriesL1 = Array.isArray(cat1Resp) ? cat1Resp : (cat1Resp.data || []);
        state.categoriesL2 = Array.isArray(cat2Resp) ? cat2Resp : (cat2Resp.data || []);
        state.categoriesL3 = Array.isArray(cat3Resp) ? cat3Resp : (cat3Resp.data || []);
        state.cajas = Array.isArray(cajaResp) ? cajaResp : (cajaResp.data || []);

        console.log(`✅ Resumen: ${state.products.length} prods, ${state.images.length} imgs, ${state.categoriesL1.length} catL1.`);

        // Unir datos
        mergeData();

        // Llenar filtros
        populateFilters();

        // Renderizar
        applyFilters();
        
        showToast(`Carga completa: ${state.mergedProducts.length} productos.`, "success", "fa-check");

    } catch (err) {
        console.error("Error crítico cargando datos:", err);
        showToast("Error de conexión o datos.", "error", "fa-circle-exclamation");
        ui.grid.innerHTML = `<div class="text-center text-danger py-5"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><p>Error al procesar datos</p><small class="text-muted">${err.message}</small></div>`;
    } finally {
        setLoading(false);
    }
}

/* =========================
   Procesamiento de Datos
   ========================= */
function mergeData() {
    // Mapa de imágenes
    const imageMap = {};
    state.images.forEach(img => {
        if (img.producto_id) {
            imageMap[img.producto_id] = img.url || img.path;
        }
    });

    state.mergedProducts = state.products.map(prod => {
        const pId = prod.producto_id || prod.id; 
        
        let imgUrl = prod.imagen || prod.img_url || imageMap[pId] || null;
        
        return {
            ...prod,
            _finalId: pId, 
            _finalImage: imgUrl,
            _finalStock: (prod.stock_total !== undefined) ? Number(prod.stock_total) : (Number(prod.stock) || 0),
            _searchStr: `${prod.nombre} ${prod.descripcion || ''} ${prod.sku || ''} ${pId} ${prod.brand_nombre || ''}`.toLowerCase()
        };
    });
}

function populateFilters() {
    // Helper inteligente y ROBUSTO
    const fillSelect = (selectElement, data, labelKey = 'nombre') => {
        // 1. Si el elemento no existe en el DOM, salimos
        if (!selectElement) return;

        // 2. CORRECCIÓN: Si el elemento NO es un SELECT (ej. es un input), no intentamos llenarlo
        if (selectElement.tagName !== 'SELECT') {
            console.log(`Info: El filtro #${selectElement.id} es un <${selectElement.tagName}>, no se llenará automáticamente.`);
            return;
        }
        
        // Limpiar pero dejar la opción por defecto
        const firstOption = selectElement.options[0];
        selectElement.innerHTML = '';
        if (firstOption) selectElement.appendChild(firstOption);

        if (!Array.isArray(data)) {
            console.warn("Data para select no es un array:", data);
            return;
        }

        data.forEach(item => {
            const opt = document.createElement('option');
            // Intentar detectar la llave primaria
            const val = item.id || item.categoria_principal_id || item.categoria_secundaria_id || item.subcategoria_id || item.caja_id || item.brand_id;
            
            if (val !== undefined) {
                opt.value = val;
                opt.textContent = item[labelKey] || item.descripcion || `Item ${val}`;
                selectElement.appendChild(opt);
            }
        });
    };

    fillSelect(ui.catPri, state.categoriesL1);
    fillSelect(ui.catSec, state.categoriesL2);
    fillSelect(ui.subCat, state.categoriesL3);
    
    // Nota: Si 'ui.caja' es un input de texto, fillSelect lo ignorará limpiamente gracias a la validación.
    fillSelect(ui.caja, state.cajas); 
}

/* =========================
   Lógica de Filtrado y Renderizado
   ========================= */
function applyFilters() {
    const term = ui.search.value.toLowerCase().trim();
    
    // Obtenemos valores de manera segura
    const fCatPri = ui.catPri ? ui.catPri.value : '';
    const fCatSec = ui.catSec ? ui.catSec.value : '';
    const fSubCat = ui.subCat ? ui.subCat.value : '';
    const fCaja = ui.caja ? ui.caja.value : '';

    const filtered = state.mergedProducts.filter(p => {
        // Filtro Texto
        if (term && !p._searchStr.includes(term)) return false;

        // Filtros Selects/Inputs
        if (fCatPri && String(p.categoria_principal_id) !== fCatPri) return false;
        if (fCatSec && String(p.categoria_secundaria_id) !== fCatSec) return false;
        if (fSubCat && String(p.subcategoria_id) !== fSubCat) return false;
        
        // Filtro de Caja: si es input texto, buscamos coincidencia parcial o exacta
        if (fCaja) {
             // Si el ID de caja coincide
             if (String(p.caja_id) !== fCaja) return false;
        }

        return true;
    });

    if(ui.count) ui.count.textContent = filtered.length;
    renderGrid(filtered);
}

function renderGrid(items) {
    if (!ui.grid) return;

    if (items.length === 0) {
        ui.grid.style.display = 'none';
        if(ui.empty) ui.empty.classList.remove('d-none');
        return;
    }

    if(ui.empty) ui.empty.classList.add('d-none');
    ui.grid.style.display = 'grid'; 
    ui.grid.innerHTML = '';

    items.forEach(prod => {
        const pId = prod._finalId;
        const stock = prod._finalStock;
        
        // Imagen
        const imgSrc = prod._finalImage 
            ? `/uploads/${prod._finalImage}` 
            : '/admin-resources/img/placeholder-product.png';

        // Badge Stock
        let stockClass = 'bg-danger';
        let stockText = 'Agotado';
        
        if (stock > 10) {
            stockClass = 'bg-success';
            stockText = `${stock} un.`;
        } else if (stock > 0) {
            stockClass = 'bg-warning text-dark';
            stockText = `${stock} un.`;
        }

        const card = document.createElement('div');
        card.className = 'product-card animate-fade-in';
        
        card.innerHTML = `
            <div class="product-img-container">
                <span class="badge position-absolute top-0 end-0 m-2 ${stockClass}">${stockText}</span>
                <img src="${imgSrc}" 
                     alt="${prod.nombre}" 
                     class="product-img"
                     loading="lazy"
                     onerror="this.onerror=null;this.src='/admin-resources/img/no-image.png';">
            </div>
            <div class="product-body p-3">
                <small class="text-muted d-block mb-1">
                   ID: ${pId} <span class="mx-1">•</span> ${prod.brand_nombre || 'S/M'}
                </small>
                <h5 class="product-title text-truncate" title="${prod.nombre}">${prod.nombre}</h5>
                <p class="product-price fw-bold text-primary">$${parseFloat(prod.precio).toFixed(2)}</p>
                
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="window.location.href='/admin-resources/pages/panels/editarProducto.html?id=${pId}'" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info btn-action" data-id="${pId}" title="Ver Detalles">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
        ui.grid.appendChild(card);
    });
}

/* =========================
   Event Listeners & Utilidades
   ========================= */
function setupEventListeners() {
    let timeout = null;
    
    if(ui.search) {
        ui.search.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(applyFilters, 300);
        });
    }

    if(ui.catPri) ui.catPri.addEventListener('change', applyFilters);
    if(ui.catSec) ui.catSec.addEventListener('change', applyFilters);
    if(ui.subCat) ui.subCat.addEventListener('change', applyFilters);
    if(ui.caja) ui.caja.addEventListener('input', applyFilters);

    if(ui.btnReset) {
        ui.btnReset.addEventListener('click', () => {
            if(ui.search) ui.search.value = '';
            if(ui.catPri) ui.catPri.value = '';
            if(ui.catSec) ui.catSec.value = '';
            if(ui.subCat) ui.subCat.value = '';
            if(ui.caja) ui.caja.value = '';
            applyFilters();
        });
    }

    if(ui.btnRefresh) ui.btnRefresh.addEventListener('click', loadData);
}

function setLoading(isLoading) {
    if (isLoading) {
        if(ui.loading) ui.loading.classList.remove('d-none');
        if(ui.grid) ui.grid.style.display = 'none';
        if(ui.empty) ui.empty.classList.add('d-none');
    } else {
        if(ui.loading) ui.loading.classList.add('d-none');
    }
}

// Toast
const toastContainer = document.getElementById("toastContainer");
function showToast(message, type = "info", icon = null, timeout = 3500) {
  if (!toastContainer) return;
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", "status");
  el.innerHTML = `${icon ? `<i class="fa-solid ${icon}"></i>` : ""}<span>${message}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => { 
      el.style.opacity = "0"; 
      el.style.transform = "translateY(4px)"; 
      setTimeout(() => el.remove(), 180); 
  }, timeout);
}