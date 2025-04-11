import { getUsernames, submitNewUser } from "../Database/UsersManager.js";
// Imports custom error handler that displays messages inside 
// <div id="error-message" class="alert alert-danger"></div>
import { showError } from "../errorHandler.js"; // Custom error message 

document.addEventListener("DOMContentLoaded", () => {
  // Select the registration form by its class name.
  const form = document.querySelector("#userRegistrationForm");
  if (!form) {
    console.error("Formulario de nuevo usuario no encontrado");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent default form submission.

    // Get the form input values.
    const email = document.getElementById("email").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validate that the password has at least 10 characters.
    if (password.length < 8) {
      showError("La contraseña debe tener al menos 10 caracteres."); // Custom error message 
      return;
    }

    // Validate that both passwords match.
    if (password !== confirmPassword) {
      showError("Las contraseñas no coinciden."); // Custom error message 
      return;
    }

    // Check if the username and email already exist in the database.
    try {
      // Assume getUsernames() returns an array of objects with Email and Nombre fields.
      const users = await getUsernames();
      console.log(users);

      // Extract the existing usernames and emails.
      const existingUsernames = Array.isArray(users) ? users.map(user => user.Nombre) : [];
      const existingEmails = Array.isArray(users) ? users.map(user => user.Email) : [];

      // Check if the username exists.
      if (existingUsernames.includes(username)) {
        showError("El nombre de usuario ya existe. Por favor, elige otro."); // Custom error message 
        return;
      }

      // Check if the email exists.
      if (existingEmails.includes(email)) {
        showError("Este correo electrónico ya esta registrado con otro usuario. Por favor, ingresa otro o inicia sesión."); // Custom error message 
        return;
      }
    } catch (error) {
      console.error("Error checking existing users:", error);
      showError("Error al verificar usuarios existentes. Intente de nuevo."); // Custom error message 
      return;
    }

    // All validations passed; create a new user object.
    const newUser = { email, username, password };

    // Attempt to submit the new user to the database.
    try {
      const response = await submitNewUser(newUser);
      alert("Usuario registrado exitosamente: " + response.message);
      form.reset();
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      showError("Error al registrar el usuario: " + error.message); // Custom error message 
    }
  });
});

