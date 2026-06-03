import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import AdminProducts  from './pages/admin/Products';
import AdminInventory from './pages/admin/Inventory';
import AdminOrders    from './pages/admin/Orders';
import SellerBrowse   from './pages/seller/Browse';
import SellerCart     from './pages/seller/Cart';
import SellerOrders   from './pages/seller/Orders';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Admin */}
            <Route path="/admin/products" element={
              <ProtectedRoute role="admin"><AdminProducts /></ProtectedRoute>
            } />
            <Route path="/admin/inventory" element={
              <ProtectedRoute role="admin"><AdminInventory /></ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute role="admin"><AdminOrders /></ProtectedRoute>
            } />

            {/* Seller */}
            <Route path="/seller/browse" element={
              <ProtectedRoute role="seller"><SellerBrowse /></ProtectedRoute>
            } />
            <Route path="/seller/cart" element={
              <ProtectedRoute role="seller"><SellerCart /></ProtectedRoute>
            } />
            <Route path="/seller/orders" element={
              <ProtectedRoute role="seller"><SellerOrders /></ProtectedRoute>
            } />

            {/* Default */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  );
}
