import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { productService } from '../../../services/product.service';
import type { Product } from '../../../services/product.service';
import { saleService } from '../../../services/sale.service';
import { api } from '../../../api/client';
import { ClientAutocomplete } from '../../../components/common/ClientAutocomplete';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  X, 
  Check,
  AlertCircle,
  CreditCard,
  User as UserIcon,
  Users
} from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  isActive: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  isMonthly: boolean;
  monthlyFee: number;
  isActive: boolean;
}

const BarberLoja = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [saleLoading, setSaleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadProducts();
    loadBarbers();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getAll();
      setProducts(data.filter(p => p.isActive && p.stock > 0));
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      setError(`Erro ao carregar produtos: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadBarbers = async () => {
    try {
      const response = await api.get('/barbers');
      const activeBarbers = response.data.filter((b: Barber) => b.isActive);
      setBarbers(activeBarbers);
      
      if (activeBarbers.length > 0) {
        setSelectedBarberId(activeBarbers[0].id);
      }
    } catch (error: any) {
      console.error('Erro ao buscar barbeiros:', error);
      setError(`Erro ao buscar barbeiros: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientName(client.name);
    setClientPhone(client.phone);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert('Estoque insuficiente!');
        return;
      }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const existing = cart.find(item => item.product.id === productId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.product.id !== productId));
    }
  };

  const removeItem = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getTotalProfit = () => {
    return cart.reduce((sum, item) => sum + ((item.product.price - item.product.costPrice) * item.quantity), 0);
  };

  const getTotalCommission = () => {
    let totalCommission = 0;
    
    for (const item of cart) {
      // Verifica se o produto tem comissão ativa
      if (item.product.hasCommission !== false) {
        const profit = (item.product.price - item.product.costPrice) * item.quantity;
        // 🔥 TAXA PADRÃO DE 50% (OU PEGAR DO BARBEIRO SELECIONADO)
        const rate = barbers.find(b => b.id === selectedBarberId)?.productCommissionRate || 0.50;
        totalCommission += profit * rate;
      }
    }
    
    return totalCommission;
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }

    if (!selectedBarberId) {
      alert('Selecione um barbeiro!');
      return;
    }

    if (!clientName.trim()) {
      alert('Por favor, informe o nome do cliente!');
      return;
    }

    setSaleLoading(true);
    try {
      for (const item of cart) {
        await saleService.create({
          barberId: selectedBarberId,
          clientName: clientName,
          clientPhone: clientPhone || '(00) 00000-0000',
          productId: item.product.id,
          quantity: item.quantity,
          paymentMethod: paymentMethod,
        });
      }

      setCart([]);
      setClientName('');
      setClientPhone('');
      setSelectedClient(null);
      setShowPaymentModal(false);
      setShowCart(false);
      setSuccessMessage(`Venda finalizada com sucesso! Total: R$ ${getTotal().toFixed(2)}`);

      await loadProducts();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      console.error('Erro ao finalizar venda:', error);
      alert(error.response?.data?.error || 'Erro ao finalizar venda');
    } finally {
      setSaleLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">❌ Erro</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadProducts();
              loadBarbers();
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">🛒 Loja</h1>
          <p className="text-[#7f7c7a]">Venda produtos para seus clientes</p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition relative"
        >
          <ShoppingCart size={18} />
          Carrinho
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Mensagem de sucesso */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center gap-2">
          <Check size={18} />
          {successMessage}
        </div>
      )}

      {/* Busca */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-[#7f7c7a]" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64]"
          />
          <span className="text-sm text-[#7f7c7a]">
            {filteredProducts.length} produtos
          </span>
        </div>
      </div>

      {/* Lista de Produtos */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9c7f64] mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-[#7f7c7a]">
              Nenhum produto disponível no momento
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#060606]">{product.name}</h3>
                    <p className="text-sm text-[#7f7c7a] line-clamp-2">
                      {product.description || 'Sem descrição'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-[#f5f0e8] rounded-full">
                    {product.category}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#7f7c7a]">Preço:</span>
                    <span className="font-bold text-[#9c7f64]">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#7f7c7a]">Estoque:</span>
                    <span className={`font-medium ${
                      product.stock < 5 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {product.stock} unidades
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                  className="w-full mt-3 py-2 bg-[#9c7f64] hover:bg-[#544941] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Adicionar ao Carrinho
                </button>

                {product.stock === 0 && (
                  <div className="mt-2 flex items-center gap-1 text-red-600 text-xs">
                    <AlertCircle size={14} />
                    Produto esgotado
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal do Carrinho */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-[#060606]">
                🛒 Carrinho ({cartCount} itens)
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-[#7f7c7a] hover:text-[#060606]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-[#7f7c7a] py-8">
                  Carrinho vazio
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-[#060606]">{item.product.name}</p>
                      <p className="text-sm text-[#9c7f64]">
                        R$ {item.product.price.toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Minus size={16} className="text-[#7f7c7a]" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item.product)}
                        className="p-1 hover:bg-gray-200 rounded"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus size={16} className="text-[#9c7f64]" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 hover:bg-red-100 rounded ml-2"
                      >
                        <X size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg text-[#9c7f64]">
                    R$ {getTotal().toFixed(2)}
                  </span>
                </div>
               <div className="flex justify-between text-sm text-[#7f7c7a]">
                  <span>Comissão do barbeiro:</span>
                  <span className="font-medium text-[#060606]">
                    R$ {getTotalCommission().toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-2 bg-[#9c7f64] hover:bg-[#544941] text-white rounded-lg transition"
                >
                  Finalizar Venda
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#060606] mb-4">
              💳 Finalizar Venda
            </h2>

            <div className="space-y-4">
              {/* SELECT DE BARBEIROS */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  👤 Barbeiro que está vendendo
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" size={18} />
                  <select
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] appearance-none"
                    required
                  >
                    {barbers.length === 0 ? (
                      <option value="">Carregando barbeiros...</option>
                    ) : (
                      <>
                        <option value="">Selecione um barbeiro</option>
                        {barbers.map((barber) => (
                          <option key={barber.id} value={barber.id}>
                            {barber.name} ({barber.username})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                {barbers.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Nenhum barbeiro cadastrado. Cadastre barbeiros no painel admin.
                  </p>
                )}
              </div>

              {/* 🔥 CLIENTE COM AUTOCOMPLETE */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  Cliente
                </label>
                <ClientAutocomplete
                  value={clientName}
                  onChange={setClientName}
                  onSelectClient={handleSelectClient}
                  placeholder="Digite o nome ou telefone do cliente..."
                />
                {selectedClient && (
                  <p className="text-xs text-[#7f7c7a] mt-1">
                    📱 Telefone: {selectedClient.phone}
                    {selectedClient.isMonthly && (
                      <span className="ml-2 text-purple-600">🔹 Mensalista</span>
                    )}
                  </p>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-[#060606] mb-1">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['dinheiro', 'pix', 'cartao', 'debito'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-lg border transition flex items-center justify-center gap-2 ${
                        paymentMethod === method
                          ? 'border-[#9c7f64] bg-[#9c7f64]/10 text-[#9c7f64]'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <CreditCard size={16} />
                      {method === 'dinheiro' && 'Dinheiro'}
                      {method === 'pix' && 'PIX'}
                      {method === 'cartao' && 'Cartão'}
                      {method === 'debito' && 'Débito'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumo da Venda */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#7f7c7a]">Itens:</span>
                  <span>{cartCount} produtos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7f7c7a]">Quantidade:</span>
                  <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} unidades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7f7c7a]">Total:</span>
                  <span className="font-bold text-lg text-[#9c7f64]">
                    R$ {getTotal().toFixed(2)}
                  </span>
                </div>
                {selectedBarberId && (
                  <div className="flex justify-between text-sm text-[#7f7c7a]">
                    <span>Comissão do barbeiro (50% do lucro):</span>
                    <span className="font-medium text-[#060606]">
                      R$ {getTotalCommission().toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCheckout}
                  disabled={saleLoading || !clientName.trim() || !selectedBarberId}
                  className="flex-1 bg-[#9c7f64] hover:bg-[#544941] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {saleLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Confirmar Venda
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#060606] py-2 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberLoja;