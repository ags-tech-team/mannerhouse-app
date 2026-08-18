const { sequelize, Barber, Revenue, Client, CashRegister } = require('../models');

const addRevenue = async () => {
  try {
    console.log('🔄 Iniciando inserção de faturamento...');

    // 🔥 Buscar os barbeiros
    const denis = await Barber.findOne({ where: { name: 'Aruclesio' } });
    const gabriel = await Barber.findOne({ where: { name: 'Barbearia Manner' } });

    if (!denis) {
      console.error('❌ Barbeiro Denis não encontrado!');
      process.exit(1);
    }
    if (!gabriel) {
      console.error('❌ Barbeiro Gabriel não encontrado!');
      process.exit(1);
    }

    console.log('✅ Barbeiros encontrados:');
    console.log(`   Denis: ${denis.id} (${denis.serviceCommissionRate * 100}%)`);
    console.log(`   Gabriel: ${gabriel.id} (${gabriel.serviceCommissionRate * 100}%)`);

    // 🔥 DATA DO PERÍODO (01 a 16/08/2026)
    const startDate = '2026-08-01';
    const endDate = '2026-08-16';
    const today = new Date().toISOString().split('T')[0];

    // 🔥 CRIAR REVENUES PARA DENIS
    // Serviços: R$ 2.350,00 com 50% de comissão
    const denisServiceRevenue = await Revenue.create({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      cashRegisterId: null,
      date: today,
      total: 2350.00,
      commissions: 1175.00, // 50% de 2350
      servicesCount: 1,
      initialCash: 0,
      finalCash: 2350.00,
    });
    console.log(`✅ Revenue Denis (Serviços): R$ 2.350,00 (Comissão: R$ 1.175,00)`);

    // Produtos: R$ 280,00 com 25% de comissão
    const denisProductRevenue = await Revenue.create({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      cashRegisterId: null,
      date: today,
      total: 280.00,
      commissions: 70.00, // 25% de 280
      servicesCount: 1,
      initialCash: 0,
      finalCash: 280.00,
    });
    console.log(`✅ Revenue Denis (Produtos): R$ 280,00 (Comissão: R$ 70,00)`);

    // 🔥 CRIAR REVENUES PARA GABRIEL
    // Serviços: R$ 1.620,00 com 35% de comissão
    const gabrielServiceRevenue = await Revenue.create({
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      cashRegisterId: null,
      date: today,
      total: 1620.00,
      commissions: 567.00, // 35% de 1620
      servicesCount: 1,
      initialCash: 0,
      finalCash: 1620.00,
    });
    console.log(`✅ Revenue Gabriel (Serviços): R$ 1.620,00 (Comissão: R$ 567,00)`);

    // 🔥 RESUMO
    console.log('\n✅ ===== FATURAMENTO ADICIONADO COM SUCESSO! =====');
    console.log('📊 Resumo:');
    console.log(`   Denis - Serviços: R$ 2.350,00 (Comissão: R$ 1.175,00)`);
    console.log(`   Denis - Produtos: R$ 280,00 (Comissão: R$ 70,00)`);
    console.log(`   Gabriel - Serviços: R$ 1.620,00 (Comissão: R$ 567,00)`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar faturamento:', error);
    process.exit(1);
  }
};

addRevenue();