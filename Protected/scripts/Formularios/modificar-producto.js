//FormularioProductos.js
console.log("CargandoScriptFomulario");

import { getAllCategories } from "/admin-resources/scripts/Database/CategoriesManager.js";
import { getAllBrands } from "/admin-resources/scripts/Database/BrandsManager.js";
import { getAllShelves } from "/admin-resources/scripts/Database/ShelvesManager.js";
import { getAllUnits } from "/admin-resources/scripts/Database/UnitsManager.js";
import { getAllDimensions } from "/admin-resources/scripts/Database/DimensionsManager.js";

// Load Categories
async function loadCategories() {
    try {
        const categories = await getAllCategories();
        console.log(categories);
        const categorySelect = document.getElementById("CategoriaId");

        if (Array.isArray(categories) && categories.length > 0) {
            categorySelect.innerHTML = '<option value="">Seleccione una categoría</option>'; // Reset dropdown

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.Category_Id;
                option.textContent = category.Name;
                categorySelect.appendChild(option);
            });
        } else {
            categorySelect.innerHTML = `<option value="">No se encontraron categorías</option>`;
        }
    } catch (error) {
        console.error("Error cargando categorías:", error);
        categorySelect.innerHTML = `<option value="">Error cargando categorías</option>`;
    }
}

// Load Brands
async function loadBrands() {
    try {
        const brands = await getAllBrands();
        console.log(brands)
        const brandSelect = document.getElementById("BrandId");

        if (Array.isArray(brands) && brands.length > 0) {
            brandSelect.innerHTML = '<option value="">Seleccione una Marca</option>'; // Reset dropdown

            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.Brand_Id;
                option.textContent = brand.Name;
                brandSelect.appendChild(option);
            });
        } else {
            brandSelect.innerHTML = `<option value="">No se encontraron marcas</option>`;
        }
    } catch (error) {
        console.error("Error cargando marcas:", error);
        brandSelect.innerHTML = `<option value="">Error cargando marcas</option>`;
    }
}

// Load Shelves
async function loadShelves() {
    try {
        const shelves = await getAllShelves();
        console.log(shelves)
        const shelfSelect = document.getElementById("ShelfId");

        if (Array.isArray(shelves) && shelves.length > 0) {
            shelfSelect.innerHTML = '<option value="">Seleccione una Estantería</option>'; // Reset dropdown

            shelves.forEach(shelf => {
                const option = document.createElement('option');
                option.value = shelf.Shelf_Id;
                option.textContent = shelf.Name;
                shelfSelect.appendChild(option);
            });
        } else {
            shelfSelect.innerHTML = `<option value="">No se encontraron estanterías</option>`;
        }
    } catch (error) {
        console.error("Error cargando estanterías:", error);
        shelfSelect.innerHTML = `<option value="">Error cargando estanterías</option>`;
    }
}

// Load Units
async function loadUnits() {
    try {
        const units = await getAllUnits();
        console.log(units)
        const unitSelect = document.getElementById("UnidadId");

        if (Array.isArray(units) && units.length > 0) {
            unitSelect.innerHTML = '<option value="">Seleccione una unidad de medida</option>'; // Reset dropdown

            units.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit.Unit_Id;
                option.textContent = unit.Name;
                unitSelect.appendChild(option);
            });
        } else {
            unitSelect.innerHTML = `<option value="">No se encontraron unidades</option>`;
        }
    } catch (error) {
        console.error("Error cargando unidades:", error);
        unitSelect.innerHTML = `<option value="">Error cargando unidades</option>`;
    }
}

// Load Dimensions
async function loadDimensions() {
    try {
        const dimensions = await getAllDimensions();
        console.log(dimensions)
        const dimensionSelect = document.getElementById("DimensionId");

        if (Array.isArray(dimensions) && dimensions.length > 0) {
            dimensionSelect.innerHTML = '<option value="">Seleccione una unidad de tamaño</option>'; // Reset dropdown

            dimensions.forEach(dimension => {
                const option = document.createElement('option');
                option.value = dimension.Dimension_Id;
                option.textContent = dimension.Name;
                dimensionSelect.appendChild(option);
            });
        } else {
            dimensionSelect.innerHTML = `<option value="">No se encontraron dimensiones</option>`;
        }
    } catch (error) {
        console.error("Error cargando dimensiones:", error);
        dimensionSelect.innerHTML = `<option value="">Error cargando dimensiones</option>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadBrands();
    loadShelves();
    loadUnits();
    loadDimensions();
    console.log("Formulario Actualizado");

    const form = document.getElementById('productForm');
    const submitButton = document.getElementById('submitProductForm');

    // Toggle logic for "unidad de tamaño"
    const toggleDimension = document.getElementById("toggleDimension");
    const dimensionContainer = document.querySelector(".form-grid-container.dimension");
    toggleDimension.addEventListener("change", () => {
      if (toggleDimension.checked) {
         dimensionContainer.style.display = "block";
      } else {
         dimensionContainer.style.display = "none";
         // Set default values when toggle is off
         document.getElementById("DimensionValue").value = "0";
         document.getElementById("DimensionId").value = "1";
      }
    });

    // Toggle logic for "unidad de peso"
    const toggleWeight = document.getElementById("toggleWeight");
    const weightContainer = document.querySelector(".form-grid-container.weight");
    toggleWeight.addEventListener("change", () => {
      if (toggleWeight.checked) {
         weightContainer.style.display = "block";
      } else {
         weightContainer.style.display = "none";
         // Set default values when toggle is off
         document.getElementById("WeightValue").value = "0";
         document.getElementById("UnidadId").value = "1";
      }
    });
});