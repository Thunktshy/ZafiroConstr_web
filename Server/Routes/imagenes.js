// Server/routes/imagenes.js
'use strict';

const express = require('express');
const multer  = require('multer');
const crypto  = require('crypto');
const { db, sql } = require('../db/db'); // uses executeProc/query helpers  ← see citation
const imageService = require('../Services/imageService.js'); // processAndSave, removeByCanonical

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to create a unique placeholder canonical path for DB insert/update
function makePlaceholderPath(productoId, ext = 'webp') {
  const nonce = crypto.randomBytes(6).toString('hex');
  const stamp = Date.now();
  // md variant is our canonical
  return `/Protected/Images/Productos/${String(productoId)}/md/${stamp}-${nonce}-pending.${ext}`;
}

/* =========================================================
   INSERT  (POST /api/imagenes)
   Body: form-data { file: <binary>, producto_id: <int> }
   ========================================================= */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const producto_id = parseInt(req.body.producto_id, 10);

    if (!file) return res.status(400).json({ error: 'Archivo de imagen requerido.' });
    if (!producto_id || producto_id <= 0) {
      return res.status(400).json({ error: 'producto_id es obligatorio y debe ser > 0.' });
    }

    // 1) DB insert with placeholder path
    const placeholderPath = makePlaceholderPath(producto_id);
    const insertedRows = await db.executeProc('imagenes_insert', {
      producto_id: { type: sql.Int, value: producto_id },
      image_path:  { type: sql.NVarChar(255), value: placeholderPath }
    });

    if (!insertedRows.length) {
      return res.status(500).json({ error: 'No se pudo insertar la imagen (sin filas).' });
    }

    const inserted = insertedRows[0]; // { imagen_id, producto_id, image_path }

    // 2) Process image on disk (AFTER successful DB call)
    const processed = await imageService.processAndSave({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      ownerId: producto_id
    });
    // processed: { canonicalPath, allPaths }

    // 3) Update row with final canonicalPath
    const updatedRows = await db.executeProc('imagenes_update', {
      imagen_id:   { type: sql.Int, value: inserted.imagen_id },
      producto_id: { type: sql.Int, value: producto_id },
      image_path:  { type: sql.NVarChar(255), value: processed.canonicalPath }
    });

    const updated = updatedRows[0] ?? {
      imagen_id: inserted.imagen_id,
      producto_id,
      image_path: processed.canonicalPath
    };

    return res.status(201).json({
      message: 'Imagen guardada',
      row: updated,
      files: processed.allPaths
    });
  } catch (err) {
    console.error('POST /imagenes error:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});


/* =========================================================
   UPDATE  (PUT /api/imagenes/:imagen_id)
   Body (multipart): { producto_id?: int, file?: binary }
   - If file provided, uses placeholder → process → final update.
   - If only producto_id provided, just updates DB.
   ========================================================= */
router.put('/:imagen_id', upload.single('file'), async (req, res) => {
  try {
    const imagen_id = parseInt(req.params.imagen_id, 10);
    if (!imagen_id) return res.status(400).json({ error: 'imagen_id inválido.' });

    const producto_id = req.body.producto_id ? parseInt(req.body.producto_id, 10) : null;
    const hasFile = !!req.file;

    // We need a current row to know old canonical (to clean files if replacing)
    // Since we don't have imagenes_get_by_id SP, we’ll fetch all and filter.
    const allRows = await db.executeProc('imagenes_get_all');
    const current = allRows.find(r => r.imagen_id === imagen_id);

    if (!current) return res.status(404).json({ error: 'Imagen no encontrada.' });

    const targetProductoId = producto_id || current.producto_id;

    // If only metadata changes (producto_id) and no file replacement:
    if (!hasFile) {
      const updatedRows = await db.executeProc('imagenes_update', {
        imagen_id:   { type: sql.Int, value: imagen_id },
        producto_id: { type: sql.Int, value: targetProductoId },
        image_path:  { type: sql.NVarChar(255), value: current.image_path }
      });
      return res.json({ message: 'Actualizada', row: updatedRows[0] || { ...current, producto_id: targetProductoId } });
    }

    // Replacing the file:
    const file = req.file;

    // 1) First DB update with placeholder (keeps invariant: image service AFTER DB)
    const placeholderPath = makePlaceholderPath(targetProductoId);
    await db.executeProc('imagenes_update', {
      imagen_id:   { type: sql.Int, value: imagen_id },
      producto_id: { type: sql.Int, value: targetProductoId },
      image_path:  { type: sql.NVarChar(255), value: placeholderPath }
    });

    // 2) Process file (AFTER successful DB update)
    const processed = await imageService.processAndSave({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      ownerId: targetProductoId
    });

    // 3) Final DB update with real canonical
    const finalRows = await db.executeProc('imagenes_update', {
      imagen_id:   { type: sql.Int, value: imagen_id },
      producto_id: { type: sql.Int, value: targetProductoId },
      image_path:  { type: sql.NVarChar(255), value: processed.canonicalPath }
    });

    // 4) Best-effort: remove old files (ignore errors)
    if (current.image_path && current.image_path !== processed.canonicalPath) {
      try { await imageService.removeByCanonical(current.image_path); } catch {}
    }

    return res.json({ message: 'Actualizada', row: finalRows[0] ?? { imagen_id, producto_id: targetProductoId, image_path: processed.canonicalPath }, files: processed.allPaths });
  } catch (err) {
    console.error('PUT /imagenes error:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});


/* =========================================================
   DELETE  (DELETE /api/imagenes/:imagen_id)
   - Deletes DB first; on success, removes files best-effort.
   ========================================================= */
router.delete('/:imagen_id', async (req, res) => {
  try {
    const imagen_id = parseInt(req.params.imagen_id, 10);
    if (!imagen_id) return res.status(400).json({ error: 'imagen_id inválido.' });

    // Find current image to remove files after DB success
    const allRows = await db.executeProc('imagenes_get_all');
    const current = allRows.find(r => r.imagen_id === imagen_id);

    // 1) DB delete
    await db.executeProc('imagenes_delete', {
      imagen_id: { type: sql.Int, value: imagen_id }
    });

    // 2) Remove files (best-effort, AFTER DB success)
    if (current?.image_path) {
      try { await imageService.removeByCanonical(current.image_path); } catch {}
    }

    return res.json({ message: 'Eliminada' });
  } catch (err) {
    console.error('DELETE /imagenes error:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});


/* =========================================================
   GET by producto_id  (GET /api/imagenes/by-producto/:producto_id)
   ========================================================= */
router.get('/by-producto/:producto_id', async (req, res) => {
  try {
    const producto_id = parseInt(req.params.producto_id, 10);
    if (!producto_id || producto_id <= 0) {
      return res.status(400).json({ error: 'producto_id inválido.' });
    }

    const rows = await db.executeProc('imagenes_get_by_producto_id', {
      producto_id: { type: sql.Int, value: producto_id }
    });

    return res.json(rows);
  } catch (err) {
    console.error('GET /imagenes/by-producto error:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});


/* =========================================================
   GET all  (GET /api/imagenes)
   ========================================================= */
router.get('/', async (_req, res) => {
  try {
    const rows = await db.executeProc('imagenes_get_all', {});
    return res.json(rows);
  } catch (err) {
    console.error('GET /imagenes error:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

// GET /api/imagenes/refresh-missing-products
router.get('/refresh-missing-products', async (_req, res) => {
  try {
    const rows = await db.executeProc('productos_sin_imagenes_get');
    // rows => [ { producto_id: 1, nombre: "Arroz" }, { producto_id: 2, nombre: "Azúcar" }, ... ]
    return res.json(rows);
  } catch (err) {
    console.error('GET /imagenes/refresh-missing-products error:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

module.exports = router;
