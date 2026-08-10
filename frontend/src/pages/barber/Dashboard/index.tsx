import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../api/client';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Scissors,
  ShoppingBag,
  User,
  Phone,
  ChevronRight,
  Coffee,
  Sun,
  Moon
} from 'lucide-react';

interface DashboardData {
  barber: {
    id: string;
    name: string;
    email: string;
    phone: string;
    commissionRate: number;
  };
  summary: {
    today: {
      appointments: number;
      revenue: number;
      commission: number;
    };
    week: {
      appointments: number;
      revenue: number;
      commission: number;
    };
    month: {
      appointments: number;
      revenue: number;
      commission: number;
      serviceRevenue: number;
      productRevenue: number;
      serviceCommission: number;
      productCommission: number;
    };
  };
  todayAppointments: Array<{
    id: string;
    time: string;
    client: string;
    phone: string;
    service: string;
    price: number;
    status: string;
    isCompleted: boolean;
  }>;
  upcomingAppointments: Array<{
    id: string;
    date: string;
    time: string;
    client: string;
    service: string;
    status: string;
  }>;
  cashRegister: {
    isOpen: boolean;
    openingTime: string | null;
  };
  stats: {
    completedToday: number;
    pendingToday: number;
    cancelledToday: number;
  };
}

const BarberDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboard();
    
    // Atualizar relógio a cada minuto
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/barber/dashboard');
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
    return new Date(date).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Bom dia', icon: Sun };
    if (hour < 18) return { text: 'Boa tarde', icon: Sun };
    return { text: 'Boa noite', icon: Moon };
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

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'confirmed': return <CheckCircle size={16} className="text-blue-600" />;
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'cancelled': return <XCircle size={16} className="text-red-600" />;
      default: return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#9c7f64] mx-auto"></div>
          <p className="mt-4 text-[#7f7c7a]">Carregando seu dia...</p>
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

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  return (
    <div className="space-y-6">
      {/* Header com Saudação */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#9c7f64]/10 rounded-full">
              <GreetingIcon size={28} className="text-[#9c7f64]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#060606]">
                {greeting.text}, {data.barber.name}
              </h1>
              <p className="text-[#7f7c7a]">
                {currentTime.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status do Caixa */}
          <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            data.cashRegister.isOpen 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              data.cashRegister.isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium">
              {data.cashRegister.isOpen 
                ? `Caixa aberto desde ${data.cashRegister.openingTime}` 
                : 'Caixa fechado'}
            </span>
          </div>
          <div className="text-sm text-[#7f7c7a]">
            Comissão: {data.barber.commissionRate}%
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Hoje</p>
              <p className="text-2xl font-bold text-[#060606]">
                {data.summary.today.appointments}
              </p>
              <p className="text-sm text-[#9c7f64]">
                {formatCurrency(data.summary.today.revenue)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-[#7f7c7a]">
            Comissão: {formatCurrency(data.summary.today.commission)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Esta Semana</p>
              <p className="text-2xl font-bold text-[#060606]">
                {data.summary.week.appointments}
              </p>
              <p className="text-sm text-[#9c7f64]">
                {formatCurrency(data.summary.week.revenue)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-[#7f7c7a]">
            Comissão: {formatCurrency(data.summary.week.commission)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Este Mês</p>
              <p className="text-2xl font-bold text-[#060606]">
                {data.summary.month.appointments}
              </p>
              <p className="text-sm text-[#9c7f64]">
                {formatCurrency(data.summary.month.revenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign size={24} className="text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-[#7f7c7a]">
            Comissão: {formatCurrency(data.summary.month.commission)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Status Hoje</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={14} /> {data.stats.completedToday}
                </span>
                <span className="flex items-center gap-1 text-xs text-yellow-600">
                  <Clock size={14} /> {data.stats.pendingToday}
                </span>
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <XCircle size={14} /> {data.stats.cancelledToday}
                </span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Users size={24} className="text-yellow-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-[#7f7c7a]">
            {data.todayAppointments.length} agendamentos hoje
          </div>
        </div>
      </div>

      {/* Agenda do Dia + Próximos Agendamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda de Hoje */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#060606] flex items-center gap-2">
              <Clock size={20} className="text-[#9c7f64]" />
              Agenda de Hoje
              <span className="ml-2 text-sm font-normal text-[#7f7c7a]">
                ({data.todayAppointments.length} agendamentos)
              </span>
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data.todayAppointments.length > 0 ? (
              data.todayAppointments.map((app) => (
                <div key={app.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-sm font-medium text-[#9c7f64]">
                      {app.time}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#060606]">{app.client}</p>
                        {app.isCompleted && (
                          <CheckCircle size={14} className="text-green-600" />
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(app.status)}`}>
                          {getStatusLabel(app.status)}
                        </span>
                      </div>
                      <p className="text-sm text-[#7f7c7a]">{app.service}</p>
                      {app.phone && (
                        <p className="text-xs text-[#7f7c7a] flex items-center gap-1">
                          <Phone size={12} /> {app.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[#9c7f64]">
                      {formatCurrency(app.price)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#7f7c7a]">
                <Coffee size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum agendamento para hoje</p>
                <p className="text-sm">Aproveite para descansar! 😊</p>
              </div>
            )}
          </div>
        </div>

        {/* Próximos Agendamentos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#060606] flex items-center gap-2">
              <Calendar size={20} className="text-[#9c7f64]" />
              Próximos Agendamentos
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data.upcomingAppointments.length > 0 ? (
              data.upcomingAppointments.map((app) => (
                <div key={app.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#060606]">{app.client}</p>
                      <p className="text-sm text-[#7f7c7a]">{app.service}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#9c7f64]">
                        {formatDate(app.date)} - {app.time}
                      </p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#7f7c7a]">
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum agendamento futuro</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Mensal - Serviços vs Produtos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-[#9c7f64]" />
          Resumo do Mês
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <p className="text-sm text-[#7f7c7a]">Serviços</p>
            <p className="text-xl font-bold text-[#060606]">
              {data.summary.month.serviceRevenue ? data.summary.month.appointments : 0}
            </p>
            <p className="text-sm text-[#9c7f64]">
              {formatCurrency(data.summary.month.serviceRevenue || 0)}
            </p>
            <p className="text-xs text-[#7f7c7a]">
              Comissão: {formatCurrency(data.summary.month.serviceCommission || 0)}
            </p>
          </div>
          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <p className="text-sm text-[#7f7c7a]">Produtos</p>
            <p className="text-xl font-bold text-[#060606]">
              {data.summary.month.productRevenue ? 'Vendas' : '0'}
            </p>
            <p className="text-sm text-[#9c7f64]">
              {formatCurrency(data.summary.month.productRevenue || 0)}
            </p>
            <p className="text-xs text-[#7f7c7a]">
              Comissão: {formatCurrency(data.summary.month.productCommission || 0)}
            </p>
          </div>
          <div className="bg-[#f5f0e8] p-4 rounded-lg border-2 border-[#9c7f64]">
            <p className="text-sm text-[#7f7c7a]">Total Faturamento</p>
            <p className="text-xl font-bold text-[#9c7f64]">
              {formatCurrency(data.summary.month.revenue || 0)}
            </p>
          </div>
          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <p className="text-sm text-[#7f7c7a]">Comissão Total</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(data.summary.month.commission || 0)}
            </p>
            <p className="text-xs text-[#7f7c7a]">
              Taxa: {data.barber.commissionRate}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarberDashboard;