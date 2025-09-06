// Server/routes/cajas_detallesRouter.js
const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');
const ValidationService = require('../Validators/validatorService.js');
const { requireAuth, requireAdmin } = require('./authRouter.js');

const Router = express.Router();

const Rules = {
  Insert: {
    caja_id: { required: true, custom: v => Number.isInteger(Number(v)) && v > 0 },
    producto_id: { required: true, custom: v => Number.isInteger(Number(v)) && v > 0 },
    stock: { required: true, custom: v => Number.isInteger(Number(v)) && v >= 0 }
  },
  Update: {
    detalle_id: { required: true, custom: v => Number.isInteger(Number(v)) && v > 0 },
    caja_id: { required: true, custom: v => Number.isInteger(Number(v)) && v > 0 },
    producto_id: { required: true, custom: v => Number.isInteger(Number(v)) && v > 0 },
    stock: { required: true, custom: v => Number.isInteger(Number(v)) && v >= 0 }
  },
  Delete: {
    detalle_id: { required: true, custom: v => Number.isInteger(Number(v)) && v > 0 }
  },
  PorId: {
    detalle_id: { required: true, custom: v => Number.isInteger(Number(v)) && v > 0 }
  }
};

function BuildParams(entries) {
  const p = {};
  for (const e of entries) p[e.name] = { type: e.type, value: e.value };
  return p;
}

// INSERT
Router.post('/insert', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, Rules.Insert);
    if (!isValid) return res.status(400).json({ success: false, message: 'Datos inválidos', errors });

    const params = BuildParams([
      { name: 'caja_id', type: sql.Int, value: Number(body.caja_id) },
      { name: 'producto_id', type: sql.Int, value: Number(body.producto_id) },
      { name: 'stock', type: sql.Int, value: Number(body.stock) }
    ]);

    const data = await db.executeProc('cajas_detalles_insert', params);
    return res.status(201).json({ success: true, message: 'Detalle de caja creado', data });
  } catch (err) {
    console.error('cajas_detalles_insert error:', err);
    return res.status(500).json({ success: false, message: 'Error al crear el detalle de caja' });
  }
});

// UPDATE
Router.post('/update', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, Rules.Update);
    if (!isValid) return res.status(400).json({ success: false, message: 'Datos inválidos', errors });

    const params = BuildParams([
      { name: 'detalle_id', type: sql.Int, value: Number(body.detalle_id) },
      { name: 'caja_id', type: sql.Int, value: Number(body.caja_id) },
      { name: 'producto_id', type: sql.Int, value: Number(body.producto_id) },
      { name: 'stock', type: sql.Int, value: Number(body.stock) }
    ]);

    const data = await db.executeProc('cajas_detalles_update', params);
    return res.status(200).json({ success: true, message: 'Detalle de caja actualizado', data });
  } catch (err) {
    console.error('cajas_detalles_update error:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar el detalle de caja' });
  }
});

// DELETE
Router.post('/delete', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, Rules.Delete);
    if (!isValid) return res.status(400).json({ success: false, message: 'Datos inválidos', errors });

    const params = BuildParams([
      { name: 'detalle_id', type: sql.Int, value: Number(body.detalle_id) }
    ]);

    await db.executeProc('cajas_detalles_delete', params);
    return res.status(200).json({ success: true, message: 'Detalle de caja eliminado' });
  } catch (err) {
    console.error('cajas_detalles_delete error:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar el detalle de caja' });
  }
});

// GET ALL
Router.get('/get_all', async (_req, res) => {
  try {
    const data = await db.executeProc('cajas_detalles_get_all', {});
    return res.status(200).json({ success: true, message: 'Listado de detalles de cajas', data });
  } catch (err) {
    console.error('cajas_detalles_get_all error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener detalles de cajas' });
  }
});

// GET BY ID
Router.get('/por_id/:detalle_id', async (req, res) => {
  try {
    const body = { detalle_id: Number(req.params.detalle_id) };
    const { isValid, errors } = await ValidationService.validateData(body, Rules.PorId);
    if (!isValid) return res.status(400).json({ success: false, message: 'Datos inválidos', errors });

    const data = await db.executeProc('cajas_detalles_get_by_id', {
      detalle_id: { type: sql.Int, value: body.detalle_id }
    });

    if (!data.length) return res.status(404).json({ success: false, message: 'Detalle de caja no encontrado' });
    return res.status(200).json({ success: true, message: 'Detalle de caja obtenido', data: data[0] });
  } catch (err) {
    console.error('cajas_detalles_get_by_id error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener el detalle de caja' });
  }
});

module.exports = Router;