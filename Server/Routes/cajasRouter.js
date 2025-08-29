// Server/Routes/cajasRouter.js
'use strict';

/**
 * IMPORTS
 */
const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');          // <- pool + tipos SQL
const ValidationService = require('../Validators/validatorService.js'); // <- validateData(payload, rules)
const { requireAdmin, requireAuth, requireUser } = require('../Routes/authRouter.js'); // <- middlewares de auth
const { InsertRules, UpdateRules, DeleteRules, ByIdRules } = require('../Validators/Rulesets/cajas.js'); // <- reglas

const CajasRouter = express.Router();

/**
 * CONFIG DE PROTECCIÓN EXPLÍCITA POR RUTA 
 * Valores posibles: 'admin' | 'auth' | 'user' | 'none'
 */
const PROTECTION = {
  LIST_ALL:   'auth', // GET /all
  LIST:       'auth', // GET /list
  GET_BY_ID:  'auth', // GET /por_id/:caja_id
  INSERT:     'admin',// POST /insert
  UPDATE:     'admin',// POST /update
  DELETE:     'admin' // POST /delete
};

// Helper para traducir el nivel a middleware real
function guard(level) {
  switch (level) {
    case 'admin': return requireAdmin;
    case 'auth':  return requireAuth;
    case 'user':  return requireUser;
    case 'none':
    default:      return (_req, _res, next) => next();
  }
}

// ---------- Helpers comunes ----------
function BuildParams(entries){ const p={}; for(const e of entries){ p[e.name]={type:e.type,value:e.value}; } return p; }

/** Mapa de errores SQL -> HTTP (basado en THROW de los SP) */
function mapSqlError(err){
  const e = err && (typeof err.number === 'number' ? err : err.originalError);
  if (!e || typeof e.number !== 'number') return null;
  const map = {
    // CAJAS (520xx)
    52001:{code:400,message:'Letra debe tener 1 o 2 caracteres.'},
    52002:{code:400,message:'Cara inválida.'},
    52003:{code:400,message:'Nivel inválido.'},
    52004:{code:409,message:'Ya existe una caja con la misma letra, cara y nivel.'},
    52009:{code:409,message:'Otra caja ya usa esa combinación de letra, cara y nivel.'},
    52010:{code:404,message:'La caja no existe.'},
    52011:{code:409,message:'No se puede eliminar: la caja tiene referencias o stock.'},
  };
  return map[e.number] || null;
}

/** Respuestas uniformes */
function sendOk(res, data, message){
  return res.status(200).json({
    success: true,
    message: message ?? (Array.isArray(data) ? (data.length ? 'OK' : 'Sin resultados') : 'OK'),
    data
  });
}
function sendCreated(res, data, message){
  return res.status(201).json({ success:true, message: message ?? 'Creado', data });
}
function sendError(res, err, fallback='Error de servidor'){
  const m = mapSqlError(err);
  if (m) return res.status(m.code).json({ success:false, message:m.message, data:null });
  return res.status(500).json({ success:false, message:fallback, data:null });
}

/**
 * Coherencia 404 en resultados vacíos:
 * Para endpoints de LISTADO, devolvemos 404 cuando no hay filas.
 * Mantiene el payload consistente con success=false y data=[]
 */
function sendListOr404(res, data, okMessage='Listado', emptyMessage='Sin resultados'){
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(404).json({ success:false, message: emptyMessage, data: [] });
  }
  return res.status(200).json({ success:true, message: okMessage, data });
}

// ---------- Rutas ----------

// GET /cajas/all  (Consultas -> requireAuth)
// datos requeridos --> datos devueltos
// (sin body)       --> Array<{ caja_id, letra, cara, nivel, etiqueta, ... }>
CajasRouter.get('/all', guard(PROTECTION.LIST_ALL), async (_req, res) => {
  try{
    const data = await db.executeProc('cajas_get_all', {});
    return sendListOr404(res, data, 'Cajas listadas', 'No hay cajas');
  }catch(err){ return sendError(res, err, 'Error al listar cajas'); }
});

