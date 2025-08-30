import { insertNewCategory } from '../Database/CategoriesManager.js';

document.getElementById("categoriaForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  // Build the new category object. Note that the server expects "Name" and "Description".
  const newCategory = {
    Name: document.getElementById("categoriaNombre").value,
    Description: document.getElementById("categoriaDescripcion").value,
  };

  try {
    const result = await insertNewCategory(newCategory);
    console.log("Category inserted successfully:", result);
    // Optionally, you can update the UI or show a success message here.
  } catch (error) {
    console.error("Error inserting category:", error);
    // Optionally, you can update the UI to notify the user of the error.
  }
});

