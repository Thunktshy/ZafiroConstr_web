// scripts/Formularios/Login.js
import { showError } from "./errorHandler.js"; //Devuelve mensajes de error

const form = document.getElementById("form-login");
const inputUser = document.getElementById("Usuario");
const inputPass = document.getElementById("Contraseña");
const errorMessageElement = document.getElementById("error-message");
const loginModalEl = document.getElementById("loginmodal");

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // evitar recarga de página
  errorMessageElement.textContent = ""; // limpiar mensajes previos

  const email = inputUser.value.trim();
  const password = inputPass.value;

  try {
    const result = await tryLogin(email, password);

    if (result?.success) {
      console.log("Login exitoso:", result);
      form.reset();

      // cerrar modal
      const modal = bootstrap.Modal.getInstance(loginModalEl);
      modal.hide();

      // redirigir según rol
      setTimeout(() => {
        if (result.isAdmin) {
          window.location.href = "admin-resources/pages/admin.html";
        } else {
          window.location.href = "user-resources/pages/miCuenta.html";
        }
      }, 500);

    } else if (result) {
      // error en credenciales
      showError(result.message || "Inicio de sesión fallido. Verifica tus datos.", errorMessageElement);
    } else {
      // sin respuesta
      showError("No hay conexión con la base de datos.", errorMessageElement);
    }

  } catch (error) {
    if (error.message?.includes("404")) {
      showError("No hay conexión con la base de datos.", errorMessageElement);
    } else {
      showError("Error al iniciar sesión: " + error.message, errorMessageElement);
    }
  }
});

export async function tryLogin(email, password) {
  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return await response.json();
  } catch (error) {
    console.error("Error in tryLogin:", error);
    throw error;
  }
}