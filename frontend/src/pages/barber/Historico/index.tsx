import { useState, useEffect } from 'react';
import { api } from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Users,
  Scissors,
  Package,
  DollarSign,
  Clock,
  Filter,
  Download,
  FileText,
  Printer,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Lock
} from 'lucide-react';

interface MonthlyPayment {
  id: string;
  clientId: string;
  client: { name: string; phone: string };
  month: string;
  amount: number;
  paid: boolean;
  paidAt: string;
  notes: string;
  createdAt: string;
}

interface Service {
  id: string;
  date: string;
  time: string;
  client: { name: string; phone: string };
  barber: { name: string };
  service: string;
  serviceDescription: string;
  price: number;
  commission: number;
  status: string;
  notes: string;
  createdAt: string;
}

interface ProductSale {
  id: string;
  date: string;
  barber: { name: string };
  client: { name: string };
  product: { name: string };
  quantity: number;
  salePrice: number;
  costPrice: number;
  profit: number;
  commission: number;
  paymentMethod: string;
  createdAt: string;
}

const BarberHistorico = () => {
  const { user, verifyPassword} = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'services' | 'products'>('payments');
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dados
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<ProductSale[]>([]);
  
  // Modal de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [actionType, setActionType] = useState<'edit' | 'delete' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'payment' | 'service' | 'product' | null>(null);
  const [passwordError, setPasswordError] = useState('');
  
  // Modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  // 🔥 FUNÇÃO PARA FORMATAR DATA (SEM NEW DATE)
  const formatDateDisplay = (date: string) => {
    if (!date) return '';
    
    // Se já estiver no formato DD/MM/YYYY, retorna direto
    if (/^\d{2}\/\d{2}\/\d{4}/.test(date)) {
      return date;
    }
    
    // Se for ISO (YYYY-MM-DD), converte manualmente
    const datePart = date.split('T')[0];
    if (!datePart || !datePart.includes('-')) return date;
    
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return date;
    
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  };

  // 🔥 FUNÇÃO PARA FORMATAR DATA + HORA
  const formatDateTimeDisplay = (date: string, time?: string) => {
    if (!date) return '';
    
    const formattedDate = formatDateDisplay(date);
    
    if (time) {
      return `${formattedDate} ${time}`;
    }
    
    // Se tiver hora no formato ISO
    if (date.includes('T')) {
      const timePart = date.split('T')[1];
      if (timePart) {
        const hours = timePart.substring(0, 5);
        return `${formattedDate} ${hours}`;
      }
    }
    
    return formattedDate;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      
      if (!year || !month || month < 1 || month > 12) {
        console.error('❌ Mês inválido:', selectedMonth);
        setLoading(false);
        return;
      }
      
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      console.log('📅 DATAS CALCULADAS:', { startDate, endDate, selectedMonth });

      // Carregar pagamentos
      const paymentsRes = await api.get('/monthly/payments', {
        params: { month: selectedMonth }
      });
      setPayments(paymentsRes.data.payments || []);

      // Carregar serviços
      console.log('📤 Enviando requisição para /revenues/services com:', { startDate, endDate });
      
      const servicesRes = await api.get('/revenues/services', {
        params: { 
          startDate, 
          endDate 
        }
      });
      
      console.log('📦 Resposta recebida:', servicesRes.data.length);
      
      const formattedServices = (servicesRes.data || []).map((r: any) => ({
        id: r.id,
        date: r.date || startDate,
        time: r.time || (r.createdAt ? new Date(r.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '00:00'),
        client: { name: r.clientName || r.client?.name || 'Cliente', phone: '' },
        barber: { name: r.barber?.name || 'Desconhecido' },
        service: r.service || 'Serviço',
        serviceDescription: r.serviceDescription || r.service || 'Serviço',
        // 🔥 CORRIGIDO: usar price e commission (e fallback para total/commissions)
        price: r.price || r.total || 0,
        commission: r.commission || r.commissions || 0,
        status: 'completed',
        notes: r.notes || '',
        createdAt: r.createdAt,
      }));
      setServices(formattedServices);

      // Carregar produtos vendidos
      const productsRes = await api.get('/sales', {
        params: { startDate, endDate }
      });
      setProducts(productsRes.data || []);

    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      alert('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const verifyBarberPassword = async (password: string) => {
    try {
      const response = await api.post('/auth/verify-password', { password });
      return response.data.valid;
    } catch (error) {
      return false;
    }
  };

  const openPasswordModal = (item: any, type: 'payment' | 'service' | 'product', action: 'edit' | 'delete') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setActionType(action);
    setPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async () => {
    if (!password.trim()) {
      setPasswordError('Digite a senha do barbeiro');
      return;
    }

    const isValid = await verifyPassword(password); 
    
    if (!isValid) {
      setPasswordError('Senha incorreta!');
      return;
    }

    setShowPasswordModal(false);
    
    if (actionType === 'delete') {
      await handleDelete();
    } else if (actionType === 'edit') {
      setShowEditModal(true);
      if (selectedItemType === 'payment') {
        setEditData({
          amount: selectedItem.amount,
          notes: selectedItem.notes || '',
        });
      } else if (selectedItemType === 'service') {
        setEditData({
          price: selectedItem.price,
          serviceDescription: selectedItem.serviceDescription || '',
          notes: selectedItem.notes || '',
        });
      } else if (selectedItemType === 'product') {
        setEditData({
          salePrice: selectedItem.salePrice,
          quantity: selectedItem.quantity,
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedItem || !selectedItemType) return;
    
    if (!confirm('Tem certeza que deseja excluir este item? Isso afetará o faturamento.')) return;

    try {
      if (selectedItemType === 'payment') {
        await api.delete(`/monthly/payment/${selectedItem.id}`);
      } else if (selectedItemType === 'service') {
        await api.delete(`/revenues/${selectedItem.id}`);
      } else if (selectedItemType === 'product') {
        await api.delete(`/sales/${selectedItem.id}`);
      }
      
      alert('✅ Item excluído com sucesso! O faturamento foi atualizado.');
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir item');
    }
  };

  const handleEdit = async () => {
    if (!selectedItem || !selectedItemType) return;

    try {
      if (selectedItemType === 'payment') {
        await api.put(`/monthly/payment/${selectedItem.id}`, {
          amount: editData.amount,
          notes: editData.notes,
        });
      } else if (selectedItemType === 'service') {
        await api.put(`/revenues/${selectedItem.id}`, {
          total: editData.price,
          commissions: editData.price * 0.5,
        });
      } else if (selectedItemType === 'product') {
        await api.put(`/sales/${selectedItem.id}`, {
          salePrice: editData.salePrice,
          quantity: editData.quantity,
        });
      }
      
      alert('✅ Item editado com sucesso! O faturamento foi atualizado.');
      setShowEditModal(false);
      await loadData();
    } catch (error) {
      console.error('Erro ao editar:', error);
      alert('Erro ao editar item');
    }
  };

  const changeMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // 🔥 FUNÇÃO PARA FORMATAR DATA DO PAGAMENTO (USANDO A MESMA LÓGICA)
  const formatPaymentDate = (date: string) => {
    if (!date) return '-';
    return formatDateTimeDisplay(date);
  };

  const getPaymentStatus = (paid: boolean) => {
    return paid ? '✅ Pago' : '⏳ Pendente';
  };

  const filteredPayments = payments.filter(p =>
    p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client?.phone?.includes(searchTerm)
  );

  const filteredServices = services.filter(s =>
    s.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.barber?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.service?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barber?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-').map(Number);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[month - 1]} ${year}`;
  };
  
  return (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-[#060606]">📜 Histórico</h1>
        <p className="text-[#7f7c7a]">Visualize e gerencie todos os registros do sistema</p>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg font-semibold min-w-[140px] text-center">
          {formatMonthDisplay(selectedMonth)}
        </span>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>

    {/* Tabs */}
    <div className="border-b border-gray-200">
      <nav className="flex gap-4">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === 'payments'
              ? 'border-[#9c7f64] text-[#9c7f64]'
              : 'border-transparent text-[#7f7c7a] hover:text-[#060606]'
          }`}
        >
          <Users size={16} className="inline mr-2" />
          Mensalidades ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === 'services'
              ? 'border-[#9c7f64] text-[#9c7f64]'
              : 'border-transparent text-[#7f7c7a] hover:text-[#060606]'
          }`}
        >
          <Scissors size={16} className="inline mr-2" />
          Serviços ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === 'products'
              ? 'border-[#9c7f64] text-[#9c7f64]'
              : 'border-transparent text-[#7f7c7a] hover:text-[#060606]'
          }`}
        >
          <Package size={16} className="inline mr-2" />
          Produtos ({products.length})
        </button>
      </nav>
    </div>

    {/* Busca */}
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center gap-2">
        <Search size={18} className="text-[#7f7c7a]" />
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
        />
        <span className="text-sm text-[#7f7c7a]">
          {activeTab === 'payments' && filteredPayments.length}
          {activeTab === 'services' && filteredServices.length}
          {activeTab === 'products' && filteredProducts.length}
          {' '}registros
        </span>
      </div>
    </div>

    {loading ? (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]" />
      </div>
    ) : (
      <>
        {/* TAB: PAGAMENTOS */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Cliente</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Mês</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Valor</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Status</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Data</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-center text-[#7f7c7a]">Nenhum pagamento registrado</td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606] font-medium">
                        {payment.client?.name || 'Cliente removido'}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606]">
                        {new Date(payment.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right font-medium text-[#9c7f64]">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-800">
                          {getPaymentStatus(payment.paid)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606]">
                        {formatPaymentDate(payment.paidAt)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right space-x-1">
                        <button onClick={() => openPasswordModal(payment, 'payment', 'edit')} className="text-blue-600 hover:text-blue-800 transition" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => openPasswordModal(payment, 'payment', 'delete')} className="text-red-500 hover:text-red-700 transition" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: SERVIÇOS */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Data/Hora</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Cliente</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Barbeiro</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Serviço</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Valor</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Comissão</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-3 text-center text-[#7f7c7a]">Nenhum serviço concluído</td>
                  </tr>
                ) : (
                  filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606]">{service.date} {service.time}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606] font-medium">{service.client?.name || 'Cliente'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606]">{service.barber?.name || 'Desconhecido'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606]">{service.serviceDescription || service.service}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right font-medium text-[#9c7f64]">{formatCurrency(service.price)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-green-600">{formatCurrency(service.commission)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right space-x-1">
                        <button onClick={() => openPasswordModal(service, 'service', 'edit')} className="text-blue-600 hover:text-blue-800 transition" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => openPasswordModal(service, 'service', 'delete')} className="text-red-500 hover:text-red-700 transition" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: PRODUTOS */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Data</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Produto</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Cliente</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[#544941] uppercase tracking-wider">Barbeiro</th>
                  <th className="px-2 py-1.5 text-center font-medium text-[#544941] uppercase tracking-wider">Qtd</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Venda</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Comissão</th>
                  <th className="px-2 py-1.5 text-right font-medium text-[#544941] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-3 text-center text-[#7f7c7a]">Nenhum produto vendido</td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606]">{formatDateDisplay(product.date)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606] font-medium">{product.product?.name || 'Produto removido'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606]">{product.client?.name || 'Cliente removido'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-[#060606]">{product.barber?.name || 'Barbeiro removido'}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-center text-[#060606]">{product.quantity}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right font-medium text-[#9c7f64]">{formatCurrency(product.salePrice * product.quantity)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-green-600">{formatCurrency(product.commission)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right space-x-1">
                        <button onClick={() => openPasswordModal(product, 'product', 'edit')} className="text-blue-600 hover:text-blue-800 transition" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => openPasswordModal(product, 'product', 'delete')} className="text-red-500 hover:text-red-700 transition" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </>
    )}

    {/* MODAL DE SENHA */}
    {showPasswordModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[#060606] flex items-center gap-2">
              <Lock size={24} className="text-[#9c7f64]" />
              {actionType === 'edit' ? 'Editar Item' : 'Excluir Item'}
            </h2>
            <button onClick={() => setShowPasswordModal(false)} className="text-[#7f7c7a] hover:text-[#060606]">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              <AlertCircle size={16} className="inline mr-2" />
              {actionType === 'edit'
                ? 'Digite a senha do barbeiro para editar este item.'
                : 'Digite a senha do barbeiro para excluir este item. Esta ação afetará o faturamento.'}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#060606] mb-1">Senha do Barbeiro</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordConfirm()}
              />
              {passwordError && <p className="text-xs text-red-600 mt-1">{passwordError}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handlePasswordConfirm} className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2">
                <Check size={18} /> Confirmar
              </button>
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* MODAL DE EDIÇÃO */}
    {showEditModal && selectedItem && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[#060606]">
              {selectedItemType === 'payment' ? 'Editar Pagamento' :
               selectedItemType === 'service' ? 'Editar Serviço' : 'Editar Produto'}
            </h2>
            <button onClick={() => setShowEditModal(false)} className="text-[#7f7c7a] hover:text-[#060606]">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-4">
            {selectedItemType === 'payment' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.amount}
                    onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Observações</label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    rows={2}
                  />
                </div>
              </>
            )}
            {selectedItemType === 'service' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.price}
                    onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Descrição</label>
                  <input
                    type="text"
                    value={editData.serviceDescription}
                    onChange={(e) => setEditData({ ...editData, serviceDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Observações</label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    rows={2}
                  />
                </div>
              </>
            )}
            {selectedItemType === 'product' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.salePrice}
                    onChange={(e) => setEditData({ ...editData, salePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606] mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={editData.quantity}
                    onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                    min="1"
                  />
                </div>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2">
                <Check size={18} /> Salvar
              </button>
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
}
export default BarberHistorico;