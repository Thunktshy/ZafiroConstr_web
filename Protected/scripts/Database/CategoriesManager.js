//CategoriesManager.js
/**
 * Fetches all categories from the server.
 * Calls the /categories route in server.js
 */
export async function getAllCategories() {
    try {
      const response = await fetch(`/categories/getAll`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error obteniendo las categorias:", error);
      throw error;
    }
}

//CategoriesManager.js
/**
 * Fetches all categories from the server.
 * Calls the /categories route in server.js
 */
export async function SearchCategories() {
  try {
    const response = await fetch(`/categories/Search`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error obteniendo las categorias:", error);
    throw error;
  }
}

//CategoriesManager.js
/**
 * Fetches all categories from the server.
 * Calls the /categories route in server.js
 */
export async function UpdateCategories() {
  try {
    const response = await fetch(`/categories/Update`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error obteniendo las categorias:", error);
    throw error;
  }
}

/**
 * Inserts a new category by sending a POST request to the server.
 * Expects an object with properties: Name and Description.
 */
export async function insertNewCategory(newCategory) {
  try {
    const response = await fetch('/submit-Category-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return result; // Return the server's response (e.g., success message)
  } catch (error) {
    console.error("Error inserting new category:", error);
    throw error; // Let the calling code handle the error
  }
}
