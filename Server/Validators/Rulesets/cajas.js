// Server/Validators/Rulesets/cajas.js
const LetraRegex = /^[A-Z]{1,2}$/i; // A, B, AA...
module.exports = {
  InsertRules: {
    letra: { required: true, type: 'string', maxLength: 2, pattern: LetraRegex },
    cara:  { required: true, type: 'number', min: 1, max: 2 }, // 1=ARRIBA, 2=ABAJO
    nivel: { required: true, type: 'number', min: 1, max: 2 }
  },
  UpdateRules: {
    caja_id:{ required: true, type: 'number', min:1 },
    letra:  { required: true, type: 'string', maxLength: 2, pattern: LetraRegex },
    cara:   { required: true, type: 'number', min:1, max:2 },
    nivel:  { required: true, type: 'number', min:1, max:2 }
  },
  DeleteRules: { caja_id: { required: true, type: 'number', min:1 } },
  ByIdRules:   { caja_id: { required: true, type: 'number', min:1 } }
};
