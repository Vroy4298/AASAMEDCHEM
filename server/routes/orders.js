/**
 * routes/orders.js
 *
 * POST /api/orders                     — Place order (seller)
 * GET  /api/orders                     — List orders (admin: all; seller: own)
 * GET  /api/orders/:id                 — Order detail with items
 * PUT  /api/orders/:id/status          — Update status (admin)
 *
 * UNIT CONVERSION & STOCK LOGIC:
 *   1. Seller submits items with { product_id, ordered_qty, ordered_unit }
 *   2. Server converts ordered_qty → base_qty (using shared units.js)
 *   3. base_qty is deducted from products.stock_qty immediately
 *   4. If admin REJECTs the order → stock is RESTORED
 *   5. total_price = base_qty * unit_price (snapshot of base_price at order time)
 *
 * WHY snapshot unit_price?
 *   If the admin changes the price later, existing orders must not be affected.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { toBaseUnit, getBaseUnit, areCompatible, calculatePrice } = require('../utils/units');

// ---------------------------------------------------------------------------
// POST /api/orders — Place a new order (seller)
// Body: { notes?: string, items: [{ product_id, ordered_qty, ordered_unit }] }
// ---------------------------------------------------------------------------
router.post('/', authMiddleware, requireRole('seller'), async (req, res) => {
  const { notes, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  // Use a database transaction so stock deductions and order creation are atomic
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create the order record
    const orderResult = await client.query(
      `INSERT INTO orders (seller_id, notes) VALUES ($1, $2) RETURNING id`,
      [req.user.userId, notes || null]
    );
    const orderId = orderResult.rows[0].id;

    // 2. Process each item
    for (const item of items) {
      const { product_id, ordered_qty, ordered_unit } = item;

      if (!product_id || !ordered_qty || !ordered_unit) {
        throw new Error('Each item needs product_id, ordered_qty, ordered_unit');
      }

      if (Number(ordered_qty) <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Fetch product (with lock to prevent race conditions on stock)
      const productResult = await client.query(
        'SELECT id, name, base_unit, base_price, stock_qty FROM products WHERE id = $1 AND is_active = true FOR UPDATE',
        [product_id]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`Product ${product_id} not found or inactive`);
      }

      const product = productResult.rows[0];

      // Validate unit compatibility (e.g., can't order kg if product is in mL)
      if (!areCompatible(ordered_unit, product.base_unit)) {
        throw new Error(
          `Unit mismatch for "${product.name}": cannot order in ${ordered_unit} (product stored in ${product.base_unit})`
        );
      }

      // Convert ordered quantity to base unit
      const { baseQty, totalPrice } = calculatePrice(
        Number(ordered_qty),
        ordered_unit,
        Number(product.base_price)
      );

      const base_unit = getBaseUnit(ordered_unit);

      // Check sufficient stock
      if (Number(product.stock_qty) < baseQty) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stock_qty} ${product.base_unit}`
        );
      }

      // Deduct stock immediately
      await client.query(
        `UPDATE products SET stock_qty = stock_qty - $1, updated_at = NOW() WHERE id = $2`,
        [baseQty, product_id]
      );

      // Insert order item
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name, ordered_unit, ordered_qty, base_unit, base_qty, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderId,
          product_id,
          product.name,
          ordered_unit,
          Number(ordered_qty),
          base_unit,
          baseQty,
          Number(product.base_price),
          totalPrice,
        ]
      );
    }

    await client.query('COMMIT');

    // Return the created order with items
    const fullOrder = await getOrderWithItems(orderId);
    res.status(201).json(fullOrder);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// GET /api/orders — List orders
// ---------------------------------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT o.*, u.name AS seller_name, u.email AS seller_email,
               COUNT(oi.id) AS item_count,
               SUM(oi.total_price) AS grand_total
        FROM orders o
        JOIN users u ON o.seller_id = u.id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id, u.name, u.email
        ORDER BY o.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT o.*,
               COUNT(oi.id) AS item_count,
               SUM(oi.total_price) AS grand_total
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.seller_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;
      params = [req.user.userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/orders/:id — Order detail with items
// ---------------------------------------------------------------------------
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await getOrderWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Sellers can only see their own orders
    if (req.user.role === 'seller' && order.seller_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/orders/:id/status — Update status (admin only)
// Body: { status: 'confirmed' | 'rejected' | 'fulfilled' }
// ---------------------------------------------------------------------------
router.put('/:id/status', authMiddleware, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  const VALID_TRANSITIONS = ['confirmed', 'rejected', 'fulfilled'];

  if (!VALID_TRANSITIONS.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_TRANSITIONS.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }

    const currentStatus = orderResult.rows[0].status;

    // If rejecting a previously pending/confirmed order → restore stock
    if (status === 'rejected' && (currentStatus === 'pending' || currentStatus === 'confirmed')) {
      const items = await client.query(
        'SELECT product_id, base_qty FROM order_items WHERE order_id = $1',
        [req.params.id]
      );

      for (const item of items.rows) {
        await client.query(
          'UPDATE products SET stock_qty = stock_qty + $1, updated_at = NOW() WHERE id = $2',
          [item.base_qty, item.product_id]
        );
      }
    }

    const result = await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Status update error:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// Helper: fetch order + items in one response
// ---------------------------------------------------------------------------
async function getOrderWithItems(orderId) {
  const orderResult = await pool.query(
    `SELECT o.*, u.name AS seller_name, u.email AS seller_email
     FROM orders o
     JOIN users u ON o.seller_id = u.id
     WHERE o.id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) return null;

  const itemsResult = await pool.query(
    `SELECT oi.*, p.sku
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1
     ORDER BY oi.created_at ASC`,
    [orderId]
  );

  return {
    ...orderResult.rows[0],
    items: itemsResult.rows,
    grand_total: itemsResult.rows.reduce((sum, i) => sum + Number(i.total_price), 0),
  };
}

module.exports = router;
