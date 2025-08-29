'use strict';

/**
 * IMPORTS (con comentarios de referencia)
 */
const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');          // pool MSSQL + tipos
const ValidationService = require('../Validators/validatorService.js');  // validateData(payload, rules)
const { requireAdmin, requireAuth, requireUser } = require('../Routes/authRouter.js'); // middlewares
const {
  GetByProductoRules, AddRemoveRules, MoveRules,
  SetByDetalleRules, DetalleByIdRules
} = require('../Validators/Rulesets/stock.js');

const StockRouter = express.Router();

/**
 * PROTECCIÓN EXPLÍCITA POR ENDPOINT
 * - Consultas -> requireAuth
 * - Mutaciones -> requireAdmin
 */
const PROTECTION = {
  LIST_ALL:       'auth',  // GET /all
  PRODUCTO:       'auth',  // GET /producto/:producto_id
  DETALLE_BY_ID:  'auth',  // GET /detalle/:detalle_id
  // NUEVOS:
  BY_CATEGORIA:   'auth',  // GET /categoria/:categoria_id
  AUDIT_BAJO:     'auth',  // GET /audit/bajo
  AUDIT_SIN:      'auth',  // GET /audit/sin
  RESUMEN:        'auth',  // GET /resumen
  DETALLES_BY_PROD:'auth', // GET /detalles/por_producto/:producto_id
  // Mutaciones:
  ADD:            'admin', // POST /add
  REMOVE:         'admin', // POST /remove
  MOVE:           'admin', // POST /move
  SET_BY_DETALLE: 'admin', // POST /set_by_detalle
  DETALLE_DELETE: 'admin', // POST /detalle_delete
  // NUEVO:
  DETALLE_INSERT: 'admin', // POST /detalle_insert
};

// Traductor
function guard(level){
  switch(level){
    case 'admin': return requireAdmin;
    case 'auth':  return requireAuth;
    case 'user':  return requireUser;
    case 'none':
    default:      return (_req,_res,next)=>next();
  }
}

// ---------- Helpers ----------
function BuildParams(entries){ const p={}; for(const e of entries){ p[e.name]={type:e.type,value:e.value}; } return p; }

/** Mapa de errores SQL -> HTTP */
function mapSqlError(err){
  const e = err && (typeof err.number === 'number' ? err : err.originalError);
  if(!e || typeof e.number !== 'number') return null;
  const map = {
    // CAJAS_DETALLES (530xx)
    53001:{code:400,message:'Stock inválido (negativo).'},
    53002:{code:404,message:'Caja no existe.'},
    53003:{code:404,message:'Producto no existe o está inactivo.'},
    53004:{code:409,message:'Ya existe un detalle para ese (caja, producto).'},
    53005:{code:404,message:'Detalle no encontrado.'},
    53006:{code:400,message:'Stock inválido (negativo).'},
    53007:{code:404,message:'Caja no existe.'},
    53008:{code:404,message:'Producto no existe o está inactivo.'},
    53009:{code:409,message:'Otro detalle ya tiene ese (caja, producto).'},
    53020:{code:409,message:'No se puede eliminar un detalle con stock > 0.'},
    53021:{code:404,message:'Detalle no encontrado.'},

    // CONTROL DE STOCK (540xx)
    54001:{code:400,message:'Delta debe ser > 0.'},
    54002:{code:404,message:'Producto no existe o está inactivo.'},
    54003:{code:404,message:'Caja no existe.'},
    54004:{code:400,message:'Delta debe ser > 0.'},
    54005:{code:404,message:'Producto no existe o está inactivo.'},
    54006:{code:404,message:'No existe stock de ese producto en la caja indicada.'},
    54007:{code:409,message:'Stock insuficiente para remover.'},
    54008:{code:400,message:'Stock inválido (negativo).'},
    54009:{code:404,message:'Producto no existe o está inactivo.'},
    54010:{code:404,message:'Detalle no existe o no corresponde al producto.'},
    54020:{code:400,message:'Cantidad debe ser > 0.'},
    54021:{code:404,message:'No existe registro de stock en caja origen.'},
    54022:{code:409,message:'Stock insuficiente en origen.'},
    54023:{code:400,message:'La caja de origen y destino deben ser distintas.'},
    54025:{code:404,message:'Caja de origen no existe.'},
    54026:{code:404,message:'Caja de destino no existe.'},
  };
  return map[e.number] || null;
}

