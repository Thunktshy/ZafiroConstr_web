// Server/routes/unitsRouter.js
// Stored procedures (params y retorno esperado):
// - units_insert(@nombre NVARCHAR(50))
//     -> RETURNS: [ { unit_id } ]   (tu SP original devuelve sólo el ID; si prefieres, ajústalo para devolver {unit_id, nombre})
// - units_update(@unit_id INT, @nombre NVARCHAR(50))
//     -> RETURNS: none
// - units_delete(@unit_id INT)
//     -> RETURNS: none
// - units_get_all()
//     -> RETURNS: [ { unit_id, nombre }, ... ]
// - units_get_by_id(@unit_id INT)   (creado previamente)
//     -> RETURNS: [ { unit_id, nombre } ]  (0 o 1)

const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');
const ValidationService = require('../Validators/validatorService.js');
const { InsertRules, UpdateRules, DeleteRules, PorIdRules } =
  require('../Validators/Rulesets/units.js');

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
    const data = await db.executeProc('units_insert', params);
    return res.status(201).json({
      success:true,
      message:'Unidad creada',
      data // puede ser [{ unit_id: X }] según tu SP
    });
  } catch (err) {
    console.error('units_insert error:', err);
    return res.status(500).json({ success:false, message:'Error al crear la unidad' });
  }
});

/* UPDATE (auth) */
Router.post('/update', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, UpdateRules);
    if (!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (update)', errors });

    const params = BuildParams([
      { name:'unit_id', type: sql.Int,           value: Number(body.unit_id) },
      { name:'nombre',  type: sql.NVarChar(50),  value: body.nombre }
    ]);
    await db.executeProc('units_update', params);
    return res.status(200).json({ success:true, message:'Unidad actualizada' });
  } catch (err) {
    console.error('units_update error:', err);
    return res.status(500).json({ success:false, message:'Error al actualizar la unidad' });
  }
});

/* DELETE (admin) */
Router.post('/delete', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const { isValid, errors } = await ValidationService.validateData(body, DeleteRules);
    if (!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (delete)', errors });

    const params = BuildParams([{ name:'unit_id', type: sql.Int, value: Number(body.unit_id) }]);
    await db.executeProc('units_delete', params);
    return res.status(200).json({ success:true, message:'Unidad eliminada' });
  } catch (err) {
    console.error('units_delete error:', err);
    return res.status(500).json({ success:false, message:'Error al eliminar la unidad' });
  }
});

/* GET ALL (public) */
Router.get('/get_all', async (_req, res) => {
  try {
    const data = await db.executeProc('units_get_all', {});
    return res.status(200).json({ success:true, message:'Listado de unidades', data });
  } catch (err) {
    console.error('units_get_all error:', err);
    return res.status(500).json({ success:false, message:'Error al listar unidades' });
  }
});

/* GET BY ID (public) */
Router.get('/por_id/:unit_id', async (req, res) => {
  try {
    const body = { unit_id: Number(req.params.unit_id) };
    const { isValid, errors } = await ValidationService.validateData(body, PorIdRules);
    if (!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_id)', errors });

    const data = await db.executeProc('units_get_by_id', {
      unit_id: { type: sql.Int, value: body.unit_id }
    });

    if (!data?.length) return res.status(404).json({ success:false, message:'Unidad no encontrada' });
    return res.status(200).json({ success:true, message:'Unidad obtenida', data: data[0] });
  } catch (err) {
    console.error('units_get_by_id error:', err);
    return res.status(500).json({ success:false, message:'Error al obtener la unidad' });
  }
});

module.exports = Router;
