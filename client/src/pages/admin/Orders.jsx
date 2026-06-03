/**
 * pages/admin/Orders.jsx — Admin order management
 *
 * Shows all incoming orders with:
 *   - Seller info
 *   - Product details, ordered qty & unit, base conversion, price breakdown
 *   - Status controls: confirm / reject / fulfill
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import StatusBadge from '../../components/StatusBadge';
import { formatINR } from '../../utils/units';

export default function AdminOrders() {
  const [orders, setOrders]       = useState([]);
  const [expanded, setExpanded]   = useState(null);
  const [details, setDetails]     = useState({});
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/orders');
      setOrders(res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function toggleExpand(orderId) {
    if (expanded === orderId) {
      setExpanded(null);
      return;
    }
    setExpanded(orderId);
    if (!details[orderId]) {
      const res = await api.get(`/api/orders/${orderId}`);
      setDetails((d) => ({ ...d, [orderId]: res.data }));
    }
  }

  async function updateStatus(orderId, status) {
    const label = { confirmed: 'Confirm', rejected: 'Reject', fulfilled: 'Mark Fulfilled' }[status];
    if (!confirm(`${label} this order?`)) return;
    try {
      await api.put(`/api/orders/${orderId}/status`, { status });
      fetchOrders();
      // Refresh detail if open
      const res = await api.get(`/api/orders/${orderId}`);
      setDetails((d) => ({ ...d, [orderId]: res.data }));
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    }
  }

  const filtered = filterStatus
    ? orders.filter((o) => o.status === filterStatus)
    : orders;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Orders</h1>
      </div>

      <div className="toolbar">
        <select
          id="filter-status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="select-input"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
          <option value="fulfilled">Fulfilled</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No orders found</div>
      ) : (
        <div className="order-list">
          {filtered.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card-header" onClick={() => toggleExpand(order.id)}>
                <div className="order-meta">
                  <span className="order-id">#{order.id.slice(0, 8)}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-info">
                  <span className="order-seller">
                    <strong>{order.seller_name}</strong> ({order.seller_email})
                  </span>
                  <span className="order-items">{order.item_count} item(s)</span>
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
                  {order.notes && (
                    <div className="order-notes"><strong>Notes:</strong> {order.notes}</div>
                  )}

                  <table className="data-table nested-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Ordered (as entered)</th>
                        <th>Converted (base)</th>
                        <th>Unit Price</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(details[order.id]?.items || []).map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td><code>{item.sku || '—'}</code></td>
                          <td>
                            {Number(item.ordered_qty).toLocaleString('en-IN')} {item.ordered_unit}
                          </td>
                          <td className="text-muted">
                            {Number(item.base_qty).toLocaleString('en-IN')} {item.base_unit}
                          </td>
                          <td>{formatINR(item.unit_price)} / {item.base_unit}</td>
                          <td className="text-bold">{formatINR(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="text-right text-bold">Grand Total</td>
                        <td className="text-bold grand-total">
                          {formatINR(details[order.id]?.grand_total || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="order-actions">
                    {order.status === 'pending' && (
                      <>
                        <button
                          id={`btn-confirm-${order.id}`}
                          className="btn-sm btn-success"
                          onClick={() => updateStatus(order.id, 'confirmed')}
                        >
                          Confirm
                        </button>
                        <button
                          id={`btn-reject-${order.id}`}
                          className="btn-sm btn-danger"
                          onClick={() => updateStatus(order.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {order.status === 'confirmed' && (
                      <>
                        <button
                          id={`btn-fulfill-${order.id}`}
                          className="btn-sm btn-success"
                          onClick={() => updateStatus(order.id, 'fulfilled')}
                        >
                          Mark Fulfilled
                        </button>
                        <button
                          id={`btn-reject-confirmed-${order.id}`}
                          className="btn-sm btn-danger"
                          onClick={() => updateStatus(order.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
