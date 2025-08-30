//FormularioProductos.js
console.log("CargandoScriptFomulario");

import { getAllCategories } from "../Database/CategoriesManager.js";
import { getAllBrands } from "../Database/BrandsManager.js";
import { getAllShelves } from "../Database/ShelvesManager.js";
import { getAllUnits } from "../Database/UnitsManager.js";
import { getAllDimensions } from "../Database/DimensionsManager.js";
import { submitProductForm } from '../Database/fillProductForm.js';

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
    const dimensionContainer = document.querySelector(".grid-container.dimension");
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
    const weightContainer = document.querySelector(".grid-container.weight");
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

    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evita la recarga de la página

        // Obtener datos del formulario usando el estado de los toggles
        const productData = {
            Name: document.getElementById("productName").value.trim(),
            Description: document.getElementById("productDescription").value.trim(),
            Category_Id: document.getElementById("CategoriaId").value,
            Shelf_Id: document.getElementById("ShelfId").value,
            Price: document.getElementById("productPrice").value.trim(),
            Brand_Id: document.getElementById("BrandId").value,
            // Para la unidad de peso, si toggle está activado se toma el valor del input, de lo contrario se asigna el valor por defecto "1" y "0"
            Unit_Id: toggleWeight.checked ? document.getElementById("UnidadId").value : "1",
            Unit_Value: toggleWeight.checked ? document.getElementById("WeightValue").value.trim() : "0",
            // Para la unidad de tamaño, si toggle está activado se toma el valor del input, de lo contrario se asigna el valor por defecto "1" y "0"
            Dimension_Value: toggleDimension.checked ? document.getElementById("DimensionValue").value.trim() : "0",
            Dimension_Id: toggleDimension.checked ? document.getElementById("DimensionId").value : "1",
            stock_Quantity: document.getElementById("productStock").value.trim(),
            ImagePath: "default.jpg" // Valor por defecto si no hay imagen
        };

        console.log(productData);

        // Verificación de campos vacíos (ajusta esta lógica si algunos campos son opcionales)
        const isEmpty = Object.values(productData).some(
            value => value === null || value === '' || value === undefined
        );
        if (isEmpty) {
            alert("Por favor, complete todos los campos requeridos.");
            return;
        }

        try {
            const result = await submitProductForm(productData);
            alert("Producto enviado con éxito: " + result.message);
            document.getElementById("productForm").reset(); 
        } catch (error) {
            alert("Error al enviar el producto: " + error.message);
        }
    });
});


//document.addEventListener("DOMContentLoaded", function() {
    //const targetElement = document.getElementById("goHome");
    //if (targetElement) {
        //targetElement.addEventListener("click", function() {
            //console.log("Element clicked!");
            //window.location.href = "index.html";
        //});
    //} else {
       // console.error("Target element not found.");
    //}
//});

// JavaScript to handle button clicks
//document.getElementById('goHome').addEventListener('click', function() {
// Redirect to the home page
//window.location.href = 'index.html'; // Change 'home.html' to your actual home page URL
//});

