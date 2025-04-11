/**
 * Fetches all shelves from the server.
 * Calls the /shelves/getAll route in server.js
 */
export async function getAllShelves() {
    try {
        const response = await fetch(`/shelves/getAll`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error obteniendo las estanterías:", error);
        throw error;
    }
}
