export interface RevenueService {
  id: string;
  cliente: string;
  barbeiro: string;
  barbeiroId: string;
  servico: string;
  servicoId: string;
  valor: number;
  comissao: number;
  data: string;
  hora: string;
  status: 'concluido' | 'pendente' | 'cancelado';
  formaPagamento: 'dinheiro' | 'cartao' | 'pix' | 'debito';
  observacao?: string;
}

export interface RevenueSummary {
  totalHoje: number;
  totalSemana: number;
  totalMes: number;
  totalComissoes: number;
  ticketMedio: number;
  totalServicos: number;
  servicosPorBarbeiro: {
    barbeiroId: string;
    nome: string;
    total: number;
    comissao: number;
  }[];
}