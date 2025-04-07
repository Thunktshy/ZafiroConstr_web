const express = require('express');
const db = require('../db/connection');
const router = express.Router();

// Middleware para proteger la ruta
function auth(req, res, next) {
    if (!req.session.userID) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }
    next();
}

// Ruta protegida: crear producto
router.post('/', auth, async (req, res) => {
    const { nombre, precio } = req.body;

    try {
        await db.queryWithParams(
            "INSERT INTO Productos (Nombre, Precio, Usuario_Id) VALUES (?, ?, ?)",
            [nombre, precio, req.session.userID]
        );

        res.json({ success: true, message: 'Producto registrado con éxito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al guardar el producto' });
    }
});

module.exports = router;
