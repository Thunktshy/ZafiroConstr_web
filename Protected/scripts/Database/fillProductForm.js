export async function submitProductForm(productData) {
    try {
        const response = await fetch('/submit-Product-form', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP error! Status: ${response.status}`);
        }

        return result; // Retornar mensaje de éxito
    } catch (error) {
        console.error("Error submitting product form:", error);
        throw error; // Lanzar el error para ser manejado en el frontend
    }
}
