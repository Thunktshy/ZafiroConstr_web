// server.js
'use strict';

require('dotenv').config();

/**
 * IMPORTS (con comentarios de referencia)
 */
const express  = require('express');     // Servidor HTTP
const cors     = require('cors');        // CORS
const session  = require('express-session'); // Sesiones de usuario
const path     = require('path');        // Rutas de archivos

// Conector con la base de datos (pool + utilidades)
const { db } = require('./db/dbconnector.js');

/**
 * Routers de negocio (usa SIEMPRE el mismo casing: 'Server/routes')
 */
const authRouter       = require('./Server/Routes/authRouter.js');        // login/logout/status + middlewares
const CajasRouter      = require('./Server/Routes/cajasRouter.js');
const CategoriasRouter = require('./Server/Routes/categoriasRouter.js');
const ProductosRouter  = require('./Server/Routes/productosRouter.js');
const StockRouter      = require('./Server/Routes/stockRouter.js');
//const UsuariosRouter   = require('./Server/Routes/usuariosRoute.js');

/**
 * Middlewares de autorización (desde authRoute.js)
 * - requireAuth  -> sesión iniciada (cualquier rol)
 * - requireAdmin -> administrador
 * - requireUser  -> rol usuario (no admin)
 */
const { requireAuth, requireAdmin, requireUser } = require('./Server/Routes/authRouter.js');

/**
 * APP y MIDDLEWARES BASE
 */
const app = express();
app.use(express.static('Public'));                 // estáticos públicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { maxAge: 60 * 60 * 1000 } // 1h
}));

const PUBLIC_DIR = path.resolve(process.cwd(), 'Public');

// Servir archivos estáticos (css/, scripts/, imágenes, etc.)
app.use(express.static(PUBLIC_DIR, {
  index: 'index.html',      // sirve /Public/index.html en "/"
  maxAge: '1d',             // cache estáticos (opcional)
}));

// Ruta explícita a "/" 
app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});


/**
 * RUTA DE AUTENTICACIÓN
 * Montada bajo /auth para claridad (/auth/login, /auth/logout, /auth/status)
 */
app.use('/auth', authRouter);

/**
 * RECURSOS ESTÁTICOS PROTEGIDOS
 * - Admin: /admin-resources -> requiere admin
 * - Usuarios: /user-resources -> requiere usuario (no admin)
 */
const PROTECTED_DIR = path.resolve(process.cwd(), 'Protected');
const adminStatic = express.static(PROTECTED_DIR, {
  index: false,
  maxAge: '1h',
  setHeaders: (res) => res.setHeader('Cache-Control', 'private, max-age=3600')
});
app.use('/admin-resources', requireAdmin, adminStatic);

const USERS_DIR = path.resolve(process.cwd(), 'Usuarios');
const userStatic = express.static(USERS_DIR, {
  index: false,
  maxAge: '1h',
  setHeaders: (res) => res.setHeader('Cache-Control', 'private, max-age=3600')
});
app.use('/user-resources', requireUser, userStatic);

/**
 * ENDPOINTS DE NEGOCIO
 */

const cajasRouter = require('./Server/Routes/cajasRouter.js');
app.use('/cajas', cajasRouter);

// Rutas para Categorías Secundarias
const categoriasSecundariasRouter = require('./Server/Routes/categorias_secundariasRouter.js');
app.use('/categorias-secundarias', categoriasSecundariasRouter);

// Rutas para Subcategorías
const subcategoriasRouter = require('./Server/Routes/subcategoriasRouter.js');
app.use('/subcategorias', subcategoriasRouter);
//app.use('/usuarios',    UsuariosRouter); // reemplaza a /clientes

// Rutas para Brands
const brandsRouter = require('./Server/Routes/brandsRouter.js');
app.use('/brands', brandsRouter);

// Rutas para Sizes
const sizesRouter = require('./Server/Routes/sizesRouter.js');
app.use('/sizes', sizesRouter);

// Rutas para Units
const unitsRouter = require('./Server/Routes/unitsRouter.js');
app.use('/units', unitsRouter);

// Productos
const productosRouter = require('./Server/Routes/productosRouter.js');
app.use('/productos', productosRouter);

// Stock (operaciones)
const stockRouter = require('./Server/Routes/stockRouter.js');
app.use('/stock', stockRouter);

// Reportes de Stock
const reportesStockRouter = require('./Server/Routes/reportes_stockRouter.js');
app.use('/reportes-stock', reportesStockRouter);

// Rutas para Usuarios
const usuariosRouter = require('./Server/Routes/usuariosRouter.js');
app.use('/usuarios', usuariosRouter);


/**
 * HEALTHCHECK (útil para orquestadores/monitoreo)
 */
app.get('/health', (req, res) => {
  if (!db || !db.pool || db.pool.connected === false) {
    return res.status(503).json({ ok: false, status: 'db_not_connected' });
  }
  return res.json({ ok: true, status: 'up' });
});

/**
 * ERROR HANDLER GLOBAL 
 * Si algún router hace next(err), respondemos JSON consistente.
 * Si integraste mapSqlError en cada router, esto sirve como red de seguridad.
 */
app.use((err, _req, res, _next) => {
  // Intenta extraer número de error de MSSQL (cuando existe)
  const e = err && (typeof err.number === 'number' ? err : err.originalError);
  if (e && typeof e.number === 'number') {
    // Puedes unificar aquí con un pequeño mapa mínimo o delegar a 500 genérico
    return res.status(500).json({ success:false, message: err.message || 'Error en operación SQL', data:null });
  }
  return res.status(500).json({ success:false, message: err?.message || 'Error inesperado', data:null });
});

/**
 * ARRANQUE CONDICIONADO A LA BD
 */
const port = parseInt(process.env.PORT, 10) || 3000;
let httpServer = null;
let shuttingDown = false;

async function start() {
  try {
    // 1) Verificación de variables críticas
    const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME'];
    const missing = requiredEnv.filter(k => !process.env[k]);
    if (missing.length) {
      console.error('FATAL: Variables de entorno faltantes:', missing.join(', '));
      process.exit(1);
    }

    // 2) Espera a que la BD conecte
    console.log('Esperando conexión a la base de datos...');
    await db.poolReady;

    // 3) Arranca HTTP
    httpServer = app.listen(port, () => {
      console.log(`Servidor corriendo en el puerto ${port}`);
    });

    httpServer.on('error', (err) => {
      console.error('Error del servidor HTTP:', err);
      safeShutdown('http_server_error', 1);
    });

  } catch (err) {
    console.error('FATAL: No se pudo conectar con la base de datos. El servidor no arrancará.', err);
    process.exit(1);
  }
}

/**
 * APAGADO ORDENADO
 */
async function safeShutdown(reason = 'shutdown', exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[${reason}] Cerrando servidor...`);

  // 1) Cierra HTTP
  await new Promise((resolve) => {
    if (!httpServer) return resolve();
    httpServer.close((err) => {
      if (err) console.error('Error al cerrar HTTP:', err);
      resolve();
    });
  });

  // 2) Cierra pool SQL
  if (db && typeof db.close === 'function') {
    try { await db.close(); } catch (e) { console.error('Error al cerrar pool SQL:', e); }
  }

  console.log('Apagado completo.');
  process.exit(exitCode);
}

// Señales y errores no controlados
process.on('SIGINT',  () => safeShutdown('SIGINT', 0));
process.on('SIGTERM', () => safeShutdown('SIGTERM', 0));
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
  safeShutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  safeShutdown('uncaughtException', 1);
});

// Inicia
start();
