// /admin-resources/scripts/Consultas/ver-marcas.js

import { getAllBrands } from "/admin-resources/scripts/Database/BrandsManager.js";

// Wait for the DOM to finish loading
document.addEventListener("DOMContentLoaded", () => {
  // Load brands when the button is clicked
  const loadBrandsBtn = document.getElementById("loadBrands");
  loadBrandsBtn.addEventListener("click", loadBrands);

  // Optionally, handle the button to create a new brand
  const gotoBrandFormBtn = document.getElementById("gotoBrandForm");
  gotoBrandFormBtn.addEventListener("click", () => {
    window.location.href = "/admin-resources/formularios/agregar-marca.html";
  });
});

/**
 * Fetch all brands from the server and display them in a DataTable
 */
async function loadBrands() {
  try {
    const brands = await getAllBrands();

    // The container where we'll insert our HTML
    const brandsListDiv = document.getElementById("brandsList");

    // If we have brand data, build a table
    if (Array.isArray(brands) && brands.length > 0) {
      let html = `
        <table id="brandsTable" class="table table-striped table-bordered">
          <thead class="table-dark">
            <tr>
              <th>Brand Id</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
      `;

      brands.forEach(brand => {
        html += `
          <tr>
            <td>${brand.Brand_Id}</td>
            <td>${brand.Name}</td>
            <td>${brand.Description || ''}</td>
            <td>
              <button type="button" class="btn btn-primary select-btn" data-id="${brand.Brand_Id}">
                Seleccionar
              </button>
            </td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      brandsListDiv.innerHTML = html;

      // Initialize DataTables
      $('#brandsTable').DataTable();

      // Handle the "Seleccionar" action (if needed)
      $('#brandsTable').on('click', '.select-btn', function() {
        const brandId = $(this).data('id');
        console.log("Marca seleccionada:", brandId);
        // Here, you could open a modal, redirect to a brand detail page, etc.
      });
    } else {
      brandsListDiv.innerHTML = `<p class="text-danger">No se encontraron marcas.</p>`;
    }
  } catch (error) {
    console.error("Error loading brands:", error);
    document.getElementById("brandsList").innerHTML = `<p class="text-danger">Error loading brands.</p>`;
  }
}
