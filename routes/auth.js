const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/db.js'); // asumiendo que ahí está tu queryWithParams
const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    const { user, password } = req.body;

    try {
        const result = await db.queryWithParams(
            'SELECT Usuario_Id, password FROM Usuarios WHERE Nombre = ?',
            [user]
        );

        if (result.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        const userRecord = result[0];
        const validPass = await bcrypt.compare(password, userRecord.password);

        if (validPass) {
            req.session.userID = userRecord.Usuario_Id;
            res.json({ success: true, message: 'Login exitoso' });
        } else {
            res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// Ver sesión activa
router.get('/session', (req, res) => {
    if (req.session.userID) {
        res.json({ loggedIn: true, userID: req.session.userID });
    } else {
        res.json({ loggedIn: false });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Sesión cerrada' });
    });
});

module.exports = router;
