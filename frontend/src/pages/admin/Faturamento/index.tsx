import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Users,
  Package,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface FinancialDashboard {
  period: {
    type: string;
    startDate: string;
    endDate: string;
    month: number;
    year: number;
    monthString: string;
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalCommissions: number;
    netProfit: number;
    revenueFromServices: number;
    revenueFromProducts: number;
    revenueFromMonthly: number;
  };
  commissions: {
    total: number;
    service: number;
    product: number;
    monthly: number;
    byBarber: Array<{
      name: string;
      serviceCommission: number;
      productCommission: number;
      monthlyCommission: number;
      total: number;
    }>;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
    list: Array<{
      id: string;
      description: string;
      category: string;
      value: number;
      date: string;
    }>;
  };
}

interface BarberData {
  id: string;
  name: string;
  weeklyAdvance: number;
}

const AdminFaturamento = () => {
  const [data, setData] = useState<FinancialDashboard | null>(null);
  const [barbers, setBarbers] = useState<BarberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'month' | 'week'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [weekOffset, setWeekOffset] = useState(0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
    loadBarbers();
  }, [selectedMonth, selectedYear, periodType, weekOffset]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (periodType === 'week') {
        params.period = 'week';
        const now = new Date();
        now.setDate(now.getDate() + weekOffset * 7);
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        params.startDate = startOfWeek.toISOString().split('T')[0];
        params.endDate = endOfWeek.toISOString().split('T')[0];
      } else {
        params.month = selectedMonth;
      }
      const response = await api.get('/revenues/dashboard', { params });
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBarbers = async () => {
    try {
      const response = await api.get('/barbers', { params: { includeInactive: true } });
      const barbersData = response.data.map((b: any) => ({
        id: b.id,
        name: b.name,
        weeklyAdvance: b.weeklyAdvance || b.weekly_advance || 0,
      }));
      console.log('📦 Barbers carregados:', barbersData);
      setBarbers(barbersData);
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  };

  const getWeekKey = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return `paid_${startOfWeek.toISOString().split('T')[0]}`;
  };

  const isPaid = (barberId: string) => {
    const key = `${getWeekKey()}_${barberId}`;
    return localStorage.getItem(key) === 'true';
  };

  const markAsPaid = (barberId: string) => {
    const key = `${getWeekKey()}_${barberId}`;
    localStorage.setItem(key, 'true');
    setBarbers([...barbers]);
  };

  const markAsUnpaid = (barberId: string) => {
    const key = `${getWeekKey()}_${barberId}`;
    localStorage.removeItem(key);
    setBarbers([...barbers]);
  };

  const handleAddAdvance = async (barberId: string) => {
    const value = prompt('Digite o valor do vale (R$):', '0');
    if (value === null) return;
    const amount = parseFloat(value.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Digite um valor válido maior que zero.');
      return;
    }
    setUpdating(true);
    try {
      await api.put(`/barbers/${barberId}/advance`, {
        value: amount,
        action: 'add',
      });
      await loadBarbers();
      alert(`✅ Vale de R$ ${amount.toFixed(2)} adicionado com sucesso!`);
    } catch (error) {
      console.error('Erro ao adicionar vale:', error);
      alert('❌ Erro ao adicionar vale.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePayAdvance = async (barberId: string) => {
    if (!window.confirm('Confirmar pagamento? Isso irá zerar o vale e marcar como pago.')) return;
    setUpdating(true);
    try {
      await api.put(`/barbers/${barberId}/advance`, {
        value: 0,
        action: 'reset',
      });
      markAsPaid(barberId);
      await loadBarbers();
      alert('✅ Pagamento registrado! Vale zerado.');
    } catch (error) {
      console.error('Erro ao pagar:', error);
      alert('❌ Erro ao registrar pagamento.');
    } finally {
      setUpdating(false);
    }
  };

  const handleResetAllAdvances = async () => {
    if (!window.confirm('Tem certeza que deseja resetar todos os vales de todos os barbeiros?')) return;
    setUpdating(true);
    try {
      await api.post('/barbers/advance/reset-all');
      await loadBarbers();
      alert('✅ Todos os vales foram resetados!');
    } catch (error) {
      console.error('Erro ao resetar vales:', error);
      alert('❌ Erro ao resetar vales.');
    } finally {
      setUpdating(false);
    }
  };

  const changeWeek = (delta: number) => setWeekOffset(weekOffset + delta);
  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPeriod = () => {
    if (periodType === 'week' && data?.period) {
      const start = new Date(data.period.startDate);
      const end = new Date(data.period.endDate);
      return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
    }
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[selectedMonth - 1]} ${selectedYear}`;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      agua: '💧 Água',
      luz: '⚡ Luz',
      internet: '🌐 Internet',
      aluguel: '🏠 Aluguel',
      salario: '👨‍💼 Salários',
      produtos: '📦 Produtos',
      manutencao: '🔧 Manutenção',
      outros: '📌 Outros',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8 sm:py-12">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#9c7f64]" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 sm:py-12 text-[#7f7c7a] text-sm sm:text-base">Nenhum dado encontrado</div>;
  }

  const { summary, commissions, expenses } = data;
  const isProfitable = summary.netProfit > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#060606]">📊 Faturamento</h1>
          <p className="text-sm sm:text-base text-[#7f7c7a]">Visão completa das finanças da barbearia</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setPeriodType('month'); setWeekOffset(0); }}
              className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-sm transition ${periodType === 'month' ? 'bg-white shadow text-[#060606]' : 'text-[#7f7c7a] hover:text-[#060606]'}`}
            >
              📅 Mês
            </button>
            <button
              onClick={() => { setPeriodType('week'); setWeekOffset(0); }}
              className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-sm transition ${periodType === 'week' ? 'bg-white shadow text-[#060606]' : 'text-[#7f7c7a] hover:text-[#060606]'}`}
            >
              📆 Semana
            </button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg shadow px-2 sm:px-3 py-1.5 sm:py-2">
            <button onClick={() => periodType === 'week' ? changeWeek(-1) : changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded transition">
              <ChevronLeft size={14} className="sm:w-4 sm:h-4 text-[#7f7c7a]" />
            </button>
            <span className="text-[10px] sm:text-sm font-medium min-w-[120px] sm:min-w-[180px] text-center truncate">
              {formatPeriod()}
            </span>
            <button onClick={() => periodType === 'week' ? changeWeek(1) : changeMonth(1)} className="p-1 hover:bg-gray-100 rounded transition">
              <ChevronRight size={14} className="sm:w-4 sm:h-4 text-[#7f7c7a]" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm font-medium text-[#7f7c7a]">Receita Total</p>
              <p className="text-sm sm:text-2xl font-bold text-green-600 truncate">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-full"><TrendingUp size={14} className="sm:w-5 sm:h-5 text-green-600" /></div>
          </div>
          <div className="mt-1 sm:mt-2 text-[9px] sm:text-sm text-[#7f7c7a]">
            <span>Serviços: {formatCurrency(summary.revenueFromServices)}</span><br />
            <span>Produtos: {formatCurrency(summary.revenueFromProducts)}</span><br />
            <span className="text-[#9c7f64] font-medium">Mensal: {formatCurrency(summary.revenueFromMonthly || 0)}</span>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm font-medium text-[#7f7c7a]">Despesas</p>
              <p className="text-sm sm:text-2xl font-bold text-red-600 truncate">{formatCurrency(summary.totalExpenses)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-red-100 rounded-full"><TrendingDown size={14} className="sm:w-5 sm:h-5 text-red-600" /></div>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm font-medium text-[#7f7c7a]">Comissões</p>
              <p className="text-sm sm:text-2xl font-bold text-orange-600 truncate">{formatCurrency(commissions.total)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-full"><Users size={14} className="sm:w-5 sm:h-5 text-orange-600" /></div>
          </div>
          <div className="mt-1 sm:mt-2 text-[9px] sm:text-sm text-[#7f7c7a]">
            <span>Serviços: {formatCurrency(commissions.service)}</span><br />
            <span>Produtos: {formatCurrency(commissions.product)}</span><br />
            <span className="text-[#9c7f64] font-medium">Mensal: {formatCurrency(commissions.monthly || 0)}</span>
          </div>
        </div>
        <div className={`p-4 sm:p-6 rounded-lg shadow border-2 ${isProfitable ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm font-medium text-[#7f7c7a]">Lucro Líquido</p>
              <p className={`text-sm sm:text-2xl font-bold truncate ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
            <div className={`p-2 sm:p-3 rounded-full ${isProfitable ? 'bg-green-200' : 'bg-red-200'}`}>
              <PiggyBank size={14} className="sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Comissões por Barbeiro */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-center mb-3 sm:mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-[#060606] flex items-center gap-2">
            <Users size={18} className="sm:w-5 sm:h-5 text-[#9c7f64]" />
            Comissões por Barbeiro
          </h2>
          <button
            onClick={handleResetAllAdvances}
            disabled={updating}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Resetar todos os vales
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[700px] sm:min-w-full">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Barbeiro</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Serviços</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Produtos</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Mensal</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Total</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Vale (R$)</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Comissão Líquida</th>
                  <th className="px-2 py-1.5 text-center font-medium text-[#544941] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {commissions.byBarber.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-3 text-center text-[#7f7c7a]">Nenhuma comissão registrada neste período</td>
                  </tr>
                ) : (
                  commissions.byBarber.map((barber, index) => {
                    const barberInfo = barbers.find(b =>
                      b.name.trim().toLowerCase() === barber.name.trim().toLowerCase()
                    );
                    const advance = barberInfo ? barberInfo.weeklyAdvance : 0;
                    const liquid = barber.total - advance;
                    const paid = barberInfo ? isPaid(barberInfo.id) : false;

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 whitespace-nowrap font-medium text-[#060606]">{barber.name}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-right text-[#060606]">{formatCurrency(barber.serviceCommission)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-right text-[#060606]">{formatCurrency(barber.productCommission)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-right text-[#060606]">{formatCurrency(barber.monthlyCommission || 0)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-right font-bold text-[#9c7f64]">{formatCurrency(barber.total)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-right text-red-600 font-medium">
                          {formatCurrency(advance)}
                          {barberInfo && (
                            <button
                              onClick={() => handleAddAdvance(barberInfo.id)}
                              disabled={updating}
                              className="ml-1 text-blue-600 hover:text-blue-800 transition"
                              title="Adicionar vale"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-right font-bold text-green-600">
                          {formatCurrency(liquid)}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-center space-x-1">
                          {barberInfo && (
                            <>
                              <button
                                onClick={() => handlePayAdvance(barberInfo.id)}
                                disabled={updating}
                                className={`p-1 rounded transition ${paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'}`}
                                title={paid ? 'Já pago' : 'Pagar comissão'}
                              >
                                {paid ? <CheckCircle size={16} /> : <DollarSign size={16} />}
                              </button>
                              {paid && (
                                <button
                                  onClick={() => markAsUnpaid(barberInfo.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition"
                                  title="Desmarcar como pago"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-[#7f7c7a] flex flex-wrap gap-3">
          <span><CheckCircle size={12} className="inline text-green-600" /> Pago</span>
          <span><DollarSign size={12} className="inline text-gray-600" /> Não pago</span>
          <span><Plus size={12} className="inline text-blue-600" /> Adicionar vale</span>
          <span>💡 Os pagamentos são resetados automaticamente a cada semana.</span>
        </div>
      </div>

      {/* Despesas e Resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-[#060606] mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="sm:w-5 sm:h-5 text-red-500" />
            Despesas por Categoria
          </h2>
          <div className="space-y-1.5 sm:space-y-2">
            {Object.entries(expenses.byCategory).map(([category, total]) => (
              <div key={category} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded text-sm sm:text-base">
                <span className="text-[#060606]">{getCategoryLabel(category)}</span>
                <span className="font-medium text-red-600">{formatCurrency(total)}</span>
              </div>
            ))}
            {Object.keys(expenses.byCategory).length === 0 && (
              <p className="text-[#7f7c7a] text-center py-4 sm:py-6 text-sm">Nenhuma despesa registrada</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-[#060606] mb-3 sm:mb-4 flex items-center gap-2">
            <Package size={18} className="sm:w-5 sm:h-5 text-[#9c7f64]" />
            Resumo Financeiro
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-100 text-sm sm:text-base">
              <span className="text-[#7f7c7a]">Receita Total</span>
              <span className="font-medium text-green-600">{formatCurrency(summary.totalRevenue)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-100 text-sm sm:text-base">
              <span className="text-[#7f7c7a]">(-) Despesas</span>
              <span className="font-medium text-red-600">-{formatCurrency(summary.totalExpenses)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-100 text-sm sm:text-base">
              <span className="text-[#7f7c7a]">(-) Comissões</span>
              <span className="font-medium text-orange-600">-{formatCurrency(commissions.total)}</span>
            </div>
            <div className={`flex justify-between p-2 sm:p-3 rounded-lg text-sm sm:text-base ${isProfitable ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className="font-bold text-[#060606]">Lucro Líquido</span>
              <span className={`font-bold text-base sm:text-lg ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFaturamento;