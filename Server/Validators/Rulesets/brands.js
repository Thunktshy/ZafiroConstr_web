// Server/Validators/Rulesets/brands.js

function isPositiveInt(v) { return Number.isInteger(Number(v)) && Number(v) > 0; }

const nombreRule = {
  required: true,
  type: 'string',
  trim: true,
  minLength: 1,
  maxLength: 50,
  messages: {
    required: 'nombre es requerido',
    maxLength: 'nombre no puede exceder 50 caracteres'
  }
};

const idRule = {
  required: true,
  custom: v => (isPositiveInt(v) ? true : 'brand_id debe ser entero positivo')
};

module.exports = {
  InsertRules: { nombre: nombreRule },
  UpdateRules: { brand_id: idRule, nombre: nombreRule },
  DeleteRules: { brand_id: idRule },
  PorIdRules:  { brand_id: idRule }
};
