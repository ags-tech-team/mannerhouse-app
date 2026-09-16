import { useState, useEffect } from 'react';
import { productService } from '../../services/product.service';
import type { Product } from '../../services/product.service';
import { Plus, X, Package, Minus } from 'lucide-react';

export interface SelectedProduct {
  id: string; // id único da linha
  product: {
    id: string;
    name: string;
    price: number;
    costPrice: number;
    stock: number;
    hasCommission: boolean;
  };
  quantity: number;
}

interface MultiProductSelectorProps {
  selectedProducts: SelectedProduct[];
  onChange: (products: SelectedProduct[]) => void;
  maxProducts?: number;
}

const MultiProductSelector: React.FC<MultiProductSelectorProps> = ({
  selectedProducts,
  onChange,
  maxProducts = 20,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    productService
      .getAll()
      .then((data) => {
        if (mounted) setProducts(data.filter((p) => p.isActive && p.stock > 0));
      })
      .catch((err) => console.error('Erro ao carregar produtos:', err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleAdd = () => {
    if (!selectedId) return;
    if (selectedProducts.length >= maxProducts) {
      alert(`Máximo de ${maxProducts} produtos`);
      return;
    }

    const product = products.find((p) => p.id === selectedId);
    if (!product) return;

    const qty = Math.max(1, Math.floor(quantity));
    const existing = selectedProducts.find((sp) => sp.product.id === product.id);

    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > product.stock) {
        alert(`Estoque insuficiente. Disponível: ${product.stock}`);
        return;
      }
      onChange(
        selectedProducts.map((sp) =>
          sp.product.id === product.id ? { ...sp, quantity: newQty } : sp
        )
      );
    } else {
      if (qty > product.stock) {
        alert(`Estoque insuficiente. Disponível: ${product.stock}`);
        return;
      }
      const uniqueId = `prod_${product.id}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 4)}`;
      onChange([
        ...selectedProducts,
        {
          id: uniqueId,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            costPrice: product.costPrice,
            stock: product.stock,
            hasCommission: product.hasCommission !== false,
          },
          quantity: qty,
        },
      ]);
    }

    setSelectedId('');
    setQuantity(1);
  };

  const handleRemove = (id: string) => {
    onChange(selectedProducts.filter((sp) => sp.id !== id));
  };

  const handleChangeQuantity = (id: string, delta: number) => {
    onChange(
      selectedProducts.map((sp) => {
        if (sp.id !== id) return sp;
        const newQty = sp.quantity + delta;
        if (newQty < 1) return sp;
        if (newQty > sp.product.stock) {
          alert(`Estoque insuficiente. Disponível: ${sp.product.stock}`);
          return sp;
        }
        return { ...sp, quantity: newQty };
      })
    );
  };

  const getTotal = () =>
    selectedProducts.reduce((sum, sp) => sum + sp.product.price * sp.quantity, 0);

  return (
    <div className="space-y-3">
      {/* Selector */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
          >
            <option value="">
              {loading ? 'Carregando produtos...' : 'Selecione um produto'}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - R$ {p.price.toFixed(2)} (estoque: {p.stock})
                {p.hasCommission === false ? ' (sem comissão)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] text-sm text-center"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedId}
            className="px-4 py-2 bg-[#9c7f64] hover:bg-[#544941] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-1 text-sm"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {/* Lista */}
      {selectedProducts.length > 0 && (
        <div className="bg-[#f5f0e8] rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center text-sm font-medium text-[#060606]">
            <span>Produtos adicionados ({selectedProducts.length})</span>
            <span className="text-[#9c7f64] font-bold">
              Total: R$ {getTotal().toFixed(2)}
            </span>
          </div>
          <div className="space-y-1">
            {selectedProducts.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center justify-between bg-white p-2 rounded-lg gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Package size={14} className="flex-shrink-0 text-[#9c7f64]" />
                  <span className="text-sm text-[#060606] truncate">
                    {sp.product.name}
                    {sp.product.hasCommission === false && (
                      <span className="ml-2 text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                        Sem comissão
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-[#9c7f64] flex-shrink-0">
                    R$ {sp.product.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleChangeQuantity(sp.id, -1)}
                    className="p-1 hover:bg-gray-200 rounded"
                    disabled={sp.quantity <= 1}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    x{sp.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleChangeQuantity(sp.id, 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                    disabled={sp.quantity >= sp.product.stock}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(sp.id)}
                    className="text-red-500 hover:text-red-700 ml-1 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiProductSelector;