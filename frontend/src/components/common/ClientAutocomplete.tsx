import { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, X } from 'lucide-react';
import { api } from '../../api/client';

interface Client {
  id: string;
  name: string;
  phone: string;
  isMonthly: boolean;
  monthlyFee: number;
  isActive: boolean;
}

interface ClientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectClient: (client: Client) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  publicMode?: boolean; // 🔥 NOVA PROP
}

export const ClientAutocomplete = ({
  value,
  onChange,
  onSelectClient,
  placeholder = 'Digite o nome ou telefone do cliente...',
  disabled = false,
  required = false,
  className = '',
  publicMode = false, // 🔥 PADRÃO: false (usa rota autenticada)
}: ClientAutocompleteProps) => {
  const [results, setResults] = useState<Client[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchClients = async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    try {
      // 🔥 USAR ROTA PÚBLICA OU PRIVADA DEPENDENDO DA PROP
      const endpoint = publicMode ? '/public/clients/search' : '/clients/search';
      const response = await api.get(endpoint, { params: { q: query } });
      setResults(response.data);
      setShowResults(response.data.length > 0);
    } catch (error: any) {
      console.error('Erro ao buscar clientes:', error);
      // 🔥 SE FOR 401 E ESTIVER EM MODO PÚBLICO, NÃO MOSTRAR ERRO
      if (error.response?.status !== 401 || !publicMode) {
        console.error('Detalhes:', error.response?.data || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value && value.length >= 2) {
        searchClients(value);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (client: Client) => {
    onChange(client.name);
    onSelectClient(client);
    setShowResults(false);
  };

  const handleClear = () => {
    onChange('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7c7a]" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.length < 2) {
              setResults([]);
              setShowResults(false);
            }
          }}
          onFocus={() => {
            if (value.length >= 2 && results.length > 0) {
              setShowResults(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7f64] focus:border-transparent"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f7c7a] hover:text-[#060606]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-center text-[#7f7c7a]">
              <span className="inline-block animate-spin mr-2">⟳</span>
              Buscando...
            </div>
          ) : results.length > 0 ? (
            results.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleSelect(client)}
                className="w-full px-4 py-2 text-left hover:bg-[#f5f0e8] transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#9c7f64]/20 flex items-center justify-center text-[#9c7f64] font-bold text-sm">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[#060606]">{client.name}</p>
                    <p className="text-xs text-[#7f7c7a] flex items-center gap-1">
                      <Phone size={12} /> {client.phone}
                    </p>
                  </div>
                </div>
                {client.isMonthly && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    Mensalista
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-center text-[#7f7c7a]">
              Nenhum cliente encontrado. Digite para criar um novo.
            </div>
          )}
        </div>
      )}
    </div>
  );
};