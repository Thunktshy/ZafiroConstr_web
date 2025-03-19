const express = require("express");
const cors = require("cors");
const formularioContactoRoutes = require("./routes/formularioContacto.js");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static("public"));

// Rutas de formularios
app.use("/api/formularioContacto", formularioContactoRoutes);


// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
