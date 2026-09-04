export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'corte' | 'barba' | 'cabelo' | 'tratamento' | 'outro';
}

export const SERVICES: Service[] = [
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
];

export const getServiceById = (id: string): Service | undefined => {
  return SERVICES.find(s => s.id === id);
};

export const getServicesByCategory = (category: string): Service[] => {
  return SERVICES.filter(s => s.category === category);
};

export const getServiceLabel = (service: Service): string => {
  return `${service.name} - R$ ${service.price.toFixed(2)}`;
};