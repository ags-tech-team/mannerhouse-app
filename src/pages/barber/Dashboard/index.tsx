import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar, 
  Clock, 
  Scissors,
  Unlock,
  Lock,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

// Tipos
interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  service: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface WalkIn {
  id: string;
  clientName: string;
  clientPhone: string;
  service: string;
  arrivalTime: string;
  status: 'waiting' | 'in_progress' | 'completed';
}

interface DaySummary {
  date: string;
  totalRevenue: number;
  totalServices: number;
  totalCommission: number;
  cashStatus: 'open' | 'closed';
  appointments: Appointment[];
  walkIns: WalkIn[];
}

const BarberDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [today, setToday] = useState(new Date());

  // Carregar dados mockados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    // Dados mockados para o dia
    const mockAppointments: Appointment[] = [
      { id: '1', clientName: 'João Silva', clientPhone: '(11) 99999-9999', service: 'Corte + Barba', time: '10:00', status: 'scheduled' },
      { id: '2', clientName: 'Carlos Souza', clientPhone: '(11) 88888-8888', service: 'Corte Degradê', time: '14:30', status: 'scheduled' },
      { id: '3', clientName: 'Pedro Oliveira', clientPhone: '(11) 77777-7777', service: 'Barba', time: '16:00', status: 'scheduled' },
    ];

    const mockWalkIns: WalkIn[] = [
      { id: 'w1', clientName: 'Rafael Santos', clientPhone: '(11) 66666-6666', service: 'Corte', arrivalTime: '09:15', status: 'waiting' },
      { id: 'w2', clientName: 'Marcos Lima', clientPhone: '(11) 55555-5555', service: 'Barba', arrivalTime: '09:45', status: 'in_progress' },
    ];

    const todayStr = today.toISOString().split('T')[0];
    
    setSummary({
      date: todayStr,
      totalRevenue: 320.00,
      totalServices: 4,
      totalCommission: 64.00,
      cashStatus: 'open',
      appointments: mockAppointments,
      walkIns: mockWalkIns,
    });

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      case 'waiting': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'scheduled': return 'Agendado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      case 'waiting': return 'Aguardando';
      case 'in_progress': return 'Em andamento';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#7f7c7a]">Carregando dados do dia...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#7f7c7a]">Nenhum dado disponível</div>
      </div>
    );
  }

  // Juntar agendamentos + walk-ins e ordenar por hora
  const allAppointments = [...summary.appointments].sort((a, b) => a.time.localeCompare(b.time));
  const allWalkIns = [...summary.walkIns].sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
  const nextAppointments = allAppointments.slice(0, 3);
  const nextWalkIns = allWalkIns.filter(w => w.status === 'waiting' || w.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">Meu Painel</h1>
          <p className="text-[#7f7c7a]">
            {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            summary.cashStatus === 'open' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {summary.cashStatus === 'open' ? <Unlock size={14} /> : <Lock size={14} />}
            {summary.cashStatus === 'open' ? 'Caixa Aberto' : 'Caixa Fechado'}
          </span>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Faturamento Hoje</p>
              <p className="text-2xl font-bold text-[#060606]">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-sm text-[#7f7c7a] mt-1">{summary.totalServices} serviços realizados</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Comissão</p>
              <p className="text-2xl font-bold text-[#060606]">{formatCurrency(summary.totalCommission)}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <TrendingUp size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-[#7f7c7a] mt-1">20% de comissão sobre serviços</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Hoje</p>
              <p className="text-2xl font-bold text-[#060606]">
                {summary.appointments.length + summary.walkIns.length}
              </p>
              <p className="text-sm text-[#7f7c7a]">atendimentos</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="flex gap-2 mt-1 text-xs">
            <span className="text-blue-600">{summary.appointments.length} agendados</span>
            <span className="text-green-600">{summary.walkIns.length} ordem</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Ticket Médio</p>
              <p className="text-2xl font-bold text-[#060606]">
                {summary.totalServices > 0 
                  ? formatCurrency(summary.totalRevenue / summary.totalServices) 
                  : 'R$ 0,00'}
              </p>
            </div>
            <div className="p-3 bg-rose-100 rounded-full">
              <Scissors size={20} className="text-rose-600" />
            </div>
          </div>
          <p className="text-sm text-[#7f7c7a] mt-1">por serviço realizado</p>
        </div>
      </div>

      {/* Próximos Atendimentos e Fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Agendamentos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#060606] flex items-center gap-2">
              <Calendar size={20} className="text-[#9c7f64]" />
              Próximos Agendamentos
            </h3>
            <span className="text-sm text-[#7f7c7a]">{summary.appointments.length} hoje</span>
          </div>
          {nextAppointments.length === 0 ? (
            <div className="text-center py-6 text-[#7f7c7a] text-sm">
              Nenhum agendamento para hoje
            </div>
          ) : (
            <div className="space-y-3">
              {nextAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#f5f0e8] p-2 rounded-full">
                      <Clock size={14} className="text-[#9c7f64]" />
                    </div>
                    <div>
                      <p className="font-medium text-[#060606]">{appointment.clientName}</p>
                      <p className="text-sm text-[#7f7c7a]">{appointment.service}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#9c7f64]">{appointment.time}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ordem de Chegada */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#060606] flex items-center gap-2">
              <Users size={20} className="text-[#9c7f64]" />
              Ordem de Chegada
            </h3>
            <span className="text-sm text-[#7f7c7a]">{nextWalkIns.length} na fila</span>
          </div>
          {nextWalkIns.length === 0 ? (
            <div className="text-center py-6 text-[#7f7c7a] text-sm">
              Nenhum cliente na fila de espera
            </div>
          ) : (
            <div className="space-y-3">
              {nextWalkIns.map((walkIn) => (
                <div key={walkIn.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      walkIn.status === 'waiting' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <Users size={14} className={
                        walkIn.status === 'waiting' ? 'text-yellow-600' : 'text-blue-600'
                      } />
                    </div>
                    <div>
                      <p className="font-medium text-[#060606]">{walkIn.clientName}</p>
                      <p className="text-sm text-[#7f7c7a]">{walkIn.service}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#7f7c7a]">{walkIn.arrivalTime}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(walkIn.status)}`}>
                      {getStatusText(walkIn.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumo do dia */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
          <Clock size={20} className="text-[#9c7f64]" />
          Resumo do Dia
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#f5f0e8] p-4 rounded-lg text-center">
            <p className="text-sm text-[#7f7c7a]">Serviços</p>
            <p className="text-2xl font-bold text-[#060606]">{summary.totalServices}</p>
          </div>
          <div className="bg-[#f5f0e8] p-4 rounded-lg text-center">
            <p className="text-sm text-[#7f7c7a]">Faturamento</p>
            <p className="text-2xl font-bold text-[#060606]">{formatCurrency(summary.totalRevenue)}</p>
          </div>
          <div className="bg-[#f5f0e8] p-4 rounded-lg text-center">
            <p className="text-sm text-[#7f7c7a]">Comissão</p>
            <p className="text-2xl font-bold text-[#060606]">{formatCurrency(summary.totalCommission)}</p>
          </div>
          <div className="bg-[#f5f0e8] p-4 rounded-lg text-center">
            <p className="text-sm text-[#7f7c7a]">Ticket Médio</p>
            <p className="text-2xl font-bold text-[#060606]">
              {summary.totalServices > 0 
                ? formatCurrency(summary.totalRevenue / summary.totalServices) 
                : 'R$ 0,00'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarberDashboard;