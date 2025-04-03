/**
 * Fetches all brands from the server.
 * Calls the /brands/getAll route in server.js
 */
export async function getAllBrands() {
    try {
        const response = await fetch(`/brands/getAll`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error obteniendo las marcas:", error);
        throw error;
    }
}

export async function insertNewBrand(newBrand) {
    try {
      const response = await fetch('/submit-Brand-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBrand),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      return result; // Return the server's response (e.g., success message)
    } catch (error) {
      console.error("Error inserting new Brand:", error);
      throw error; // Let the calling code handle the error
    }
  }
  