// GET /cajas/list  (Consultas -> requireAuth)
// (sin body) --> Array<{ caja_id, etiqueta }>
CajasRouter.get('/list', guard(PROTECTION.LIST), async (_req, res) => {
  try{
    const data = await db.executeProc('cajas_get_list', {});
    return sendListOr404(res, data, 'Cajas listadas', 'No hay cajas');
  }catch(err){ return sendError(res, err, 'Error al listar cajas'); }
});

// GET /cajas/por_id/:caja_id  (Consultas -> requireAuth)
// params: caja_id:number --> { caja_id, letra, cara, nivel, etiqueta, ... }
CajasRouter.get('/por_id/:caja_id', guard(PROTECTION.GET_BY_ID), async (req, res) => {
  try{
    const Body = { caja_id: Number(req.params.caja_id) };
    const { isValid } = await ValidationService.validateData(Body, ByIdRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_id)', data:null });

    const data = await db.executeProc('cajas_get_by_id', { caja_id:{ type: sql.Int, value: Body.caja_id }});
    if(!data.length) return res.status(404).json({ success:false, message:'Caja no encontrada', data:[] });
    return sendOk(res, data[0], 'Caja obtenida');
  }catch(err){ return sendError(res, err, 'Error al obtener caja'); }
});

// POST /cajas/insert  (Insert -> ADMIN)
// body: { letra, cara, nivel } --> { caja_id, letra, cara, nivel, etiqueta, ... }
CajasRouter.post('/insert', guard(PROTECTION.INSERT), async (req, res) => {
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, InsertRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (insert)', data:null });

    const Params = BuildParams([
      { name:'letra', type: sql.NVarChar(2), value: Body.letra },
      { name:'cara',  type: sql.Int,         value: Body.cara  },
      { name:'nivel', type: sql.Int,         value: Body.nivel }
    ]);
    const data = await db.executeProc('cajas_insert', Params);
    // El SP normalmente devuelve la fila creada; si viniera vacío (raro), aún respondemos 201 con null.
    return sendCreated(res, data[0] ?? null, 'Caja creada');
  }catch(err){ return sendError(res, err, 'Error al crear caja'); }
});

// POST /cajas/update  (Update -> ADMIN)
// body: { caja_id, letra, cara, nivel } --> { caja_id, ... } | 404 si no hay filas
CajasRouter.post('/update', guard(PROTECTION.UPDATE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, UpdateRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (update)', data:null });

    const Params = BuildParams([
      { name:'caja_id', type: sql.Int,         value: Body.caja_id },
      { name:'letra',   type: sql.NVarChar(2), value: Body.letra },
      { name:'cara',    type: sql.Int,         value: Body.cara },
      { name:'nivel',   type: sql.Int,         value: Body.nivel }
    ]);
    const data = await db.executeProc('cajas_update', Params);
    // Coherencia 404 si UPDATE no devuelve filas y el SP no hizo THROW (p.ej., 52010)
    if(!data.length) return res.status(404).json({ success:false, message:'Caja no encontrada', data:[] });
    return sendOk(res, data[0], 'Caja actualizada');
  }catch(err){ return sendError(res, err, 'Error al actualizar caja'); }
});

// POST /cajas/delete  (Delete -> ADMIN)
// body: { caja_id } --> sin data | errores mapeados por THROW
CajasRouter.post('/delete', guard(PROTECTION.DELETE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, DeleteRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (delete)', data:null });

    await db.executeProc('cajas_delete', { caja_id:{ type: sql.Int, value: Body.caja_id }});
    return sendOk(res, [], 'Caja eliminada');
  }catch(err){ return sendError(res, err, 'Error al eliminar caja'); }
});

module.exports = CajasRouter;
