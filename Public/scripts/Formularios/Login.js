import { tryLogin } from "../Database/authentication.js";
import { showError } from "../errorHandler.js"; // Adjust the path as necessary

document.getElementById("form-login").addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const user = document.getElementById("Usuario").value;
    const password = document.getElementById("Contraseña").value;
    const errorMessageElement = document.getElementById("error-message");

    try {
        const result = await tryLogin(user, password);
        
        // Handle successful login
        console.log("Login :", result);
        document.getElementById("form-login").reset(); // Reset the form

        // Close the modal and redirection user to Almacen
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginmodal'));
            modal.hide();
            setTimeout(function() {
                window.location.href = 'products.html';
            }, 500); // Adjust the delay 
            
        } else {
            showError(result.message || "Inicio de sesión fallido. Verifique su usuario y contraseña.");
        }
    } catch (error) {
        showError("Error while trying to log in: " + error.message);
    }
});