/** Respuestas */
function sendOk(res, data, message){
  return res.status(200).json({ success:true, message: message ?? (Array.isArray(data)?(data.length?'OK':'Sin resultados'):'OK'), data });
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

// ---------- Rutas existentes ----------

// GET /stock/all  -> get_all_stock
StockRouter.get('/all', guard(PROTECTION.LIST_ALL), async (_req,res)=>{
  try{
    const data = await db.executeProc('get_all_stock', {});
    return sendListOr404(res, data, 'Stock listado', 'Sin stock');
  }catch(err){ return sendError(res, err, 'Error al listar stock'); }
});

// GET /stock/producto/:producto_id  -> productos_get_stock
StockRouter.get('/producto/:producto_id', guard(PROTECTION.PRODUCTO), async (req,res)=>{
  try{
    const Body = { producto_id: Number(req.params.producto_id) };
    const { isValid } = await ValidationService.validateData(Body, GetByProductoRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (producto stock)', data:null });

    const data = await db.executeProc('productos_get_stock', { producto_id:{ type: sql.Int, value: Body.producto_id }});
    return sendListOr404(res, data, 'Detalle de stock', 'Sin detalle');
  }catch(err){ return sendError(res, err, 'Error al obtener stock del producto'); }
});

// GET /stock/detalle/:detalle_id  -> cajas_detalles_get_by_id
StockRouter.get('/detalle/:detalle_id', guard(PROTECTION.DETALLE_BY_ID), async (req,res)=>{
  try{
    const Body = { detalle_id: Number(req.params.detalle_id) };
    const { isValid } = await ValidationService.validateData(Body, DetalleByIdRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (detalle por_id)', data:null });

    const data = await db.executeProc('cajas_detalles_get_by_id', { detalle_id:{ type: sql.Int, value: Body.detalle_id }});
    if(!data.length) return res.status(404).json({ success:false, message:'Detalle no encontrado', data: [] });
    return sendOk(res, data[0], 'Detalle obtenido');
  }catch(err){ return sendError(res, err, 'Error al obtener detalle'); }
});

// POST /stock/add  -> productos_add_stock
StockRouter.post('/add', guard(PROTECTION.ADD), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, AddRemoveRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (add)', data:null });

    const Params = BuildParams([
      { name:'caja_id',     type: sql.Int, value: Body.caja_id },
      { name:'producto_id', type: sql.Int, value: Body.producto_id },
      { name:'delta',       type: sql.Int, value: Body.delta }
    ]);
    const data = await db.executeProc('productos_add_stock', Params);
    return sendOk(res, data[0] ?? null, 'Stock agregado');
  }catch(err){ return sendError(res, err, 'Error al agregar stock'); }
});

// POST /stock/remove  -> productos_remove_stock
StockRouter.post('/remove', guard(PROTECTION.REMOVE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, AddRemoveRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (remove)', data:null });

    const Params = BuildParams([
      { name:'caja_id',     type: sql.Int, value: Body.caja_id },
      { name:'producto_id', type: sql.Int, value: Body.producto_id },
      { name:'delta',       type: sql.Int, value: Body.delta }
    ]);
    const data = await db.executeProc('productos_remove_stock', Params);
    return sendOk(res, data[0] ?? null, 'Stock removido');
  }catch(err){ return sendError(res, err, 'Error al remover stock'); }
});

// POST /stock/move  -> productos_move_stock
StockRouter.post('/move', guard(PROTECTION.MOVE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, MoveRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (move)', data:null });

    const Params = BuildParams([
      { name:'caja_origen',  type: sql.Int, value: Body.caja_origen },
      { name:'caja_destino', type: sql.Int, value: Body.caja_destino },
      { name:'producto_id',  type: sql.Int, value: Body.producto_id },
      { name:'delta',        type: sql.Int, value: Body.delta }
    ]);
    const data = await db.executeProc('productos_move_stock', Params);
    return sendOk(res, data, 'Movimiento realizado');
  }catch(err){ return sendError(res, err, 'Error al mover stock'); }
});

// POST /stock/set_by_detalle  -> cajas_detalles_update
StockRouter.post('/set_by_detalle', guard(PROTECTION.SET_BY_DETALLE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, SetByDetalleRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (set_by_detalle)', data:null });

    const Params = BuildParams([
      { name:'detalle_id',  type: sql.Int, value: Body.detalle_id },
      { name:'caja_id',     type: sql.Int, value: Body.caja_id },
      { name:'producto_id', type: sql.Int, value: Body.producto_id },
      { name:'stock',       type: sql.Int, value: Body.stock }
    ]);
    const data = await db.executeProc('cajas_detalles_update', Params);
    return sendOk(res, data[0] ?? null, 'Detalle actualizado');
  }catch(err){ return sendError(res, err, 'Error al actualizar detalle'); }
});

