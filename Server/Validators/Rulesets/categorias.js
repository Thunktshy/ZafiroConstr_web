// Server/Validators/Rulesets/categorias.js
// Reglas para ValidationService (tipos, longitudes, etc.)

function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

module.exports = {
  // insert: @nombre NVARCHAR(100) requerido, @descripcion NVARCHAR(255) opcional
  InsertRules: {
    nombre: {
      required: true,
      type: 'string',
      trim: true,
      minLength: 1,
      maxLength: 100,
      messages: {
        required: 'nombre es requerido',
        type: 'nombre debe ser texto',
        maxLength: 'nombre no puede exceder 100 caracteres'
      }
    },
    descripcion: {
      required: false,
      type: 'string',
      trim: true,
      maxLength: 255,
      messages: {
        type: 'descripcion debe ser texto',
        maxLength: 'descripcion no puede exceder 255 caracteres'
      }
    }
  },

  // update: @categoria_id INT requerido + campos de insert
  UpdateRules: {
    categoria_id: {
      required: true,
      custom: v => (isPositiveInt(Number(v)) ? true : 'categoria_id debe ser entero positivo')
    },
    nombre: {
      required: true,
      type: 'string',
      trim: true,
      minLength: 1,
      maxLength: 100
    },
    descripcion: {
      required: false,
      type: 'string',
      trim: true,
      maxLength: 255
    }
  },

  // delete: @categoria_id INT requerido
  DeleteRules: {
    categoria_id: {
      required: true,
      custom: v => (isPositiveInt(Number(v)) ? true : 'categoria_id debe ser entero positivo')
    }
  },

  // por_id (GET param)
  PorIdRules: {
    categoria_id: {
      required: true,
      custom: v => (isPositiveInt(Number(v)) ? true : 'categoria_id debe ser entero positivo')
    }
  }
};
