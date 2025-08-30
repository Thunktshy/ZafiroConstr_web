import { insertNewBrand } from '../Database/BrandsManager.js';

document.getElementById("marcaForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  // Build the new category object. Note that the server expects "Name" and "Description".
  const newBrand = {
    Name: document.getElementById("marcaNombre").value,
  };

  try {
    const result = await insertNewBrand(newBrand);
    console.log("Category inserted successfully:", result);
    // Optionally, you can update the UI or show a success message here.
  } catch (error) {
    console.error("Error inserting category:", error);
    // Optionally, you can update the UI to notify the user of the error.
  }
});