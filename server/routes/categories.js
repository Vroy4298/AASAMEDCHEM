/**
 * routes/categories.js
 *
 * GET  /api/categories        — List all categories (both roles)
 * POST /api/categories        — Create category (admin only)
 * DELETE /api/categories/:id  — Delete category (admin only)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET all categories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create category (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Category already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE category (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
