//getAllProducts.js
/**
 * Fetches all products from the server.
 * Calls the /products route in server.js
 */
export async function getAllProducts() {
    try {
      const response = await fetch(`/products`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
}
  