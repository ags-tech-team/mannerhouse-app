import { useState } from 'react';
import { SERVICES, getServiceById } from '../../utils/services';
import { Plus, X, Scissors } from 'lucide-react';

interface SelectedService {
  id: string;
  service: {
    id: string;
    name: string;
    price: number;
    category: string;
  };
}

interface MultiServiceSelectorProps {
  selectedServices: SelectedService[];
  onChange: (services: SelectedService[]) => void;
  maxServices?: number;
}

const MultiServiceSelector: React.FC<MultiServiceSelectorProps> = ({
  selectedServices,
  onChange,
  maxServices = 10 // 🔥 AUMENTEI PARA 10
}) => {
  const [selectedId, setSelectedId] = useState('');

  const handleAddService = () => {
    if (!selectedId) return;
    if (selectedServices.length >= maxServices) {
      alert(`Máximo de ${maxServices} serviços por agendamento`);
      return;
    }

    const service = getServiceById(selectedId);
    if (!service) return;

    // 🔥 REMOVIDA A VERIFICAÇÃO DE DUPLICIDADE - AGORA PERMITE REPETIR
    // if (selectedServices.some(s => s.id === selectedId)) {
    //   alert('Este serviço já foi adicionado');
    //   return;
    // }

    // 🔥 GERAR ID ÚNICO PARA CADA SERVIÇO (PERMITE REPETIÇÃO)
    const uniqueId = `${selectedId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    
    onChange([...selectedServices, { id: uniqueId, service }]);
    setSelectedId('');
  };

  // 🔥 REMOVER POR ÍNDICE EM VEZ DE ID
  const handleRemoveService = (index: number) => {
    const updated = selectedServices.filter((_, i) => i !== index);
    onChange(updated);
  };

  const getTotal = () => {
    return selectedServices.reduce((sum, s) => sum + s.service.price, 0);
  };

  // 🔥 MOSTRAR TODOS OS SERVIÇOS DISPONÍVEIS (INCLUINDO OS QUE JÁ FORAM ADICIONADOS)
  const availableServices = SERVICES;

  return (
    <div className="space-y-3">
      {/* Selector de Serviços */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent text-sm"
          >
            <option value="">Selecione um serviço</option>
            {availableServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - R$ {service.price.toFixed(2)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddService}
          disabled={!selectedId}
          className="px-4 py-2 bg-[#9c7f64] hover:bg-[#544941] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center justify-center gap-1 text-sm"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Lista de Serviços Selecionados */}
      {selectedServices.length > 0 && (
        <div className="bg-[#f5f0e8] rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center text-sm font-medium text-[#060606]">
            <span>Serviços adicionados ({selectedServices.length})</span>
            <span>Total: R$ {getTotal().toFixed(2)}</span>
          </div>
          <div className="space-y-1">
            {selectedServices.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white p-2 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Scissors size={14} className="text-[#9c7f64] flex-shrink-0" />
                  <span className="text-sm text-[#060606] truncate">{item.service.name}</span>
                  <span className="text-xs text-[#9c7f64] flex-shrink-0">
                    R$ {item.service.price.toFixed(2)}
                  </span>
                  {/* 🔥 BADGE PARA MOSTRAR QUANTAS VEZES O SERVIÇO FOI ADICIONADO */}
                  {selectedServices.filter(s => s.service.id === item.service.id).length > 1 && (
                    <span className="text-[10px] bg-[#9c7f64]/20 text-[#9c7f64] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      x{selectedServices.filter(s => s.service.id === item.service.id).length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveService(index)}
                  className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔥 INDICAÇÃO QUE PERMITE REPETIR SERVIÇOS */}
      {selectedServices.length > 0 && (
        <p className="text-[10px] text-[#7f7c7a] text-center">
          💡 Você pode adicionar o mesmo serviço várias vezes para múltiplas pessoas
        </p>
      )}
    </div>
  );
};

export default MultiServiceSelector;