/**
 * routes/products.js
 *
 * GET    /api/products          — List products (sellers: active only; admin: all)
 * GET    /api/products/:id      — Get single product
 * POST   /api/products          — Create product (admin)
 * PUT    /api/products/:id      — Update product (admin)
 * DELETE /api/products/:id      — Soft-delete / deactivate (admin)
 * GET    /api/inventory         — Stock view (admin)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ALL_UNITS } = require('../utils/units');

// ---------------------------------------------------------------------------
// GET /api/products
// Query params: search, category_id
// ---------------------------------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
  const { search, category_id } = req.query;
  const isAdmin = req.user.role === 'admin';

  let query = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  // Sellers only see active products
  if (!isAdmin) {
    query += ` AND p.is_active = true`;
  }

  if (search) {
    query += ` AND (p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  if (category_id) {
    query += ` AND p.category_id = $${idx}`;
    params.push(category_id);
    idx++;
  }

  query += ` ORDER BY p.name ASC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/products/:id
// ---------------------------------------------------------------------------
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/products (admin only)
// ---------------------------------------------------------------------------
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, sku, description, category_id, base_unit, base_price, stock_qty } = req.body;

  if (!name || !sku || !base_unit || base_price === undefined) {
    return res.status(400).json({ error: 'name, sku, base_unit, base_price are required' });
  }

  if (!ALL_UNITS.includes(base_unit)) {
    return res.status(400).json({ error: `base_unit must be one of: ${ALL_UNITS.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, sku, description, category_id, base_unit, base_price, stock_qty)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, sku, description || null, category_id || null, base_unit, base_price, stock_qty || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/products/:id (admin only)
// ---------------------------------------------------------------------------
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, sku, description, category_id, base_unit, base_price, stock_qty, is_active } = req.body;

  if (base_unit && !ALL_UNITS.includes(base_unit)) {
    return res.status(400).json({ error: `base_unit must be one of: ${ALL_UNITS.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE products
       SET name        = COALESCE($1, name),
           sku         = COALESCE($2, sku),
           description = COALESCE($3, description),
           category_id = COALESCE($4, category_id),
           base_unit   = COALESCE($5, base_unit),
           base_price  = COALESCE($6, base_price),
           stock_qty   = COALESCE($7, stock_qty),
           is_active   = COALESCE($8, is_active),
           updated_at  = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, sku, description, category_id, base_unit, base_price, stock_qty, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/products/:id (admin only) — soft delete (deactivate)
// ---------------------------------------------------------------------------
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/inventory (admin only) — stock levels
// ---------------------------------------------------------------------------
router.get('/admin/inventory', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.sku, p.base_unit, p.stock_qty, p.is_active, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
