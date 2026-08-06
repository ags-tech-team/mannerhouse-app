import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import BarberLayout from '../layouts/BarberLayout';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

import AdminDashboard from '../pages/admin/Dashboard';
import AdminBarbers from '../pages/admin/Barbers';
import AdminDespesas from '../pages/admin/Despesas';
import AdminEstoque from '../pages/admin/Estoque';
import BarberDashboard from '../pages/barber/Dashboard';
import BarberLoja from '../pages/barber/Loja';
import BarberAgenda from '../pages/barber/Agenda';
import BarberCaixa from '../pages/barber/Caixa';

import { ProtectedRoute } from '../components/common/ProtectedRoute';

export const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060606]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64] mx-auto"></div>
          <p className="mt-4 text-[#7f7c7a]">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Rotas do Admin */}
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
          <Route path="expenses" element={<AdminDespesas />} />
          <Route path="products" element={<AdminEstoque />} />
        </Route>

        {/* Rotas do Barbeiro */}
        <Route
          path="/barber"
          element={
            <ProtectedRoute allowedRoles={['barber', 'admin']}>
              <BarberLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<BarberDashboard />} />
          <Route path="cash-register" element={<BarberCaixa />} /> 
          <Route path="schedule" element={<BarberAgenda />} />
          <Route path="shop" element={<BarberLoja />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/barber') : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
};