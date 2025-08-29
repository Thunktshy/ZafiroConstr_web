'use strict';

/**
 * IMPORTS (con comentarios de referencia)
 */
const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');           // pool MSSQL + tipos
const ValidationService = require('../Validators/validatorService.js'); // validateData(payload, rules)
const { requireAdmin, requireAuth, requireUser } = require('../Routes/authRouter.js'); // middlewares
const {
  InsertRules, UpdateRules, SoftDeleteRules, SetPrecioRules,
  ByIdRules, ByCategoriaRules
} = require('../Validators/Rulesets/productos.js');

const ProductosRouter = express.Router();

/**
 * PROTECCIÓN EXPLÍCITA POR ENDPOINT
 * - Consultas -> requireAuth
 * - Mutaciones -> requireAdmin
 */
const PROTECTION = {
  LIST:           'auth',  // GET /list
  GET_BY_ID:      'auth',  // GET /por_id/:producto_id
  BY_CATEGORY:    'auth',  // GET /por_categoria/:categoria_id
  // NUEVOS:
  LIST_ALL:       'auth',  // GET /all
  LIST_ALL_ACTIVE:'auth',  // GET /all_active
  BY_CAJA:        'auth',  // GET /por_caja/:caja_id
  DETALLE_FULL:   'auth',  // GET /detalle_completo/:producto_id
  SEARCH_NAME:    'auth',  // GET /search/name?q=
  SEARCH_PRICE:   'auth',  // GET /search/price?min=&max=
  // Mutaciones existentes
  INSERT:         'admin', // POST /insert
  UPDATE:         'admin', // POST /update
  SOFT_DELETE:    'admin', // POST /soft_delete
  SET_PRECIO:     'admin'  // POST /set_precio
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
    // PRODUCTOS (52012–52020, 52031)
    52031:{code:400,message:'El nombre del producto es obligatorio.'},
    52012:{code:400,message:'Precio inválido.'},
    52013:{code:404,message:'Categoría no existe.'},
    52014:{code:404,message:'Producto no encontrado.'},
    52015:{code:400,message:'El nombre del producto es obligatorio.'},
    52016:{code:400,message:'Precio inválido.'},
    52017:{code:404,message:'Categoría no existe.'},
    52018:{code:409,message:'Ya existe otro producto con ese nombre.'},
    52019:{code:400,message:'Precio inválido.'},
    52020:{code:404,message:'Producto no encontrado.'},
  };
  return map[e.number] || null;
}

/** Respuestas */
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

// ---------- Rutas existentes ----------

// GET /productos/list
ProductosRouter.get('/list', guard(PROTECTION.LIST), async (_req,res)=>{
  try{
    const data = await db.executeProc('productos_get_list', {});
    return sendListOr404(res, data, 'Productos listados', 'No hay productos');
  }catch(err){ return sendError(res, err, 'Error al listar productos'); }
});

// GET /productos/por_id/:producto_id
ProductosRouter.get('/por_id/:producto_id', guard(PROTECTION.GET_BY_ID), async (req,res)=>{
  try{
    const Body = { producto_id: Number(req.params.producto_id) };
    const { isValid } = await ValidationService.validateData(Body, ByIdRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_id)', data:null });

    const data = await db.executeProc('productos_get_by_id', { producto_id:{ type: sql.Int, value: Body.producto_id }});
    if(!data.length) return res.status(404).json({ success:false, message:'Producto no encontrado', data: [] });
    return sendOk(res, data[0], 'Producto obtenido');
  }catch(err){ return sendError(res, err, 'Error al obtener producto'); }
});

// GET /productos/por_categoria/:categoria_id
ProductosRouter.get('/por_categoria/:categoria_id', guard(PROTECTION.BY_CATEGORY), async (req,res)=>{
  try{
    const Body = { categoria_id: Number(req.params.categoria_id) };
    const { isValid } = await ValidationService.validateData(Body, ByCategoriaRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_categoria)', data:null });

    const data = await db.executeProc('productos_get_list_by_category_id', { categoria_id:{ type: sql.Int, value: Body.categoria_id }});
    return sendListOr404(res, data, 'Productos listados', 'No hay productos para la categoría');
  }catch(err){ return sendError(res, err, 'Error al listar por categoría'); }
});

// POST /productos/insert
ProductosRouter.post('/insert', guard(PROTECTION.INSERT), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, InsertRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (insert)', data:null });

    const Params = BuildParams([
      { name:'nombre',       type: sql.NVarChar(100), value: Body.nombre },
      { name:'descripcion',  type: sql.NVarChar(255), value: Body.descripcion ?? null },
      { name:'precio',       type: sql.Decimal(10,2), value: Body.precio },
      { name:'categoria_id', type: sql.Int,           value: Body.categoria_id }
    ]);
    const data = await db.executeProc('productos_insert', Params);
    return sendCreated(res, data[0] ?? null, 'Producto creado');
  }catch(err){ return sendError(res, err, 'Error al crear producto'); }
});

// POST /productos/update
ProductosRouter.post('/update', guard(PROTECTION.UPDATE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, UpdateRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (update)', data:null });

    const Params = BuildParams([
      { name:'producto_id',  type: sql.Int,           value: Body.producto_id },
      { name:'nombre',       type: sql.NVarChar(100), value: Body.nombre },
      { name:'descripcion',  type: sql.NVarChar(255), value: Body.descripcion ?? null },
      { name:'precio',       type: sql.Decimal(10,2), value: Body.precio },
      { name:'categoria_id', type: sql.Int,           value: Body.categoria_id }
    ]);
    const data = await db.executeProc('productos_update', Params);
    if(!data.length) return res.status(404).json({ success:false, message:'Producto no encontrado', data: [] });
    return sendOk(res, data[0], 'Producto actualizado');
  }catch(err){ return sendError(res, err, 'Error al actualizar producto'); }
});

