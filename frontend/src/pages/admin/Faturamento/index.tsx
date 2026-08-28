import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  PiggyBank,
  Users,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  CalendarDays
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

const AdminFaturamento = () => {
  const [data, setData] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodType, setPeriodType] = useState<'month' | 'week'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear();
  });
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, periodType, weekOffset]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (periodType === 'week') {
        params.period = 'week';
        // Calcular a semana com offset
        const now = new Date();
        now.setDate(now.getDate() + (weekOffset * 7));
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        params.startDate = startOfWeek.toISOString().split('T')[0];
        params.endDate = endOfWeek.toISOString().split('T')[0];
        
        console.log('📅 Semana selecionada:', params.startDate, 'até', params.endDate); // 🔥 DEBUG
      } else {
        params.month = selectedMonth;
        console.log('📅 Mês selecionado:', selectedMonth); // 🔥 DEBUG
      }
      
      const response = await api.get('/revenues/dashboard', { params });
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeWeek = (delta: number) => {
    setWeekOffset(weekOffset + delta);
  };

  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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
      outros: '📌 Outros'
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-[#7f7c7a]">Nenhum dado encontrado</div>;
  }

  const { summary, commissions, expenses } = data;
  const isProfitable = summary.netProfit > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">📊 Faturamento</h1>
          <p className="text-[#7f7c7a]">Visão completa das finanças da barbearia</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* 🔥 SELETOR DE PERÍODO */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setPeriodType('month'); setWeekOffset(0); }}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                periodType === 'month' ? 'bg-white shadow text-[#060606]' : 'text-[#7f7c7a] hover:text-[#060606]'
              }`}
            >
              📅 Mês
            </button>
            <button
              onClick={() => { setPeriodType('week'); setWeekOffset(0); }}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                periodType === 'week' ? 'bg-white shadow text-[#060606]' : 'text-[#7f7c7a] hover:text-[#060606]'
              }`}
            >
              📆 Semana
            </button>
          </div>
          
          {/* 🔥 NAVEGAÇÃO */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2">
            <button
              onClick={() => periodType === 'week' ? changeWeek(-1) : changeMonth(-1)}
              className="p-1 hover:bg-gray-100 rounded transition"
            >
              <ChevronLeft size={16} className="text-[#7f7c7a]" />
            </button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {formatPeriod()}
            </span>
            <button
              onClick={() => periodType === 'week' ? changeWeek(1) : changeMonth(1)}
              className="p-1 hover:bg-gray-100 rounded transition"
            >
              <ChevronRight size={16} className="text-[#7f7c7a]" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Receita Total</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-[#7f7c7a]">
            <span>Serviços: {formatCurrency(summary.revenueFromServices)}</span>
            <br />
            <span>Produtos: {formatCurrency(summary.revenueFromProducts)}</span>
            <br />
            <span className="text-[#9c7f64] font-medium">Mensal: {formatCurrency(summary.revenueFromMonthly || 0)}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Despesas</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown size={20} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Comissões</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(commissions.total)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Users size={20} className="text-orange-600" />
            </div>
          </div>
          <div className="mt-2 text-sm text-[#7f7c7a]">
            <span>Serviços: {formatCurrency(commissions.service)}</span>
            <br />
            <span>Produtos: {formatCurrency(commissions.product)}</span>
            <br />
            <span className="text-[#9c7f64] font-medium">Mensal: {formatCurrency(commissions.monthly || 0)}</span>
          </div>
        </div>

        <div className={`p-6 rounded-lg shadow border-2 ${
          isProfitable 
            ? 'bg-green-50 border-green-500' 
            : 'bg-red-50 border-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Lucro Líquido</p>
              <p className={`text-2xl font-bold ${
                isProfitable ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${
              isProfitable ? 'bg-green-200' : 'bg-red-200'
            }`}>
              <PiggyBank size={20} className={isProfitable ? 'text-green-600' : 'text-red-600'} />
            </div>
          </div>
        </div>
      </div>

      {/* Comissões por Barbeiro */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
          <Users size={20} className="text-[#9c7f64]" />
          Comissões por Barbeiro
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#f5f0e8]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Barbeiro</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Serviços</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Produtos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Mensal</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {commissions.byBarber.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-[#7f7c7a]">
                    Nenhuma comissão registrada neste período
                  </td>
                </tr>
              ) : (
                commissions.byBarber.map((barber, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-[#060606]">
                      {barber.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[#060606]">
                      {formatCurrency(barber.serviceCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[#060606]">
                      {formatCurrency(barber.productCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[#060606]">
                      {formatCurrency(barber.monthlyCommission || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-[#9c7f64]">
                      {formatCurrency(barber.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Despesas por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
            <TrendingDown size={20} className="text-red-500" />
            Despesas por Categoria
          </h2>
          <div className="space-y-2">
            {Object.entries(expenses.byCategory).map(([category, total]) => (
              <div key={category} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span className="text-[#060606]">{getCategoryLabel(category)}</span>
                <span className="font-medium text-red-600">{formatCurrency(total)}</span>
              </div>
            ))}
            {Object.keys(expenses.byCategory).length === 0 && (
              <p className="text-[#7f7c7a] text-center py-4">Nenhuma despesa registrada</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
            <Package size={20} className="text-[#9c7f64]" />
            Resumo Financeiro
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-100">
              <span className="text-[#7f7c7a]">Receita Total</span>
              <span className="font-medium text-green-600">{formatCurrency(summary.totalRevenue)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-100">
              <span className="text-[#7f7c7a]">(-) Despesas</span>
              <span className="font-medium text-red-600">-{formatCurrency(summary.totalExpenses)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-100">
              <span className="text-[#7f7c7a]">(-) Comissões</span>
              <span className="font-medium text-orange-600">-{formatCurrency(commissions.total)}</span>
            </div>
            <div className={`flex justify-between p-2 rounded-lg ${
              isProfitable ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <span className="font-bold text-[#060606]">Lucro Líquido</span>
              <span className={`font-bold text-lg ${
                isProfitable ? 'text-green-600' : 'text-red-600'
              }`}>
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