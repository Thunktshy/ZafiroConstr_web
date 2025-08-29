'use strict';

/**
 * IMPORTS
 */
const express = require('express');
const bcrypt = require('bcrypt');
const { db, sql } = require('../../db/dbconnector.js');                 // pool MSSQL + tipos
const ValidationService = require('../Validators/validatorService.js'); // validateData(payload, rules)
const { requireAdmin, requireAuth, requireUser } = require('../Routes/authRouter.js'); // middlewares

const UsuariosRouter = express.Router();

/**
 * PROTECCIÓN POR ENDPOINT
 * - Consultas -> requireAuth
 * - Mutaciones -> requireAdmin
 */
const PROTECTION = {
  GET_BY_ID:   'auth',   // GET /por_id/:usuario_id
  GET_BY_MAIL: 'admin',  // GET /por_email/:email   (evita fugas)
  INSERT:      'admin',  // POST /insert
  UPDATE:      'admin',  // POST /update
  SET_TIPO:    'admin',  // POST /set_tipo
  SET_ADMIN:   'admin',  // POST /set_admin
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

// ---------- Helpers ----------
function BuildParams(entries){ const p={}; for(const e of entries){ p[e.name]={type:e.type,value:e.value}; } return p; }

/** Mapa de errores SQL -> HTTP (560xx de tus SP de usuarios) */
function mapSqlError(err){
  const e = err && (typeof err.number === 'number' ? err : err.originalError);
  if(!e || typeof e.number !== 'number') return null;
  const map = {
    56001:{code:400,message:'Formato de email inválido.'},
    56002:{code:409,message:'El nombre de usuario ya existe.'},
    56003:{code:409,message:'El email ya está registrado.'},
    56004:{code:404,message:'usuario_id no existe.'},
    56005:{code:409,message:'El nombre ya está en uso por otro usuario.'},
    56006:{code:409,message:'El email ya está en uso por otro usuario.'},
    56012:{code:400,message:'Tipo inválido. Use "Usuario" o "Admin".'},
    56013:{code:404,message:'usuario_id no existe.'},
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

// ---------- Validaciones rápidas (usando tu ValidationService) ----------
const InsertRules = {
  nombre:      { required:true,  type:'string', minLength:1, maxLength:100 },
  contrasena:  { required:true,  type:'string', minLength:6, maxLength:255 },
  email:       { required:true,  type:'string', minLength:3, maxLength:150 },
  tipo:        { required:false, type:'string', minLength:5, maxLength:10 }, // 'Usuario' | 'Admin'
};
const UpdateRules = {
  usuario_id:  { required:true,  type:'number', min:1 },
  nombre:      { required:true,  type:'string', minLength:1, maxLength:100 },
  email:       { required:true,  type:'string', minLength:3, maxLength:150 },
  tipo:        { required:false, type:'string', minLength:5, maxLength:10 },
};
const SetTipoRules = {
  usuario_id:  { required:true,  type:'number', min:1 },
  tipo:        { required:true,  type:'string',  enum:['Usuario','Admin'] }
};
const ByIdRules = { usuario_id:{ required:true, type:'number', min:1 } };

// ---------- Rutas ----------

// GET /usuarios/por_id/:usuario_id (omite hash de contraseña en respuesta)
UsuariosRouter.get('/por_id/:usuario_id', guard(PROTECTION.GET_BY_ID), async (req,res)=>{
  try{
    const Body = { usuario_id: Number(req.params.usuario_id) };
    const { isValid } = await ValidationService.validateData(Body, ByIdRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_id)', data:null });

    const data = await db.executeProc('usuario_por_id', { usuario_id:{ type: sql.Int, value: Body.usuario_id }});
    if(!data.length) return res.status(404).json({ success:false, message:'Usuario no encontrado', data:[] });

    const row = { ...data[0] };
    if ('contrasena' in row) delete row.contrasena; // higiene
    return sendOk(res, row, 'Usuario obtenido');
  }catch(err){ return sendError(res, err, 'Error al obtener usuario'); }
});

// GET /usuarios/por_email/:email   (solo admin)
UsuariosRouter.get('/por_email/:email', guard(PROTECTION.GET_BY_MAIL), async (req,res)=>{
  try{
    const email = decodeURIComponent(String(req.params.email||'')).trim();
    const { isValid } = await ValidationService.validateData({ email }, { email:{ required:true, type:'string', minLength:3, maxLength:150 }});
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (por_email)', data:null });

    const data = await db.executeProc('usuario_por_email', { email:{ type: sql.NVarChar(150), value: email }});
    if(!data.length) return res.status(404).json({ success:false, message:'Usuario no encontrado', data:[] });
    return sendOk(res, data[0], 'Usuario obtenido');
  }catch(err){ return sendError(res, err, 'Error al obtener usuario por email'); }
});

// POST /usuarios/insert  (hash de contraseña antes de guardar)
UsuariosRouter.post('/insert', guard(PROTECTION.INSERT), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, InsertRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (insert)', data:null });

    const hash = await bcrypt.hash(Body.contrasena, Number(process.env.BCRYPT_ROUNDS||10));

    const Params = BuildParams([
      { name:'nombre',     type: sql.NVarChar(100), value: Body.nombre },
      { name:'contrasena', type: sql.NVarChar(255), value: hash },
      { name:'email',      type: sql.NVarChar(150), value: Body.email },
      { name:'tipo',       type: sql.NVarChar(10),  value: Body.tipo ?? null }
    ]);

    const data = await db.executeProc('usuarios_insert', Params);
    return sendCreated(res, data[0] ?? null, 'Usuario creado');
  }catch(err){ return sendError(res, err, 'Error al crear usuario'); }
});

// POST /usuarios/update
UsuariosRouter.post('/update', guard(PROTECTION.UPDATE), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, UpdateRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (update)', data:null });

    const Params = BuildParams([
      { name:'usuario_id', type: sql.Int,           value: Body.usuario_id },
      { name:'nombre',     type: sql.NVarChar(100), value: Body.nombre },
      { name:'email',      type: sql.NVarChar(150), value: Body.email },
      { name:'tipo',       type: sql.NVarChar(10),  value: Body.tipo ?? null }
    ]);

    const data = await db.executeProc('usuarios_update', Params);
    if(!data.length) return res.status(404).json({ success:false, message:'Usuario no encontrado', data:[] });
    return sendOk(res, data[0], 'Usuario actualizado');
  }catch(err){ return sendError(res, err, 'Error al actualizar usuario'); }
});

