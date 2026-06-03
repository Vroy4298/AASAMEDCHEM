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

---

## Database Schema

### `users`
| Column          | Type         | Notes |
|-----------------|--------------|-------|
| id              | UUID PK      | gen_random_uuid() |
| email           | TEXT UNIQUE  | Login identifier |
| password_hash   | TEXT         | bcrypt hash, never stored plain |
| role            | TEXT         | `'admin'` or `'seller'` |
| name            | TEXT         | Display name |
| created_at      | TIMESTAMPTZ  | UTC timestamp |

### `categories`
| Column    | Type        | Notes |
|-----------|-------------|-------|
| id        | UUID PK     | |
| name      | TEXT UNIQUE | e.g. "Solvents", "Reagents" |
| created_at| TIMESTAMPTZ | |

### `products`
| Column      | Type            | Notes |
|-------------|-----------------|-------|
| id          | UUID PK         | |
| name        | TEXT            | Product display name |
| sku         | TEXT UNIQUE     | Stock-keeping unit |
| description | TEXT            | Optional |
| category_id | UUID FK         | References categories |
| base_unit   | TEXT            | `g`, `kg`, `mL`, `L`, `item` — the canonical storage unit |
| base_price  | NUMERIC(15,4)   | Price per 1 `base_unit` in INR |
| stock_qty   | NUMERIC(20,6)   | Current stock in `base_unit` |
| is_active   | BOOLEAN         | Soft delete — inactive products hidden from sellers |
| created_at  | TIMESTAMPTZ     | |
| updated_at  | TIMESTAMPTZ     | |

### `orders`
| Column     | Type       | Notes |
|------------|------------|-------|
| id         | UUID PK    | |
| seller_id  | UUID FK    | References users |
| status     | TEXT       | `pending → confirmed → fulfilled` (or `rejected`) |
| notes      | TEXT       | Optional seller notes |
| created_at | TIMESTAMPTZ| |
| updated_at | TIMESTAMPTZ| |

### `order_items`
| Column        | Type          | Notes |
|---------------|---------------|-------|
| id            | UUID PK       | |
| order_id      | UUID FK       | References orders |
| product_id    | UUID FK       | References products |
| product_name  | TEXT          | Snapshot at order time |
| ordered_unit  | TEXT          | What the seller selected |
| ordered_qty   | NUMERIC(20,6) | What the seller entered |
| base_unit     | TEXT          | The product's canonical unit |
| base_qty      | NUMERIC(20,6) | Converted from ordered_qty |
| unit_price    | NUMERIC(15,4) | Snapshot of base_price at order time |
| total_price   | NUMERIC(15,4) | `base_qty × unit_price` |
| created_at    | TIMESTAMPTZ   | |

---

## Data Type Choices — Reasoning

### `NUMERIC(15, 4)` for prices
- `FLOAT` has binary representation errors. `₹10.1` stored as float can be `₹10.09999...`
- `NUMERIC` is exact decimal storage — no rounding errors.
- `15` total digits, `4` decimal places → handles up to ₹99,999,999,999.9999 per unit.

### `NUMERIC(20, 6)` for quantities
- 6 decimal places to handle sub-unit precision (e.g. 0.000001 g for trace amounts).
- 20 total digits → handles very large bulk quantities.

### `TIMESTAMPTZ` for all timestamps
- Timezone-aware. Always stored as UTC internally.
- Safe across deployments in different timezones.

### `UUID` for all IDs
- No sequential enumeration (unlike integer IDs, users can't guess `id=1, id=2`).
- Generated in the database with `gen_random_uuid()` — no application-level ID management.

---

## Unit Conversion Strategy

### Base Units (what gets stored in the database)

| Dimension | Base Unit | Other Supported Units |
|-----------|-----------|----------------------|
| Weight    | `g`       | `kg`                 |
| Volume    | `mL`      | `L`                  |
| Count     | `item`    | —                    |

**Why `g` and `mL` as bases?**  
They are the smallest common units. Converting to them avoids fractional DB values for typical quantities:
- 1 kg → 1000 g (clean integer)
- 1 L → 1000 mL (clean integer)
- 0.5 kg → 500 g (still clean)

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

## Deployment

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the repo, set **Root Directory** to `server`
3. Add environment variables (same as `.env`):
   - `DATABASE_URL` — your Neon connection string
   - `JWT_SECRET` — your secret
   - `CLIENT_URL` — your Vercel frontend URL
   - `PORT` — Railway sets this automatically
4. Railway auto-detects Node.js and runs `npm start`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `client`
3. Add environment variable:
   - `VITE_API_URL` — your Railway backend URL (e.g. `https://asamedchem-api.up.railway.app`)
4. Vercel auto-detects Vite and runs `npm run build`

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

## Git Commit Strategy

All commits are small and meaningful:

1. `init: project scaffold`
2. `db: schema and seed SQL`
3. `server: DB pool and units utility`
4. `server: auth routes and JWT middleware`
5. `server: category and product routes`
6. `server: orders routes with unit conversion and stock logic`
7. `client: auth context, protected routes, navbar`
8. `client: login and register page`
9. `client: admin products and inventory pages`
10. `client: admin orders view with status controls`
11. `client: seller browse with live price preview`
12. `client: seller cart and order submission`
13. `client: global CSS`
14. `docs: README`
15. `deploy: vercel and railway config`
