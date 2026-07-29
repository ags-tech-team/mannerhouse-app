import { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Check,
  Search,
  Filter,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Minus,
  Plus as PlusIcon
} from 'lucide-react';

// Tipos
interface Product {
  id: string;
  name: string;
  category: 'pomada' | 'bebida' | 'shampoo' | 'outro';
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  createdAt: string;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todos');
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'pomada' as Product['category'],
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 5,
  });

  // Dados mockados
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Pomada Modeladora 100g',
      category: 'pomada',
      price: 45.00,
      cost: 22.00,
      stock: 15,
      minStock: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Óleo de Barba 50ml',
      category: 'pomada',
      price: 35.00,
      cost: 15.00,
      stock: 8,
      minStock: 3,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Shampoo Especial 250ml',
      category: 'shampoo',
      price: 28.00,
      cost: 12.00,
      stock: 20,
      minStock: 5,
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Cerveja Artesanal 330ml',
      category: 'bebida',
      price: 15.00,
      cost: 6.00,
      stock: 48,
      minStock: 12,
      createdAt: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Refrigerante Lata 350ml',
      category: 'bebida',
      price: 8.00,
      cost: 3.00,
      stock: 60,
      minStock: 20,
      createdAt: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      setProducts(mockProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'pomada',
        price: 0,
        cost: 0,
        stock: 0,
        minStock: 5,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        // Editar
        setProducts(products.map(p =>
          p.id === editingProduct.id
            ? { ...p, ...formData }
            : p
        ));
      } else {
        // Novo
        const newProduct: Product = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toISOString(),
        };
        setProducts([newProduct, ...products]);
      }
      handleCloseModal();
      alert(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
    } catch (error) {
      alert('Erro ao salvar produto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este produto?')) return;
    setProducts(products.filter(p => p.id !== id));
  };

  const handleStockChange = (id: string, increment: boolean) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        const newStock = increment ? p.stock + 1 : Math.max(0, p.stock - 1);
        return { ...p, stock: newStock };
      }
      return p;
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
      pomada: 'Pomada',
      bebida: 'Bebida',
      shampoo: 'Shampoo',
      outro: 'Outro',
    };
    return map[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const map: Record<string, string> = {
      pomada: 'bg-purple-100 text-purple-800',
      bebida: 'bg-blue-100 text-blue-800',
      shampoo: 'bg-green-100 text-green-800',
      outro: 'bg-gray-100 text-gray-800',
    };
    return map[category] || 'bg-gray-100 text-gray-800';
  };

  // Filtros
  const filteredProducts = products.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === 'todos' || product.category === filterCategory;
    return matchSearch && matchCategory;
  });

  // Estatísticas
  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStockItems = products.filter(p => p.stock <= p.minStock);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#060606]">Estoque</h1>
          <p className="text-[#7f7c7a]">Gerencie os produtos da barbearia</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#9c7f64] hover:bg-[#544941] text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Adicionar Produto
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7f7c7a]">Total de Produtos</p>
              <p className="text-2xl font-bold text-[#060606]">{totalProducts}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <Package size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7f7c7a]">Unidades em Estoque</p>
              <p className="text-2xl font-bold text-[#060606]">{totalStock}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <TrendingUp size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7f7c7a]">Valor Total em Estoque</p>
              <p className="text-2xl font-bold text-[#060606]">{formatCurrency(totalValue)}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <DollarSign size={20} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7f7c7a]">Produtos com Estoque Baixo</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2">
            <Search size={18} className="text-[#7f7c7a]" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[#7f7c7a]" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
            >
              <option value="todos">Todas categorias</option>
              <option value="pomada">Pomada</option>
              <option value="bebida">Bebida</option>
              <option value="shampoo">Shampoo</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-[#7f7c7a]">Carregando produtos...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Package size={48} className="mx-auto text-[#7f7c7a] mb-2" />
          <p className="text-[#7f7c7a]">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#f5f0e8]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Preço Venda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Custo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#544941] uppercase tracking-wider">
                    Estoque
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
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-[#9c7f64]" />
                        {product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(product.category)}`}>
                        {getCategoryLabel(product.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606] font-medium">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#060606]">
                      {formatCurrency(product.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStockChange(product.id, false)}
                          className="p-1 hover:bg-gray-100 rounded"
                          disabled={product.stock === 0}
                        >
                          <Minus size={14} className={product.stock === 0 ? 'text-gray-300' : 'text-red-500'} />
                        </button>
                        <span className={`font-medium ${product.stock <= product.minStock ? 'text-red-600' : 'text-[#060606]'}`}>
                          {product.stock}
                        </span>
                        <button
                          onClick={() => handleStockChange(product.id, true)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <PlusIcon size={14} className="text-green-500" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stock <= product.minStock ? (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <AlertTriangle size={14} />
                          Baixo estoque
                        </span>
                      ) : (
                        <span className="text-green-600 text-sm">OK</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="text-[#9c7f64] hover:text-[#544941] transition mr-2"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#060606]">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={handleCloseModal} className="text-[#7f7c7a] hover:text-[#060606]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#060606]">Nome do Produto</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#060606]">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Product['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                >
                  <option value="pomada">Pomada</option>
                  <option value="bebida">Bebida</option>
                  <option value="shampoo">Shampoo</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Quantidade em Estoque</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#060606]">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
                    required
                  />
                </div>
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

export default AdminProducts;