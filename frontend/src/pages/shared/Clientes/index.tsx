import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { useNumberInput } from '../../../hooks/useNumberInput';
import { ClientAutocomplete } from '../../../components/common/ClientAutocomplete';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Check,
  Users,
  User,
  Phone,
  AlertCircle,
  CheckCircle,
  UserPlus,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  isMonthly: boolean;
  monthlyFee: number;
  isActive: boolean;
}

const AdminClientes = () => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    isMonthly: false,
    monthlyFee: 0,
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      alert('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone,
        isMonthly: client.isMonthly,
        monthlyFee: client.monthlyFee || 0,
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        phone: '',
        isMonthly: false,
        monthlyFee: 0,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        isMonthly: formData.isMonthly,
        monthlyFee: formData.monthlyFee,
        isActive: true,
      };

      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      
      await loadClients();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      alert(error.response?.data?.error || 'Erro ao salvar cliente');
    }
  };

  // 🔥 FUNÇÃO PARA EDITAR CLIENTE
  const handleEditClient = (client: Client) => {
    handleOpenModal(client);
  };

  // 🔥 FUNÇÃO PARA DELETAR CLIENTE
  const handleDeleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await api.delete(`/clients/${id}`);
      await loadClients();
      alert('✅ Cliente excluído com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      alert(error.response?.data?.error || 'Erro ao excluir cliente');
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      phone: '',
      isMonthly: false,
      monthlyFee: 0,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#060606]">👤 Clientes</h1>
          <p className="text-sm sm:text-base text-[#7f7c7a]">Gerencie os clientes da barbearia</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition text-sm sm:text-base"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Total de Clientes</p>
              <p className="text-lg sm:text-2xl font-bold text-[#060606]">{clients.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
              <Users size={16} className="sm:w-5 sm:h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Clientes Ativos</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {clients.filter(c => c.isActive).length}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-full">
              <CheckCircle size={16} className="sm:w-5 sm:h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#7f7c7a]">Mensalistas</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">
                {clients.filter(c => c.isMonthly).length}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
              <CreditCard size={16} className="sm:w-5 sm:h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Search size={16} className="sm:w-[18px] sm:h-[18px] text-[#7f7c7a] flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar cliente por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
          />
          <span className="text-xs sm:text-sm text-[#7f7c7a] whitespace-nowrap">
            {filteredClients.length} clientes
          </span>
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="flex justify-center items-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#9c7f64]"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
          <Users size={32} className="sm:w-12 sm:h-12 mx-auto text-[#7f7c7a] mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-[#060606]">Nenhum cliente encontrado</h3>
          <p className="text-sm text-[#7f7c7a] mt-2">Clique em "Novo Cliente" para começar</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[500px] sm:min-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#f5f0e8]">
                  <tr>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Nome</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Telefone</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Status</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Mensalista</th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-[#544941] uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#9c7f64]/20 flex items-center justify-center text-[#9c7f64] font-bold text-[10px] sm:text-sm flex-shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-[#060606] text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
                            {client.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[#060606] text-xs sm:text-sm">
                        {client.phone}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-xs rounded-full ${
                          client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {client.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                        {client.isMonthly ? (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-xs rounded-full bg-purple-100 text-purple-800">
                            Mensalista
                          </span>
                        ) : (
                          <span className="text-[#7f7c7a] text-[10px] sm:text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => handleEditClient(client)}
                            className="text-[#9c7f64] hover:text-[#544941] transition p-1"
                            title="Editar"
                          >
                            <Edit size={14} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-red-500 hover:text-red-700 transition p-1"
                            title="Excluir"
                          >
                            <Trash2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606]">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606]">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606]">Telefone *</label>
                <div className="relative">
                  <Phone size={14} className="sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-[#9c7f64] transition cursor-pointer">
                <input
                  type="checkbox"
                  id="isMonthly"
                  checked={formData.isMonthly}
                  onChange={(e) => setFormData({ ...formData, isMonthly: e.target.checked })}
                  className="w-4 h-4 text-[#9c7f64] focus:ring-[#9c7f64] rounded"
                />
                <label htmlFor="isMonthly" className="text-xs sm:text-sm text-[#060606] cursor-pointer flex items-center gap-2">
                  <CreditCard size={14} className="sm:w-[18px] sm:h-[18px] text-[#9c7f64]" />
                  Cliente Mensalista
                </label>
              </div>

              {formData.isMonthly && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[#060606]">Valor da Mensalidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                    placeholder="0,00"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base order-2 sm:order-1"
                >
                  <Check size={16} />
                  {editingClient ? 'Atualizar' : 'Criar'}
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

export default AdminClientes;