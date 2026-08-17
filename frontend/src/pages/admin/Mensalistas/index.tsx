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
  Calendar,
  DollarSign,
  Users,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  CreditCard,
  Phone,
  FileText
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  isMonthly: boolean;
  monthlyFee: number;
  isActive: boolean;
  MonthlyPayments?: MonthlyPayment[];
}

interface MonthlyPayment {
  id: string;
  clientId: string;
  month: string;
  amount: number;
  paid: boolean;
  paidAt: string;
  notes: string;
}

interface NewClientData {
  name: string;
  phone: string;
  monthlyFee: number;
  paymentMethod: 'dinheiro' | 'cartao' | 'pix' | 'debito';
  notes: string;
}

const AdminMensalistas = () => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 🔥 AUTO-COMPLETE
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [newClient, setNewClient] = useState<NewClientData>({
    name: '',
    phone: '',
    monthlyFee: 0,
    paymentMethod: 'pix',
    notes: ''
  });

  const monthlyFee = useNumberInput();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      console.log('🔄 Buscando clientes mensalistas...');
      const response = await api.get('/monthly/clients');
      console.log('📦 Clientes carregados:', response.data);
      setClients(response.data);
    } catch (error: any) {
      console.error('❌ Erro ao carregar mensalistas:', error);
      console.error('Detalhes:', error.response?.data || error.message);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 HANDLE SELECT CLIENT
  const handleSelectClient = (client: Client) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setNewClient(prev => ({
      ...prev,
      name: client.name,
      phone: client.phone,
    }));
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newClient.name.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    
    if (!newClient.phone.trim()) {
      alert('Telefone é obrigatório');
      return;
    }
    
    if (newClient.monthlyFee <= 0) {
      alert('Valor da mensalidade deve ser maior que 0');
      return;
    }

    try {
      console.log('📝 Criando mensalista:', newClient);
      
      const response = await api.post('/monthly/clients', {
        name: newClient.name.trim(),
        phone: newClient.phone.trim(),
        monthlyFee: newClient.monthlyFee,
        paymentMethod: newClient.paymentMethod,
        notes: newClient.notes || 'Nova assinatura',
      });

      console.log('✅ Mensalista criado:', response.data);
      
      await loadClients();
      
      setShowNewClientModal(false);
      setClientName('');
      setClientPhone('');
      setNewClient({
        name: '',
        phone: '',
        monthlyFee: 0,
        paymentMethod: 'pix',
        notes: ''
      });
      
      alert('✅ Cliente mensalista criado! Aguardando primeiro pagamento.');
    } catch (error: any) {
      console.error('❌ Erro ao criar mensalista:', error);
      console.error('Detalhes:', error.response?.data || error.message);
      
      // 🔥 TRATATIVA DE ERRO DE DUPLICIDADE
      if (error.response?.data?.error?.includes('já existe')) {
        alert(error.response.data.error);
      } else {
        alert(error.response?.data?.error || 'Erro ao criar cliente mensalista');
      }
    }
  };

  const handleToggleMonthly = async (client: Client) => {
    try {
      await api.put(`/monthly/client/${client.id}`, {
        isMonthly: !client.isMonthly,
        monthlyFee: client.monthlyFee || 0,
      });
      await loadClients();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar status mensal');
    }
  };

  const handleSetMonthlyFee = async (client: Client) => {
    const fee = monthlyFee.getNumberValue();
    if (!fee || fee < 0) {
      alert('Digite um valor válido');
      return;
    }

    try {
      await api.put(`/monthly/client/${client.id}`, {
        isMonthly: true,
        monthlyFee: fee,
      });
      monthlyFee.reset();
      await loadClients();
      setShowModal(false);
      alert('✅ Valor da mensalidade atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar valor');
    }
  };

  const handleConfirmPayment = async (clientId: string) => {
    if (!confirm(`Confirmar pagamento da mensalidade para ${currentMonth}?`)) return;

    try {
      await api.post(`/monthly/pay/${clientId}`, {
        month: currentMonth,
        notes: `Pagamento mensalidade - ${currentMonth}`,
      });
      await loadClients();
      alert('✅ Pagamento confirmado! Valor enviado para o faturamento.');
    } catch (error: any) {
      console.error('Erro ao confirmar pagamento:', error);
      alert(error.response?.data?.error || 'Erro ao confirmar pagamento');
    }
  };

  const hasPaidThisMonth = (client: Client) => {
    if (!client.MonthlyPayments) return false;
    return client.MonthlyPayments.some(p => p.month === currentMonth && p.paid);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTotalMonthlyRevenue = () => {
    return clients
      .filter(c => c.isMonthly)
      .reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
  };

  const getPaidThisMonth = () => {
    return clients
      .filter(c => c.isMonthly && hasPaidThisMonth(c))
      .reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
  };

  const getPendingThisMonth = () => {
    return clients
      .filter(c => c.isMonthly && !hasPaidThisMonth(c))
      .reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">📋 Mensalistas</h1>
          <p className="text-[#7f7c7a]">Gerencie clientes com assinatura mensal</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setClientName('');
              setClientPhone('');
              setNewClient({
                name: '',
                phone: '',
                monthlyFee: 0,
                paymentMethod: 'pix',
                notes: ''
              });
              setShowNewClientModal(true);
            }}
            className="bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-lg"
          >
            <UserPlus size={20} />
            Nova Assinatura
          </button>
          
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2">
            <Calendar size={18} className="text-[#9c7f64]" />
            <span className="text-sm font-medium">
              {new Date(currentMonth + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Total Mensalidades</p>
              <p className="text-2xl font-bold text-[#060606]">
                {formatCurrency(getTotalMonthlyRevenue())}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-[#7f7c7a] mt-1">
            {clients.filter(c => c.isMonthly).length} clientes mensalistas
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Pago este mês</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(getPaidThisMonth())}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Pendente este mês</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(getPendingThisMonth())}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock size={20} className="text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-[#7f7c7a]" />
          <input
            type="text"
            placeholder="Buscar cliente por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
          />
          <span className="text-sm text-[#7f7c7a]">
            {filteredClients.length} clientes
          </span>
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users size={48} className="mx-auto text-[#7f7c7a] mb-4" />
          <h3 className="text-lg font-medium text-[#060606]">Nenhum mensalista encontrado</h3>
          <p className="text-[#7f7c7a] mt-2">
            Clique em "Nova Assinatura" para criar o primeiro cliente mensalista
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Mensalidade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Mês Atual</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const paid = hasPaidThisMonth(client);
                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#9c7f64]/20 flex items-center justify-center text-[#9c7f64] font-bold text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-[#060606]">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                        {client.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.isMonthly ? (
                          <span className="font-medium text-[#9c7f64]">
                            {formatCurrency(client.monthlyFee || 0)}
                          </span>
                        ) : (
                          <span className="text-[#7f7c7a]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.isMonthly ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Mensalista
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.isMonthly ? (
                          paid ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle size={16} /> Pago
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <Clock size={16} /> Pendente
                            </span>
                          )
                        ) : (
                          <span className="text-[#7f7c7a]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {!client.isMonthly ? (
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              monthlyFee.reset();
                              setShowModal(true);
                            }}
                            className="text-[#9c7f64] hover:text-[#544941] transition text-sm"
                          >
                            Tornar Mensalista
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                monthlyFee.setValue(String(client.monthlyFee || 0));
                                setShowModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition"
                              title="Editar valor"
                            >
                              <Edit size={18} />
                            </button>
                            {!paid && (
                              <button
                                onClick={() => handleConfirmPayment(client.id)}
                                className="text-green-600 hover:text-green-800 transition"
                                title="Confirmar pagamento"
                              >
                                <Check size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleMonthly(client)}
                              className="text-red-500 hover:text-red-700 transition"
                              title="Remover mensalista"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NOVA ASSINATURA */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606] flex items-center gap-2">
                <UserPlus size={24} className="text-[#9c7f64]" />
                Nova Assinatura
              </h2>
              <button
                onClick={() => {
                  setShowNewClientModal(false);
                  setClientName('');
                  setClientPhone('');
                  setNewClient({
                    name: '',
                    phone: '',
                    monthlyFee: 0,
                    paymentMethod: 'pix',
                    notes: ''
                  });
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  Nome do Cliente *
                </label>
                <ClientAutocomplete
                  value={clientName}
                  onChange={setClientName}
                  onSelectClient={handleSelectClient}
                  placeholder="Digite o nome ou telefone do cliente..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  Telefone *
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => {
                      setNewClient({ ...newClient, phone: e.target.value });
                      setClientPhone(e.target.value);
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  Valor da Mensalidade (R$) *
                </label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newClient.monthlyFee || ''}
                    onChange={(e) => setNewClient({ ...newClient, monthlyFee: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  Forma de Pagamento *
                </label>
                <div className="relative">
                  <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <select
                    value={newClient.paymentMethod}
                    onChange={(e) => setNewClient({ ...newClient, paymentMethod: e.target.value as any })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent appearance-none"
                    required
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão de Crédito</option>
                    <option value="debito">Cartão de Débito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  Observações
                </label>
                <div className="relative">
                  <FileText size={18} className="absolute left-3 top-3 text-[#7f7c7a]" />
                  <textarea
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    placeholder="Observações sobre a assinatura..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="bg-[#f5f0e8] p-4 rounded-lg">
                <p className="text-sm font-medium text-[#060606]">Resumo da Assinatura</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#7f7c7a]">Mensalidade:</span>
                    <span className="font-bold text-[#9c7f64]">
                      {formatCurrency(newClient.monthlyFee || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7f7c7a]">Mês de início:</span>
                    <span className="font-medium">
                      {new Date(currentMonth + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7f7c7a]">Pagamento:</span>
                    <span className="font-medium capitalize">{newClient.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClientModal(false);
                    setClientName('');
                    setClientPhone('');
                    setNewClient({
                      name: '',
                      phone: '',
                      monthlyFee: 0,
                      paymentMethod: 'pix',
                      notes: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Criar Assinatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Mensalidade */}
      {showModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {selectedClient.isMonthly ? 'Editar Mensalidade' : 'Tornar Mensalista'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedClient(null);
                  monthlyFee.reset();
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#f5f0e8] p-4 rounded-lg">
                <p className="font-medium text-[#060606]">{selectedClient.name}</p>
                <p className="text-sm text-[#7f7c7a]">{selectedClient.phone}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  Valor da Mensalidade (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={monthlyFee.value}
                  onChange={monthlyFee.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  placeholder="0,00"
                  min="0"
                  required
                />
              </div>

              <button
                onClick={() => handleSetMonthlyFee(selectedClient)}
                className="w-full bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Check size={18} />
                {selectedClient.isMonthly ? 'Atualizar Valor' : 'Ativar Mensalidade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMensalistas;