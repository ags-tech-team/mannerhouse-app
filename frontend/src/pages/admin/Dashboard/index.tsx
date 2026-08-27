import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../api/client';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Package,
  AlertCircle,
  User,
  Scissors,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  ChevronRight
} from 'lucide-react';

interface DashboardData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    totalCommissions: number;
    servicesCount: number;
    productsSold: number;
    activeBarbers: number;
    totalClients: number;
  };
  monthlyRevenue: {
    labels: string[];
    values: number[];
  };
  barbersPerformance: Array<{
    id: string;
    name: string;
    services: number;
    revenue: number;
    commission: number;
  }>;
  recentAppointments: Array<{
    id: string;
    client: string;
    barber: string;
    service: string;
    date: string;
    time: string;
    status: string;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    price: number;
  }>;
  alerts: {
    lowStock: number;
    pendingAppointments: number;
    todayAppointments: number;
  };
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });

  useEffect(() => {
    loadDashboard();
  }, [selectedMonth]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/dashboard', {
        params: { month: selectedMonth }
      });
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'completed': return 'Concluído';
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#9c7f64] mx-auto"></div>
          <p className="mt-4 text-[#7f7c7a]">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-[#7f7c7a]">
        Nenhum dado disponível
      </div>
    );
  }

  const { summary, monthlyRevenue, barbersPerformance, recentAppointments, lowStockProducts, alerts } = data;
  const isProfitable = summary.netProfit > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">📊 Dashboard</h1>
          <p className="text-[#7f7c7a]">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#7f7c7a]">Bem-vindo,</span>
          <span className="font-semibold text-[#060606]">{user?.name}</span>
        </div>
      </div>

      {/* Alertas */}
      {(alerts.lowStock > 0 || alerts.pendingAppointments > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {alerts.lowStock > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-yellow-800 font-medium">⚠️ Estoque baixo!</p>
                <p className="text-yellow-700 text-sm">
                  {alerts.lowStock} produtos com estoque abaixo de 5 unidades
                </p>
              </div>
            </div>
          )}
          {alerts.pendingAppointments > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Clock className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-blue-800 font-medium">📋 Agendamentos pendentes</p>
                <p className="text-blue-700 text-sm">
                  {alerts.pendingAppointments} agendamentos aguardando confirmação
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">💰 Faturamento</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign size={24} className="text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-[#7f7c7a]">
            {summary.servicesCount} serviços realizados
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">📈 Lucro Líquido</p>
              <p className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${isProfitable ? 'bg-green-100' : 'bg-red-100'}`}>
              {isProfitable ? (
                <TrendingUp size={24} className="text-green-600" />
              ) : (
                <TrendingDown size={24} className="text-red-600" />
              )}
            </div>
          </div>
          <div className="mt-2 text-sm text-[#7f7c7a]">
            Despesas: {formatCurrency(summary.totalExpenses)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">✂️ Barbeiros</p>
              <p className="text-2xl font-bold text-[#060606]">
                {summary.activeBarbers}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users size={24} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-[#7f7c7a]">
            {barbersPerformance.length} barbeiros ativos
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">👤 Clientes</p>
              <p className="text-2xl font-bold text-[#060606]">
                {summary.totalClients}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <User size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-[#7f7c7a]">
            {alerts.todayAppointments} agendamentos hoje
          </div>
        </div>
      </div>

      {/* Gráfico de Faturamento Mensal + Top Barbeiros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-[#060606] mb-4">
            📈 Faturamento Mensal
          </h2>
          <div className="h-64 flex items-end gap-2">
            {monthlyRevenue.values.map((value, index) => {
              const maxValue = Math.max(...monthlyRevenue.values, 1);
              const height = (value / maxValue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-xs font-medium text-[#7f7c7a]">
                      {formatCurrency(value)}
                    </span>
                    <div 
                      className="w-full bg-[#9c7f64] rounded-t transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(height, 5)}%`, minHeight: '20px' }}
                    />
                  </div>
                  <span className="text-xs text-[#7f7c7a]">
                    {monthlyRevenue.labels[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Barbeiros */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-[#060606] mb-4">
            🏆 Top Barbeiros
          </h2>
          <div className="space-y-3">
            {barbersPerformance.slice(0, 5).map((barber, index) => (
              <div key={barber.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                <div className="w-8 h-8 rounded-full bg-[#9c7f64]/20 flex items-center justify-center text-[#9c7f64] font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#060606]">{barber.name}</p>
                  <p className="text-xs text-[#7f7c7a]">{barber.services} serviços</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#9c7f64]">
                    {formatCurrency(barber.revenue)}
                  </p>
                  <p className="text-xs text-[#7f7c7a]">
                    Comissão: {formatCurrency(barber.commission)}
                  </p>
                </div>
              </div>
            ))}
            {barbersPerformance.length === 0 && (
              <p className="text-center text-[#7f7c7a] py-4">Nenhum barbeiro ativo</p>
            )}
          </div>
        </div>
      </div>

      {/* Últimos Agendamentos + Estoque Baixo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimos Agendamentos */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#060606] flex items-center gap-2">
              <Calendar size={20} className="text-[#9c7f64]" />
              Últimos Agendamentos
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#544941] uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#544941] uppercase">Barbeiro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#544941] uppercase">Serviço</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#544941] uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#544941] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentAppointments.slice(0, 5).map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#060606]">
                      {app.client}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#060606]">
                      {app.barber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#060606]">
                      {app.service}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#060606]">
                      {formatDate(app.date)} - {app.time}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentAppointments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#7f7c7a]">
                      Nenhum agendamento recente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Estoque Baixo */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
            <Package size={20} className="text-[#9c7f64]" />
            Estoque Baixo
          </h2>
          <div className="space-y-3">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition">
                  <div>
                    <p className="font-medium text-[#060606]">{product.name}</p>
                    <p className="text-sm text-[#7f7c7a]">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.stock} unidades
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[#7f7c7a]">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p>Todos os produtos com estoque OK</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;