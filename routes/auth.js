// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../Database/db'); // Assuming this has queryWithParams()

router.post('/login', async (req, res) => {
    const { user, password } = req.body;

    try {
        const userData = await db.queryWithParams(
            "SELECT Usuario_Id, password FROM Usuarios WHERE username = ?",
            [user]
        );

        if (userData.length === 0) {
            return res.status(401).json({ success: false, message: "Usuario no encontrado." });
        }

        const userRecord = userData[0];
        if (userRecord.password === password) {
            req.session.userID = userRecord.Usuario_Id;
            return res.json({ success: true });
        } else {
            return res.status(401).json({ success: false, message: "Contraseña incorrecta." });
        }
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false, message: "Error en el servidor." });
    }
});

module.exports = router;
