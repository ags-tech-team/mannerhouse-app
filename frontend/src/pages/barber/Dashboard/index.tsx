import { useState, useEffect, useCallback } from 'react';
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
  Moon,
  BarChart,
  ChevronDown
} from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  userId: string;
}

interface DashboardData {
  summary: {
    totalBarbers: number;
    totalClients: number;
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
    barber: string;
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
    barber: string;
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
  alerts?: {
    pendingAppointments: number;
    todayAppointments: number;
  };
  // 🔥 NOVOS CAMPOS PARA O SELETOR
  barbers?: Barber[];
  selectedBarberId?: string;
  selectedBarberName?: string;
  isAdmin?: boolean;
}

const defaultData: DashboardData = {
  summary: {
    totalBarbers: 0,
    totalClients: 0,
    today: { appointments: 0, revenue: 0, commission: 0 },
    week: { appointments: 0, revenue: 0, commission: 0 },
    month: { 
      appointments: 0, 
      revenue: 0, 
      commission: 0,
      serviceRevenue: 0,
      productRevenue: 0,
      serviceCommission: 0,
      productCommission: 0
    }
  },
  todayAppointments: [],
  upcomingAppointments: [],
  cashRegister: { isOpen: false, openingTime: null },
  stats: { completedToday: 0, pendingToday: 0, cancelledToday: 0 },
  alerts: { pendingAppointments: 0, todayAppointments: 0 },
  barbers: [],
  selectedBarberId: '',
  selectedBarberName: '',
  isAdmin: false
};

const BarberDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(defaultData);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedBarber, setSelectedBarber] = useState<string>('');

  const loadDashboard = useCallback(async (barberId?: string) => {
    setLoading(true);
    try {
      console.log('📤 Buscando dashboard...');
      const params: any = {};
      if (barberId) {
        params.barberId = barberId;
      }
      
      const response = await api.get('/barber/dashboard', { params });
      
      console.log('📥 Resposta recebida:', response.data);
      
      if (response.data) {
        const mappedData: DashboardData = {
          summary: {
            totalBarbers: response.data.summary?.totalBarbers || 0,
            totalClients: response.data.summary?.totalClients || 0,
            today: {
              appointments: response.data.summary?.today?.appointments || 0,
              revenue: response.data.summary?.today?.revenue || 0,
              commission: response.data.summary?.today?.commission || 0,
            },
            week: {
              appointments: response.data.summary?.week?.appointments || 0,
              revenue: response.data.summary?.week?.revenue || 0,
              commission: response.data.summary?.week?.commission || 0,
            },
            month: {
              appointments: response.data.summary?.month?.appointments || 0,
              revenue: response.data.summary?.month?.revenue || 0,
              commission: response.data.summary?.month?.commission || 0,
              serviceRevenue: response.data.summary?.month?.serviceRevenue || 0,
              productRevenue: response.data.summary?.month?.productRevenue || 0,
              serviceCommission: response.data.summary?.month?.serviceCommission || 0,
              productCommission: response.data.summary?.month?.productCommission || 0,
            }
          },
          todayAppointments: response.data.todayAppointments || [],
          upcomingAppointments: response.data.upcomingAppointments || [],
          cashRegister: response.data.cashRegister || { isOpen: false, openingTime: null },
          stats: response.data.stats || { completedToday: 0, pendingToday: 0, cancelledToday: 0 },
          alerts: response.data.alerts || { pendingAppointments: 0, todayAppointments: 0 },
          barbers: response.data.barbers || [],
          selectedBarberId: response.data.selectedBarberId || '',
          selectedBarberName: response.data.selectedBarberName || '',
          isAdmin: response.data.isAdmin || false
        };
        
        console.log('📊 Dados mapeados:', mappedData);
        setData(mappedData);
        
        // 🔥 Se não tiver um barbeiro selecionado e tiver lista, seleciona o primeiro
        if (!selectedBarber && mappedData.barbers && mappedData.barbers.length > 0) {
          setSelectedBarber(mappedData.selectedBarberId || mappedData.barbers[0].id);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 Quando o barbeiro selecionado mudar, recarregar
  useEffect(() => {
    if (selectedBarber) {
      loadDashboard(selectedBarber);
    }
  }, [selectedBarber, loadDashboard]);

  // 🔥 Carregar inicial
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '';
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

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const cashRegister = data?.cashRegister || { isOpen: false, openingTime: null };
  const stats = data?.stats || { completedToday: 0, pendingToday: 0, cancelledToday: 0 };
  const summary = data?.summary || defaultData.summary;
  const alerts = data?.alerts || { pendingAppointments: 0, todayAppointments: 0 };
  const barbers = data?.barbers || [];
  const isAdmin = data?.isAdmin || false;

  // 🔥 Nome do barbeiro selecionado para exibir
  const selectedBarberName = data?.selectedBarberName || barbers.find(b => b.id === selectedBarber)?.name || 'Selecione um barbeiro';

  return (
    <div className="space-y-6">
      {/* Header com Saudação e Seletor */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#9c7f64]/10 rounded-full">
            <GreetingIcon size={28} className="text-[#9c7f64]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#060606]">
              {greeting.text}! 👋
            </h1>
            <p className="text-[#7f7c7a]">
              {currentTime.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {barbers.length > 1 && (
            <div className="relative w-full sm:w-56">
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                className="w-full appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent bg-white text-[#060606] text-sm"
              >
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    ✂️ {barber.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" size={18} />
            </div>
          )}
          
          {/* 🔥 NOME DO BARBEIRO SELECIONADO */}
          {!isAdmin && (
            <div className="px-4 py-2 bg-[#f5f0e8] rounded-lg">
              <span className="font-medium text-[#060606]">✂️ {selectedBarberName}</span>
            </div>
          )}
          
          {/* Status do Caixa */}
          <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            cashRegister.isOpen 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              cashRegister.isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium whitespace-nowrap">
              {cashRegister.isOpen 
                ? `Caixa aberto` 
                : 'Caixa fechado'}
            </span>
          </div>
        </div>
      </div>

      {/* 🔥 ALERTA DE AGENDAMENTOS PENDENTES */}
      {(alerts.pendingAppointments > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <Clock className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-blue-800 font-medium text-sm sm:text-base">
                📋 Agendamentos pendentes
              </p>
              <p className="text-blue-700 text-xs sm:text-sm">
                {alerts.pendingAppointments} agendamentos aguardando confirmação
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Hoje</p>
              <p className="text-2xl font-bold text-[#060606]">
                {summary.today.appointments || 0}
              </p>
              <p className="text-sm text-[#9c7f64]">
                {formatCurrency(summary.today.revenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-[#7f7c7a]">
            Comissão: {formatCurrency(summary.today.commission || 0)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Esta Semana</p>
              <p className="text-2xl font-bold text-[#060606]">
                {summary.week.appointments || 0}
              </p>
              <p className="text-sm text-[#9c7f64]">
                {formatCurrency(summary.week.revenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-[#7f7c7a]">
            Comissão: {formatCurrency(summary.week.commission || 0)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Este Mês</p>
              <p className="text-2xl font-bold text-[#060606]">
                {summary.month.appointments || 0}
              </p>
              <p className="text-sm text-[#9c7f64]">
                {formatCurrency(summary.month.revenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign size={24} className="text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-[#7f7c7a]">
            Comissão: {formatCurrency(summary.month.commission || 0)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Status Hoje</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={14} /> {stats.completedToday || 0}
                </span>
                <span className="flex items-center gap-1 text-xs text-yellow-600">
                  <Clock size={14} /> {stats.pendingToday || 0}
                </span>
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <XCircle size={14} /> {stats.cancelledToday || 0}
                </span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Users size={24} className="text-yellow-600" />
            </div>
          </div>
          <div className="mt-2 text-xs text-[#7f7c7a]">
            {data?.todayAppointments?.length || 0} agendamentos hoje
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
              Agenda de Hoje - {selectedBarberName}
              <span className="ml-2 text-sm font-normal text-[#7f7c7a]">
                ({data?.todayAppointments?.length || 0} agendamentos)
              </span>
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data?.todayAppointments && data.todayAppointments.length > 0 ? (
              data.todayAppointments.map((app) => (
                <div key={app.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-sm font-medium text-[#9c7f64]">
                      {app.time}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
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
            {data?.upcomingAppointments && data.upcomingAppointments.length > 0 ? (
              data.upcomingAppointments.map((app) => (
                <div key={app.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#060606]">{app.client}</p>
                      <p className="text-sm text-[#7f7c7a] flex items-center gap-1">
                        <User size={12} /> {app.service}
                      </p>
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

      {/* Resumo da Barbearia */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
          <BarChart size={20} className="text-[#9c7f64]" />
          Resumo da Barbearia
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#9c7f64]" />
              <p className="text-sm text-[#7f7c7a]">Barbeiros</p>
            </div>
            <p className="text-2xl font-bold text-[#060606] mt-1">
              {summary.totalBarbers || 0}
            </p>
          </div>

          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <User size={18} className="text-[#9c7f64]" />
              <p className="text-sm text-[#7f7c7a]">Clientes</p>
            </div>
            <p className="text-2xl font-bold text-[#060606] mt-1">
              {summary.totalClients || 0}
            </p>
          </div>

          <div className="bg-[#f5f0e8] p-4 rounded-lg border-2 border-[#9c7f64]">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-[#9c7f64]" />
              <p className="text-sm text-[#7f7c7a]">Faturamento Mês</p>
            </div>
            <p className="text-xl font-bold text-[#9c7f64] mt-1">
              {formatCurrency(summary.month.revenue || 0)}
            </p>
          </div>

          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Scissors size={18} className="text-[#9c7f64]" />
              <p className="text-sm text-[#7f7c7a]">Serviços Mês</p>
            </div>
            <p className="text-2xl font-bold text-[#060606] mt-1">
              {summary.month.appointments || 0}
            </p>
          </div>
        </div>

        {/* Detalhes do Mês - Serviços vs Produtos */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <p className="text-sm text-[#7f7c7a] flex items-center gap-1">
              <Scissors size={14} /> Serviços
            </p>
            <div className="flex justify-between mt-1">
              <span className="text-[#060606]">Faturamento:</span>
              <span className="font-medium text-[#9c7f64]">
                {formatCurrency(summary.month.serviceRevenue || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#7f7c7a]">Comissão:</span>
              <span className="font-medium text-[#060606]">
                {formatCurrency(summary.month.serviceCommission || 0)}
              </span>
            </div>
          </div>

          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <p className="text-sm text-[#7f7c7a] flex items-center gap-1">
              <ShoppingBag size={14} /> Produtos
            </p>
            <div className="flex justify-between mt-1">
              <span className="text-[#060606]">Faturamento:</span>
              <span className="font-medium text-[#9c7f64]">
                {formatCurrency(summary.month.productRevenue || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#7f7c7a]">Comissão:</span>
              <span className="font-medium text-[#060606]">
                {formatCurrency(summary.month.productCommission || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarberDashboard;