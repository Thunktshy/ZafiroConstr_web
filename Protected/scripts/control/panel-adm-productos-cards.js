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
    btnRefresh: document.getElementById('btnRefresh') // Asegúrate de que este botón exista en tu HTML o usa un condicional
};

// Estado Global
let state = {
    products: [],      // Productos crudos
    images: [],        // Lista de imagenes
    categoriesL1: [],  // Categorias Nivel 1
    categoriesL2: [],  // Categorias Nivel 2
    categoriesL3: [],  // Categorias Nivel 3
    cajas: [],         // Cajas
    mergedProducts: [] // Productos con imagen y nombres de cat/caja unidos
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
   Carga de Datos (Estrategia Paralela)
   ========================= */
async function loadData() {
    setLoading(true);
    try {
        console.log("Iniciando carga masiva de datos...");

        // Ejecutamos todas las peticiones en paralelo para ganar velocidad
        const [
            prodResp, 
            imgResp, 
            cat1Resp, 
            cat2Resp, 
            cat3Resp, 
            cajaResp
        ] = await Promise.all([
            productosAPI.getAll(),       // Productos
            imagenesAPI.getAll(),        // Imágenes
            categoriasAPI.getAll('1'),   // Categorías Nivel 1
            categoriasAPI.getAll('2'),   // Categorías Nivel 2
            categoriasAPI.getAll('3'),   // Categorías Nivel 3 (Sub)
            cajasAPI.getAll()            // Cajas
        ]);

        // Guardamos en el estado (verificando si la respuesta es directa o tiene propiedad .data)
        // Ajusta .data o la respuesta directa según como tus managers retornen la info
        state.products = Array.isArray(prodResp) ? prodResp : (prodResp.data || []);
        state.images = Array.isArray(imgResp) ? imgResp : (imgResp.data || []);
        state.categoriesL1 = Array.isArray(cat1Resp) ? cat1Resp : (cat1Resp.data || []);
        state.categoriesL2 = Array.isArray(cat2Resp) ? cat2Resp : (cat2Resp.data || []);
        state.categoriesL3 = Array.isArray(cat3Resp) ? cat3Resp : (cat3Resp.data || []);
        state.cajas = Array.isArray(cajaResp) ? cajaResp : (cajaResp.data || []);

        // Procesamos los datos (unimos imágenes con productos)
        mergeData();

        // Llenamos los selects de los filtros
        populateFilters();

        // Renderizamos
        applyFilters(); // Esto llamará a renderGrid internamente
        
        showToast(`Carga completa: ${state.mergedProducts.length} productos.`, "success", "fa-check");

    } catch (err) {
        console.error("Error cargando datos:", err);
        showToast("Error al cargar los datos. Revisa la consola.", "error", "fa-circle-exclamation");
        ui.grid.innerHTML = `<div class="text-center text-danger py-5"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><p>Error de conexión</p></div>`;
    } finally {
        setLoading(false);
    }
}

/* =========================
   Procesamiento de Datos
   ========================= */
function mergeData() {
    // Crear un mapa de imágenes para búsqueda rápida: { producto_id: "url_imagen" }
    // Asumimos que la API de imagenes retorna objetos tipo { producto_id: 1, url: "..." }
    const imageMap = {};
    state.images.forEach(img => {
        // Si hay múltiples imágenes, esto guardará la última. 
        // Idealmente filtrarías por "es_principal" si existe esa bandera.
        if (img.producto_id) {
            imageMap[img.producto_id] = img.url || img.path; // Ajusta según tu API
        }
    });

    // Mapear productos agregando la imagen y nombres legibles si hiciera falta
    state.mergedProducts = state.products.map(prod => {
        // Intentar obtener imagen del propio producto, o del mapa de imagenes, o default
        let imgUrl = prod.imagen || prod.img_url || imageMap[prod.id] || null;
        
        return {
            ...prod,
            finalImage: imgUrl, // Propiedad normalizada para la vista
            // Normalizamos nombres para búsqueda (opcional si la API ya trae nombres)
            searchStr: `${prod.nombre} ${prod.descripcion || ''} ${prod.sku || ''} ${prod.id}`.toLowerCase()
        };
    });
}

function populateFilters() {
    // Helper para llenar select
    const fillSelect = (selectElement, data, valueKey = 'id', labelKey = 'nombre') => {
        if (!selectElement) return;
        // Mantener la primera opción (ej: "Todas las categorías")
        const firstOption = selectElement.options[0];
        selectElement.innerHTML = '';
        if (firstOption) selectElement.appendChild(firstOption);

        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valueKey];
            opt.textContent = item[labelKey];
            selectElement.appendChild(opt);
        });
    };

    fillSelect(ui.catPri, state.categoriesL1);
    fillSelect(ui.catSec, state.categoriesL2);
    fillSelect(ui.subCat, state.categoriesL3);
    fillSelect(ui.caja, state.cajas);
}