// POST /usuarios/set_tipo
UsuariosRouter.post('/set_tipo', guard(PROTECTION.SET_TIPO), async (req,res)=>{
  try{
    const Body = req.body;
    const { isValid } = await ValidationService.validateData(Body, SetTipoRules);
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (set_tipo)', data:null });

    const Params = BuildParams([
      { name:'usuario_id', type: sql.Int,          value: Body.usuario_id },
      { name:'tipo',       type: sql.NVarChar(10), value: Body.tipo }
    ]);

    const data = await db.executeProc('usuarios_set_tipo', Params);
    if(!data.length) return res.status(404).json({ success:false, message:'Usuario no encontrado', data:[] });
    return sendOk(res, data[0], 'Rol actualizado');
  }catch(err){ return sendError(res, err, 'Error al actualizar rol'); }
});

// POST /usuarios/set_admin
UsuariosRouter.post('/set_admin', guard(PROTECTION.SET_ADMIN), async (req,res)=>{
  try{
    const Body = req.body; // { usuario_id }
    const { isValid } = await ValidationService.validateData(Body, { usuario_id:{ required:true, type:'number', min:1 }});
    if(!isValid) return res.status(400).json({ success:false, message:'Datos inválidos (set_admin)', data:null });

    const data = await db.executeProc('usuarios_set_admin', { usuario_id:{ type: sql.Int, value: Body.usuario_id }});
    if(!data.length) return res.status(404).json({ success:false, message:'Usuario no encontrado', data:[] });
    return sendOk(res, data[0], 'Usuario promovido a Admin');
  }catch(err){ return sendError(res, err, 'Error al promover a Admin'); }
});

module.exports = UsuariosRouter;
