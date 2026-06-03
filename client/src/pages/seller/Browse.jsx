/**
 * pages/seller/Browse.jsx — Product catalogue for sellers
 *
 * Features:
 *   - Search by name/SKU
 *   - Filter by category
 *   - Add products to cart with any compatible unit
 *   - Live price preview before adding to cart
 *   - Cart state passed via localStorage (simple, avoids prop drilling)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { formatINR, getCompatibleUnits, calculatePrice } from '../../utils/units';

export default function SellerBrowse() {
  const navigate = useNavigate();
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cart') || '[]');
      // Filter out malformed items (missing required fields)
      const valid = saved.filter(
        (c) => c.product_id && c.ordered_qty && c.ordered_unit
      );
      localStorage.setItem('cart', JSON.stringify(valid));
      return valid;
    } catch { return []; }
  });

  // Per-product quantity/unit state for the UI controls
  const [qtyInputs, setQtyInputs] = useState({});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)    params.search      = search;
      if (filterCat) params.category_id = filterCat;
      const [pRes, cRes] = await Promise.all([
        api.get('/api/products', { params }),
        api.get('/api/categories'),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, filterCat]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function getInput(product) {
    const stored = qtyInputs[product.id] || {};
    return { qty: stored.qty || '', unit: stored.unit || product.base_unit };
  }

  function setInput(productId, patch) {
    setQtyInputs((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], ...patch },
    }));
  }

  function getPreview(product) {
    const { qty, unit } = getInput(product);
    if (!qty || isNaN(qty) || Number(qty) <= 0) return null;
    const { totalPrice, baseQty } = calculatePrice(Number(qty), unit || product.base_unit, product.base_price);
    return { totalPrice, baseQty, unit: unit || product.base_unit };
  }

  function addToCart(product) {
    const { qty, unit } = getInput(product);
    if (!qty || Number(qty) <= 0) return alert('Enter a valid quantity');

    const preview = getPreview(product);
    if (!preview) return;

    const existing = cart.findIndex((c) => c.product_id === product.id && c.ordered_unit === unit);
    let newCart;
    if (existing >= 0) {
      newCart = cart.map((c, i) =>
        i === existing
          ? { ...c, ordered_qty: Number(c.ordered_qty) + Number(qty), total_price: c.total_price + preview.totalPrice }
          : c
      );
    } else {
      newCart = [
        ...cart,
        {
          product_id:   product.id,
          product_name: product.name,
          ordered_qty:  Number(qty),
          ordered_unit: unit,
          base_unit:    product.base_unit,
          unit_price:   Number(product.base_price),
          total_price:  preview.totalPrice,
        },
      ];
    }

    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    // Reset input
    setInput(product.id, { qty: '' });
    alert(`Added ${qty} ${unit} of "${product.name}" to cart`);
  }

  const cartCount = cart.reduce((s, c) => s + 1, 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Browse Products</h1>
        <button
          id="btn-go-cart"
          className="btn-primary"
          onClick={() => navigate('/seller/cart')}
        >
          Cart ({cartCount})
        </button>
      </div>

      <div className="toolbar">
        <input
          id="search-products"
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          id="filter-category"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="select-input"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">No products found</div>
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            const input   = getInput(product);
            const units   = getCompatibleUnits(product.base_unit);
            const preview = getPreview(product);
            const inCart  = cart.some((c) => c.product_id === product.id);

            return (
              <div key={product.id} className={`product-card ${inCart ? 'in-cart' : ''}`}>
                <div className="product-card-top">
                  <div>
                    <div className="product-name">{product.name}</div>
                    <div className="product-sku"><code>{product.sku}</code></div>
                    {product.category_name && (
                      <div className="product-category">{product.category_name}</div>
                    )}
                  </div>
                  {inCart && <span className="in-cart-tag">In Cart</span>}
                </div>

                {product.description && (
                  <div className="product-desc">{product.description}</div>
                )}

                <div className="product-price-row">
                  <span className="price-label">Rate:</span>
                  <span className="price-value">
                    {formatINR(product.base_price)} / {product.base_unit}
                  </span>
                </div>

                <div className="product-stock">
                  Stock: {Number(product.stock_qty).toLocaleString('en-IN')} {product.base_unit}
                </div>

                <div className="product-order-row">
                  <input
                    id={`qty-${product.id}`}
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="Qty"
                    value={input.qty}
                    onChange={(e) => setInput(product.id, { qty: e.target.value })}
                    className="qty-input"
                  />
                  <select
                    id={`unit-${product.id}`}
                    value={input.unit || product.base_unit}
                    onChange={(e) => setInput(product.id, { unit: e.target.value })}
                    className="unit-select"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <button
                    id={`add-${product.id}`}
                    className="btn-primary btn-sm"
                    onClick={() => addToCart(product)}
                  >
                    Add
                  </button>
                </div>

                {preview && (
                  <div className="price-preview">
                    <span>
                      {Number(input.qty)} {input.unit || product.base_unit}
                      {' = '}
                      {preview.baseQty.toLocaleString('en-IN')} {product.base_unit}
                    </span>
                    <span className="preview-total">≈ {formatINR(preview.totalPrice)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
