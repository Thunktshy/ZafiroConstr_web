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

export async function getProductById(id) {
  try {
    // Use query param instead of path param
    const response = await fetch(`/productwithId?id=${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching product by id:", error);
    throw error;
  }
}

/**
 * Submits an updated product form to the server.
 * Expects a productData object containing all necessary fields,
 * including the productId.
 */
export async function submitUpdatedProductForm(productData) {
  try {
    const response = await fetch("/update-product-form", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
      // You can also inspect response.status here for a better error handling
      const errorResult = await response.json();
      throw new Error(errorResult.error || "Error updating product");
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error submitting updated product:", error);
    throw error;
  }
}

