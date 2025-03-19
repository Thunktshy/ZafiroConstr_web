const express = require("express");
const router = express.Router();
const pool = require("../db/db");

// Ruta para manejar el formulario1
router.post("/", async (req, res) => {
  try {
    const { nombre, correo, mensaje } = req.body;

    if (!nombre || !correo || !mensaje) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    const conn = await pool.getConnection();
    await conn.query("INSERT INTO formulario1 (nombre, correo, mensaje) VALUES (?, ?, ?)", [nombre, correo, mensaje]);
    conn.release();

    res.json({ success: true, message: "Formulario enviado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
