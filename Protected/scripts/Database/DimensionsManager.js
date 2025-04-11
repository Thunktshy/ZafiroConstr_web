/**
 * Fetches all dimensions from the server.
 * Calls the /dimensions/getAll route in server.js
 */
export async function getAllDimensions() {
    try {
        const response = await fetch(`/dimensions/getAll`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error obteniendo las dimensiones:", error);
        throw error;
    }
}
