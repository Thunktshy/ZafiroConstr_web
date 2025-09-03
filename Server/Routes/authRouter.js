// Routes/authRoute.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

// ajusta la ruta a tu conector
const { db, sql } = require('../../db/dbconnector.js');

const router = express.Router();
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'connect.sid';

// Updated paths:
const ADMIN_HOME = '/admin-resources/pages/admin.html';
const USER_HOME  = '/user-resources/pages/miCuenta.html';

// ---------------------------
// Helpers 
// ---------------------------
function saveSession(req) {
  return new Promise((resolve, reject) =>
    req.session.save(err => (err ? reject(err) : resolve()))
  );
}
function regenerateSession(req) {
  return new Promise((resolve, reject) =>
    req.session.regenerate(err => (err ? reject(err) : resolve()))
  );
}
function isHtmlRequest(req) {
  return (req.headers.accept || '').includes('text/html');
}

// ---------------------------
// POST /login
// ---------------------------
router.post('/login', [
  body('email').trim().isEmail().withMessage('Email inválido').isLength({ max: 150 }),
  body('password').notEmpty().withMessage('Se requiere contraseña').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  try {
    const rows = await db.executeProc('buscar_id_para_login', {
      email: { type: sql.NVarChar(150), value: email }
    });

    if (!rows?.length) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    const { id, contrasena, tipo, nombre } = rows[0] || {};
    if (!id || !contrasena || !tipo) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    const ok = await bcrypt.compare(password, contrasena);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    const normTipo = String(tipo).trim().toLowerCase(); // "usuario" | "admin"
    const isUser  = normTipo === 'usuario';
    const isAdmin = normTipo === 'admin';

    await regenerateSession(req);

    req.session.userID   = id;
    req.session.userType = tipo;
    req.session.username = nombre || null;
    req.session.isAdmin  = isAdmin;
    req.session.isUser   = isUser || (!isAdmin && !isUser);
    req.session.isAuth   = req.session.isUser || req.session.isAdmin;

    await saveSession(req);

    if (isHtmlRequest(req)) {
      // redirect based on role
      return res.redirect(303, req.session.isAdmin ? ADMIN_HOME : USER_HOME);
    }

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      userID: req.session.userID,
      username: req.session.username || 'Bienvenido',
      userType: req.session.userType,
      isUser: req.session.isUser === true,
      isAdmin: req.session.isAdmin === true,
      isAuth: req.session.isAuth === true
    });
  } catch (err) {
    console.error('Error en el login:', err);
    return res.status(500).json({ success: false, message: 'Error en el servidor.' });
  }
});

// ---------------------------
// POST /logout  &  GET /logout
// ---------------------------
function logoutHandler(req, res) {
  if (!req.session) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.json({ success: true, message: 'Sesión cerrada correctamente' });
  }

  req.session.destroy(err => {
    if (err) {
      console.error('Error al destruir la sesión:', err);
      return res.status(500).json({ success: false, message: 'Error al cerrar sesión.' });
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    if (isHtmlRequest(req)) {
      return res.redirect(303, '/'); // para clics directos
    }
    return res.json({ success: true, message: 'Sesión cerrada correctamente' });
  });
}

router.post('/logout', logoutHandler);
router.get('/logout', logoutHandler);

// ---------------------------
// GET /auth/status  (para menu.js)
// ---------------------------
router.get('/auth/status', (req, res) => {
  const authenticated = !!req.session?.userID;
  res.set('Cache-Control', 'no-store');
  return res.json({
    authenticated,
    userType: authenticated ? (req.session.userType || 'Usuario') : 'guest',
    isAdmin:  !!req.session?.isAdmin,
    isUser:   !!req.session?.isUser,
    isAuth:   !!req.session?.isAuth,
    userID:   authenticated ? (req.session.userID || null) : null,
    username: authenticated ? (req.session.username || null) : null
  });
});

// ---------------------------
// Middlewares de autorización
// ---------------------------
function requireAuth(req, res, next) {
  const hasSession = !!req.session?.userID;
  const hasAllowedRole = !!(req.session?.isAdmin || req.session?.isUser);

  if (hasSession && hasAllowedRole) return next();

  // No autenticado
  if (isHtmlRequest(req)) return res.redirect('/index.html');
  return res.status(401).json({ success: false, message: 'No autenticado.' });
}

function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) {
    if (isHtmlRequest(req)) return res.redirect('/index.html');
    return res.status(403).json({ success: false, message: 'Prohibido: se requieren privilegios de administrador' });
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.session?.isUser) {
    if (isHtmlRequest(req)) return res.redirect('/index.html');
    return res.status(403).json({ success: false, message: 'Prohibido: solo para Usuarios' });
  }
  next();
}

// Exportaciones
module.exports = router;
module.exports.requireAuth  = requireAuth;   // acepta Usuario o Admin
module.exports.requireAdmin = requireAdmin;
module.exports.requireUser  = requireUser;
