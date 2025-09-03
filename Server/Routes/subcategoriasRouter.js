// Server/routes/subcategoriasRouter.js
// Stored Procedures usados (con @parámetros y retorno):
// - subcategorias_insert(@nombre NVARCHAR(100))
//     -> RETURNS: [ { subcategoria_id, nombre } ]
// - subcategorias_update(@subcategoria_id INT, @nombre NVARCHAR(100))
//     -> RETURNS: [ { subcategoria_id, nombre } ]
// - subcategorias_delete(@subcategoria_id INT)
//     -> RETURNS: none
// - subcategorias_get_all()
//     -> RETURNS: [ { subcategoria_id, nombre }, ... ]
// - subcategorias_get_list()
//     -> RETURNS: [ { subcategoria_id, nombre }, ... ]
// - subcategorias_get_by_id(@subcategoria_id INT)
//     -> RETURNS: [ { subcategoria_id, nombre } ]  (0 o 1)

const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');
const ValidationService = require('../Validators/validatorService.js');
const {
  InsertRules,
  UpdateRules,
  DeleteRules,
  PorIdRules
} = require('../Validators/Rulesets/subcategorias.js');

const { requireAuth, requireAdmin } = require('./authRouter.js');

const Router = express.Router();

function BuildParams(entries) {
  const params = {};
  for (const e of entries) params[e.name] = { type: e.type, value: e.value };
  return params;
}

/* INSERT (auth) */
Router.post('/insert', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, InsertRules);
    if (!isValid) return res.status(400).json({ success: false, message: 'Datos inválidos (insert)', errors });

    const params = BuildParams([
      { name: 'nombre', type: sql.NVarChar(100), value: body.nombre }
    ]);

    const data = await db.executeProc('subcategorias_insert', params);
    return res.status(201).json({ success: true, message: 'Subcategoría creada', data });
  } catch (err) {
    console.error('subcategorias_insert error:', err);
    return res.status(500).json({ success: false, message: 'Error al crear la subcategoría' });
  }
});

/* UPDATE (auth) */
Router.post('/update', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, UpdateRules);
    if (!isValid) return res.status(400).json({ success: false, message: 'Datos inválidos (update)', errors });

    const params = BuildParams([
      { name: 'subcategoria_id', type: sql.Int,           value: Number(body.subcategoria_id) },
      { name: 'nombre',          type: sql.NVarChar(100), value: body.nombre }
    ]);

    const data = await db.executeProc('subcategorias_update', params);
    return res.status(200).json({ success: true, message: 'Subcategoría actualizada', data });
  } catch (err) {
    console.error('subcategorias_update error:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar la subcategoría' });
  }
});

/* DELETE (admin) */
Router.post('/delete', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, DeleteRules);
    if (!isValid) return res.status(400).json({ success: false, message: 'Datos inválidos (delete)', errors });

    const params = BuildParams([
      { name: 'subcategoria_id', type: sql.Int, value: Number(body.subcategoria_id) }
    ]);

    await db.executeProc('subcategorias_delete', params);
    return res.status(200).json({ success: true, message: 'Subcategoría eliminada' });
  } catch (err) {
    console.error('subcategorias_delete error:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar la subcategoría' });
  }
});

/* GET ALL (public) */
Router.get('/get_all', async (_req, res) => {
  try {
    const data = await db.executeProc('subcategorias_get_all', {});
    return res.status(200).json({ success: true, message: 'Listado de subcategorías', data });
  } catch (err) {
    console.error('subcategorias_get_all error:', err);
    return res.status(500).json({ success: false, message: 'Error al listar subcategorías' });
  }
});

/* GET LIST (public) */
Router.get('/get_list', async (_req, res) => {
  try {
    const data = await db.executeProc('subcategorias_get_list', {});
    return res.status(200).json({ success: true, message: 'Listado simple de subcategorías', data });
  } catch (err) {
    console.error('subcategorias_get_list error:', err);
    return res.status(500).json({ success: false, message: 'Error al listar subcategorías (simple)' });
  }
});

/* GET BY ID (public) */
Router.get('/por_id/:subcategoria_id', async (req, res) => {
  try {
    const body = { subcategoria_id: Number(req.params.subcategoria_id) };
    const { isValid, errors } = await ValidationService.validateData(body, PorIdRules);
    if (!isValid) return res.status(400).json({ success: false, message: 'Datos inválidos (por_id)', errors });

    const data = await db.executeProc('subcategorias_get_by_id', {
      subcategoria_id: { type: sql.Int, value: body.subcategoria_id }
    });

    if (!Array.isArray(data) || !data.length)
      return res.status(404).json({ success: false, message: 'Subcategoría no encontrada' });

    return res.status(200).json({ success: true, message: 'Subcategoría obtenida', data: data[0] });
  } catch (err) {
    console.error('subcategorias_get_by_id error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener la subcategoría' });
  }
});

module.exports = Router;
