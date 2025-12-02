// Server/routes/imagenes.js
'use strict';

const express = require('express');
const multer  = require('multer');
const { db, sql } = require('../../db/dbconnector.js'); // Asegúrate que la ruta al conector sea correcta
const imageService = require('../Services/imageService.js');

const router = express.Router();

// ---------------------------------------------------------
// 1. CONFIGURACIÓN MULTER (Regla: Max 10MB)
// ---------------------------------------------------------
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB en bytes
});

// Wrapper para capturar errores de Multer antes de entrar al controlador
const uploadMiddleware = (req, res, next) => {
  const uploader = upload.single('file');

  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        // Regla 3: Mensaje específico para límite excedido
        return res.status(413).json({ error: 'Limite de 10MB excedido' }); 
      }
      return res.status(400).json({ error: `Error en subida: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: 'Error al procesar el archivo' });
    }
    next();
  });
};

// ---------------------------------------------------------
// HELPER: Verificación de BD
// ---------------------------------------------------------
function checkDBConnection() {
  if (!db || !db.pool || !db.pool.connected) {
    throw { status: 503, message: 'No hay conexion con la Base de Datos' };
  }
}

/* =========================================================
   INSERT  (POST /api/imagenes)
   Flujo: Disco -> DB
   ========================================================= */
router.post('/', uploadMiddleware, async (req, res) => {
  let processedImage = null;

  try {
    // 1. Verificar conexión BD (Fail-fast)
    checkDBConnection();

    const { file } = req;
    const producto_id = parseInt(req.body.producto_id, 10);

    if (!file) return res.status(400).json({ error: 'Archivo de imagen requerido.' });
    if (!producto_id || producto_id <= 0) {
      return res.status(400).json({ error: 'producto_id es obligatorio y debe ser > 0.' });
    }

    // 2. Procesar y Guardar en Disco (Regla 2: Primero disco)
    try {
      processedImage = await imageService.processAndSave({
        buffer: file.buffer,
        originalName: file.originalname,
        mimetype: file.mimetype,
        ownerId: producto_id
      });
    } catch (diskErr) {
      console.error('Error guardando en disco:', diskErr);
      return res.status(500).json({ error: 'Error al guardar la imagen' });
    }

    // 3. Insertar en Base de Datos
    try {
      const insertedRows = await db.executeProc('imagenes_insert', {
        producto_id: { type: sql.Int, value: producto_id },
        image_path:  { type: sql.NVarChar(255), value: processedImage.canonicalPath }
      });

      if (!insertedRows.length) {
        throw new Error('La base de datos no devolvió el registro insertado.');
      }

      const inserted = insertedRows[0];

      return res.status(201).json({
        message: 'Imagen guardada',
        row: inserted,
        files: processedImage.allPaths
      });

    } catch (dbErr) {
      // ROLLBACK: Si falla la BD, borramos la imagen creada en el paso 2
      if (processedImage && processedImage.canonicalPath) {
        console.warn('Rollback: Eliminando imagen huérfana tras fallo de BD...');
        await imageService.removeByCanonical(processedImage.canonicalPath).catch(() => {});
      }
      throw dbErr; // Re-lanzar para el catch global
    }

  } catch (err) {
    console.error('POST /imagenes error:', err);
    
    // Mapeo de errores (Regla 3)
    const status = err.status || 500;
    const msg = err.message || 'Error en el servidor';
    
    // Si es error de SQL Server (generalmente tienen 'number' o 'code')
    if (err.number || err.code === 'ECONNCLOSED') { 
       return res.status(500).json({ error: 'Error en la operación de base de datos' });
    }

    return res.status(status).json({ error: msg });
  }
});


/* =========================================================
   UPDATE  (PUT /api/imagenes/:imagen_id)
   Flujo: Disco (Nueva) -> DB Update -> Borrar Disco (Vieja)
   ========================================================= */
router.put('/:imagen_id', uploadMiddleware, async (req, res) => {
  let newProcessedImage = null;

  try {
    checkDBConnection();

    const imagen_id = parseInt(req.params.imagen_id, 10);
    if (!imagen_id) return res.status(400).json({ error: 'imagen_id inválido.' });

    const producto_id = req.body.producto_id ? parseInt(req.body.producto_id, 10) : null;
    const hasFile = !!req.file;

    // Obtener imagen actual para saber qué borrar luego
    const allRows = await db.executeProc('imagenes_get_all'); // O crear SP imagenes_get_by_id
    const current = allRows.find(r => r.imagen_id === imagen_id);
    
    if (!current) return res.status(404).json({ error: 'Imagen no encontrada.' });

    const targetProductoId = producto_id || current.producto_id;
    let finalPath = current.image_path;

    // CASO A: Solo actualización de datos (sin archivo nuevo)
    if (!hasFile) {
      const updatedRows = await db.executeProc('imagenes_update', {
        imagen_id:   { type: sql.Int, value: imagen_id },
        producto_id: { type: sql.Int, value: targetProductoId },
        image_path:  { type: sql.NVarChar(255), value: finalPath }
      });
      return res.json({ message: 'Actualizada (metadatos)', row: updatedRows[0] });
    }

    // CASO B: Reemplazo de archivo
    // 1. Guardar NUEVA imagen en disco
    try {
      newProcessedImage = await imageService.processAndSave({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        ownerId: targetProductoId
      });
      finalPath = newProcessedImage.canonicalPath;
    } catch (diskErr) {
      console.error('Error disco update:', diskErr);
      return res.status(500).json({ error: 'Error al guardar la imagen nueva' });
    }

    // 2. Actualizar DB
    try {
      const finalRows = await db.executeProc('imagenes_update', {
        imagen_id:   { type: sql.Int, value: imagen_id },
        producto_id: { type: sql.Int, value: targetProductoId },
        image_path:  { type: sql.NVarChar(255), value: finalPath }
      });

      // 3. Éxito DB -> Limpieza (Borrar imagen VIEJA)
      if (current.image_path && current.image_path !== finalPath) {
        await imageService.removeByCanonical(current.image_path).catch(() => {});
      }

      return res.json({ 
        message: 'Actualizada', 
        row: finalRows[0], 
        files: newProcessedImage.allPaths 
      });

    } catch (dbErr) {
      // ROLLBACK: Si falla la BD, borrar la imagen NUEVA que acabamos de subir
      if (newProcessedImage) {
        await imageService.removeByCanonical(newProcessedImage.canonicalPath).catch(() => {});
      }
      throw dbErr;
    }

  } catch (err) {
    console.error('PUT /imagenes error:', err);
    const status = err.status || 500;
    const msg = err.message || 'Error en el servidor';
    return res.status(status).json({ error: msg });
  }
});


/* =========================================================
   DELETE, GET, REFRESH (Sin cambios mayores de lógica)
   ========================================================= */
router.delete('/:imagen_id', async (req, res) => {
  try {
    checkDBConnection();
    const imagen_id = parseInt(req.params.imagen_id, 10);
    
    // Obtener ruta antes de borrar para limpiar disco despues
    const allRows = await db.executeProc('imagenes_get_all');
    const current = allRows.find(r => r.imagen_id === imagen_id);

    // Borrar de DB
    await db.executeProc('imagenes_delete', {
      imagen_id: { type: sql.Int, value: imagen_id }
    });

    // Si DB ok, borrar archivos (Best effort)
    if (current?.image_path) {
      await imageService.removeByCanonical(current.image_path).catch(e => console.error(e));
    }

    return res.json({ message: 'Eliminada' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Error en el servidor' });
  }
});

router.get('/by-producto/:producto_id', async (req, res) => {
  try {
    checkDBConnection();
    const rows = await db.executeProc('imagenes_get_by_producto_id', {
      producto_id: { type: sql.Int, value: parseInt(req.params.producto_id) }
    });
    return res.json(rows);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Error en el servidor' });
  }
});

router.get('/', async (_req, res) => {
  try {
    checkDBConnection();
    const rows = await db.executeProc('imagenes_get_all', {});
    return res.json(rows);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Error en el servidor' });
  }
});

router.get('/refresh-missing-products', async (_req, res) => {
  try {
    checkDBConnection();
    const rows = await db.executeProc('productos_sin_imagenes_get');
    return res.json(rows);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Error en el servidor' });
  }
});

module.exports = router;