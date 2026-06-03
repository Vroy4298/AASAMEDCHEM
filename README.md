# AasaMedChem — Inventory & Order Management System

A full-stack web application for managing chemical/reagent inventory and processing seller orders. Built as part of the AasaMedChem recruitment assignment.


> Sellers can also self-register from the login page.

---

## Project Overview

AasaMedChem is an internal tool for a specialty chemicals supplier. It provides:

- **Admin panel**: Manage products (CRUD), monitor inventory stock levels, review and action incoming orders.
- **Seller panel**: Browse and search the product catalogue, build a cart with flexible unit selection, place orders, and track order history.

The system handles unit conversion transparently — a seller can order `2.5 kg` of a product whose base unit is `g`, and the system converts, calculates the correct price, and stores both the original input and the converted base quantity for a clean audit trail.

---

## Tech Stack

| Layer      | Technology          | Reason |
|------------|---------------------|--------|
| Frontend   | React (Vite)        | Component-based UI, fast dev server, ES module support |
| Backend    | Node.js + Express   | Lightweight, simple REST API, easy to reason about |
| Database   | Neon PostgreSQL      | Required; serverless Postgres, excellent free tier |
| Auth       | JWT (jsonwebtoken)  | Stateless, no server-side session storage, works across origins |
| Passwords  | bcryptjs            | Industry-standard password hashing (cost factor 10) |
| DB Client  | pg (node-postgres)  | Raw SQL with parameterized queries — no ORM magic, full control |
| HTTP Client| Axios               | Promise-based, interceptors for JWT injection |
| Deployment | Vercel (FE) + Railway (BE) | Both have generous free tiers |

### Why raw SQL instead of an ORM?

Using `pg` directly means every query is explicit and readable. In an interview, you can explain exactly what SQL is running, what indexes are used, and why. An ORM generates queries you don't always control or understand.

---

## System Architecture

```
Browser (React)
      │
      │  HTTPS REST API (JSON)
      ▼
Express Server (Railway)
      │
      │  SQL (TLS)
      ▼
Neon PostgreSQL
```

All API routes are prefixed `/api/`. The frontend uses an Axios instance that automatically attaches the JWT from localStorage to every request. On a 401 response, the user is redirected to `/login`.



### Conversion Factors

```
kg → g:  multiply by 1000
g  → kg: divide by 1000

L  → mL: multiply by 1000
mL → L:  divide by 1000

item: no conversion (identity)
```

### Where Conversions Happen

1. **`server/utils/units.js`** — The single source of truth on the backend. Used in `routes/orders.js` before any INSERT or stock deduction.
2. **`client/src/utils/units.js`** — Identical logic (ES module syntax) used in the React frontend for:
   - Live price preview as the seller types a quantity
   - Displaying stored base quantities in the seller's preferred unit

Both files implement the same `toBaseUnit(qty, unit)` and `fromBaseUnit(baseQty, unit)` functions. Because the logic is the same, the frontend preview always matches what the backend will calculate.

### Example

> Seller orders **2.5 kg** of Ethanol (base unit: `mL`, base price: ₹0.085 per mL)

Wait — these have different dimensions (weight vs volume). The system will reject this with "Unit mismatch". Only compatible units are shown in the UI dropdown.

> Seller orders **2.5 L** of Ethanol (base unit: `mL`, base price: ₹0.085 per mL)

1. `ordered_qty = 2.5`, `ordered_unit = 'L'`
2. `base_qty = 2.5 × 1000 = 2500` mL
3. `total_price = 2500 × 0.085 = ₹212.50`
4. Stored: `ordered_unit='L', ordered_qty=2.5, base_unit='mL', base_qty=2500, total_price=212.50`

---

## How Prices Are Stored

- **`base_price`** in `products` = price per **1 base_unit** in INR.
- Example: Ethanol `base_unit='mL'`, `base_price=0.0850` means ₹0.085 per mL = ₹85 per L.
- **`unit_price`** in `order_items` = a **snapshot** of `base_price` at the time of order.
  - This means if an admin updates the price later, existing orders are unaffected.
- **`total_price`** = `base_qty × unit_price` — pre-calculated and stored for fast querying and audit.

---

## Order Status Flow

```
[Seller places order]
        ↓
    PENDING  ←─── stock deducted immediately
    /      \
CONFIRMED  REJECTED ←─── stock RESTORED
    ↓
FULFILLED
```

If an order is rejected, `orders.js` restores the stock by adding `base_qty` back to `products.stock_qty` inside a transaction.

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Neon account (free at [neon.tech](https://neon.tech))
- Git

### 1. Clone and install

```bash
git clone https://github.com/your-username/asamedchem.git
cd asamedchem

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Set up Neon database

1. Go to [console.neon.tech](https://console.neon.tech) → New Project
2. Copy the connection string (starts with `postgresql://...`)
3. Open the **SQL Editor** in Neon console
4. Run `server/db/schema.sql` (copy-paste the entire file)
5. Run `server/db/seed.sql` (copy-paste the entire file)

> The seed script creates the two demo accounts and 8 sample products.

### 3. Configure environment variables

```bash
# In server/
cp .env.example .env
# Edit .env: paste your DATABASE_URL and set JWT_SECRET to any random string

# In client/
cp .env.example .env
# VITE_API_URL=http://localhost:4000 (default is fine for local)
```

### 4. Run locally

```bash
# Terminal 1 — backend
cd server
npm run dev    # nodemon watches for changes, runs on port 4000

# Terminal 2 — frontend
cd client
npm run dev    # Vite dev server, runs on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---


## How to Use Each Panel

### Admin

1. Login with `admin@aasa.com / Admin@123`
2. **Products tab**: Click "+ Add Product" to create a product. Fill in SKU, base unit, and base price. Edit or deactivate products from the table.
3. **Inventory tab**: See real-time stock levels. Products with < 100 units show a ⚠ Low warning.
4. **Orders tab**: Click any order row to expand it. See full breakdown of what was ordered, in which unit, converted value, and price. Use Confirm / Reject / Fulfill buttons to manage the order lifecycle.

### Seller

1. Login with `seller@aasa.com / Seller@123` or self-register
2. **Browse Products**: Search by name/SKU, filter by category. Enter a quantity, pick a unit from the dropdown. The live price preview appears below the input.
3. Click **Add** to add to cart. The "In Cart" badge appears on the product card.
4. Click **Cart (N)** to go to the order summary.
5. Review the breakdown, add optional notes, click **Place Order**.
6. **My Orders**: View all past orders with expandable item detail showing what you ordered vs the base equivalent.

---

