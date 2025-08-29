// Server/Routes/categoriasRouter.js
'use strict';

/**
 * IMPORTS (con comentarios de referencia)
 */
const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');          // pool MSSQL + tipos
const ValidationService = require('../Validators/validatorService.js'); // validateData(payload, rules)
const { requireAdmin, requireAuth, requireUser } = require('../Routes/authRouter.js'); // middlewares
const { InsertRules, UpdateRules, DeleteRules, ByIdRules } = require('../Validators/Rulesets/categorias.js'); // reglas

const CategoriasRouter = express.Router();

/**
 * PROTECCIÓN EXPLÍCITA POR ENDPOINT
 * - Consultas -> requireAuth
 * - Insert/Update/Delete -> requireAdmin
 */
const PROTECTION = {
  LIST_ALL:   'auth', // GET /all
  LIST:       'auth', // GET /list
  GET_BY_ID:  'auth', // GET /por_id/:categoria_id
  INSERT:     'admin',// POST /insert
  UPDATE:     'admin',// POST /update
  DELETE:     'admin' // POST /delete
};

// Traductor de nivel a middleware
function guard(level){
  switch(level){
    case 'admin': return requireAdmin;
    case 'auth':  return requireAuth;
    case 'user':  return requireUser;
    case 'none':
    default:      return (_req,_res,next)=>next();
  }
}

// ---------- Helpers comunes ----------
function BuildParams(entries){ const p={}; for(const e of entries){ p[e.name]={type:e.type,value:e.value}; } return p; }

/** Mapa de errores SQL -> HTTP */
function mapSqlError(err){
  const e = err && (typeof err.number === 'number' ? err : err.originalError);
  if(!e || typeof e.number !== 'number') return null;
  const map = {
    // CATEGORÍAS (510xx)
    51002:{code:404,message:'La categoría no existe.'},
    51003:{code:400,message:'El nombre de categoría es obligatorio.'},
    51004:{code:409,message:'Ya existe otra categoría con ese nombre.'},
    51005:{code:409,message:'No se puede eliminar: hay productos en esta categoría.'},
    51006:{code:409,message:'Ya existe otra categoría con ese nombre.'},
  };
  return map[e.number] || null;
}

/** Respuestas uniformes */
function sendOk(res, data, message){
  return res.status(200).json({ success:true, message: message ?? (Array.isArray(data)?(data.length?'OK':'Sin resultados'):'OK'), data });
}
function sendCreated(res, data, message){
  return res.status(201).json({ success:true, message: message ?? 'Creado', data });
}
function sendError(res, err, fallback='Error de servidor'){
  const m = mapSqlError(err);
  if(m) return res.status(m.code).json({ success:false, message:m.message, data:null });
  return res.status(500).json({ success:false, message:fallback, data:null });
}
function sendListOr404(res, data, okMessage='Listado', emptyMessage='Sin resultados'){
  if(!Array.isArray(data) || data.length===0){
    return res.status(404).json({ success:false, message: emptyMessage, data: [] });
  }
  return res.status(200).json({ success:true, message: okMessage, data });
}

// ---------- Rutas ----------

// GET /categorias/all
// (sin body) --> Array<{ categoria_id, nombre, descripcion? }>
CategoriasRouter.get('/all', guard(PROTECTION.LIST_ALL), async (_req,res)=>{
  try{
    const data = await db.executeProc('categorias_get_all', {});
    return sendListOr404(res, data, 'Categorías listadas', 'No hay categorías');
  }catch(err){ return sendError(res, err, 'Error al listar categorías'); }
});

// GET /categorias/list
// (sin body) --> Array<{ categoria_id, nombre }>
CategoriasRouter.get('/list', guard(PROTECTION.LIST), async (_req,res)=>{
  try{
    const data = await db.executeProc('categorias_get_list', {});
    return sendListOr404(res, data, 'Categorías listadas', 'No hay categorías');
  }catch(err){ return sendError(res, err, 'Error al listar categorías'); }
});

// GET /categorias/por_id/:categoria_id
// params: categoria_id:number --> { categoria_id, nombre, descripcion? }
CategoriasRouter.get('/por_id/:categoria_id', guard(PROTECTION.GET_BY_ID), async (req,res)=>{
  try{
    const Body = { categoria_id: Number(req.params.categoria_id) };
    const { isValid } = await ValidationService.validateData(Body, ByIdRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_id)', data:null });

    const data = await db.executeProc('categorias_get_by_id', { categoria_id:{ type: sql.Int, value: Body.categoria_id }});
    if(!data.length) return res.status(404).json({ success:false, message:'Categoría no encontrada', data: [] });
    return sendOk(res, data[0], 'Categoría obtenida');
  }catch(err){ return sendError(res, err, 'Error al obtener categoría'); }
});

// POST /categorias/insert
// body: { nombre, descripcion? } --> { categoria_id, nombre, descripcion? }
CategoriasRouter.post('/insert', guard(PROTECTION.INSERT), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, InsertRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (insert)', data:null });

    const Params = BuildParams([
      { name:'nombre',      type: sql.NVarChar(100), value: Body.nombre },
      { name:'descripcion', type: sql.NVarChar(255), value: Body.descripcion ?? null }
    ]);
    const data = await db.executeProc('categorias_insert', Params);
    return sendCreated(res, data[0] ?? null, 'Categoría creada');
  }catch(err){ return sendError(res, err, 'Error al crear categoría'); }
});

// POST /categorias/update
// body: { categoria_id, nombre, descripcion? } --> fila actualizada | 404 si vacío
CategoriasRouter.post('/update', guard(PROTECTION.UPDATE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, UpdateRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (update)', data:null });

    const Params = BuildParams([
      { name:'categoria_id', type: sql.Int,           value: Body.categoria_id },
      { name:'nombre',       type: sql.NVarChar(100), value: Body.nombre },
      { name:'descripcion',  type: sql.NVarChar(255), value: Body.descripcion ?? null }
    ]);
    const data = await db.executeProc('categorias_update', Params);
    if(!data.length) return res.status(404).json({ success:false, message:'Categoría no encontrada', data: [] });
    return sendOk(res, data[0], 'Categoría actualizada');
  }catch(err){ return sendError(res, err, 'Error al actualizar categoría'); }
});

// POST /categorias/delete
// body: { categoria_id } --> sin data (200)
CategoriasRouter.post('/delete', guard(PROTECTION.DELETE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, DeleteRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (delete)', data:null });

    await db.executeProc('categorias_delete', { categoria_id:{ type: sql.Int, value: Body.categoria_id }});
    return sendOk(res, [], 'Categoría eliminada');
  }catch(err){ return sendError(res, err, 'Error al eliminar categoría'); }
});

module.exports = CategoriasRouter;
