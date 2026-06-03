/**
 * units.js — Unit conversion utility
 *
 * STRATEGY:
 *   Weight  → base unit: g  (grams)
 *   Volume  → base unit: mL (milliliters)
 *   Count   → base unit: item
 *
 * WHY these bases?
 *   They are the smallest common units in each dimension.
 *   1 kg → 1000 g (no fractions), 1 L → 1000 mL (no fractions).
 *   Storing in the smallest unit minimises fractional values for typical quantities.
 *
 * ALL quantities saved to the database are in the base unit.
 * Conversions happen:
 *   - On the backend before INSERT (ordered quantity → base quantity)
 *   - On the frontend for live price preview (same math, same file)
 *   - On display: base quantity → user's preferred unit via fromBase()
 */

const UNITS = {
  // Weight — base: g
  g: {
    dimension: 'weight',
    label: 'grams (g)',
    toBase: (v) => Number(v),           // g → g (identity)
    fromBase: (v) => Number(v),         // g → g
    factor: 1,
  },
  kg: {
    dimension: 'weight',
    label: 'kilograms (kg)',
    toBase: (v) => Number(v) * 1000,    // kg → g
    fromBase: (v) => Number(v) / 1000,  // g → kg
    factor: 1000,
  },

  // Volume — base: mL
  mL: {
    dimension: 'volume',
    label: 'milliliters (mL)',
    toBase: (v) => Number(v),
    fromBase: (v) => Number(v),
    factor: 1,
  },
  L: {
    dimension: 'volume',
    label: 'liters (L)',
    toBase: (v) => Number(v) * 1000,    // L → mL
    fromBase: (v) => Number(v) / 1000,  // mL → L
    factor: 1000,
  },

  // Count — base: item
  item: {
    dimension: 'count',
    label: 'items (unit)',
    toBase: (v) => Number(v),
    fromBase: (v) => Number(v),
    factor: 1,
  },
};

/**
 * Convert a quantity from any supported unit to its base unit.
 * @param {number} qty   - The quantity value
 * @param {string} unit  - The unit key (e.g. 'kg', 'mL')
 * @returns {number}     - Quantity in base unit
 */
function toBaseUnit(qty, unit) {
  if (!UNITS[unit]) throw new Error(`Unsupported unit: ${unit}`);
  return UNITS[unit].toBase(qty);
}

/**
 * Convert a quantity from base unit to any supported unit.
 * @param {number} baseQty  - The quantity in base unit
 * @param {string} unit     - Target unit key (e.g. 'kg', 'L')
 * @returns {number}
 */
function fromBaseUnit(baseQty, unit) {
  if (!UNITS[unit]) throw new Error(`Unsupported unit: ${unit}`);
  return UNITS[unit].fromBase(baseQty);
}

/**
 * Get the base unit for a given unit key.
 * @param {string} unit
 * @returns {string}  'g' | 'mL' | 'item'
 */
function getBaseUnit(unit) {
  const dim = UNITS[unit]?.dimension;
  if (dim === 'weight') return 'g';
  if (dim === 'volume') return 'mL';
  if (dim === 'count') return 'item';
  throw new Error(`Unsupported unit: ${unit}`);
}

/**
 * Check if two units are compatible (same dimension).
 */
function areCompatible(unitA, unitB) {
  return UNITS[unitA]?.dimension === UNITS[unitB]?.dimension;
}

/**
 * Calculate total price given an ordered quantity & unit,
 * and a base_price (price per 1 base unit).
 *
 * Example: 2.5 kg ordered, base_price = ₹10 per g
 *   → baseQty = 2500 g
 *   → total   = 2500 * 10 = ₹25,000
 *
 * @param {number} orderedQty    - quantity the user typed
 * @param {string} orderedUnit   - unit the user selected
 * @param {number} basePrice     - price per 1 base_unit (INR)
 * @returns {{ baseQty: number, totalPrice: number }}
 */
function calculatePrice(orderedQty, orderedUnit, basePrice) {
  const baseQty = toBaseUnit(orderedQty, orderedUnit);
  const totalPrice = baseQty * Number(basePrice);
  return { baseQty, totalPrice };
}

/**
 * Format a number as Indian Rupees.
 */
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * All supported unit keys.
 */
const ALL_UNITS = Object.keys(UNITS);

/**
 * Units grouped by dimension.
 */
const UNITS_BY_DIMENSION = {
  weight: ['g', 'kg'],
  volume: ['mL', 'L'],
  count: ['item'],
};

/**
 * Get compatible units for a given base unit (what a seller can order in).
 * If the product's base_unit is 'g', seller can order in 'g' or 'kg'.
 */
function getCompatibleUnits(baseUnit) {
  const dim = UNITS[baseUnit]?.dimension;
  return UNITS_BY_DIMENSION[dim] || [baseUnit];
}

module.exports = {
  UNITS,
  ALL_UNITS,
  UNITS_BY_DIMENSION,
  toBaseUnit,
  fromBaseUnit,
  getBaseUnit,
  areCompatible,
  calculatePrice,
  formatINR,
  getCompatibleUnits,
};
