// /admin-resources/scripts/panel-adm-productos-cards.js
import { productosAPI } from "/admin-resources/scripts/api/productosManager.js";
import { imagenesAPI } from "/admin-resources/scripts/api/imagesManager.js"; // Para obtener imágenes si no vienen en el objeto producto

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
    btnReset: document.getElementById('btnResetFilters'),
    btnRefresh: document.getElementById('btnRefresh')
};

// Estado Global
let allProducts = [];
let filteredProducts = [];
let availableFilters = {
    catPri: new Set(),
    catSec: new Set(),
    subCat: new Set()
};

/* =========================
   Inicialización
   ========================= */
document.addEventListener("DOMContentLoaded", init);

async function init() {
    await loadData();
    setupEventListeners();
}

async function loadData() {
    setLoading(true);
    try {
        // Obtenemos todos los productos activos (o todos si prefieres)
        const data = await productosAPI.getAll(); 
        
        // Asumimos que data es un array de productos
        allProducts = Array.isArray(data) ? data : [];
        
        // Preparar filtros dinámicos basados en los datos recibidos
        extractFilterOptions();
        populateFilterSelects();
        
        // Render inicial
        applyFilters();
        
    } catch (err) {
        console.error("Error cargando productos:", err);
        showToast("Error al cargar inventario", "error");
        ui.grid.innerHTML = '<div class="text-danger text-center w-100 py-5">Error de conexión</div>';
    } finally {
        setLoading(false);
    }
}

/* =========================
   Filtros y Búsqueda
   ========================= */

function extractFilterOptions() {
    // Limpiamos Sets
    availableFilters.catPri.clear();
    availableFilters.catSec.clear();
    availableFilters.subCat.clear();

    allProducts.forEach(p => {
        if (p.categoria_principal) availableFilters.catPri.add(p.categoria_principal);
        if (p.categoria_secundaria) availableFilters.catSec.add(p.categoria_secundaria);
        if (p.subcategoria) availableFilters.subCat.add(p.subcategoria);
    });
}

function populateFilterSelects() {
    fillSelect(ui.catPri, availableFilters.catPri);
    fillSelect(ui.catSec, availableFilters.catSec);
    fillSelect(ui.subCat, availableFilters.subCat);
}

function fillSelect(selectElement, setValues) {
    const currentVal = selectElement.value;
    // Guardar opción seleccionada si existe, o resetear
    selectElement.innerHTML = '<option value="">Todas</option>';
    
    const sorted = Array.from(setValues).sort();
    sorted.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        selectElement.appendChild(opt);
    });
    
    // Restaurar selección si sigue siendo válida
    if (setValues.has(currentVal)) selectElement.value = currentVal;
}

function applyFilters() {
    const term = ui.search.value.toLowerCase().trim();
    const fCatPri = ui.catPri.value;
    const fCatSec = ui.catSec.value;
    const fSubCat = ui.subCat.value;
    const fCaja = ui.caja.value.toLowerCase().trim();

    filteredProducts = allProducts.filter(p => {
        // Filtro Texto (Nombre o ID)
        const matchText = !term || 
            (p.nombre && p.nombre.toLowerCase().includes(term)) || 
            (String(p.producto_id).includes(term));

        // Filtros Categoría
        const matchCP = !fCatPri || p.categoria_principal === fCatPri;
        const matchCS = !fCatSec || p.categoria_secundaria === fCatSec;
        const matchSC = !fSubCat || p.subcategoria === fSubCat;

        // Filtro Caja (Buscamos que la concatenación de letra+numero contenga el input)
        // Ojo: Asumiendo que 'caja_letra' y 'caja_numero' existen en el objeto. 
        // Si viene como string 'A1', ajustar propiedad.
        const cajaFull = ((p.caja_letra || '') + (p.caja_numero || '')).toLowerCase();
        const matchCaja = !fCaja || cajaFull.includes(fCaja);

        return matchText && matchCP && matchCS && matchSC && matchCaja;
    });

    renderGrid(filteredProducts);
}

/* =========================
   Renderizado (Tarjetas)
   ========================= */

function renderGrid(products) {
    ui.grid.innerHTML = '';
    ui.count.textContent = products.length;

    if (products.length === 0) {
        ui.grid.style.display = 'none';
        ui.empty.classList.remove('d-none');
        return;
    }

    ui.empty.classList.add('d-none');
    ui.grid.style.display = 'grid';

    // Crear fragmento para rendimiento
    const fragment = document.createDocumentFragment();

    products.forEach(p => {
        const card = createCardElement(p);
        fragment.appendChild(card);
    });

    ui.grid.appendChild(fragment);
}

function createCardElement(p) {
    const el = document.createElement('article');
    el.className = 'product-card';

    // Formateadores
    const fmtMoney = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const stockClass = p.stock_total > 5 ? 'bg-stock-ok' : (p.stock_total > 0 ? 'bg-stock-low' : 'bg-stock-out');
    const stockLabel = p.stock_total > 0 ? `Stock: ${p.stock_total}` : 'Agotado';
    
    // Imagen: Usamos image_path si viene en el join de SQL, o placeholder.
    // Si tu SP 'productos_get_all' no devuelve 'image_path', necesitarás ajustar el SP o hacer fetch lazy.
    // Asumiremos que el backend ya hace JOIN para traer al menos una imagen principal.
    const imgSrc = p.image_path || '/admin-resources/img/placeholder.png'; 

    // Caja String
    const cajaStr = (p.caja_letra && p.caja_numero) 
        ? `${p.caja_letra}${p.caja_numero}` 
        : '--';

    el.innerHTML = `
        <div class="card-header-badge">
            <span class="badge-id">#${p.producto_id}</span>
            <span class="badge-stock ${stockClass}">${stockLabel}</span>
        </div>
        
        <div class="card-img-wrapper">
            <img src="${imgSrc}" alt="${p.nombre}" loading="lazy" onerror="this.src='/admin-resources/img/placeholder.png'">
        </div>
        
        <div class="card-body">
            <h3 class="card-title" title="${p.nombre}">${p.nombre}</h3>
            <div class="card-price">${fmtMoney.format(p.precio || 0)}</div>
            
            <div class="card-meta">
                <div class="meta-row">
                    <i class="fa-solid fa-layer-group meta-icon"></i>
                    <span>${p.categoria_principal || 'Sin Cat.'}</span>
                </div>
                <div class="meta-row">
                    <i class="fa-solid fa-box-open meta-icon"></i>
                    <span>Caja: <strong>${cajaStr}</strong></span>
                </div>
            </div>
        </div>

        <div class="card-footer">
            <a href="/admin-resources/pages/panels/ver_producto.html?id=${p.producto_id}" class="btn-card btn-view">
                <i class="fa-solid fa-eye me-1"></i> Ver Detalle
            </a>
        </div>
    `;

    return el;
}

/* =========================
   Eventos y Utilidades
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

    ui.btnRefresh.addEventListener('click', loadData);
}

function setLoading(isLoading) {
    if (isLoading) {
        ui.loading.classList.remove('d-none');
        ui.grid.style.display = 'none';
        ui.empty.classList.add('d-none');
    } else {
        ui.loading.classList.add('d-none');
    }
}

// Toast simple (duplicado del helper común)
const toastContainer = document.getElementById("toastContainer");
function showToast(message, type = "info") {
    if (!toastContainer) return;
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}