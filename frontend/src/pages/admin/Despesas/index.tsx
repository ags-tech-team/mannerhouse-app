import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { useNumberInput } from '../../../hooks/useNumberInput';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Check,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Home,
  Zap,
  Wifi,
  Droplet,
  ShoppingBag,
  Wrench,
  Users,
  MoreHorizontal
} from 'lucide-react';

interface Despesa {
  id: string;
  description: string;
  category: string;
  value: number;
  date: string;
  paymentMethod: string;
  notes?: string;
}

const AdminDespesas = () => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear();
  });

  const valorDespesa = useNumberInput();

  const [formData, setFormData] = useState({
    description: '',
    category: 'outros',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'dinheiro',
    notes: '',
  });

  const categories = [
    { value: 'agua', label: '💧 Água', icon: Droplet },
    { value: 'luz', label: '⚡ Luz', icon: Zap },
    { value: 'internet', label: '🌐 Internet', icon: Wifi },
    { value: 'aluguel', label: '🏠 Aluguel', icon: Home },
    { value: 'salario', label: '👨‍💼 Salários', icon: Users },
    { value: 'produtos', label: '📦 Produtos', icon: ShoppingBag },
    { value: 'manutencao', label: '🔧 Manutenção', icon: Wrench },
    { value: 'outros', label: '📌 Outros', icon: MoreHorizontal },
  ];

  const paymentMethods = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao', label: 'Cartão' },
    { value: 'pix', label: 'PIX' },
    { value: 'debito', label: 'Débito' },
  ];

  useEffect(() => {
    loadDespesas();
  }, [selectedMonth, selectedYear]);

  const loadDespesas = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${new Date(selectedYear, selectedMonth, 0).getDate()}`;
      
      const response = await api.get('/expenses', {
        params: { startDate, endDate }
      });
      setDespesas(response.data);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      alert('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (despesa?: Despesa) => {
    if (despesa) {
      setEditingDespesa(despesa);
      setFormData({
        description: despesa.description,
        category: despesa.category,
        date: despesa.date,
        paymentMethod: despesa.paymentMethod,
        notes: despesa.notes || '',
      });
      valorDespesa.setValue(String(despesa.value));
    } else {
      setEditingDespesa(null);
      setFormData({
        description: '',
        category: 'outros',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'dinheiro',
        notes: '',
      });
      valorDespesa.reset();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        description: formData.description,
        category: formData.category,
        value: valorDespesa.getNumberValue(),
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
      };

      if (editingDespesa) {
        await api.put(`/expenses/${editingDespesa.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      await loadDespesas();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar despesa:', error);
      alert(error.response?.data?.error || 'Erro ao salvar despesa');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      await loadDespesas();
    } catch (error) {
      alert('Erro ao excluir despesa');
    }
  };

  const resetForm = () => {
    setEditingDespesa(null);
    setFormData({
      description: '',
      category: 'outros',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'dinheiro',
      notes: '',
    });
    valorDespesa.reset();
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

  const formatMonth = (month: number, year: number) => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[month - 1]} ${year}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.label || value;
  };

  const getCategoryIcon = (value: string) => {
    const cat = categories.find(c => c.value === value);
    return cat ? cat.icon : MoreHorizontal;
  };

  const getPaymentLabel = (value: string) => {
    return paymentMethods.find(p => p.value === value)?.label || value;
  };

  const filteredDespesas = despesas.filter(d => {
    const matchSearch = d.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filtroCategoria === 'todos' || d.category === filtroCategoria;
    return matchSearch && matchCategoria;
  });

  const totalDespesas = despesas.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#060606]">📉 Despesas</h1>
          <p className="text-sm sm:text-base text-[#7f7c7a]">Controle de despesas da barbearia</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition text-sm sm:text-base"
        >
          <Plus size={18} />
          Nova Despesa
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Total de Despesas</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">
                {formatCurrency(totalDespesas)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-red-100 rounded-full">
              <TrendingDown size={16} className="sm:w-5 sm:h-5 text-red-600" />
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#7f7c7a] mt-1">
            {despesas.length} despesas registradas
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Ticket Médio</p>
              <p className="text-lg sm:text-2xl font-bold text-[#060606] truncate">
                {despesas.length > 0 ? formatCurrency(totalDespesas / despesas.length) : 'R$ 0,00'}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
              <DollarSign size={16} className="sm:w-5 sm:h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Mês</p>
              <p className="text-sm sm:text-2xl font-bold text-[#060606] truncate">
                {formatMonth(selectedMonth, selectedYear)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
              <Calendar size={16} className="sm:w-5 sm:h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Mês */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          </button>
          <h2 className="text-base sm:text-xl font-semibold text-[#060606]">
            {formatMonth(selectedMonth, selectedYear)}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <button
          onClick={() => {
            const now = new Date();
            setSelectedMonth(now.getMonth() + 1);
            setSelectedYear(now.getFullYear());
          }}
          className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-[#f5f0e8] hover:bg-[#e8e0d4] text-[#060606] rounded-lg transition text-xs sm:text-sm"
        >
          Mês Atual
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Search size={16} className="sm:w-[18px] sm:h-[18px] text-[#7f7c7a] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar despesa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
            >
              <option value="todos">Todas categorias</option>
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Despesas */}
      {loading ? (
        <div className="flex justify-center items-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#9c7f64]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[600px] sm:min-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#f5f0e8]">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Descrição</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Categoria</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Valor</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Data</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Pagamento</th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDespesas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-[#7f7c7a] text-sm">
                        Nenhuma despesa encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredDespesas.map((despesa) => {
                      const Icon = getCategoryIcon(despesa.category);
                      return (
                        <tr key={despesa.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                            {despesa.description}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                              <Icon size={14} className="sm:w-4 sm:h-4 text-[#7f7c7a]" />
                              {getCategoryLabel(despesa.category)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-red-600 font-medium text-xs sm:text-sm">
                            {formatCurrency(despesa.value)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] text-xs sm:text-sm">
                            {new Date(despesa.date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] text-xs sm:text-sm">
                            {getPaymentLabel(despesa.paymentMethod)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right space-x-1 sm:space-x-2">
                            <button
                              onClick={() => handleOpenModal(despesa)}
                              className="text-[#9c7f64] hover:text-[#544941] transition p-1"
                              title="Editar"
                            >
                              <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                            <button
                              onClick={() => handleDelete(despesa.id)}
                              className="text-red-500 hover:text-red-700 transition p-1"
                              title="Excluir"
                            >
                              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredDespesas.length > 0 && (
                  <tfoot className="bg-[#f5f0e8]">
                    <tr>
                      <td colSpan={2} className="px-3 sm:px-6 py-2 sm:py-4 text-right font-bold text-[#060606] text-xs sm:text-sm">Total</td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 font-bold text-red-600 text-xs sm:text-sm">
                        {formatCurrency(filteredDespesas.reduce((acc, d) => acc + d.value, 0))}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Despesa - Responsivo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606]">
                {editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-[#7f7c7a] hover:text-[#060606] p-1"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606]">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606]">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606]">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorDespesa.value}
                  onChange={valorDespesa.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                  placeholder="0,00"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606]">Data</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606]">Forma de Pagamento</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                >
                  {paymentMethods.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606]">Observação</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                  rows={2}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base order-2 sm:order-1"
                >
                  <Check size={18} /> Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base order-1 sm:order-2"
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

export default AdminDespesas;