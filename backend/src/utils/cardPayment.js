const surchargeRate = (method) => {
  if (method === 'debito') return 5;
  if (method === 'credito' || method === 'cartao') return 8.5;
  return 0;
};

const cardTotal = (amount, method) => {
  const cents = Math.round((Number(amount) + Number.EPSILON) * 100);
  return (cents + Math.round(cents * surchargeRate(method) / 100)) / 100;
};

const saleTotal = (sale) => sale.chargedTotal ?? sale.salePrice * sale.quantity;
const monthlyBase = (payment) => payment.baseAmount ?? payment.amount;

module.exports = { cardTotal, saleTotal, monthlyBase };
