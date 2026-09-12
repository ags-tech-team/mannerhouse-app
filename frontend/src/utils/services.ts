import { api } from '../api/client';

export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'corte' | 'barba' | 'cabelo' | 'tratamento' | 'outro';
  isActive?: boolean;
}

const FALLBACK_SERVICES: Service[] = [
  { id: 'mensalista', name: '📋 Mensalista', price: 0.00, category: 'outro' },
  { id: 'corte-masculino', name: 'Corte Masculino', price: 35.00, category: 'corte' },
  { id: 'corte-navalhado', name: 'Corte Navalhado', price: 40.00, category: 'corte' },
  { id: 'barba-terapia', name: 'Barba Terapia', price: 40.00, category: 'barba' },
  { id: 'barba-maquina', name: 'Barba só Máquina', price: 25.00, category: 'barba' },
  { id: 'bigode', name: 'Bigode', price: 5.00, category: 'barba' }, // 🔥 NOVO
  { id: 'cabelo-barba', name: 'Cabelo e Barba', price: 70.00, category: 'corte' },
  { id: 'platinado-corte', name: 'Platinado com Corte', price: 160.00, category: 'cabelo' },
  { id: 'luzes-corte', name: 'Luzes com Corte', price: 140.00, category: 'cabelo' },
  { id: 'pigmentacao', name: 'Pigmentação', price: 25.00, category: 'cabelo' },
  { id: 'depilacao-cera', name: 'Depilação com Cera', price: 20.00, category: 'outro' },
  { id: 'sobrancelha', name: 'Sobrancelha', price: 10.00, category: 'outro' },
  { id: 'limpeza-pele', name: 'Limpeza de Pele', price: 30.00, category: 'tratamento' },
  { id: 'limpeza-ouvido', name: 'Limpeza de Ouvido com Cone Hindu', price: 80.00, category: 'outro' },
  { id: 'hidratacao-capilar', name: 'Hidratação Capilar', price: 35.00, category: 'tratamento' },
  { id: 'progressiva', name: 'Progressiva', price: 200.00, category: 'tratamento' },
  { id: 'spa-face', name: 'SPA Face (Rejuvenescimento da Pele)', price: 60.00, category: 'tratamento' },
  { id: 'microagulhamento-1', name: 'Microagulhamento Capilar (1 Sessão)', price: 180.00, category: 'tratamento' },
  { id: 'microagulhamento-10', name: 'Microagulhamento Capilar (10 Sessões)', price: 1450.00, category: 'tratamento' },
  { id: 'corte-kids', name: 'Corte Kids', price: 55.00, category: 'corte' },
  { id: 'lavagem capilar', name: 'Lavagem e higienização Capilar', price: 145.00, category: 'tratamento' },
];

// 🔥 Cache interno (começa com o fallback, é atualizado pela API)
let cachedServices: Service[] = [...FALLBACK_SERVICES];

// 🔄 Carregar serviços da API e atualizar o cache
export const loadServices = async (): Promise<Service[]> => {
  try {
    const response = await api.get('/services');
    // Filtrar apenas ativos, se aplicável
    const all: Service[] = response.data;
    cachedServices = all.filter(s => s.isActive !== false);
    console.log(`✅ ${cachedServices.length} serviços carregados da API`);
    return cachedServices;
  } catch (error) {
    console.error('❌ Erro ao carregar serviços da API, usando fallback:', error);
    return cachedServices;
  }
};

// 🎯 Acesso síncrono (usa o cache atual)
export const getServices = (): Service[] => cachedServices;

// 🎯 Buscar por ID
export const getServiceById = (id: string): Service | undefined => {
  return cachedServices.find(s => s.id === id);
};

// 🎯 Buscar por categoria
export const getServicesByCategory = (category: string): Service[] => {
  return cachedServices.filter(s => s.category === category);
};

// 🎯 Label formatado
export const getServiceLabel = (service: Service): string => {
  return `${service.name} - R$ ${service.price.toFixed(2)}`;
};

// 🔥 Compatibilidade: exportar SERVICES como getter dinâmico
export const SERVICES = cachedServices;

// 🔥 Atualizar referência exportada (para quem importar diretamente)
export const refreshServices = async () => {
  await loadServices();
  return cachedServices;
};