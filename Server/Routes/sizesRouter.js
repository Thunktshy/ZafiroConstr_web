// Server/routes/sizesRouter.js
// Stored procedures (params y retorno esperado):
// - sizes_insert(@nombre NVARCHAR(50))
//     -> RETURNS: [ { size_id, nombre } ]
// - sizes_update(@size_id INT, @nombre NVARCHAR(50))
//     -> RETURNS: none
// - sizes_delete(@size_id INT)
//     -> RETURNS: none
// - sizes_get_all()
//     -> RETURNS: [ { size_id, nombre }, ... ]
// - sizes_get_by_id(@size_id INT)   (creado previamente)
//     -> RETURNS: [ { size_id, nombre } ]  (0 o 1)

const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');
const ValidationService = require('../Validators/validatorService.js');
const { InsertRules, UpdateRules, DeleteRules, PorIdRules } =
  require('../Validators/Rulesets/sizes.js');

const { requireAuth, requireAdmin } = require('./authRouter.js');

const Router = express.Router();

function BuildParams(entries) {
  const p = {}; for (const e of entries) p[e.name] = { type: e.type, value: e.value }; return p;
}

/* INSERT (auth) */
Router.post('/insert', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, InsertRules);
    if (!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (insert)', errors });

    const params = BuildParams([{ name:'nombre', type: sql.NVarChar(50), value: body.nombre }]);
    const data = await db.executeProc('sizes_insert', params);
    return res.status(201).json({ success:true, message:'Talla creada', data });
  } catch (err) {
    console.error('sizes_insert error:', err);
    return res.status(500).json({ success:false, message:'Error al crear la talla' });
  }
});

/* UPDATE (auth) */
Router.post('/update', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, UpdateRules);
    if (!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (update)', errors });

    const params = BuildParams([
      { name:'size_id', type: sql.Int,           value: Number(body.size_id) },
      { name:'nombre',  type: sql.NVarChar(50),  value: body.nombre }
    ]);
    await db.executeProc('sizes_update', params);
    return res.status(200).json({ success:true, message:'Talla actualizada' });
  } catch (err) {
    console.error('sizes_update error:', err);
    return res.status(500).json({ success:false, message:'Error al actualizar la talla' });
  }
});

/* DELETE (admin) */
Router.post('/delete', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, DeleteRules);
    if (!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (delete)', errors });

    const params = BuildParams([{ name:'size_id', type: sql.Int, value: Number(body.size_id) }]);
    await db.executeProc('sizes_delete', params);
    return res.status(200).json({ success:true, message:'Talla eliminada' });
  } catch (err) {
    console.error('sizes_delete error:', err);
    return res.status(500).json({ success:false, message:'Error al eliminar la talla' });
  }
});

/* GET ALL (public) */
Router.get('/get_all', async (_req, res) => {
  try {
    const data = await db.executeProc('sizes_get_all', {});
    return res.status(200).json({ success:true, message:'Listado de tallas', data });
  } catch (err) {
    console.error('sizes_get_all error:', err);
    return res.status(500).json({ success:false, message:'Error al listar tallas' });
  }
});

/* GET BY ID (public) */
Router.get('/por_id/:size_id', async (req, res) => {
  try {
    const body = { size_id: Number(req.params.size_id) };
    const { isValid, errors } = await ValidationService.validateData(body, PorIdRules);
    if (!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_id)', errors });

    const data = await db.executeProc('sizes_get_by_id', {
      size_id: { type: sql.Int, value: body.size_id }
    });

    if (!data?.length) return res.status(404).json({ success:false, message:'Talla no encontrada' });
    return res.status(200).json({ success:true, message:'Talla obtenida', data: data[0] });
  } catch (err) {
    console.error('sizes_get_by_id error:', err);
    return res.status(500).json({ success:false, message:'Error al obtener la talla' });
  }
});

module.exports = Router;