// POST /stock/detalle_delete  -> cajas_detalles_delete
StockRouter.post('/detalle_delete', guard(PROTECTION.DETALLE_DELETE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, { detalle_id:{ required:true, type:'number', min:1 }});
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (detalle_delete)', data:null });

    await db.executeProc('cajas_detalles_delete', { detalle_id:{ type: sql.Int, value: Body.detalle_id }});
    return sendOk(res, [], 'Detalle eliminado');
  }catch(err){ return sendError(res, err, 'Error al eliminar detalle'); }
});

// ---------- Rutas NUEVAS (SPs que faltaban) ----------

// GET /stock/categoria/:categoria_id  -> get_stock_by_categoria_id
StockRouter.get('/categoria/:categoria_id', guard(PROTECTION.BY_CATEGORIA), async (req,res)=>{
  try{
    const Body = { categoria_id: Number(req.params.categoria_id) };
    const { isValid } = await ValidationService.validateData(Body, { categoria_id:{ required:true, type:'number', min:1 }});
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (categoria stock)', data:null });

    const data = await db.executeProc('get_stock_by_categoria_id', { categoria_id:{ type: sql.Int, value: Body.categoria_id }});
    return sendListOr404(res, data, 'Stock por categoría', 'Sin stock para la categoría');
  }catch(err){ return sendError(res, err, 'Error al obtener stock por categoría'); }
});

// GET /stock/audit/bajo  -> productos_auditar_bajo_stock
StockRouter.get('/audit/bajo', guard(PROTECTION.AUDIT_BAJO), async (_req,res)=>{
  try{
    const data = await db.executeProc('productos_auditar_bajo_stock', {});
    return sendListOr404(res, data, 'Productos con bajo stock', 'Sin alertas de stock bajo');
  }catch(err){ return sendError(res, err, 'Error al auditar bajo stock'); }
});

// GET /stock/audit/sin  -> productos_auditar_sin_stock
StockRouter.get('/audit/sin', guard(PROTECTION.AUDIT_SIN), async (_req,res)=>{
  try{
    const data = await db.executeProc('productos_auditar_sin_stock', {});
    return sendListOr404(res, data, 'Productos sin stock', 'No hay productos sin stock');
  }catch(err){ return sendError(res, err, 'Error al auditar sin stock'); }
});

// GET /stock/resumen  -> get_stock (resumen consolidado)
StockRouter.get('/resumen', guard(PROTECTION.RESUMEN), async (_req,res)=>{
  try{
    const data = await db.executeProc('get_stock', {});
    return sendListOr404(res, data, 'Resumen de stock', 'Sin datos de stock');
  }catch(err){ return sendError(res, err, 'Error al obtener resumen de stock'); }
});

// GET /stock/detalles/por_producto/:producto_id  -> cajas_detalles_get_by_producto
StockRouter.get('/detalles/por_producto/:producto_id', guard(PROTECTION.DETALLES_BY_PROD), async (req,res)=>{
  try{
    const Body = { producto_id: Number(req.params.producto_id) };
    const { isValid } = await ValidationService.validateData(Body, { producto_id:{ required:true, type:'number', min:1 }});
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (detalles por producto)', data:null });

    const data = await db.executeProc('cajas_detalles_get_by_producto', { producto_id:{ type: sql.Int, value: Body.producto_id }});
    return sendListOr404(res, data, 'Detalles por producto', 'Sin detalles para el producto');
  }catch(err){ return sendError(res, err, 'Error al obtener detalles por producto'); }
});

// POST /stock/detalle_insert  -> cajas_detalles_insert
StockRouter.post('/detalle_insert', guard(PROTECTION.DETALLE_INSERT), async (req,res)=>{
  try{
    const Body = req.body; // { caja_id, producto_id, stock }
    const { isValid } = await ValidationService.validateData(Body, {
      caja_id:{ required:true, type:'number', min:1 },
      producto_id:{ required:true, type:'number', min:1 },
      stock:{ required:true, type:'number', min:0 },
    });
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (detalle_insert)', data:null });

    const Params = BuildParams([
      { name:'caja_id',     type: sql.Int, value: Body.caja_id },
      { name:'producto_id', type: sql.Int, value: Body.producto_id },
      { name:'stock',       type: sql.Int, value: Body.stock }
    ]);
    const data = await db.executeProc('cajas_detalles_insert', Params);
    return sendOk(res, data[0] ?? null, 'Detalle creado');
  }catch(err){ return sendError(res, err, 'Error al crear detalle'); }
});

module.exports = StockRouter;
