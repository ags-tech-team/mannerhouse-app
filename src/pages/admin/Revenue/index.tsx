import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  Printer,
  BarChart3,
  Package,
  Scissors,
  Users
} from 'lucide-react';

interface ResumoFinanceiro {
  totalServicos: number;
  totalProdutos: number;
  totalDespesas: number;
  totalComissoes: number;
  lucroLiquido: number;
  servicos: { quantidade: number; valor: number };
  produtos: { quantidade: number; valor: number };
  despesas: { quantidade: number; valor: number };
  comissoes: { quantidade: number; valor: number };
  ticketMedio: number;
  periodos: { diario: number; semanal: number; mensal: number };
}

const mockResumo: ResumoFinanceiro = {
  totalServicos: 12580.50,
  totalProdutos: 3420.00,
  totalDespesas: 2150.00,
  totalComissoes: 2516.10,
  lucroLiquido: 11334.40,
  servicos: { quantidade: 156, valor: 12580.50 },
  produtos: { quantidade: 89, valor: 3420.00 },
  despesas: { quantidade: 12, valor: 2150.00 },
  comissoes: { quantidade: 156, valor: 2516.10 },
  ticketMedio: 80.64,
  periodos: { diario: 1280.00, semanal: 8760.00, mensal: 34200.00 },
};

const topServicos = [
  { nome: 'Corte Degradê', quantidade: 45, valor: 3600.00 },
  { nome: 'Corte + Barba', quantidade: 32, valor: 3840.00 },
  { nome: 'Barba Completa', quantidade: 28, valor: 1960.00 },
  { nome: 'Corte Máquina', quantidade: 25, valor: 1500.00 },
  { nome: 'Platinado', quantidade: 18, valor: 2160.00 },
];

const topProdutos = [
  { nome: 'Pomada Modeladora', quantidade: 34, valor: 680.00 },
  { nome: 'Óleo de Barba', quantidade: 28, valor: 560.00 },
  { nome: 'Shampoo Especial', quantidade: 22, valor: 440.00 },
  { nome: 'Cerveja Artesanal', quantidade: 5, valor: 75.00 },
];

const AdminRevenue = () => {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [periodo, setPeriodo] = useState('mes');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setResumo(mockResumo);
      setLoading(false);
    };
    loadData();
  }, [periodo]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) return <div className="text-center text-[#7f7c7a] py-10">Carregando...</div>;
  if (!resumo) return <div className="text-center text-[#7f7c7a] py-10">Nenhum dado disponível</div>;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">Faturamento</h1>
          <p className="text-[#7f7c7a]">Visão geral financeira da barbearia</p>
        </div>
        <div className="flex gap-2">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
          >
            <option value="dia">Hoje</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mês</option>
          </select>
          <button className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition">
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Faturamento Total</p>
              <p className="text-2xl font-bold text-[#060606]">{formatCurrency(resumo.totalServicos + resumo.totalProdutos)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full"><DollarSign className="text-green-600" size={20} /></div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm">
            <TrendingUp size={14} className="text-green-600" />
            <span className="text-green-600">+12,5%</span>
            <span className="text-[#7f7c7a]">em relação ao mês passado</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Lucro Líquido</p>
              <p className="text-2xl font-bold text-[#060606]">{formatCurrency(resumo.lucroLiquido)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full"><TrendingUp className="text-blue-600" size={20} /></div>
          </div>
          <p className="text-sm text-[#7f7c7a] mt-1">Margem: 72,3%</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Total de Serviços</p>
              <p className="text-2xl font-bold text-[#060606]">{formatCurrency(resumo.totalServicos)}</p>
              <p className="text-sm text-[#7f7c7a]">{resumo.servicos.quantidade} serviços</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full"><Scissors className="text-purple-600" size={20} /></div>
          </div>
          <p className="text-sm text-[#7f7c7a] mt-1">Ticket médio: {formatCurrency(resumo.ticketMedio)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Produtos Vendidos</p>
              <p className="text-2xl font-bold text-[#060606]">{formatCurrency(resumo.totalProdutos)}</p>
              <p className="text-sm text-[#7f7c7a]">{resumo.produtos.quantidade} itens</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full"><Package className="text-orange-600" size={20} /></div>
          </div>
        </div>
      </div>

      {/* Custos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-400">
          <p className="text-sm font-medium text-[#7f7c7a]">Despesas</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(resumo.totalDespesas)}</p>
          <p className="text-xs text-[#7f7c7a]">{resumo.despesas.quantidade} despesas</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
          <p className="text-sm font-medium text-[#7f7c7a]">Comissões Pagas</p>
          <p className="text-xl font-bold text-yellow-600">{formatCurrency(resumo.totalComissoes)}</p>
          <p className="text-xs text-[#7f7c7a]">{resumo.comissoes.quantidade} comissões</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
          <p className="text-sm font-medium text-[#7f7c7a]">Lucro Líquido</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(resumo.lucroLiquido)}</p>
          <p className="text-xs text-[#7f7c7a]">{((resumo.lucroLiquido / (resumo.totalServicos + resumo.totalProdutos)) * 100).toFixed(1)}% margem</p>
        </div>
      </div>

      {/* Top Serviços e Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
            <Scissors size={20} className="text-[#9c7f64]" />
            Serviços Mais Realizados
          </h3>
          {topServicos.map((s, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 py-2">
              <span className="text-sm font-bold text-[#7f7c7a]">#{i+1} {s.nome}</span>
              <span className="text-sm">{s.quantidade}x {formatCurrency(s.valor)}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
            <Package size={20} className="text-[#9c7f64]" />
            Produtos Mais Vendidos
          </h3>
          {topProdutos.map((p, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 py-2">
              <span className="text-sm font-bold text-[#7f7c7a]">#{i+1} {p.nome}</span>
              <span className="text-sm">{p.quantidade}x {formatCurrency(p.valor)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo por Período */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-[#060606] mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-[#9c7f64]" />
          Resumo por Período
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <p className="text-sm text-[#7f7c7a]">Hoje</p>
            <p className="text-2xl font-bold text-[#060606]">{formatCurrency(resumo.periodos.diario)}</p>
          </div>
          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <p className="text-sm text-[#7f7c7a]">Esta Semana</p>
            <p className="text-2xl font-bold text-[#060606]">{formatCurrency(resumo.periodos.semanal)}</p>
          </div>
          <div className="bg-[#f5f0e8] p-4 rounded-lg">
            <p className="text-sm text-[#7f7c7a]">Este Mês</p>
            <p className="text-2xl font-bold text-[#060606]">{formatCurrency(resumo.periodos.mensal)}</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-[#7f7c7a] flex justify-between">
        <span>Dados atualizados em tempo real</span>
        <button onClick={() => window.print()} className="flex items-center gap-1 hover:text-[#060606]">
          <Printer size={14} /> Imprimir
        </button>
      </div>
    </div>
  );
};

export default AdminRevenue;