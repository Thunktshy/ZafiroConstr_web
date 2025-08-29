// Server/Validators/Rulesets/categorias.js
module.exports = {
  InsertRules: {
    nombre: { required: true, type: 'string', maxLength: 100, trim: true },
    descripcion: { required: false, type: 'string', maxLength: 255 }
  },
  UpdateRules: {
    categoria_id:{ required: true, type:'number', min:1 },
    nombre: { required: true, type:'string', maxLength:100, trim:true },
    descripcion: { required: false, type:'string', maxLength:255 }
  },
  DeleteRules: { categoria_id:{ required:true, type:'number', min:1 } },
  ByIdRules:   { categoria_id:{ required:true, type:'number', min:1 } }
};
