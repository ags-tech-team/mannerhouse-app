export const paymentOptions = [
  { value: 'dinheiro', label: 'Dinheiro', surcharge: 0 },
  { value: 'pix', label: 'Pix', surcharge: 0 },
  { value: 'debito', label: 'Débito (+5%)', surcharge: 5 },
  { value: 'cartao', label: 'Crédito (+8,5%)', surcharge: 8.5 },
] as const;

export type PaymentMethod = typeof paymentOptions[number]['value'];

export const cardTotal = (amount: number, method: string) => {
  const cents = Math.round((Number(amount) + Number.EPSILON) * 100);
  const rate = paymentOptions.find(option => option.value === (method === 'credito' ? 'cartao' : method))?.surcharge ?? 0;
  return (cents + Math.round(cents * rate / 100)) / 100;
};
