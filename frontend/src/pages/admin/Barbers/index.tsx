import { useState, useEffect, useCallback } from 'react';
import { barberService } from '../../../services/barber.service';
import type { Barber } from '../../../services/barber.service';
import { commissionService } from '../../../services/comission.service';
import type { BarberCommissionDetail } from '../../../services/comission.service';
import { useNumberInput } from '../../../hooks/useNumberInput';
import { Plus, Pencil, Trash2, X, Check, Eye, Calendar, DollarSign, Package, Scissors, User as UserIcon, Phone, Mail } from 'lucide-react';

const AdminBarbers = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [barberDetail, setBarberDetail] = useState<BarberCommissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 🔥 HOOKS PARA OS INPUTS NUMBER
  const commissionRate = useNumberInput();
  const serviceCommissionRate = useNumberInput();
  const productCommissionRate = useNumberInput();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    isActive: true,
  });

  const loadBarbers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await barberService.getAll();
      // 🔥 FILTRAR APENAS BARBEIROS ATIVOS
      const activeBarbers = data.filter(barber => barber.isActive === true);
      setBarbers(activeBarbers);
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error);
      alert('Erro ao carregar barbeiros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBarbers();
  }, [loadBarbers]);

  // 🔥 FUNÇÃO PARA ABRIR MODAL DE DETALHES
  const handleViewDetails = async (barber: Barber) => {
    setSelectedBarber(barber);
    setShowDetailModal(true);
    await loadBarberDetails(barber.id);
  };

  // 🔥 FUNÇÃO PARA CARREGAR DETALHES DO BARBEIRO
  const loadBarberDetails = async (barberId: string) => {
    setDetailLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(Number(year), Number(month), 0).getDate()}`;
      
      const data = await commissionService.getByBarberId(barberId, startDate, endDate);
      setBarberDetail(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      alert('Erro ao carregar detalhes do barbeiro');
    } finally {
      setDetailLoading(false);
    }
  };

  // 🔥 FUNÇÃO PARA MUDAR O MÊS
  const handleMonthChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
    if (selectedBarber) {
      await loadBarberDetails(selectedBarber.id);
    }
  };

  const handleOpenModal = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber);
      setFormData({
        name: barber.name,
        email: barber.email,
        phone: barber.phone || '',
        username: barber.username,
        password: '',
        confirmPassword: '',
        isActive: barber.isActive,
      });
      commissionRate.setValue(String(barber.commissionRate * 100));
      serviceCommissionRate.setValue(String(barber.serviceCommissionRate * 100));
      productCommissionRate.setValue(String(barber.productCommissionRate * 100));
    } else {
      setEditingBarber(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        confirmPassword: '',
        isActive: true,
      });
      commissionRate.reset();
      serviceCommissionRate.reset();
      productCommissionRate.reset();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBarber(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingBarber && !formData.password) {
      alert('Senha é obrigatória para novo barbeiro');
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        username: formData.username,
        commissionRate: commissionRate.getNumberValue() / 100,
        serviceCommissionRate: serviceCommissionRate.getNumberValue() / 100,
        productCommissionRate: productCommissionRate.getNumberValue() / 100,
        isActive: formData.isActive,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingBarber) {
        await barberService.update(editingBarber.id, payload);
      } else {
        await barberService.create(payload);
      }
      
      await loadBarbers();
      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar barbeiro:', error);
      alert(error.response?.data?.error || 'Erro ao salvar barbeiro');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este barbeiro?')) return;
    try {
      const response = await barberService.delete(id);
      if (response?.message) {
        alert(response.message);
      } else {
        alert('Barbeiro desativado com sucesso!');
      }
      await loadBarbers(); // 🔥 RECARREGAR A LISTA (vai remover o desativado)
    } catch (error: any) {
      console.error('Erro ao desativar barbeiro:', error);
      alert(error.response?.data?.error || 'Erro ao desativar barbeiro');
    }
  };

  // Formatar data para exibição
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Formatar mês para exibição
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[Number(monthNum) - 1]} ${year}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">Barbeiros</h1>
          <p className="text-[#7f7c7a]">Gerencie os barbeiros da barbearia</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Adicionar Barbeiro
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]"></div>
        </div>
      ) : barbers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-[#7f7c7a]">
          Nenhum barbeiro cadastrado. Clique em "Adicionar Barbeiro" para começar.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Comissão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#544941] uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {barbers.map((barber) => (
                  <tr key={barber.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                      {barber.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      {barber.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      {barber.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      {barber.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      <div className="text-sm">
                        <span>Serviços: {(barber.serviceCommissionRate * 100).toFixed(0)}%</span>
                        <br />
                        <span>Produtos: {(barber.productCommissionRate * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        barber.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {barber.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleViewDetails(barber)}
                        className="text-blue-600 hover:text-blue-800 transition"
                        title="Ver detalhes e comissões"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenModal(barber)}
                        className="text-[#9c7f64] hover:text-[#544941] transition"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(barber.id)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🔥 MODAL DE DETALHES DO BARBEIRO */}
      {showDetailModal && selectedBarber && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b bg-[#f5f0e8]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#9c7f64] flex items-center justify-center text-white text-2xl font-bold">
                  {selectedBarber.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#060606]">{selectedBarber.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-[#7f7c7a]">
                    <span className="flex items-center gap-1">
                      <Mail size={14} /> {selectedBarber.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={14} /> {selectedBarber.phone}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      selectedBarber.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedBarber.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-[#7f7c7a]" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setBarberDetail(null);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition text-[#7f7c7a] hover:text-[#060606]"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {showDetailModal && selectedBarber && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b bg-[#f5f0e8]">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#9c7f64] flex items-center justify-center text-white text-2xl font-bold">
                      {selectedBarber.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#060606]">{selectedBarber.name}</h2>
                      <div className="flex items-center gap-4 text-sm text-[#7f7c7a]">
                        <span className="flex items-center gap-1">
                          <Mail size={14} /> {selectedBarber.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone size={14} /> {selectedBarber.phone}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          selectedBarber.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedBarber.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-[#7f7c7a]" />
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setBarberDetail(null);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition text-[#7f7c7a] hover:text-[#060606]"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* 🔥 CONTEÚDO DO MODAL - AQUI ESTÁ O PROBLEMA */}
                <div className="flex-1 overflow-y-auto p-6">
                  {detailLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]"></div>
                      <p className="ml-4 text-[#7f7c7a]">Carregando dados...</p>
                    </div>
                  ) : barberDetail ? (
                    <div className="space-y-6">
                      {/* Resumo - Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[#f5f0e8] p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-[#7f7c7a] text-sm">
                            <Scissors size={16} />
                            Serviços
                          </div>
                          <p className="text-2xl font-bold text-[#060606]">
                            {barberDetail.summary.totalServices}
                          </p>
                          <p className="text-sm text-[#7f7c7a]">
                            R$ {barberDetail.summary.totalServiceRevenue.toFixed(2)}
                          </p>
                        </div>

                        <div className="bg-[#f5f0e8] p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-[#7f7c7a] text-sm">
                            <Package size={16} />
                            Produtos
                          </div>
                          <p className="text-2xl font-bold text-[#060606]">
                            {barberDetail.summary.totalProducts}
                          </p>
                          <p className="text-sm text-[#7f7c7a]">
                            R$ {barberDetail.summary.totalProductRevenue.toFixed(2)}
                          </p>
                        </div>

                        <div className="bg-[#f5f0e8] p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-[#7f7c7a] text-sm">
                            <DollarSign size={16} />
                            Total Faturamento
                          </div>
                          <p className="text-2xl font-bold text-[#060606]">
                            R$ {barberDetail.summary.totalRevenue.toFixed(2)}
                          </p>
                          <p className="text-sm text-[#7f7c7a]">
                            {barberDetail.period.startDate} até {barberDetail.period.endDate}
                          </p>
                        </div>

                        <div className="bg-[#9c7f64]/10 p-4 rounded-lg border-2 border-[#9c7f64]">
                          <div className="flex items-center gap-2 text-[#9c7f64] text-sm font-medium">
                            <DollarSign size={16} />
                            Comissão Total
                          </div>
                          <p className="text-2xl font-bold text-[#9c7f64]">
                            R$ {barberDetail.summary.totalCommission.toFixed(2)}
                          </p>
                          <p className="text-xs text-[#9c7f64]/70">
                            Serviços: {barberDetail.barber.serviceCommissionRate}% • Produtos: {barberDetail.barber.productCommissionRate}%
                          </p>
                        </div>
                      </div>

                      {/* 🔥 DETALHES DOS SERVIÇOS */}
                      {barberDetail.details.services.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-[#060606] mb-3 flex items-center gap-2">
                            <Scissors size={18} className="text-[#9c7f64]" />
                            Serviços Realizados ({barberDetail.details.services.length})
                          </h3>
                          <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-[#f5f0e8]">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-[#544941] uppercase">Data</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-[#544941] uppercase">Cliente</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-[#544941] uppercase">Serviço</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-[#544941] uppercase">Valor</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-[#544941] uppercase">Comissão</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {barberDetail.details.services.map((service: any) => (
                                  <tr key={service.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(service.date)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{service.client}</td>
                                    <td className="px-4 py-2">{service.service}</td>
                                    <td className="px-4 py-2 text-right font-medium">R$ {service.price.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-green-600 font-medium">R$ {service.commission.toFixed(2)}</td>
                                  </tr>
                                ))}
                                <tr className="bg-[#f5f0e8] font-bold">
                                  <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                                  <td className="px-4 py-2 text-right">R$ {barberDetail.summary.totalServiceRevenue.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-right text-green-600">R$ {barberDetail.summary.serviceCommission.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 🔥 DETALHES DOS PRODUTOS */}
                      {barberDetail.details.products.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-[#060606] mb-3 flex items-center gap-2">
                            <Package size={18} className="text-[#9c7f64]" />
                            Produtos Vendidos ({barberDetail.details.products.length})
                          </h3>
                          <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-[#f5f0e8]">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-[#544941] uppercase">Data</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-[#544941] uppercase">Produto</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-[#544941] uppercase">Qtd</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-[#544941] uppercase">Venda</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-[#544941] uppercase">Custo</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-[#544941] uppercase">Lucro</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-[#544941] uppercase">Comissão</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {barberDetail.details.products.map((product: any) => (
                                  <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(product.date)}</td>
                                    <td className="px-4 py-2">{product.product}</td>
                                    <td className="px-4 py-2 text-center">{product.quantity}</td>
                                    <td className="px-4 py-2 text-right">R$ {product.salePrice.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-[#7f7c7a]">R$ {product.costPrice.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-blue-600">R$ {product.profit.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-green-600 font-medium">R$ {product.commission.toFixed(2)}</td>
                                  </tr>
                                ))}
                                <tr className="bg-[#f5f0e8] font-bold">
                                  <td colSpan={4} className="px-4 py-2 text-right">Total</td>
                                  <td className="px-4 py-2 text-right">R$ {barberDetail.summary.totalProductRevenue.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-right text-blue-600">R$ {(barberDetail.summary.totalProductRevenue * 0.5).toFixed(2)}</td>
                                  <td className="px-4 py-2 text-right text-green-600">R$ {barberDetail.summary.productCommission.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Mensagem quando não tem dados */}
                      {barberDetail.details.services.length === 0 && barberDetail.details.products.length === 0 && (
                        <div className="text-center py-12 text-[#7f7c7a] bg-gray-50 rounded-lg">
                          <p className="text-lg">Nenhum serviço ou venda registrado neste período</p>
                          <p className="text-sm mt-1">{formatMonth(selectedMonth)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[#7f7c7a]">
                      <p className="text-lg">Nenhum dado encontrado</p>
                      <p className="text-sm mt-1">Tente selecionar outro mês</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
              </h2>
              <button onClick={handleCloseModal} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606]">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Usuário (login)</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">
                  {editingBarber ? 'Nova senha (opcional)' : 'Senha'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  placeholder={editingBarber ? 'Deixe em branco para manter' : 'Digite a senha'}
                  required={!editingBarber}
                />
              </div>

              {formData.password && (
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Confirmar senha</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    placeholder="Confirme a senha"
                    required={!editingBarber && !!formData.password}
                  />
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-[#060606] mb-3">Comissões</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[#060606]">
                      Comissão sobre Serviços (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={serviceCommissionRate.value}
                      onChange={serviceCommissionRate.onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                      min="0"
                      max="100"
                      placeholder="0"
                      required
                    />
                    <p className="text-xs text-[#7f7c7a] mt-1">Ex: 50% sobre o valor do serviço</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#060606]">
                      Comissão sobre Produtos (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={productCommissionRate.value}
                      onChange={productCommissionRate.onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                      min="0"
                      max="100"
                      placeholder="0"
                      required
                    />
                    <p className="text-xs text-[#7f7c7a] mt-1">Ex: 50% sobre o lucro do produto</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#060606]">
                      Comissão Geral (usado para cálculo de comissões pagas)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={commissionRate.value}
                      onChange={commissionRate.onChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                      min="0"
                      max="100"
                      placeholder="0"
                      required
                    />
                    <p className="text-xs text-[#7f7c7a] mt-1">Taxa geral para relatórios</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-[#9c7f64] focus:ring-[#9c7f64]"
                />
                <label className="text-sm font-medium text-[#060606]">Ativo</label>
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
                  onClick={handleCloseModal}
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

export default AdminBarbers;