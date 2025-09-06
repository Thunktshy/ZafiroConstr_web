// Server/routes/stock_por_Filtro.js
const express = require('express');
const { db, sql } = require('../../db/dbconnector.js');

const Router = express.Router();

// GET BY CATEGORIA PRINCIPAL
Router.get('/por_categoria_principal/:categoria_id', async (req, res) => {
  try {
    const categoria_id = Number(req.params.categoria_id);
    if (!Number.isInteger(categoria_id) || categoria_id <= 0) {
      return res.status(400).json({ success: false, message: 'categoria_id inválido' });
    }

    const data = await db.executeProc('productos_get_by_categoria_principal', {
      categoria_principal_id: { type: sql.Int, value: categoria_id }
    });
    
    return res.status(200).json({ success: true, message: 'Productos por categoría principal', data });
  } catch (err) {
    console.error('productos_get_by_categoria_principal error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener productos por categoría principal' });
  }
});

// GET BY CATEGORIA SECUNDARIA
Router.get('/por_categoria_secundaria/:categoria_id', async (req, res) => {
  try {
    const categoria_id = Number(req.params.categoria_id);
    if (!Number.isInteger(categoria_id) || categoria_id <= 0) {
      return res.status(400).json({ success: false, message: 'categoria_id inválido' });
    }

    const data = await db.executeProc('productos_get_by_categoria_secundaria', {
      categoria_secundaria_id: { type: sql.Int, value: categoria_id }
    });
    
    return res.status(200).json({ success: true, message: 'Productos por categoría secundaria', data });
  } catch (err) {
    console.error('productos_get_by_categoria_secundaria error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener productos por categoría secundaria' });
  }
});

// GET BY SUBCATEGORIA
Router.get('/por_subcategoria/:subcategoria_id', async (req, res) => {
  try {
    const subcategoria_id = Number(req.params.subcategoria_id);
    if (!Number.isInteger(subcategoria_id) || subcategoria_id <= 0) {
      return res.status(400).json({ success: false, message: 'subcategoria_id inválido' });
    }

    const data = await db.executeProc('productos_get_by_subcategoria', {
      subcategoria_id: { type: sql.Int, value: subcategoria_id }
    });
    
    return res.status(200).json({ success: true, message: 'Productos por subcategoría', data });
  } catch (err) {
    console.error('productos_get_by_subcategoria error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener productos por subcategoría' });
  }
});

// GET BY UNIT
Router.get('/por_unit/:unit_id', async (req, res) => {
  try {
    const unit_id = Number(req.params.unit_id);
    if (!Number.isInteger(unit_id) || unit_id <= 0) {
      return res.status(400).json({ success: false, message: 'unit_id inválido' });
    }

    const data = await db.executeProc('productos_get_by_unit', {
      unit_id: { type: sql.Int, value: unit_id }
    });
    
    return res.status(200).json({ success: true, message: 'Productos por unidad', data });
  } catch (err) {
    console.error('productos_get_by_unit error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener productos por unidad' });
  }
});

// GET BY SIZE
Router.get('/por_size/:size_id', async (req, res) => {
  try {
    const size_id = Number(req.params.size_id);
    if (!Number.isInteger(size_id) || size_id <= 0) {
      return res.status(400).json({ success: false, message: 'size_id inválido' });
    }

    const data = await db.executeProc('productos_get_by_size', {
      size_id: { type: sql.Int, value: size_id }
    });
    
    return res.status(200).json({ success: true, message: 'Productos por tamaño', data });
  } catch (err) {
    console.error('productos_get_by_size error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener productos por tamaño' });
  }
});

// GET BY BRAND
Router.get('/por_brand/:brand_id', async (req, res) => {
  try {
    const brand_id = Number(req.params.brand_id);
    if (!Number.isInteger(brand_id) || brand_id <= 0) {
      return res.status(400).json({ success: false, message: 'brand_id inválido' });
    }

    const data = await db.executeProc('productos_get_by_brand', {
      brand_id: { type: sql.Int, value: brand_id }
    });
    
    return res.status(200).json({ success: true, message: 'Productos por marca', data });
  } catch (err) {
    console.error('productos_get_by_brand error:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener productos por marca' });
  }
});

module.exports = Router;