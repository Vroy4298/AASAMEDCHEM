/**
 * pages/admin/Inventory.jsx — Stock level view for admin
 */

import { useState, useEffect } from 'react';
import api from '../../api/api';
import { formatINR } from '../../utils/units';

export default function AdminInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    api.get('/api/products/admin/inventory')
      .then((res) => setInventory(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = inventory.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive   = inventory.filter((p) => p.is_active).length;
  const totalInactive = inventory.filter((p) => !p.is_active).length;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventory</h1>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{totalActive}</div>
          <div className="stat-label">Active Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalInactive}</div>
          <div className="stat-label">Inactive Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{inventory.length}</div>
          <div className="stat-label">Total Products</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          id="inventory-search"
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading">Loading inventory...</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Base Unit</th>
                <th>Stock Qty</th>
                <th>Base Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="empty-row">No products match your search</td></tr>
              )}
              {filtered.map((p) => {
                const lowStock = Number(p.stock_qty) < 100;
                return (
                  <tr key={p.id} className={!p.is_active ? 'row-inactive' : ''}>
                    <td className="cell-name">{p.name}</td>
                    <td><code>{p.sku}</code></td>
                    <td>{p.category_name || '—'}</td>
                    <td>{p.base_unit}</td>
                    <td className={lowStock && p.is_active ? 'text-warning' : ''}>
                      {Number(p.stock_qty).toLocaleString('en-IN')} {p.base_unit}
                      {lowStock && p.is_active && <span className="low-stock-tag"> ⚠ Low</span>}
                    </td>
                    <td>{formatINR(p.base_price)} / {p.base_unit}</td>
                    <td>
                      <span className={p.is_active ? 'badge-active' : 'badge-inactive'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
