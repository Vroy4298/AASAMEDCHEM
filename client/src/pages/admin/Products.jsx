/**
 * pages/admin/Products.jsx — Admin product management
 *
 * Features:
 *   - List all products (including inactive)
 *   - Create new product via modal form
 *   - Edit existing product inline via modal
 *   - Soft-delete (deactivate) a product
 *   - Category filter
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import { ALL_UNITS, formatINR } from '../../utils/units';

const EMPTY_FORM = {
  name: '', sku: '', description: '', category_id: '',
  base_unit: 'g', base_price: '', stock_qty: '', is_active: true,
};

export default function AdminProducts() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null); // product object or null
  const [form, setForm]             = useState(EMPTY_FORM);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [filterCat, setFilterCat]   = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/categories'),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name:        product.name,
      sku:         product.sku,
      description: product.description || '',
      category_id: product.category_id || '',
      base_unit:   product.base_unit,
      base_price:  product.base_price,
      stock_qty:   product.stock_qty,
      is_active:   product.is_active,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        base_price: Number(form.base_price),
        stock_qty:  Number(form.stock_qty),
        category_id: form.category_id || null,
      };
      if (editing) {
        await api.put(`/api/products/${editing.id}`, payload);
      } else {
        await api.post('/api/products', payload);
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(product) {
    if (!confirm(`Deactivate "${product.name}"? Sellers won't see it.`)) return;
    try {
      await api.delete(`/api/products/${product.id}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate');
    }
  }

  async function handleReactivate(product) {
    try {
      await api.put(`/api/products/${product.id}`, { is_active: true });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reactivate');
    }
  }

  const filtered = filterCat
    ? products.filter((p) => p.category_id === filterCat)
    : products;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Products</h1>
        <button id="btn-add-product" className="btn-primary" onClick={openCreate}>
          + Add Product
        </button>
      </div>

      <div className="toolbar">
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
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Base Unit</th>
                <th>Base Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="empty-row">No products found</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className={!p.is_active ? 'row-inactive' : ''}>
                  <td>
                    <div className="cell-name">{p.name}</div>
                    {p.description && <div className="cell-sub">{p.description}</div>}
                  </td>
                  <td><code>{p.sku}</code></td>
                  <td>{p.category_name || '—'}</td>
                  <td>{p.base_unit}</td>
                  <td>{formatINR(p.base_price)} / {p.base_unit}</td>
                  <td>{Number(p.stock_qty).toLocaleString('en-IN')} {p.base_unit}</td>
                  <td>
                    <span className={p.is_active ? 'badge-active' : 'badge-inactive'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="action-cell">
                    <button className="btn-sm btn-edit" onClick={() => openEdit(p)}>Edit</button>
                    {p.is_active
                      ? <button className="btn-sm btn-danger" onClick={() => handleDeactivate(p)}>Deactivate</button>
                      : <button className="btn-sm btn-outline" onClick={() => handleReactivate(p)}>Reactivate</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Product' : 'New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text" required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="select-input"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Base Unit *</label>
                  <select
                    value={form.base_unit}
                    onChange={(e) => setForm({ ...form, base_unit: e.target.value })}
                    className="select-input"
                    required
                  >
                    {ALL_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Base Price (₹ per {form.base_unit}) *</label>
                  <input
                    type="number" step="0.0001" min="0" required
                    value={form.base_price}
                    onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Stock ({form.base_unit})</label>
                  <input
                    type="number" step="0.000001" min="0"
                    value={form.stock_qty}
                    onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                  />
                </div>
              </div>

              {editing && (
                <div className="form-group form-group-check">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    &nbsp;Active (visible to sellers)
                  </label>
                </div>
              )}

              {error && <div className="form-error">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
