/**
 * pages/seller/Cart.jsx — Order review and submission
 *
 * Shows cart items with full price breakdown.
 * Allows removing items and adding order notes.
 * On submit, calls POST /api/orders.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { formatINR } from '../../utils/units';

export default function SellerCart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function removeItem(index) {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  }

  const grandTotal = cart.reduce((s, c) => s + Number(c.total_price), 0);

  async function placeOrder() {
    if (cart.length === 0) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/api/orders', {
        notes,
        items: cart.map((c) => ({
          product_id:   c.product_id,
          ordered_qty:  c.ordered_qty,
          ordered_unit: c.ordered_unit,
        })),
      });

      // Clear cart
      localStorage.removeItem('cart');
      navigate('/seller/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Order Summary</h1>
        <button className="btn-outline" onClick={() => navigate('/seller/browse')}>
          ← Back to Products
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="empty-state">
          Your cart is empty.{' '}
          <button className="link-btn" onClick={() => navigate('/seller/browse')}>
            Browse products
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity Ordered</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="cell-name">{item.product_name}</div>
                    </td>
                    <td>
                      {Number(item.ordered_qty).toLocaleString('en-IN')} {item.ordered_unit}
                    </td>
                    <td>
                      {formatINR(item.unit_price)} / {item.base_unit}
                    </td>
                    <td className="text-bold">{formatINR(item.total_price)}</td>
                    <td>
                      <button
                        id={`remove-${i}`}
                        className="btn-sm btn-danger"
                        onClick={() => removeItem(i)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right text-bold">Grand Total</td>
                  <td colSpan={2} className="text-bold grand-total">{formatINR(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label htmlFor="order-notes">Order Notes (optional)</label>
            <textarea
              id="order-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="cart-submit-row">
            <div className="cart-total-display">
              Total: <strong>{formatINR(grandTotal)}</strong>
            </div>
            <button
              id="btn-place-order"
              className="btn-primary btn-lg"
              onClick={placeOrder}
              disabled={loading}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
