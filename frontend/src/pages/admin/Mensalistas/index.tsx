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
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface Barber {
  id: string;
  name: string;
  serviceCommissionRate: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  isMonthly: boolean;
  monthlyFee: number;
  isActive: boolean;
  barberId: string | null;
  barber?: Barber;
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
  barberId: string;
  paymentMethod: 'dinheiro' | 'cartao' | 'pix' | 'debito';
  notes: string;
}

const AdminMensalistas = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingBarberId, setEditingBarberId] = useState('');
  
  // 🔥 CONFIRMAÇÃO PARA REMOVER
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clientToRemove, setClientToRemove] = useState<Client | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [newClient, setNewClient] = useState<NewClientData>({
    name: '',
    phone: '',
    monthlyFee: 0,
    barberId: '',
    paymentMethod: 'pix',
    notes: ''
  });

  const monthlyFee = useNumberInput();

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const response = await api.get('/barbers');
      setBarbers(response.data);
    } catch (error) {
      console.error('❌ Erro ao carregar barbeiros:', error);
    }
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-').map(Number);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[month - 1]} ${year}`;
  };

  const changeMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + delta, 1);
    const newYear = newDate.getFullYear();
    const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === current;
  };

  useEffect(() => {
    loadClients();
  }, [selectedMonth]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/monthly/clients', {
        params: { month: selectedMonth }
      });
      setClients(response.data);
    } catch (error: any) {
      console.error('❌ Erro ao carregar mensalistas:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const getLastPayment = (client: Client) => {
    if (!client.MonthlyPayments || client.MonthlyPayments.length === 0) return null;
    const paidPayments = client.MonthlyPayments.filter(p => p.paid);
    if (paidPayments.length === 0) return null;
    const sorted = paidPayments.sort((a, b) => {
      if (a.paidAt && b.paidAt) return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
      if (a.month > b.month) return -1;
      if (a.month < b.month) return 1;
      return 0;
    });
    return sorted[0];
  };

  const formatPaymentDate = (payment: MonthlyPayment | null) => {
    if (!payment) return 'Nunca';
    if (payment.paidAt) {
      const date = new Date(payment.paidAt);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    const [year, month] = payment.month.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

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
    const nomeCliente = clientName.trim();
    const telefoneCliente = newClient.phone.trim() || clientPhone.trim();
    
    if (!nomeCliente) {
      alert('Nome é obrigatório');
      return;
    }
    if (!telefoneCliente) {
      alert('Telefone é obrigatório');
      return;
    }
    if (newClient.monthlyFee <= 0) {
      alert('Valor da mensalidade deve ser maior que 0');
      return;
    }
    if (!newClient.barberId) {
      alert('Selecione um barbeiro responsável');
      return;
    }

    try {
      const response = await api.post('/monthly/clients', {
        name: nomeCliente,
        phone: telefoneCliente,
        monthlyFee: newClient.monthlyFee,
        barberId: newClient.barberId,
        paymentMethod: newClient.paymentMethod,
        notes: newClient.notes || 'Nova assinatura',
      });

      await loadClients();
      setShowNewClientModal(false);
      setClientName('');
      setClientPhone('');
      setNewClient({
        name: '',
        phone: '',
        monthlyFee: 0,
        barberId: '',
        paymentMethod: 'pix',
        notes: ''
      });
      alert('✅ Cliente mensalista criado! Aguardando primeiro pagamento.');
    } catch (error: any) {
      console.error('❌ Erro ao criar mensalista:', error);
      if (error.response?.data?.error?.includes('já existe')) {
        alert(error.response.data.error);
      } else {
        alert(error.response?.data?.error || 'Erro ao criar cliente mensalista');
      }
    }
  };

  // 🔥 REMOVER MENSALISTA – abre o modal de confirmação
  const openRemoveConfirm = (client: Client) => {
    setClientToRemove(client);
    setShowConfirmModal(true);
  };

  // 🔥 EXECUTA A REMOÇÃO
  const handleConfirmRemove = async () => {
    if (!clientToRemove) return;
    try {
      await api.put(`/monthly/client/${clientToRemove.id}`, {
        isMonthly: false,
        monthlyFee: clientToRemove.monthlyFee || 0,
        barberId: clientToRemove.barberId || null,
      });
      await loadClients();
      setShowConfirmModal(false);
      setClientToRemove(null);
      alert('✅ Cliente removido do plano mensal com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao remover mensalista:', error);
      alert('❌ Erro ao remover cliente do plano mensal.');
      setShowConfirmModal(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setEditingBarberId(client.barberId || '');
    monthlyFee.setValue(String(client.monthlyFee || 0));
    setShowModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedClient) return;
    const fee = monthlyFee.getNumberValue();
    if (!fee || fee < 0) {
      alert('Digite um valor válido');
      return;
    }
    try {
      await api.put(`/monthly/client/${selectedClient.id}`, {
        isMonthly: true,
        monthlyFee: fee,
        barberId: editingBarberId || null,
      });
      monthlyFee.reset();
      await loadClients();
      setShowModal(false);
      setSelectedClient(null);
      alert('✅ Cliente atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      alert('❌ Erro ao atualizar cliente');
    }
  };

  const handleConfirmPayment = async (clientId: string) => {
    if (!confirm(`Confirmar pagamento da mensalidade para ${selectedMonth}?`)) return;
    try {
      await api.post(`/monthly/pay/${clientId}`, {
        month: selectedMonth,
        notes: `Pagamento mensalidade - ${selectedMonth}`,
      });
      await loadClients();
      alert('✅ Pagamento confirmado! Comissão enviada para o faturamento.');
    } catch (error: any) {
      console.error('❌ Erro ao confirmar pagamento:', error);
      alert(error.response?.data?.error || 'Erro ao confirmar pagamento');
    }
  };

  const hasPaidThisMonth = (client: Client) => {
    if (!client.MonthlyPayments) return false;
    return client.MonthlyPayments.some(p => p.month === selectedMonth && p.paid);
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#060606]">📋 Mensalistas</h1>
          <p className="text-sm sm:text-base text-[#7f7c7a]">Gerencie clientes com assinatura mensal</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={() => {
              setClientName('');
              setClientPhone('');
              setNewClient({
                name: '',
                phone: '',
                monthlyFee: 0,
                barberId: '',
                paymentMethod: 'pix',
                notes: ''
              });
              setShowNewClientModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base"
          >
            <UserPlus size={18} />
            Nova Assinatura
          </button>
          
          <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg shadow px-2 sm:px-3 py-1.5 sm:py-2">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded transition">
              <ChevronLeft size={14} className="sm:w-4 sm:h-4 text-[#7f7c7a]" />
            </button>
            <span className="text-[10px] sm:text-sm font-medium min-w-[80px] sm:min-w-[120px] text-center truncate">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded transition">
              <ChevronRight size={14} className="sm:w-4 sm:h-4 text-[#7f7c7a]" />
            </button>
            {!isCurrentMonth() && (
              <button
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                }}
                className="ml-1 text-[8px] sm:text-xs text-[#9c7f64] hover:underline"
              >
                Voltar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm font-medium text-[#7f7c7a]">Total Mensalidades</p>
              <p className="text-base sm:text-2xl font-bold text-[#060606]">
                {formatCurrency(getTotalMonthlyRevenue())}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
              <Users size={16} className="sm:w-5 sm:h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-[10px] sm:text-sm text-[#7f7c7a] mt-1">
            {clients.filter(c => c.isMonthly).length} clientes
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm font-medium text-[#7f7c7a]">Pago este mês</p>
              <p className="text-base sm:text-2xl font-bold text-green-600">
                {formatCurrency(getPaidThisMonth())}
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
              <p className="text-[10px] sm:text-sm font-medium text-[#7f7c7a]">Pendente</p>
              <p className="text-base sm:text-2xl font-bold text-yellow-600">
                {formatCurrency(getPendingThisMonth())}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
              <Clock size={16} className="sm:w-5 sm:h-5 text-yellow-600" />
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
          <span className="text-[10px] sm:text-sm text-[#7f7c7a] whitespace-nowrap">
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
          <h3 className="text-base sm:text-lg font-medium text-[#060606]">Nenhum mensalista encontrado</h3>
          <p className="text-sm text-[#7f7c7a] mt-2">Clique em "Nova Assinatura" para criar</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Cliente</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Telefone</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Barbeiro</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Mensalidade</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Status</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Mês Atual</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Último Pgto</th>
                  <th className="px-2 sm:px-3 py-2 text-right text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const paid = hasPaidThisMonth(client);
                  const lastPayment = getLastPayment(client);
                  
                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#9c7f64]/20 flex items-center justify-center text-[#9c7f64] font-bold text-[10px] sm:text-xs flex-shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-[#060606] text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
                            {client.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-[#060606] text-[10px] sm:text-sm">
                        {client.phone}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        {client.barber ? (
                          <span className="text-[10px] sm:text-sm text-[#9c7f64] font-medium">
                            {client.barber.name}
                          </span>
                        ) : (
                          <span className="text-[10px] sm:text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} className="sm:w-[14px] sm:h-[14px]" />
                            Sem barbeiro
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        {client.isMonthly ? (
                          <span className="font-medium text-[#9c7f64] text-[10px] sm:text-sm">
                            {formatCurrency(client.monthlyFee || 0)}
                          </span>
                        ) : (
                          <span className="text-[#7f7c7a] text-[10px] sm:text-sm">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        {client.isMonthly ? (
                          <span className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] rounded-full bg-green-100 text-green-800 whitespace-nowrap">
                            Mensalista
                          </span>
                        ) : (
                          <span className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] rounded-full bg-gray-100 text-gray-800 whitespace-nowrap">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        {client.isMonthly ? (
                          paid ? (
                            <span className="flex items-center gap-0.5 sm:gap-1 text-green-600 text-[10px] sm:text-sm whitespace-nowrap">
                              <CheckCircle size={12} className="sm:w-[14px] sm:h-[14px]" /> Pago
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 sm:gap-1 text-yellow-600 text-[10px] sm:text-sm whitespace-nowrap">
                              <Clock size={12} className="sm:w-[14px] sm:h-[14px]" /> Pendente
                            </span>
                          )
                        ) : (
                          <span className="text-[#7f7c7a] text-[10px] sm:text-sm">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        {client.isMonthly ? (
                          lastPayment ? (
                            <span className="text-[9px] sm:text-xs text-[#060606] whitespace-nowrap">
                              {formatPaymentDate(lastPayment)}
                            </span>
                          ) : (
                            <span className="text-[9px] sm:text-xs text-[#7f7c7a] whitespace-nowrap">Nunca</span>
                          )
                        ) : (
                          <span className="text-[#7f7c7a] text-[10px] sm:text-sm">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          {!client.isMonthly ? (
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setEditingBarberId(client.barberId || '');
                                monthlyFee.setValue(String(client.monthlyFee || 0));
                                setShowModal(true);
                              }}
                              className="text-[#9c7f64] hover:text-[#544941] transition text-[9px] sm:text-xs whitespace-nowrap px-1"
                            >
                              Tornar Mensalista
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditClient(client)}
                                className="text-blue-600 hover:text-blue-800 transition p-1"
                                title="Editar"
                              >
                                <Edit size={14} className="sm:w-[16px] sm:h-[16px]" />
                              </button>
                              {!paid && (
                                <button
                                  onClick={() => handleConfirmPayment(client.id)}
                                  className="text-green-600 hover:text-green-800 transition p-1"
                                  title="Confirmar pagamento"
                                >
                                  <Check size={14} className="sm:w-[16px] sm:h-[16px]" />
                                </button>
                              )}
                              <button
                                onClick={() => openRemoveConfirm(client)}
                                className="text-red-500 hover:text-red-700 transition p-1"
                                title="Remover"
                              >
                                <X size={14} className="sm:w-[16px] sm:h-[16px]" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MODAIS ==================== */}

      {/* MODAL DE CONFIRMAÇÃO PARA REMOVER */}
      {showConfirmModal && clientToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606] flex items-center gap-2">
                <AlertCircle size={24} className="text-red-500" />
                Confirmar Remoção
              </h2>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setClientToRemove(null);
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 text-sm text-yellow-700">
                <p className="font-medium">⚠️ Atenção</p>
                <p className="mt-1">
                  Tem certeza que deseja remover <strong>{clientToRemove.name}</strong> do plano mensal?
                </p>
                <p className="mt-1 text-xs text-yellow-600">
                  Isso não excluirá o cliente, apenas o desativará como mensalista. Os pagamentos futuros não serão mais cobrados.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setClientToRemove(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base order-1 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmRemove}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base order-2 sm:order-2"
                >
                  <X size={16} /> Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA ASSINATURA (mantido igual) */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606] flex items-center gap-2">
                <UserPlus size={20} className="sm:w-6 sm:h-6 text-[#9c7f64]" />
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
                    barberId: '',
                    paymentMethod: 'pix',
                    notes: ''
                  });
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3 sm:space-y-4">
              {/* ... campos do formulário (mantido igual) ... */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-1">Nome do Cliente *</label>
                <ClientAutocomplete
                  value={clientName}
                  onChange={setClientName}
                  onSelectClient={handleSelectClient}
                  placeholder="Digite o nome ou telefone..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-1">Telefone *</label>
                <div className="relative">
                  <Phone size={14} className="sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <input
                    type="tel"
                    value={newClient.phone}
                    onChange={(e) => {
                      setNewClient({ ...newClient, phone: e.target.value });
                      setClientPhone(e.target.value);
                    }}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-1">Barbeiro *</label>
                <div className="relative">
                  <User size={14} className="sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <select
                    value={newClient.barberId}
                    onChange={(e) => setNewClient({ ...newClient, barberId: e.target.value })}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm appearance-none"
                    required
                  >
                    <option value="">Selecione um barbeiro...</option>
                    {barbers.map(barber => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-1">Valor (R$) *</label>
                <div className="relative">
                  <DollarSign size={14} className="sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newClient.monthlyFee || ''}
                    onChange={(e) => setNewClient({ ...newClient, monthlyFee: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-1">Pagamento *</label>
                <div className="relative">
                  <CreditCard size={14} className="sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <select
                    value={newClient.paymentMethod}
                    onChange={(e) => setNewClient({ ...newClient, paymentMethod: e.target.value as any })}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm appearance-none"
                    required
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="debito">Débito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-1">Observações</label>
                <div className="relative">
                  <FileText size={14} className="sm:w-[18px] sm:h-[18px] absolute left-3 top-3 text-[#7f7c7a]" />
                  <textarea
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                    placeholder="Observações..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="bg-[#f5f0e8] p-3 sm:p-4 rounded-lg text-sm">
                <p className="font-medium text-[#060606]">Resumo da Assinatura</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#7f7c7a]">Mensalidade:</span>
                    <span className="font-bold text-[#9c7f64]">{formatCurrency(newClient.monthlyFee || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7f7c7a]">Barbeiro:</span>
                    <span>{barbers.find(b => b.id === newClient.barberId)?.name || 'Não selecionado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7f7c7a]">Mês:</span>
                    <span>{formatMonthDisplay(selectedMonth)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
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
                      barberId: '',
                      paymentMethod: 'pix',
                      notes: ''
                    });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base order-1 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base order-2 sm:order-2"
                >
                  <Check size={16} /> Criar Assinatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR (mantido igual) */}
      {showModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606]">
                {selectedClient.isMonthly ? 'Editar Mensalista' : 'Tornar Mensalista'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedClient(null);
                  monthlyFee.reset();
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#f5f0e8] p-3 sm:p-4 rounded-lg">
                <p className="font-medium text-[#060606] text-sm sm:text-base">{selectedClient.name}</p>
                <p className="text-xs sm:text-sm text-[#7f7c7a]">{selectedClient.phone}</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-1">Barbeiro</label>
                <div className="relative">
                  <User size={14} className="sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
                  <select
                    value={editingBarberId}
                    onChange={(e) => setEditingBarberId(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm appearance-none"
                  >
                    <option value="">Selecione um barbeiro...</option>
                    {barbers.map(barber => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name} ({barber.serviceCommissionRate * 100}% comissão)
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClient.barber && (
                  <p className="text-[10px] sm:text-xs text-[#7f7c7a] mt-1">
                    Atual: {selectedClient.barber.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={monthlyFee.value}
                  onChange={monthlyFee.onChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                  placeholder="0,00"
                  min="0"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedClient(null);
                    monthlyFee.reset();
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base order-1 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base order-2 sm:order-2"
                >
                  <Check size={16} /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMensalistas;