export async function submitProductForm(productData) {
    try {
        // No headers here; the browser will set multipart/form-data automatically.
        const response = await fetch('/submit-Product-form', {
            method: 'POST',
            body: productData  // productData is now a FormData instance
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP error! Status: ${response.status}`);
        }

        return result; // Return a success message
    } catch (error) {
        console.error("Error submitting product form:", error);
        throw error; // Throw the error so it can be handled in the frontend
    }
}
