import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Vehicles     from './pages/Vehicles';
import Customers    from './pages/Customers';
import Promotions   from './pages/Promotions';
import PromoVehicles from './pages/PromoVehicles';
import Reports      from './pages/Reports';
import Layout       from './components/Layout';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-500 animate-pulse text-sm">Loading…</div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      <Route path="/dashboard" element={
        <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
      } />
      <Route path="/vehicles" element={
        <PrivateRoute><Layout><Vehicles /></Layout></PrivateRoute>
      } />
      <Route path="/customers" element={
        <PrivateRoute><Layout><Customers /></Layout></PrivateRoute>
      } />
      <Route path="/promotions" element={
        <PrivateRoute><Layout><Promotions /></Layout></PrivateRoute>
      } />
      <Route path="/promo-vehicles" element={
        <PrivateRoute><Layout><PromoVehicles /></Layout></PrivateRoute>
      } />
      <Route path="/reports" element={
        <PrivateRoute><Layout><Reports /></Layout></PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
