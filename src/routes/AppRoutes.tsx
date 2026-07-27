import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import BarberLayout from '../layouts/BarberLayout';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

import AdminDashboard from '../pages/admin/Dashboard';
import AdminBarbers from '../pages/admin/Barbers';
import BarberDashboard from '../pages/barber/Dashboard';

import { ProtectedRoute } from '../components/common/ProtectedRoute';

export const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="barbers" element={<AdminBarbers />} />
        </Route>

        <Route
          path="/barber"
          element={
            <ProtectedRoute allowedRoles={['barber', 'admin']}>
              <BarberLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<BarberDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/barber') : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
};