-- ============================================================
-- AasaMedChem — Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- Categories
INSERT INTO categories (name) VALUES
  ('Solvents'),
  ('Reagents'),
  ('Acids & Bases'),
  ('Indicators'),
  ('Buffers')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Users (passwords hashed with bcrypt, cost 10)
-- Plain-text credentials for README / demo:
--   admin@aasa.com   / Admin@123
--   seller@aasa.com  / Seller@123
-- ============================================================
-- These hashes are pre-generated. The seed script inserts them directly.
-- DO NOT commit real credentials — these are demo-only accounts.
INSERT INTO users (email, password_hash, role, name) VALUES
  (
    'admin@aasa.com',
    '$2b$10$LtaCqiiFI6JXJ30UFC31vu/pMDvaim5AtX72fZQv3saFqHijlp6R2', -- Admin@123
    'admin',
    'Admin User'
  ),
  (
    'seller@aasa.com',
    '$2b$10$09k1updl4crLMAROrh187eXYFd74g8137v5mI8M0./gTw2NzGirAe', -- Seller@123
    'seller',
    'Demo Seller'
  )
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Sample Products
-- ============================================================
INSERT INTO products (name, sku, description, category_id, base_unit, base_price, stock_qty)
VALUES
  (
    'Ethanol (96%)',
    'SOL-ETH-96',
    'High-purity ethanol for laboratory use.',
    (SELECT id FROM categories WHERE name = 'Solvents'),
    'mL',        -- base unit: milliliters
    0.0850,      -- ₹0.085 per mL  (= ₹85 per L)
    50000.000000 -- 50,000 mL = 50 L in stock
  ),
  (
    'Acetone (99.5%)',
    'SOL-ACE-995',
    'HPLC-grade acetone.',
    (SELECT id FROM categories WHERE name = 'Solvents'),
    'mL',
    0.0650,
    30000.000000
  ),
  (
    'Sodium Chloride (NaCl)',
    'REA-NACL-AR',
    'Analytical reagent grade NaCl.',
    (SELECT id FROM categories WHERE name = 'Reagents'),
    'g',         -- base unit: grams
    0.0120,      -- ₹0.012 per g  (= ₹12 per 100g)
    10000.000000 -- 10,000 g = 10 kg in stock
  ),
  (
    'Hydrochloric Acid (35%)',
    'ACI-HCL-35',
    'Concentrated HCl, laboratory grade.',
    (SELECT id FROM categories WHERE name = 'Acids & Bases'),
    'mL',
    0.0450,
    20000.000000
  ),
  (
    'pH Buffer Solution 7.0',
    'BUF-PH7-STD',
    'Certified reference buffer, pH 7.00 ± 0.01 at 25°C.',
    (SELECT id FROM categories WHERE name = 'Buffers'),
    'mL',
    0.1500,
    5000.000000
  ),
  (
    'Phenolphthalein Indicator',
    'IND-PHEN-1',
    'Phenolphthalein solution 1% in ethanol.',
    (SELECT id FROM categories WHERE name = 'Indicators'),
    'mL',
    0.2200,
    2000.000000
  ),
  (
    'Glucose (Anhydrous)',
    'REA-GLU-ANH',
    'Anhydrous D-glucose, 99.5% purity.',
    (SELECT id FROM categories WHERE name = 'Reagents'),
    'g',
    0.0350,
    8000.000000
  ),
  (
    'Micropipette Tips (1000µL)',
    'EQP-TIP-1000',
    'Universal fit, 1000µL pipette tips, pack of 100.',
    (SELECT id FROM categories WHERE name = 'Reagents'),
    'item',      -- base unit: item (count)
    8.5000,      -- ₹8.50 per tip
    500.000000   -- 500 tips in stock
  )
ON CONFLICT (sku) DO NOTHING;
