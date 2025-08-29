// Server/Validators/Rulesets/productos.js
module.exports = {
  InsertRules: {
    nombre: { required:true, type:'string', maxLength:100, trim:true },
    descripcion: { required:false, type:'string', maxLength:255 },
    precio: { required:true, type:'number', min:0 },
    categoria_id: { required:true, type:'number', min:1 }
  },
  UpdateRules: {
    producto_id: { required:true, type:'number', min:1 },
    nombre: { required:true, type:'string', maxLength:100, trim:true },
    descripcion: { required:false, type:'string', maxLength:255 },
    precio: { required:true, type:'number', min:0 },
    categoria_id: { required:true, type:'number', min:1 }
  },
  SoftDeleteRules: { producto_id:{ required:true, type:'number', min:1 } },
  SetPrecioRules: { producto_id:{ required:true, type:'number', min:1 }, precio:{ required:true, type:'number', min:0 } },
  ByIdRules: { producto_id:{ required:true, type:'number', min:1 } },
  ByCategoriaRules: { categoria_id:{ required:true, type:'number', min:1 } }
};
