// Server/Validators/Rulesets/subcategorias.js

function isPositiveInt(n) { return Number.isInteger(Number(n)) && Number(n) > 0; }

const nombreRule = {
  required: true,
  type: 'string',
  trim: true,
  minLength: 1,
  maxLength: 100,
  messages: {
    required: 'nombre es requerido',
    maxLength: 'nombre no puede exceder 100 caracteres'
  }
};

const idRule = {
  required: true,
  custom: v => (isPositiveInt(v) ? true : 'subcategoria_id debe ser entero positivo')
};

module.exports = {
  InsertRules: { nombre: nombreRule },
  UpdateRules: {
    subcategoria_id: idRule,
    nombre: nombreRule
  },
  DeleteRules: { subcategoria_id: idRule },
  PorIdRules:  { subcategoria_id: idRule }
};
