// /admin-resources/scripts/Consultas/productos.js

// Import necessary functions from your modules
import { getAllProducts } from "/admin-resources/scripts/Database/getAllProducts.js";
import { getAllCategories } from "/admin-resources/scripts/Database/CategoriesManager.js";
import { getAllBrands } from "/admin-resources/scripts/Database/BrandsManager.js";
import { getAllShelves } from "/admin-resources/scripts/Database/ShelvesManager.js";
import { getAllUnits } from "/admin-resources/scripts/Database/UnitsManager.js";
import { getAllDimensions } from "/admin-resources/scripts/Database/DimensionsManager.js";

// Global variables for storing fetched products and lookup maps
let allProducts = [];
let lookupMaps = {};

// When DOM is loaded, execute initial load and attach event listeners
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();

  // Attach change event listeners to each filter control
  document.getElementById("brandFilter").addEventListener("change", filterProducts);
  document.getElementById("categoryFilter").addEventListener("change", filterProducts);
  document.getElementById("shelfFilter").addEventListener("change", filterProducts);
  document.getElementById("unitFilter").addEventListener("change", filterProducts);
  document.getElementById("dimensionFilter").addEventListener("change", filterProducts);
  // Listen to input events on the search field (activate filtering on 2+ characters)
  document.getElementById("nameSearch").addEventListener("input", filterProducts);
});

// Function to load products and their lookup data concurrently
async function loadProducts() {
  try {
    // Load products and lookup data concurrently
    const [products, categories, brands, shelves, units, dimensions] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
      getAllBrands(),
      getAllShelves(),
      getAllUnits(),
      getAllDimensions()
    ]);
    
    // Save products globally
    allProducts = products;

    // Build lookup maps (object key → display text)
    const categoryMap = {};
    categories.forEach(cat => { 
      categoryMap[cat.Category_Id] = cat.Name; 
    });

    const brandMap = {};
    brands.forEach(brand => { 
      brandMap[brand.Brand_Id] = brand.Name; 
    });

    const shelfMap = {};
    shelves.forEach(shelf => { 
      shelfMap[shelf.Shelf_Id] = shelf.Name; 
    });

    const unitMap = {};
    units.forEach(unit => { 
      unitMap[unit.Unit_Id] = unit.Name; 
    });

    const dimensionMap = {};
    dimensions.forEach(dimension => { 
      dimensionMap[dimension.Dimension_Id] = dimension.Name; 
    });

    // Save all lookup maps for later use in rendering
    lookupMaps = { categoryMap, brandMap, shelfMap, unitMap, dimensionMap };

    // Populate filter dropdowns using the lookup maps
    populateFilterOptions("brandFilter", brandMap, "Todas las Marcas");
    populateFilterOptions("categoryFilter", categoryMap, "Todas las Categorías");
    populateFilterOptions("shelfFilter", shelfMap, "Todas las Repisas");
    populateFilterOptions("unitFilter", unitMap, "Todas las Unidades");
    populateFilterOptions("dimensionFilter", dimensionMap, "Todas las Medidas");

    // Render all products (initially unfiltered)
    renderProducts(allProducts);
    
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

// Helper function: Populate a given select element with options from a lookup map
function populateFilterOptions(selectId, mapData, defaultText) {
  const select = document.getElementById(selectId);
  // Clear any current options and add the default option
  select.innerHTML = `<option value="">${defaultText}</option>`;
  for (const key in mapData) {
    if (Object.hasOwnProperty.call(mapData, key)) {
      select.innerHTML += `<option value="${key}">${mapData[key]}</option>`;
    }
  }
}

// Function to filter products based on selected dropdown values and search field
function filterProducts() {
  // Retrieve filter values
  const brandFilter = document.getElementById("brandFilter").value;
  const categoryFilter = document.getElementById("categoryFilter").value;
  const shelfFilter = document.getElementById("shelfFilter").value;
  const unitFilter = document.getElementById("unitFilter").value;
  const dimensionFilter = document.getElementById("dimensionFilter").value;
  const nameSearch = document.getElementById("nameSearch").value.trim().toLowerCase();

  // Filter products
  const filtered = allProducts.filter(product => {
    if (brandFilter && product.Brand_Id != brandFilter) return false;
    if (categoryFilter && product.Category_Id != categoryFilter) return false;
    if (shelfFilter && product.Shelf_Id != shelfFilter) return false;
    if (unitFilter && product.Unit_Id != unitFilter) return false;
    if (dimensionFilter && product.Dimension_Id != dimensionFilter) return false;
    // Only filter by name if at least 2 characters are entered
    if (nameSearch.length >= 2 && !product.Name.toLowerCase().includes(nameSearch)) return false;
    return true;
  });

  renderProducts(filtered);
}

// Function to render product cards into the #productList container
function renderProducts(products) {
  const { categoryMap, brandMap, shelfMap, unitMap, dimensionMap } = lookupMaps;
  const productListDiv = document.getElementById("productList");
  let html = "";

  products.forEach(product => {
    const shelfName = shelfMap[product.Shelf_Id] || "N/A";
    const categoryName = categoryMap[product.Category_Id] || "N/A";
    const brandName = brandMap[product.Brand_Id] || "N/A";
    const unitText = unitMap[product.Unit_Id] ? `${product.Unit_Value} ${unitMap[product.Unit_Id]}` : "";
    const dimensionText = dimensionMap[product.Dimension_Id] ? `${product.Dimension_Value} ${dimensionMap[product.Dimension_Id]}` : "";

    html += `
      <div class="col-md-4">
        <div class="card product-card">
          <img src="/admin-resources/img/products/product${product.Id}.jpg" class="card-img-top" alt="${product.Name}">
          <div class="card-body">
            <h5 class="card-title text-center">${product.Name}</h5>
            <p class="card-text">
              Stock: ${product.Stock_Quantity} <br>
              Repisa: ${shelfName}
            </p>
            <p class="card-text">
              Precio: $${product.Price}
            </p>
            <button type="button" class="btn btn-primary btn-detail" data-id="${product.Id}">
              Ver Detalles
            </button>
            <div class="product-details mt-2" style="display:none;">
              <ul>
                <li><strong>Categoría:</strong> ${categoryName}</li>
                <li><strong>Marca:</strong> ${brandName}</li>
                <li><strong>Unidad:</strong> ${unitText}</li>
                <li><strong>Tamaño:</strong> ${dimensionText}</li>
                <li><strong>Descripción:</strong> ${product.Description || "Sin descripción"}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  productListDiv.innerHTML = html;

  // Attach click event listeners to "Ver Detalles" buttons to toggle visibility of details
  document.querySelectorAll(".btn-detail").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest('.card');
      const detailsDiv = card.querySelector('.product-details');
      detailsDiv.style.display = (detailsDiv.style.display === "none" || detailsDiv.style.display === "") ? "block" : "none";
    });
  });
}
