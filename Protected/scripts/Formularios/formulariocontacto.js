// formulario.js
import { submitContactForm } from  "../Database/fillformulario.js";

document.getElementById("form-contacto").addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const nombre = document.getElementById("nombre").value;
    const correo = document.getElementById("correo").value;
    const mensaje = document.getElementById("mensaje").value;

    try {
        const result = await submitContactForm(nombre, correo, mensaje);
        alert("Formulario enviado con éxito: " + result.message);
        // Optionally, reset the form
        document.getElementById("form-contacto").reset();
    } catch (error) {
        alert("Error al enviar el formulario: " + error.message);
    }
});