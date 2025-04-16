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

  // Attach change event listeners to filter controls
  document.getElementById("brandFilter").addEventListener("change", filterProducts);
  document.getElementById("categoryFilter").addEventListener("change", filterProducts);
  document.getElementById("shelfFilter").addEventListener("change", filterProducts);
  document.getElementById("unitFilter").addEventListener("change", filterProducts);
  document.getElementById("dimensionFilter").addEventListener("change", filterProducts);
  // Listen to input events on the search field (activate filtering on 2+ characters)
  document.getElementById("nameSearch").addEventListener("input", filterProducts);
});

// Function to load products and lookup data concurrently
async function loadProducts() {
  try {
    const [products, categories, brands, shelves, units, dimensions] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
      getAllBrands(),
      getAllShelves(),
      getAllUnits(),
      getAllDimensions()
    ]);
    
    allProducts = products;

    // Build lookup maps for display values
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

    lookupMaps = { categoryMap, brandMap, shelfMap, unitMap, dimensionMap };

    // Populate filter dropdowns
    populateFilterOptions("brandFilter", brandMap, "Todas las Marcas");
    populateFilterOptions("categoryFilter", categoryMap, "Todas las Categorías");
    populateFilterOptions("shelfFilter", shelfMap, "Todas las Repisas");
    populateFilterOptions("unitFilter", unitMap, "Todas las Unidades");
    populateFilterOptions("dimensionFilter", dimensionMap, "Todas las Medidas");

    // Initially render all products
    renderProducts(allProducts);
    
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

// Helper to populate filter dropdown options
function populateFilterOptions(selectId, mapData, defaultText) {
  const select = document.getElementById(selectId);
  select.innerHTML = `<option value="">${defaultText}</option>`;
  for (const key in mapData) {
    if (Object.hasOwnProperty.call(mapData, key)) {
      select.innerHTML += `<option value="${key}">${mapData[key]}</option>`;
    }
  }
}

// Filter products based on selected filters and search input
function filterProducts() {
  const brandFilter = document.getElementById("brandFilter").value;
  const categoryFilter = document.getElementById("categoryFilter").value;
  const shelfFilter = document.getElementById("shelfFilter").value;
  const unitFilter = document.getElementById("unitFilter").value;
  const dimensionFilter = document.getElementById("dimensionFilter").value;
  const nameSearch = document.getElementById("nameSearch").value.trim().toLowerCase();

  const filtered = allProducts.filter(product => {
    if (brandFilter && product.Brand_Id != brandFilter) return false;
    if (categoryFilter && product.Category_Id != categoryFilter) return false;
    if (shelfFilter && product.Shelf_Id != shelfFilter) return false;
    if (unitFilter && product.Unit_Id != unitFilter) return false;
    if (dimensionFilter && product.Dimension_Id != dimensionFilter) return false;
    if (nameSearch.length >= 2 && !product.Name.toLowerCase().includes(nameSearch)) return false;
    return true;
  });

  renderProducts(filtered);
}

// Renders product cards in the #productList container
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
      <div class="col-md-4 product-card">
        <div class="card">
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
            <!-- Use toggle-btn class instead of btn-detail -->
            <button type="button" class="btn btn-primary toggle-btn" data-id="${product.Id}">
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

  // ----- Attaching Event Listeners -----

  // Replace the original behavior with focus mode toggle
  // Ensure your HTML has a button with the "toggle-btn" class for each product card,
  // and that each product card has a wrapping container with the "product-card" class.
  document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest('.product-card');
      toggleFocus(card);
    });
  });

}

// ----- Focus Mode Functions -----

// Toggle focus mode for a product card
function toggleFocus(card) {
  // Use the product list container for grid management (adjust selector as needed)
  const grid = document.querySelector('#productList');
  const isFocused = card.classList.contains('focused-card');

  if (!isFocused) {
    // Hide all other product cards and remove any focus classes
    document.querySelectorAll('.product-card').forEach(c => {
      c.classList.remove('focused-card', 'active');
      c.style.display = 'none';  // Hide all other cards
    });

    // Add focus mode to the container if desired
    grid.classList.add('focus-mode');

    // Set the selected card into focus and ensure it’s visible
    card.classList.add('focused-card', 'active');
    card.style.display = 'block';

    // Change the toggle button text to a close symbol (×) and add a helper class
    const toggleBtn = card.querySelector('.toggle-btn');
    toggleBtn.innerHTML = '&times;';
    toggleBtn.classList.add('close-focus');

    // If your design requires product details to always show in focus mode, ensure they are visible:
    const detailsDiv = card.querySelector('.product-details');
    if (detailsDiv) {
      detailsDiv.style.display = 'block';
    }
  } else {
    exitFocusMode();
  }
}

// Exit focus mode by restoring all product cards
function exitFocusMode() {
  // Show all product cards again and remove focus classes
  document.querySelectorAll('.product-card').forEach(c => {
    c.classList.remove('focused-card', 'active');
    c.style.display = 'block';

    // Restore the toggle button text and remove the close-focus class
    const toggleBtn = c.querySelector('.toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = 'Ver Detalles';
      toggleBtn.classList.remove('close-focus');
    }

    // Optionally, if you want product details hidden when not focused, you could hide them:
    // const detailsDiv = c.querySelector('.product-details');
    // if (detailsDiv) { detailsDiv.style.display = 'none'; }
  });

  // Remove the focus-mode class from the grid container
  const grid = document.querySelector('#productList');
  grid.classList.remove('focus-mode');
}