// POST /productos/soft_delete
ProductosRouter.post('/soft_delete', guard(PROTECTION.SOFT_DELETE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, SoftDeleteRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (soft_delete)', data:null });

    await db.executeProc('productos_soft_delete', { producto_id:{ type: sql.Int, value: Body.producto_id }});
    return sendOk(res, [], 'Producto desactivado');
  }catch(err){ return sendError(res, err, 'Error al desactivar producto'); }
});

// POST /productos/set_precio
ProductosRouter.post('/set_precio', guard(PROTECTION.SET_PRECIO), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, SetPrecioRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (set_precio)', data:null });

    const Params = BuildParams([
      { name:'producto_id', type: sql.Int,           value: Body.producto_id },
      { name:'precio',      type: sql.Decimal(10,2), value: Body.precio }
    ]);
    const data = await db.executeProc('productos_set_precio', Params);
    return sendOk(res, data ?? [], 'Precio actualizado');
  }catch(err){ return sendError(res, err, 'Error al actualizar precio'); }
});

// ---------- Rutas NUEVAS (SPs que faltaban) ----------

// GET /productos/all  -> productos_get_all
ProductosRouter.get('/all', guard(PROTECTION.LIST_ALL), async (_req,res)=>{
  try{
    const data = await db.executeProc('productos_get_all', {});
    return sendListOr404(res, data, 'Productos (todas las columnas)', 'Sin productos');
  }catch(err){ return sendError(res, err, 'Error al listar todos los productos'); }
});

// GET /productos/all_active  -> productos_get_all_active
ProductosRouter.get('/all_active', guard(PROTECTION.LIST_ALL_ACTIVE), async (_req,res)=>{
  try{
    const data = await db.executeProc('productos_get_all_active', {});
    return sendListOr404(res, data, 'Productos activos', 'Sin productos activos');
  }catch(err){ return sendError(res, err, 'Error al listar productos activos'); }
});

// GET /productos/por_caja/:caja_id  -> productos_get_by_caja_id
ProductosRouter.get('/por_caja/:caja_id', guard(PROTECTION.BY_CAJA), async (req,res)=>{
  try{
    const Body = { caja_id: Number(req.params.caja_id) };
    const { isValid } = await ValidationService.validateData(Body, { caja_id:{ required:true, type:'number', min:1 }});
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_caja)', data:null });

    const data = await db.executeProc('productos_get_by_caja_id', { caja_id:{ type: sql.Int, value: Body.caja_id }});
    return sendListOr404(res, data, 'Productos por caja', 'No hay productos en la caja');
  }catch(err){ return sendError(res, err, 'Error al listar por caja'); }
});

// GET /productos/detalle_completo/:producto_id  -> productos_get_detalle_completo
ProductosRouter.get('/detalle_completo/:producto_id', guard(PROTECTION.DETALLE_FULL), async (req,res)=>{
  try{
    const Body = { producto_id: Number(req.params.producto_id) };
    const { isValid } = await ValidationService.validateData(Body, ByIdRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (detalle_completo)', data:null });

    const data = await db.executeProc('productos_get_detalle_completo', { producto_id:{ type: sql.Int, value: Body.producto_id }});
    if(!data.length) return res.status(404).json({ success:false, message:'Producto no encontrado', data: [] });
    return sendOk(res, data[0], 'Detalle completo del producto');
  }catch(err){ return sendError(res, err, 'Error al obtener detalle completo'); }
});

// GET /productos/search/name?q=  -> productos_search_by_name
ProductosRouter.get('/search/name', guard(PROTECTION.SEARCH_NAME), async (req,res)=>{
  try{
    const q = (req.query.q ?? '').toString().trim();
    const { isValid } = await ValidationService.validateData({ q }, { q:{ required:true, type:'string', minLength:2 }});
    if(!isValid) return res.status(400).json({ success:false, message:'Parámetro q requerido (mín 2 caracteres)', data:null });

    const data = await db.executeProc('productos_search_by_name', { q:{ type: sql.NVarChar(100), value: q }});
    return sendListOr404(res, data, 'Búsqueda por nombre', 'Sin coincidencias');
  }catch(err){ return sendError(res, err, 'Error en búsqueda por nombre'); }
});

// GET /productos/search/price?min=&max=  -> productos_search_by_price_range
ProductosRouter.get('/search/price', guard(PROTECTION.SEARCH_PRICE), async (req,res)=>{
  try{
    const min = req.query.min !== undefined ? Number(req.query.min) : null;
    const max = req.query.max !== undefined ? Number(req.query.max) : null;

    const { isValid } = await ValidationService.validateData({ min, max }, {
      min:{ required:false, type:'number', min:0 },
      max:{ required:false, type:'number', min:0 }
    });
    if(!isValid) return res.status(400).json({ success:false, message:'Parámetros inválidos (price)', data:null });
    if(min===null && max===null) return res.status(400).json({ success:false, message:'Debes enviar min y/o max', data:null });
    if(min!==null && max!==null && min>max) return res.status(400).json({ success:false, message:'min no puede ser mayor que max', data:null });

    const params = {};
    if(min!==null) params.min = { type: sql.Decimal(10,2), value: min };
    if(max!==null) params.max = { type: sql.Decimal(10,2), value: max };

    const data = await db.executeProc('productos_search_by_price_range', params);
    return sendListOr404(res, data, 'Búsqueda por precio', 'Sin coincidencias');
  }catch(err){ return sendError(res, err, 'Error en búsqueda por precio'); }
});

module.exports = ProductosRouter;
