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
