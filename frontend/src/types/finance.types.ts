export interface Despesa {
  id: string;
  descricao: string;
  categoria: 'agua' | 'luz' | 'internet' | 'aluguel' | 'salario' | 'produtos' | 'manutencao' | 'outros';
  valor: number;
  data: string; // YYYY-MM-DD
  formaPagamento: 'dinheiro' | 'cartao' | 'pix' | 'debito';
  comprovante?: string;
  observacao?: string;
  parcela?: number;
  totalParcelas?: number;
}

export interface FaturamentoRegistro {
  id: string;
  data: string; // YYYY-MM-DD
  valor: number;
  comissoes: number;
  quantidadeServicos: number;
  valorInicial: number;
  valorFinal: number;
  caixaId: string;
}

export interface ResumoFinanceiro {
  mes: string;
  ano: string;
  faturamentoTotal: number;
  despesasTotal: number;
  lucroLiquido: number;
  totalComissoes: number;
  quantidadeServicos: number;
  categoriasDespesas: {
    categoria: string;
    total: number;
  }[];
}