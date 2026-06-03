/**
 * utils/units.js (frontend)
 *
 * Mirror of server/utils/units.js — same logic, ES module syntax for Vite/React.
 * Having the same conversion logic on both ends means:
 *   - Frontend shows live price preview before the API call
 *   - Backend validates and recalculates for security
 *   - Both use the same math → no discrepancies
 */

export const UNITS = {
  g:    { dimension: 'weight', label: 'grams (g)',       toBase: (v) => Number(v),         fromBase: (v) => Number(v),        factor: 1 },
  kg:   { dimension: 'weight', label: 'kilograms (kg)',  toBase: (v) => Number(v) * 1000,  fromBase: (v) => Number(v) / 1000, factor: 1000 },
  mL:   { dimension: 'volume', label: 'milliliters (mL)',toBase: (v) => Number(v),         fromBase: (v) => Number(v),        factor: 1 },
  L:    { dimension: 'volume', label: 'liters (L)',      toBase: (v) => Number(v) * 1000,  fromBase: (v) => Number(v) / 1000, factor: 1000 },
  item: { dimension: 'count',  label: 'items (unit)',    toBase: (v) => Number(v),         fromBase: (v) => Number(v),        factor: 1 },
};

export const UNITS_BY_DIMENSION = {
  weight: ['g', 'kg'],
  volume: ['mL', 'L'],
  count:  ['item'],
};

export function toBaseUnit(qty, unit) {
  return UNITS[unit].toBase(qty);
}

export function fromBaseUnit(baseQty, unit) {
  return UNITS[unit].fromBase(baseQty);
}

export function getBaseUnit(unit) {
  const dim = UNITS[unit]?.dimension;
  if (dim === 'weight') return 'g';
  if (dim === 'volume') return 'mL';
  if (dim === 'count')  return 'item';
}

export function areCompatible(unitA, unitB) {
  return UNITS[unitA]?.dimension === UNITS[unitB]?.dimension;
}

export function getCompatibleUnits(baseUnit) {
  const dim = UNITS[baseUnit]?.dimension;
  return UNITS_BY_DIMENSION[dim] || [baseUnit];
}

/**
 * Calculate total price for preview.
 * Same formula as the backend.
 */
export function calculatePrice(orderedQty, orderedUnit, basePrice) {
  const baseQty = toBaseUnit(orderedQty, orderedUnit);
  const totalPrice = baseQty * Number(basePrice);
  return { baseQty, totalPrice };
}

/**
 * Format number as INR currency string.
 * Example: 25000 → "₹25,000.00"
 */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export const ALL_UNITS = Object.keys(UNITS);