/* =========================
   Lógica de Filtrado y Renderizado
   ========================= */
function applyFilters() {
    const term = ui.search.value.toLowerCase().trim();
    const fCatPri = ui.catPri.value;
    const fCatSec = ui.catSec.value;
    const fSubCat = ui.subCat.value;
    const fCaja = ui.caja.value;

    const filtered = state.mergedProducts.filter(p => {
        // Filtro Texto
        if (term && !p.searchStr.includes(term)) return false;

        // Filtros Selects (Asumiendo que las propiedades en producto son snake_case)
        // Ajusta p.categoria_principal_id segun tu DB real
        if (fCatPri && String(p.categoria_principal_id) !== fCatPri) return false;
        if (fCatSec && String(p.categoria_secundaria_id) !== fCatSec) return false;
        if (fSubCat && String(p.subcategoria_id) !== fSubCat) return false;
        if (fCaja && String(p.caja_id) !== fCaja) return false;

        return true;
    });

    // Actualizar contador
    if(ui.count) ui.count.textContent = filtered.length;

    renderGrid(filtered);
}

function renderGrid(items) {
    if (items.length === 0) {
        ui.grid.style.display = 'none';
        ui.empty.classList.remove('d-none');
        return;
    }

    ui.empty.classList.add('d-none');
    ui.grid.style.display = 'grid'; // O 'flex' según tu CSS
    ui.grid.innerHTML = '';

    items.forEach(prod => {
        // Determinar imagen o placeholder
        const imgSrc = prod.finalImage 
            ? `/uploads/${prod.finalImage}` // Ajusta la ruta base si es necesario
            : '/admin-resources/img/placeholder-product.png'; // Ruta a imagen default

        const card = document.createElement('div');
        card.className = 'product-card animate-fade-in'; // Asegúrate de tener esta clase o usa 'card'
        
        // Determinar badge de stock
        const stockClass = prod.stock > 10 ? 'bg-success' : (prod.stock > 0 ? 'bg-warning' : 'bg-danger');
        const stockText = prod.stock > 0 ? `${prod.stock} un.` : 'Agotado';

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
                <small class="text-muted d-block mb-1">ID: ${prod.id}</small>
                <h5 class="product-title text-truncate" title="${prod.nombre}">${prod.nombre}</h5>
                <p class="product-price fw-bold text-primary">$${parseFloat(prod.precio).toFixed(2)}</p>
                
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <button class="btn btn-sm btn-outline-primary btn-action" data-id="${prod.id}" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info btn-action" data-id="${prod.id}" title="Ver Detalles">
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
    // Debounce para búsqueda
    let timeout = null;
    ui.search.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(applyFilters, 300);
    });

    // Filtros directos
    ui.catPri.addEventListener('change', applyFilters);
    ui.catSec.addEventListener('change', applyFilters);
    ui.subCat.addEventListener('change', applyFilters);
    ui.caja.addEventListener('input', applyFilters);

    // Botones
    ui.btnReset.addEventListener('click', () => {
        ui.search.value = '';
        ui.catPri.value = '';
        ui.catSec.value = '';
        ui.subCat.value = '';
        ui.caja.value = '';
        applyFilters();
    });

    if(ui.btnRefresh) {
        ui.btnRefresh.addEventListener('click', loadData);
    }
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

// Helper Toast (Si ya existe globalmente en el HTML, no es necesario duplicarlo, 
// pero se incluye por seguridad si este script corre aislado)
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