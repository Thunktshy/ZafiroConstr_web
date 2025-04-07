import { tryLogin } from "../Database/authentication.js";
import { showError } from "../errorHandler.js"; // Adjust the path as necessary

document.getElementById("form-login").addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const user = document.getElementById("Usuario").value;
    const password = document.getElementById("Contraseña").value;
    const errorMessageElement = document.getElementById("error-message");

    try {
        const result = await tryLogin(user, password);
    
        // Check if we received a valid result
        if (result && result.success) {
            console.log("Login :", result);
            document.getElementById("form-login").reset(); // Reset the form
    
            // Close the modal and redirect user to Almacen
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginmodal'));
            modal.hide();
            setTimeout(function() {
                window.location.href = 'admin.html';
            }, 500); // Adjust the delay
        } else if (result) {
            showError(result.message || "Inicio de sesión fallido. Verifique su usuario y contraseña.");
        } else {
            // If result is undefined, possibly due to no connection
            showError("No hay conexión con la base de datos");
        }
    } catch (error) {
        // If the error message indicates a 404 error, show the database connection error message
        if (error.message && error.message.includes("404")) {
            showError("No hay conexión con la base de datos");
        } else {
            showError("Error while trying to log in: " + error.message);
        }
    }
});

app.post("/admin.html", isAuthenticated, async (req, res) => {
    // ...
});


