/**
 * components/ProtectedRoute.jsx
 * Redirects to /login if not authenticated.
 * Redirects to appropriate panel if role doesn't match.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    // Wrong role — redirect to their dashboard
    return <Navigate to={user.role === 'admin' ? '/admin/products' : '/seller/browse'} replace />;
  }

  return children;
}
