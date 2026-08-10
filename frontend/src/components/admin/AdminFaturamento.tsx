import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Eye,
  Printer,
  Plus,
  X,
  Check,
  DollarSign,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';
import { revenueService } from '../../services/revenue.service';
import type { RevenueService, RevenueSummary } from '../../types/revenue.types';

const AdminFaturamento = () => {
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState<RevenueService[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [periodo, setPeriodo] = useState('hoje');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingServico, setEditingServico] = useState<RevenueService | null>(null);

  // Form data para novo serviço
  const [formData, setFormData] = useState({
    cliente: '',
    barbeiroId: '',
    servico: '',
    valor: 0,
    formaPagamento: 'dinheiro',
    observacao: '',
  });

  useEffect(() => {
    loadData();
  }, [periodo]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar resumo
      const summaryData = await revenueService.getSummary(periodo as any);
      setSummary(summaryData);

      // Carregar lista de serviços
      const servicosData = await revenueService.getAll();
      setServicos(servicosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (servico?: RevenueService) => {
    if (servico) {
      setEditingServico(servico);
      setFormData({
        cliente: servico.cliente,
        barbeiroId: servico.barbeiroId,
        servico: servico.servico,
        valor: servico.valor,
        formaPagamento: servico.formaPagamento,
        observacao: servico.observacao || '',
      });
    } else {
      setEditingServico(null);
      setFormData({
        cliente: '',
        barbeiroId: '',
        servico: '',
        valor: 0,
        formaPagamento: 'dinheiro',
        observacao: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingServico) {
        await revenueService.update(editingServico.id, formData);
      } else {
        await revenueService.create({
          ...formData,
          data: new Date().toISOString().split('T')[0],
          hora: new Date().toLocaleTimeString('pt-BR'),
          status: 'concluido',
          comissao: formData.valor * 0.2, // 20% de comissão padrão
        });
      }
      await loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar serviço');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      await revenueService.delete(id);
      await loadData();
    } catch (error) {
      alert('Erro ao excluir serviço');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await revenueService.exportar({ periodo });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faturamento_${periodo}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      alert('Erro ao exportar dados');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'concluido': return 'Concluído';
      case 'pendente': return 'Pendente';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getPaymentText = (payment: string) => {
    switch(payment) {
      case 'dinheiro': return 'Dinheiro';
      case 'cartao': return 'Cartão';
      case 'pix': return 'PIX';
      case 'debito': return 'Débito';
      default: return payment;
    }
  };

  // Filtra serviços
  const filteredServicos = servicos.filter(servico => {
    const matchSearch = 
      servico.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.barbeiro.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.servico.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filtroStatus === 'todos' || servico.status === filtroStatus;
    
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">Faturamento</h1>
          <p className="text-[#7f7c7a]">Gerencie todos os serviços e transações</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={18} />
            Nova Venda
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border border-[#9c7f64] text-[#9c7f64] hover:bg-[#9c7f64] hover:text-white px-4 py-2 rounded-lg transition"
          >
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Faturamento</p>
                <p className="text-2xl font-bold text-[#060606]">
                  R$ {summary.totalHoje.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign size={20} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Comissões</p>
                <p className="text-2xl font-bold text-[#060606]">
                  R$ {summary.totalComissoes.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp size={20} className="text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Ticket Médio</p>
                <p className="text-2xl font-bold text-[#060606]">
                  R$ {summary.ticketMedio.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users size={20} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#7f7c7a]">Serviços</p>
                <p className="text-2xl font-bold text-[#060606]">
                  {summary.totalServicos}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock size={20} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#7f7c7a]" />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
            >
              <option value="hoje">Hoje</option>
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mês</option>
            </select>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <Search size={18} className="text-[#7f7c7a]" />
            <input
              type="text"
              placeholder="Buscar por cliente, barbeiro ou serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[#7f7c7a]" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="concluido">Concluídos</option>
              <option value="pendente">Pendentes</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#f5f0e8]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                  Barbeiro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                  Serviço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                  Comissão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-[#7f7c7a]">
                    Carregando...
                  </td>
                </tr>
              ) : filteredServicos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-[#7f7c7a]">
                    Nenhum serviço encontrado
                  </td>
                </tr>
              ) : (
                filteredServicos.map((servico) => (
                  <tr key={servico.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                      {servico.cliente}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      {servico.barbeiro}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      {servico.servico}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                      R$ {servico.valor.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      R$ {servico.comissao.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      {getPaymentText(servico.formaPagamento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(servico.status)}`}>
                        {getStatusText(servico.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleOpenModal(servico)}
                        className="text-[#9c7f64] hover:text-[#544941] transition mr-2"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="text-[#9c7f64] hover:text-[#544941] transition"
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nova Venda */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingServico ? 'Editar Serviço' : 'Nova Venda'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606]">Cliente</label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Barbeiro</label>
                <select
                  value={formData.barbeiroId}
                  onChange={(e) => setFormData({ ...formData, barbeiroId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                >
                  <option value="">Selecione um barbeiro</option>
                  <option value="1">Carlos Santos</option>
                  <option value="2">André Lima</option>
                  <option value="3">Rafael Souza</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Serviço</label>
                <input
                  type="text"
                  value={formData.servico}
                  onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Forma de Pagamento</label>
                <select
                  value={formData.formaPagamento}
                  onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão de Crédito</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Observação</label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Check size={18} />
                    Salvar
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFaturamento;