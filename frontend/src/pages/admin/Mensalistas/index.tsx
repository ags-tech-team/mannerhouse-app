import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { useNumberInput } from '../../../hooks/useNumberInput';
import { ClientAutocomplete } from '../../../components/common/ClientAutocomplete';
import { 
  Search, Edit, Trash2, X, Check,
  Users, User, Clock, AlertCircle, CheckCircle,
  UserPlus, CreditCard, Phone, ChevronLeft, ChevronRight,
  DollarSign, Settings,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { planService } from '../../../services/plan.service';
import type { Plan } from '../../../services/plan.service';

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
  planType?: string | null;
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
  planType: string;
  barberId: string;
  paymentMethod: 'dinheiro' | 'cartao' | 'pix' | 'debito';
  notes: string;
}

const AdminMensalistas = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]); // 🔥 NOVO: planos dinâmicos
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showEditPlansModal, setShowEditPlansModal] = useState(false); // 🔥 NOVO
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingBarberId, setEditingBarberId] = useState('');
  const [editingPlanType, setEditingPlanType] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clientToRemove, setClientToRemove] = useState<Client | null>(null);

  // 🔥 Estado dos planos pra edição
  const [editingPlans, setEditingPlans] = useState<Record<string, number>>({});
  const [savingPlans, setSavingPlans] = useState(false);

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
    planType: '',
    barberId: '',
    paymentMethod: 'pix',
    notes: ''
  });

  const monthlyFee = useNumberInput();

  useEffect(() => {
    loadBarbers();
    loadPlans();
  }, []);

  const loadBarbers = async () => {
    try {
      const response = await api.get('/barbers');
      setBarbers(response.data);
    } catch (error) {
      console.error('❌ Erro ao carregar barbeiros:', error);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await planService.getAll();
      setPlans(data);
    } catch (error) {
      console.error('❌ Erro ao carregar planos:', error);
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
    } catch (error) {
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
    return paidPayments.sort((a, b) => {
      if (a.paidAt && b.paidAt) return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
      if (a.month > b.month) return -1;
      if (a.month < b.month) return 1;
      return 0;
    })[0];
  };

  const formatPaymentDate = (payment: MonthlyPayment | null) => {
    if (!payment) return 'Nunca';
    if (payment.paidAt) {
      return new Date(payment.paidAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    const [year, month] = payment.month.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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

  const handleChangeNewPlan = (planType: string) => {
    const plano = plans.find(p => p.id === planType);
    setNewClient(prev => ({
      ...prev,
      planType,
      monthlyFee: plano ? plano.price : prev.monthlyFee,
    }));
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeCliente = clientName.trim();
    const telefoneCliente = newClient.phone.trim() || clientPhone.trim();

    if (!nomeCliente) return alert('Nome é obrigatório');
    if (!telefoneCliente) return alert('Telefone é obrigatório');
    if (newClient.monthlyFee <= 0) return alert('Selecione um plano');
    if (!newClient.barberId) return alert('Selecione um barbeiro responsável');

    try {
      await api.post('/monthly/clients', {
        name: nomeCliente,
        phone: telefoneCliente,
        monthlyFee: newClient.monthlyFee,
        planType: newClient.planType || null,
        barberId: newClient.barberId,
        paymentMethod: newClient.paymentMethod,
        notes: newClient.notes || 'Nova assinatura',
      });

      await loadClients();
      setShowNewClientModal(false);
      setClientName('');
      setClientPhone('');
      setNewClient({ name: '', phone: '', monthlyFee: 0, planType: '', barberId: '', paymentMethod: 'pix', notes: '' });
      alert('✅ Cliente mensalista criado! Aguardando primeiro pagamento.');
    } catch (error: any) {
      console.error('❌ Erro ao criar mensalista:', error);
      alert(error.response?.data?.error || 'Erro ao criar cliente mensalista');
    }
  };

  const openRemoveConfirm = (client: Client) => {
    setClientToRemove(client);
    setShowConfirmModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!clientToRemove) return;
    try {
      await api.put(`/monthly/client/${clientToRemove.id}`, {
        isMonthly: false,
        monthlyFee: clientToRemove.monthlyFee || 0,
        planType: null,
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
    setEditingPlanType(client.planType || '');
    monthlyFee.setValue(String(client.monthlyFee || 0));
    setShowModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedClient) return;
    const fee = monthlyFee.getNumberValue();
    if (!fee || fee < 0) return alert('Digite um valor válido');

    try {
      await api.put(`/monthly/client/${selectedClient.id}`, {
        isMonthly: true,
        monthlyFee: fee,
        planType: editingPlanType || null,
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
      alert(error.response?.data?.error || 'Erro ao confirmar pagamento');
    }
  };

  // 🔥 NOVO: abrir modal de edição de planos
  const handleOpenEditPlans = () => {
    const editing: Record<string, number> = {};
    plans.forEach(p => { editing[p.id] = p.price; });
    setEditingPlans(editing);
    setShowEditPlansModal(true);
  };

  // 🔥 NOVO: salvar planos
  const handleSavePlans = async () => {
    setSavingPlans(true);
    try {
      for (const plan of plans) {
        const newPrice = editingPlans[plan.id];
        if (newPrice !== undefined && newPrice !== plan.price) {
          await planService.update(plan.id, newPrice);
        }
      }
      await loadPlans();
      setShowEditPlansModal(false);
      alert('✅ Valores dos planos atualizados!');
    } catch (error: any) {
      console.error('❌ Erro ao salvar planos:', error);
      alert(error.response?.data?.error || 'Erro ao salvar planos');
    } finally {
      setSavingPlans(false);
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getTotalMonthlyRevenue = () =>
    clients.filter(c => c.isMonthly).reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

  const getPaidThisMonth = () =>
    clients.filter(c => c.isMonthly && hasPaidThisMonth(c)).reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

  const getPendingThisMonth = () =>
    clients.filter(c => c.isMonthly && !hasPaidThisMonth(c)).reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

  const getPlanLabel = (planType?: string | null) => {
    if (!planType) return null;
    const p = plans.find(x => x.id === planType);
    if (!p) return null;
    const diasLabel = Array.isArray(p.days) && p.days.includes(5) ? 'Seg a Sáb' : 'Seg a Qui';
    return `${p.name} (${diasLabel})`;
  };

  const getPlanDiasLabel = (plan: Plan) => {
    return Array.isArray(plan.days) && plan.days.includes(5) ? 'Seg a Sáb' : 'Seg a Qui';
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
          {/* 🔥 NOVO: botão editar planos */}
          <button
            onClick={handleOpenEditPlans}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-[#9c7f64] text-[#9c7f64] hover:bg-[#9c7f64]/10 px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base"
          >
            <Settings size={18} />
            Valores
          </button>
          <button
            onClick={() => {
              setClientName('');
              setClientPhone('');
              setNewClient({ name: '', phone: '', monthlyFee: 0, planType: '', barberId: '', paymentMethod: 'pix', notes: '' });
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
              <p className="text-base sm:text-2xl font-bold text-[#060606]">{formatCurrency(getTotalMonthlyRevenue())}</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
              <Users size={16} className="sm:w-5 sm:h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-[10px] sm:text-sm text-[#7f7c7a] mt-1">{clients.filter(c => c.isMonthly).length} clientes</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-sm font-medium text-[#7f7c7a]">Pago este mês</p>
              <p className="text-base sm:text-2xl font-bold text-green-600">{formatCurrency(getPaidThisMonth())}</p>
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
              <p className="text-base sm:text-2xl font-bold text-yellow-600">{formatCurrency(getPendingThisMonth())}</p>
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
          <span className="text-[10px] sm:text-sm text-[#7f7c7a] whitespace-nowrap">{filteredClients.length} clientes</span>
        </div>
      </div>

      {/* Lista */}
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
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Plano</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Barbeiro</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Mensalidade</th>
                  <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Mês Atual</th>
                  <th className="px-2 sm:px-3 py-2 text-right text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const paid = hasPaidThisMonth(client);

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
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-[#060606] text-[10px] sm:text-sm">{client.phone}</td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        {client.planType ? (
                          <span className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] rounded-full bg-[#9c7f64]/20 text-[#544941] font-medium whitespace-nowrap">
                            {getPlanLabel(client.planType) || client.planType}
                          </span>
                        ) : (
                          <span className="text-[#7f7c7a] text-[10px] sm:text-sm">-</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        {client.barber ? (
                          <span className="text-[10px] sm:text-sm text-[#9c7f64] font-medium">{client.barber.name}</span>
                        ) : (
                          <span className="text-[10px] sm:text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} className="sm:w-[14px] sm:h-[14px]" /> Sem barbeiro
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        <span className="font-medium text-[#9c7f64] text-[10px] sm:text-sm">{formatCurrency(client.monthlyFee || 0)}</span>
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                        {paid ? (
                          <span className="flex items-center gap-0.5 sm:gap-1 text-green-600 text-[10px] sm:text-sm whitespace-nowrap">
                            <CheckCircle size={12} className="sm:w-[14px] sm:h-[14px]" /> Pago
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 sm:gap-1 text-yellow-600 text-[10px] sm:text-sm whitespace-nowrap">
                            <Clock size={12} className="sm:w-[14px] sm:h-[14px]" /> Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <button onClick={() => handleEditClient(client)} className="text-blue-600 hover:text-blue-800 transition p-1" title="Editar">
                            <Edit size={14} className="sm:w-[16px] sm:h-[16px]" />
                          </button>
                          {!paid && (
                            <button onClick={() => handleConfirmPayment(client.id)} className="text-green-600 hover:text-green-800 transition p-1" title="Confirmar pagamento">
                              <Check size={14} className="sm:w-[16px] sm:h-[16px]" />
                            </button>
                          )}
                          <button onClick={() => openRemoveConfirm(client)} className="text-red-500 hover:text-red-700 transition p-1" title="Remover">
                            <X size={14} className="sm:w-[16px] sm:h-[16px]" />
                          </button>
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

      {/* 🔥 NOVO: Modal Editar Valores dos Planos */}
      {showEditPlansModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606] flex items-center gap-2">
                <Settings size={22} className="text-[#9c7f64]" />
                Valores dos Planos
              </h2>
              <button onClick={() => setShowEditPlansModal(false)} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                💡 Altere os valores abaixo. Os próximos cadastros já usam os novos valores.
              </div>

              {plans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#060606]">{plan.name}</p>
                    <p className="text-xs text-[#7f7c7a]">{getPlanDiasLabel(plan)}</p>
                  </div>
                  <div className="relative w-32">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a] pointer-events-none" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingPlans[plan.id] ?? plan.price}
                      onChange={(e) => setEditingPlans({
                        ...editingPlans,
                        [plan.id]: parseFloat(e.target.value) || 0,
                      })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 mt-2 border-t border-gray-200">
              <button
                onClick={() => setShowEditPlansModal(false)}
                disabled={savingPlans}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlans}
                disabled={savingPlans}
                className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50"
              >
                {savingPlans ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO PARA REMOVER */}
      {showConfirmModal && clientToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#060606] flex items-center gap-2">
                <AlertCircle size={24} className="text-red-500" />
                Confirmar Remoção
              </h2>
              <button onClick={() => { setShowConfirmModal(false); setClientToRemove(null); }} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 text-sm text-yellow-700">
                <p className="font-medium">⚠️ Atenção</p>
                <p className="mt-1">Tem certeza que deseja remover <strong>{clientToRemove.name}</strong> do plano mensal?</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button onClick={() => { setShowConfirmModal(false); setClientToRemove(null); }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base">
                  Cancelar
                </button>
                <button onClick={handleConfirmRemove}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base">
                  <X size={16} /> Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA ASSINATURA */}
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
                  setNewClient({ name: '', phone: '', monthlyFee: 0, planType: '', barberId: '', paymentMethod: 'pix', notes: '' });
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3 sm:space-y-4">
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
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-2">Plano *</label>
                <div className="grid grid-cols-2 gap-2">
                  {plans.map((p) => {
                    const selected = newClient.planType === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleChangeNewPlan(p.id)}
                        className={`p-3 rounded-lg border-2 text-left transition ${
                          selected
                            ? 'border-[#9c7f64] bg-[#9c7f64]/10'
                            : 'border-gray-200 hover:border-[#9c7f64]/50'
                        }`}
                      >
                        <p className={`text-sm font-bold ${selected ? 'text-[#9c7f64]' : 'text-[#060606]'}`}>{p.name}</p>
                        <p className="text-xs text-[#7f7c7a]">{getPlanDiasLabel(p)}</p>
                        <p className={`text-sm font-medium mt-1 ${selected ? 'text-[#9c7f64]' : 'text-[#060606]'}`}>
                          R$ {p.price.toFixed(2)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {newClient.planType && (
                  <div className="mt-3 p-3 bg-[#f5f0e8] rounded-lg flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-[#7f7c7a]">Valor da mensalidade:</span>
                    <span className="text-base font-bold text-[#9c7f64]">
                      R$ {newClient.monthlyFee.toFixed(2)}
                    </span>
                  </div>
                )}
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
                      <option key={barber.id} value={barber.id}>{barber.name}</option>
                    ))}
                  </select>
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
                <textarea
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm"
                  placeholder="Observações..."
                  rows={2}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClientModal(false);
                    setClientName('');
                    setClientPhone('');
                    setNewClient({ name: '', phone: '', monthlyFee: 0, planType: '', barberId: '', paymentMethod: 'pix', notes: '' });
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Check size={16} /> Criar Assinatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR MENSALISTA */}
      {showModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
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
                <label className="block text-xs sm:text-sm font-medium text-[#060606] mb-2">Plano de Assinatura</label>
                <div className="grid grid-cols-2 gap-2">
                  {plans.map((p) => {
                    const selected = editingPlanType === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setEditingPlanType(p.id);
                          monthlyFee.setValue(String(p.price));
                        }}
                        className={`p-3 rounded-lg border-2 text-left transition ${
                          selected
                            ? 'border-[#9c7f64] bg-[#9c7f64]/10'
                            : 'border-gray-200 hover:border-[#9c7f64]/50'
                        }`}
                      >
                        <p className={`text-sm font-bold ${selected ? 'text-[#9c7f64]' : 'text-[#060606]'}`}>{p.name}</p>
                        <p className="text-xs text-[#7f7c7a]">{getPlanDiasLabel(p)}</p>
                        <p className={`text-sm font-medium mt-1 ${selected ? 'text-[#9c7f64]' : 'text-[#060606]'}`}>
                          R$ {p.price.toFixed(2)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {editingPlanType && (
                  <button
                    type="button"
                    onClick={() => setEditingPlanType('')}
                    className="text-xs text-red-500 hover:text-red-700 mt-2 underline"
                  >
                    Remover plano específico
                  </button>
                )}

                <div className="mt-3 p-3 bg-[#f5f0e8] rounded-lg flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-[#7f7c7a]">Valor da mensalidade:</span>
                  <span className="text-base font-bold text-[#9c7f64]">
                    R$ {monthlyFee.getNumberValue().toFixed(2)}
                  </span>
                </div>

                {!editingPlanType && (
                  <p className="text-[10px] sm:text-xs text-[#7f7c7a] mt-2">
                    💡 Selecione um plano para atualizar o valor automaticamente.
                  </p>
                )}
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
                      <option key={barber.id} value={barber.id}>{barber.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedClient(null);
                    monthlyFee.reset();
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 sm:py-3 rounded-lg transition text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 sm:py-3 rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
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