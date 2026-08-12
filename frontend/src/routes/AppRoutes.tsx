import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import BarberLayout from '../layouts/BarberLayout';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

import AdminDashboard from '../pages/admin/Dashboard';
import AdminBarbers from '../pages/admin/Barbers';
import AdminFaturamento from '../pages/admin/Faturamento';
import AdminDespesas from '../pages/admin/Despesas';
import AdminEstoque from '../pages/admin/Estoque';

import BarberDashboard from '../pages/barber/Dashboard';
import BarberLoja from '../pages/barber/Loja';
import BarberAgenda from '../pages/barber/Agenda';
import BarberCaixa from '../pages/barber/Caixa';
import Clientes from '../pages/shared/Clientes';

// 🔥 PÁGINA PÚBLICA
import PublicSchedule from '../pages/public/Schedule';

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
        {/* 🔥 ROTA PÚBLICA (PÁGINA INICIAL) */}
        <Route path="/" element={<PublicSchedule />} />
        <Route path="/agendar" element={<PublicSchedule />} />

        {/* Rotas de autenticação */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* 🔥 ROTAS DO ADMIN (PROTEGIDAS) */}
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
          <Route path="revenue" element={<AdminFaturamento />} />
          <Route path="expenses" element={<AdminDespesas />} />
          <Route path="products" element={<AdminEstoque />} />
          <Route path="clients" element={<Clientes />} />
        </Route>

        {/* 🔥 ROTAS DO BARBEIRO (PROTEGIDAS) */}
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
          <Route path="clients" element={<Clientes />} />
        </Route>

        {/* 🔥 QUALQUER OUTRA ROTA → PÁGINA INICIAL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};