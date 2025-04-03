import { getAllCategories } from "../Database/CategoriesManager.js";

// Function to toggle focus mode
export function toggleFocus(card) {
  const grid = document.querySelector('.categories-section');
  const isFocused = card.classList.contains('focused-card');

  if (!isFocused) {
    // Hide all other cards
    document.querySelectorAll('.category-card').forEach(c => {
      c.classList.remove('focused-card', 'active');
      c.style.display = 'none'; // Hide all other cards
    });

    grid.classList.add('focus-mode');
    card.classList.add('focused-card', 'active');
    card.style.display = 'block'; // Ensure selected card remains visible

    // Switch "Ver Detalles" button to "X"
    const toggleBtn = card.querySelector('.toggle-btn');
    toggleBtn.innerHTML = '&times;'; // '×' symbol
    toggleBtn.classList.add('close-focus');
  } else {
    exitFocusMode();
  }
}

// Function to exit focus mode
function exitFocusMode() {
  document.querySelectorAll('.category-card').forEach(c => {
    c.classList.remove('focused-card', 'active');
    c.style.display = 'block'; // Show all cards again

    // Restore "Ver Detalles" button
    const toggleBtn = c.querySelector('.toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = 'Ver Detalles';
      toggleBtn.classList.remove('close-focus');
    }
  });

  document.querySelector('.categories-section').classList.remove('focus-mode');
}

// Function to load categories dynamically
async function loadCategories() {
  try {
    const categories = await getAllCategories();
    const categoriesGrid = document.getElementById("categoriesGrid");

    if (Array.isArray(categories) && categories.length > 0) {
      categoriesGrid.innerHTML = ''; // Clear existing content

      categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.classList.add('category-card');

        const imagePath = category.Image_Path && category.Image_Path.trim() !== '' && category.Image_Path !== 'null'
          ? category.Image_Path 
          : './img/Toolbox.png';

        categoryCard.innerHTML = `
          <div class="category-header">
            <h3 class="category-title">${category.Name}</h3>
            <img class="category-image" 
                 src="${imagePath}"
                 alt="${category.Name}" 
                 onerror="this.onerror=null; this.src='./img/Toolbox.png';">
            <button class="toggle-btn">Ver Detalles</button>
          </div>
          <div class="category-body">
            <ul class="category-description-list">
              ${category.Description.split(',').map(item => `<li>${item.trim()}</li>`).join('')}
            </ul>
          </div>
        `;

        // Add event listener to toggle button
        const toggleBtn = categoryCard.querySelector(".toggle-btn");
        toggleBtn.addEventListener("click", function (event) {
          event.stopPropagation(); // Prevent unintended event propagation
          if (categoryCard.classList.contains("focused-card")) {
            exitFocusMode();
          } else {
            toggleFocus(categoryCard);
          }
        });

        categoriesGrid.appendChild(categoryCard);
      });
    } else {
      categoriesGrid.innerHTML = `<p class="text-danger">No se encontraron categorías.</p>`;
    }
  } catch (error) {
    console.error("Error cargando categorías:", error);
    document.getElementById("categoriesGrid").innerHTML = `<p class="text-danger">Error cargando categorías.</p>`;
  }
}

// Attach event listener to load button
document.getElementById("loadCategories").addEventListener("click", loadCategories);
