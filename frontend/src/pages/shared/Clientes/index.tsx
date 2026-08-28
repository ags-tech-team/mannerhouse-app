import { useState, useEffect } from 'react';
import { clientService } from '../../../services/client.service';
import type { Client } from '../../../services/client.service';
import { ClientAutocomplete } from '../../../components/common/ClientAutocomplete';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Check,
  User,
  Phone,
  Users,
  AlertCircle
} from 'lucide-react';

const Clientes = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // 🔥 AUTO-COMPLETE
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await clientService.getAll();
      setClients(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      alert('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 HANDLE SELECT CLIENT (do auto-complete)
  const handleSelectClient = (client: Client) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setFormData({
      name: client.name,
      phone: client.phone,
    });
    // Se for edição, seleciona o cliente
    if (editingClient) {
      setEditingClient(client);
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setClientName(client.name);
      setClientPhone(client.phone);
      setFormData({
        name: client.name,
        phone: client.phone,
      });
    } else {
      setEditingClient(null);
      setClientName('');
      setClientPhone('');
      setFormData({
        name: '',
        phone: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔥 VALIDAÇÃO
    if (!clientName.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    
    if (!clientPhone.trim()) {
      alert('Telefone é obrigatório');
      return;
    }

    try {
      if (editingClient) {
        // 🔥 EDIÇÃO - Verifica se o telefone já existe para outro cliente
        const existing = await clientService.getByPhone(clientPhone.trim());
        if (existing && existing.id !== editingClient.id) {
          const confirm = window.confirm(
            `📌 Telefone já cadastrado!\n\n` +
            `O telefone ${clientPhone} já está cadastrado para o cliente:\n` +
            `👤 ${existing.name}\n\n` +
            `Deseja usar este cliente existente?`
          );
          if (confirm) {
            // Usar o cliente existente
            setEditingClient(existing);
            setClientName(existing.name);
            setClientPhone(existing.phone);
            setFormData({
              name: existing.name,
              phone: existing.phone,
            });
            alert(`✅ Cliente atualizado para: ${existing.name}`);
            await loadClients();
            setShowModal(false);
            resetForm();
            return;
          }
          return;
        }
        
        await clientService.update(editingClient.id, {
          name: clientName.trim(),
          phone: clientPhone.trim(),
        });
        alert('✅ Cliente atualizado com sucesso!');
      } else {
        // 🔥 CRIAÇÃO - Verifica se o telefone já existe
        try {
          await clientService.create({
            name: clientName.trim(),
            phone: clientPhone.trim(),
          });
          alert('✅ Cliente criado com sucesso!');
        } catch (error: any) {
          // 🔥 TRATAR ERRO DE TELEFONE JÁ EXISTENTE
          if (error.response?.data?.error === 'TELEFONE_JA_EXISTE' || error.response?.status === 409) {
            const existingClient = error.response?.data?.client;
            if (existingClient) {
              const confirm = window.confirm(
                `📌 Telefone já cadastrado!\n\n` +
                `O telefone ${clientPhone} já está cadastrado para o cliente:\n` +
                `👤 ${existingClient.name}\n\n` +
                `Deseja usar este cliente existente?`
              );
              if (confirm) {
                // 🔥 USAR O CLIENTE EXISTENTE
                setClientName(existingClient.name);
                setClientPhone(existingClient.phone);
                setFormData({
                  name: existingClient.name,
                  phone: existingClient.phone,
                });
                alert(`✅ Usando cliente existente: ${existingClient.name}`);
                await loadClients();
                setShowModal(false);
                resetForm();
                return;
              }
            }
            return;
          }
          throw error;
        }
      }
      
      await loadClients();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Erro ao salvar cliente:', error);
      alert(error.response?.data?.message || 'Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await clientService.delete(id);
      await loadClients();
      alert('✅ Cliente excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir cliente');
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setClientName('');
    setClientPhone('');
    setFormData({
      name: '',
      phone: '',
    });
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">👤 Clientes</h1>
          <p className="text-[#7f7c7a]">Gerencie os clientes da barbearia</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Total de Clientes</p>
              <p className="text-2xl font-bold text-[#060606]">{clients.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Clientes Ativos</p>
              <p className="text-2xl font-bold text-[#060606]">
                {clients.filter(c => c.isActive).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <User size={20} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#7f7c7a]">Clientes Inativos</p>
              <p className="text-2xl font-bold text-[#060606]">
                {clients.filter(c => !c.isActive).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <User size={20} className="text-red-600" />
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
            placeholder="Buscar clientes por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
          />
          <span className="text-sm text-[#7f7c7a]">
            {filteredClients.length} clientes
          </span>
        </div>
      </div>

      {/* Tabela de Clientes */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Nome</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Telefone</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Status</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Mensalista</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-[#544941] uppercase whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[#060606] font-medium text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#9c7f64]/20 flex items-center justify-center text-[#9c7f64] font-bold text-[10px] sm:text-sm flex-shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[100px] sm:max-w-none">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-[#060606] text-xs sm:text-sm">
                      {client.phone}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-[10px] sm:text-xs rounded-full ${
                        client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {client.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                      {client.isMonthly ? (
                        <span className="px-2 py-1 text-[10px] sm:text-xs rounded-full bg-purple-100 text-purple-800">
                          Mensalista
                        </span>
                      ) : (
                        <span className="text-[#7f7c7a] text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEditClient(client)}
                          className="text-[#9c7f64] hover:text-[#544941] transition p-1"
                          title="Editar"
                        >
                          <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-500 hover:text-red-700 transition p-1"
                          title="Excluir"
                        >
                          <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 🔥 NOME COM AUTO-COMPLETE */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Nome</label>
                <ClientAutocomplete
                  value={clientName}
                  onChange={setClientName}
                  onSelectClient={handleSelectClient}
                  placeholder="Digite o nome ou telefone do cliente..."
                  required
                />
              </div>

              {/* 🔥 TELEFONE */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" size={18} />
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  {editingClient ? 'Atualizar' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
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

export default Clientes;