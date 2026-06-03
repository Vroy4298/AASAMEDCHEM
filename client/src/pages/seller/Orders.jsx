/**
 * pages/seller/Orders.jsx — Seller's order history
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import StatusBadge from '../../components/StatusBadge';
import { formatINR } from '../../utils/units';

export default function SellerOrders() {
  const navigate  = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails]   = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/api/orders')
      .then((res) => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleExpand(orderId) {
    if (expanded === orderId) { setExpanded(null); return; }
    setExpanded(orderId);
    if (!details[orderId]) {
      const res = await api.get(`/api/orders/${orderId}`);
      setDetails((d) => ({ ...d, [orderId]: res.data }));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Orders</h1>
        <button className="btn-primary" onClick={() => navigate('/seller/browse')}>
          + New Order
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          No orders yet.{' '}
          <button className="link-btn" onClick={() => navigate('/seller/browse')}>
            Place your first order
          </button>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header" onClick={() => toggleExpand(order.id)}>
                <div className="order-meta">
                  <span className="order-id">#{order.id.slice(0, 8)}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-info">
                  <span>{order.item_count} item(s)</span>
                  <span className="order-total">{formatINR(order.grand_total)}</span>
                  <span className="order-date">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
                <span className="expand-icon">{expanded === order.id ? '▲' : '▼'}</span>
              </div>

              {expanded === order.id && (
                <div className="order-detail">
                  <table className="data-table nested-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>You Ordered</th>
                        <th>Equivalent</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(details[order.id]?.items || []).map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>{Number(item.ordered_qty).toLocaleString('en-IN')} {item.ordered_unit}</td>
                          <td className="text-muted">
                            = {Number(item.base_qty).toLocaleString('en-IN')} {item.base_unit}
                          </td>
                          <td>{formatINR(item.unit_price)} / {item.base_unit}</td>
                          <td className="text-bold">{formatINR(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="text-right text-bold">Grand Total</td>
                        <td className="text-bold grand-total">
                          {formatINR(details[order.id]?.grand_total || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  {order.notes && (
                    <div className="order-notes"><strong>Notes:</strong> {order.notes}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
