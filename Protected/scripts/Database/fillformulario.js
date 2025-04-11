// fillformulario.js
/**
 * Sends the contact form data to the server.
 * Calls the /submit-form route in server.js
 */
export async function submitContactForm(nombre, correo, mensaje) {
    try {
        const response = await fetch('/submit-form', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nombre, correo, mensaje }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error submitting contact form:", error);
        throw error;
    }
}