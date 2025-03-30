// errorHandler.js

export function showError(message) {
    const errorMessageElement = document.getElementById("error-message");
    errorMessageElement.textContent = message;
    errorMessageElement.classList.add('alert', 'alert-danger', 'active'); // Add classes to show the alert

    // Remove the 'fade-out' class if it exists (in case of multiple calls)
    errorMessageElement.classList.remove('fade-out');

    // Show the alert for 5 seconds, then fade out
    setTimeout(() => {
        errorMessageElement.classList.add('fade-out'); // Start fading out
        setTimeout(() => {
            errorMessageElement.classList.remove('active', 'fade-out'); // Hide the alert after fading out
        }, 500); // Match this duration with the CSS transition duration
    }, 5000); // Show for 5 seconds
}