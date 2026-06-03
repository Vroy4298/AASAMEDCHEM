-- ============================================================
-- AasaMedChem — Database Schema
-- PostgreSQL (Neon)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                          -- bcrypt hash, never stored in plain text
  role          TEXT NOT NULL CHECK (role IN ('admin', 'seller')),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: products
-- ============================================================
-- DESIGN NOTES:
--   base_unit  : the canonical unit in which ALL quantities are stored for this product.
--                Choices: 'g' (weight), 'mL' (volume), 'item' (count)
--   base_price : price per ONE base_unit in INR.
--                Type NUMERIC(15,4): exact decimal, no float rounding errors.
--                Up to ₹99,999,999,999.9999 per unit.
--   stock_qty  : current stock expressed in base_unit.
--                Type NUMERIC(20,6): 6 decimal places for sub-unit precision.
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  sku           TEXT UNIQUE NOT NULL,
  description   TEXT,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  base_unit     TEXT NOT NULL CHECK (base_unit IN ('g', 'kg', 'mL', 'L', 'item')),
  base_price    NUMERIC(15, 4) NOT NULL CHECK (base_price >= 0),
  stock_qty     NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: orders
-- ============================================================
-- status flow:
--   pending   → seller placed, stock deducted immediately
--   confirmed → admin reviewed and approved
--   rejected  → admin rejected, stock is RESTORED
--   fulfilled → physical delivery confirmed by admin
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'rejected', 'fulfilled')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: order_items
-- ============================================================
-- DESIGN NOTES:
--   ordered_unit / ordered_qty  : what the seller entered (preserved for display & audit)
--   base_unit  / base_qty       : converted to base_unit (used for all math)
--   unit_price                  : snapshot of base_price at time of order (historical accuracy)
--   total_price                 : base_qty * unit_price (pre-calculated, stored for audit)
--
--   Storing both input and converted values means:
--   - Admins see exactly what was requested ("2.5 kg")
--   - All price math uses only base units — no ambiguity
--   - If product price changes later, the order price is unaffected
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  product_name  TEXT NOT NULL,                 -- snapshot at time of order

  -- What the seller entered
  ordered_unit  TEXT NOT NULL,
  ordered_qty   NUMERIC(20, 6) NOT NULL CHECK (ordered_qty > 0),

  -- Converted to base unit (used for stock and price calculation)
  base_unit     TEXT NOT NULL,
  base_qty      NUMERIC(20, 6) NOT NULL CHECK (base_qty > 0),

  -- Price snapshot
  unit_price    NUMERIC(15, 4) NOT NULL,       -- price per 1 base_unit at time of order
  total_price   NUMERIC(15, 4) NOT NULL,       -- base_qty * unit_price

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_seller     ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
