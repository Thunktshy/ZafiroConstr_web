/**
 * Fetches all units from the server.
 * Calls the /units/getAll route in server.js
 */
export async function getAllUnits() {
    try {
        const response = await fetch(`/units/getAll`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error obteniendo las unidades:", error);
        throw error;
    }
}
