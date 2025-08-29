// Server/Validators/Rulesets/stock.js
module.exports = {
  GetByProductoRules: { producto_id:{ required:true, type:'number', min:1 } },
  AddRemoveRules: {
    caja_id:{ required:true, type:'number', min:1 },
    producto_id:{ required:true, type:'number', min:1 },
    delta:{ required:true, type:'number', min:1 }
  },
  MoveRules: {
    caja_origen:{ required:true, type:'number', min:1 },
    caja_destino:{ required:true, type:'number', min:1 },
    producto_id:{ required:true, type:'number', min:1 },
    delta:{ required:true, type:'number', min:1 }
  },
  SetByDetalleRules: {
    detalle_id:{ required:true, type:'number', min:1 },
    caja_id:{ required:true, type:'number', min:1 },
    producto_id:{ required:true, type:'number', min:1 },
    stock:{ required:true, type:'number', min:0 }
  },
  DetalleByIdRules: { detalle_id:{ required:true, type:'number', min:1 } }
};
