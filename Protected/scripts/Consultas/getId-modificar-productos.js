// Import the necessary functions from your modules.
import { getAllProducts } from "/admin-resources/scripts/Database/getAllProducts.js";
import { getAllCategories } from "/admin-resources/scripts/Database/CategoriesManager.js";
import { getAllBrands } from "/admin-resources/scripts/Database/BrandsManager.js";
import { getAllShelves } from "/admin-resources/scripts/Database/ShelvesManager.js";
import { getAllUnits } from "/admin-resources/scripts/Database/UnitsManager.js";
import { getAllDimensions } from "/admin-resources/scripts/Database//DimensionsManager.js";

// Wait for the DOM to finish loading.
document.addEventListener("DOMContentLoaded", () => {
  // Event listener for loading products.
  document.getElementById("loadProducts").addEventListener("click", loadProducts);
});

// Function to load products and associated lookup data.
async function loadProducts() {
  try {
    // Load products and lookup data concurrently.
    const [products, categories, brands, shelves, units, dimensions] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
      getAllBrands(),
      getAllShelves(),
      getAllUnits(),
      getAllDimensions()
    ]);

    // Build lookup maps.
    const categoryMap = {};
    categories.forEach(cat => categoryMap[cat.Category_Id] = cat.Name);

    const brandMap = {};
    brands.forEach(brand => brandMap[brand.Brand_Id] = brand.Name);

    const shelfMap = {};
    shelves.forEach(shelf => shelfMap[shelf.Shelf_Id] = shelf.Name);

    const unitMap = {};
    units.forEach(unit => unitMap[unit.Unit_Id] = unit.Name);

    const dimensionMap = {};
    dimensions.forEach(dimension => dimensionMap[dimension.Dimension_Id] = dimension.Name);

    const productListDiv = document.getElementById("productList");

    // Build the table using the lookup maps.
    if (Array.isArray(products) && products.length > 0) {
      let html = `
        <table id="productsTable" class="table table-striped table-bordered">
          <thead class="table-dark">
            <tr>
              <th>Id</th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Categoria</th>
              <th>Marca</th>
              <th>Repisa</th>
              <th>Stock</th>
              <th>Unidad</th>
              <th>Precio</th>
              <th>Tamaño</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
      `;

      products.forEach(product => {
        const categoryName = categoryMap[product.Category_Id] || "N/A";
        const brandName = brandMap[product.Brand_Id] || "N/A";
        const shelfName = shelfMap[product.Shelf_Id] || "N/A";
        const unitName = unitMap[product.Unit_Id] || "";
        const fullUnitDisplay = `${product.Unit_value || 0} ${unitName}`.trim();
        const dimensionName = dimensionMap[product.Dimension_Id] || "";
        const fullDimensionDisplay = `${product.Dimension_Value || 0} ${dimensionName}`.trim();

        html += `
          <tr>
            <td>${product.Id}</td>
            <td>${product.Code}</td>
            <td>${product.Name}</td>
            <td>${product.Description}</td>
            <td>${categoryName}</td>
            <td>${brandName}</td>
            <td>${shelfName}</td>
            <td>${product.Stock_Quantity}</td>
            <td>${fullUnitDisplay}</td>
            <td>${product.Price}</td>
            <td>${fullDimensionDisplay}</td>
            <td>
              <button type="button" class="btn btn-primary select-btn" data-id="${product.Id}">
                Seleccionar
              </button>
            </td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      productListDiv.innerHTML = html;

      $('#productsTable').on('click', '.select-btn', function() {
        const id = $(this).data('id');
        console.log("Producto seleccionado: " + id);
        window.location.href = `/admin-resources/formularios/modificar-producto.html?id=${id}`;
      });

      // Initialize DataTables.
      $('#productsTable').DataTable();
    } else {
      productListDiv.innerHTML = `<p class="text-danger">No products found.</p>`;
    }
  } catch (error) {
    console.error("Error loading products:", error);
    document.getElementById("productList").innerHTML = `<p class="text-danger">Error loading products.</p>`;
  }
}
