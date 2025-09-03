// Server/Validators/Rulesets/cajas.js
// Reglas de validación para "cajas"

const isInt = (v) => Number.isInteger(Number(v));

const letraRule = {
  required: true,
  type: 'string',
  trim: true,
  minLength: 1,
  maxLength: 2,
  pattern: /^[A-Za-z]{1,2}$/, // solo 1-2 letras
  messages: {
    required: 'letra es requerida',
    maxLength: 'letra debe tener máximo 2 caracteres',
    pattern: 'letra debe ser 1-2 letras (A-Z)'
  }
};

const caraRule = {
  required: true,
  type: 'number',
  min: 1,
  max: 2,              // Cara usualmente 1 ó 2
  custom: (v) => isInt(v) || 'cara debe ser entero'
};

const nivelRule = {
  required: true,
  type: 'number',
  min: 1,
  max: 99,             // ajusta si tu rack tiene más niveles
  custom: (v) => isInt(v) || 'nivel debe ser entero'
};

const idRule = {
  required: true,
  type: 'number',
  min: 1,
  custom: (v) => isInt(v) || 'caja_id debe ser entero'
};

const InsertRules = {
  letra: letraRule,
  cara:  caraRule,
  nivel: nivelRule
};

const UpdateRules = {
  caja_id: idRule,
  letra:   letraRule,
  cara:    caraRule,
  nivel:   nivelRule
};

const DeleteRules = {
  caja_id: idRule
};

const PorIdRules = {
  caja_id: idRule
};

module.exports = {
  InsertRules,
  UpdateRules,
  DeleteRules,
  PorIdRules
};
