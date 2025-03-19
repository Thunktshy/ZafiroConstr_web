// Función para manejar el envío de formularios
function enviarFormulario(formulario, ruta) {
  formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(formulario);
    const data = Object.fromEntries(formData);

    const response = await fetch(ruta, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    alert(result.message);
    formulario.reset();
  });
}

// Seleccionar cada formulario y asignarle su ruta
enviarFormulario(document.getElementById("form-contacto"), "/api/formularioContacto");
enviarFormulario(document.getElementById("form-servicios"), "/api/formularioServicios");
