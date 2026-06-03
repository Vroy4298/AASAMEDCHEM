/**
 * components/Navbar.jsx — Role-aware navigation bar
 */

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const adminLinks = [
    { to: '/admin/products', label: 'Products' },
    { to: '/admin/inventory', label: 'Inventory' },
    { to: '/admin/orders', label: 'Orders' },
  ];

  const sellerLinks = [
    { to: '/seller/browse', label: 'Browse Products' },
    { to: '/seller/orders', label: 'My Orders' },
  ];

  const links = user.role === 'admin' ? adminLinks : sellerLinks;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to={user.role === 'admin' ? '/admin/products' : '/seller/browse'}>
          <span className="brand-name">AasaMedChem</span>
          <span className="brand-badge">{user.role === 'admin' ? 'Admin' : 'Seller'}</span>
        </Link>
      </div>

      <div className="navbar-links">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="navbar-user">
        <span className="user-name">{user.name}</span>
        <button className="btn-logout" onClick={logout} id="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}
