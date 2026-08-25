const { sequelize, User, Barber, Client, Appointment, Sale, CashRegister, Revenue, MonthlyPayment, Product } = require('../src/models');
const { Op } = require('sequelize');

(async () => {
  try {
    console.log('🔄 ===== INICIANDO INSERÇÃO EM MASSA (TOTAL) =====');

    // 1. Verificar conexão
    await sequelize.authenticate();
    console.log('✅ Banco conectado!');

    // 2. Buscar barbeiros
    const denis = await Barber.findOne({ where: { name: 'Denis' } });
    const gabriel = await Barber.findOne({ where: { name: 'Gabriel' } });
    const barbers = await Barber.findAll({ 
      where: { isActive: true },
      attributes: ['id', 'name', 'serviceCommissionRate']
    });

    if (!denis || !gabriel) {
      console.error('❌ Denis ou Gabriel não encontrados!');
      console.log('📋 Barbeiros disponíveis:');
      barbers.forEach(b => console.log(`   - ${b.name} (${b.id})`));
      process.exit(1);
    }

    console.log('✅ Barbeiros encontrados:');
    console.log(`   🟢 Denis: ${denis.id} (Comissão Serviços: ${denis.serviceCommissionRate * 100}%, Produtos: ${denis.productCommissionRate * 100}%)`);
    console.log(`   🟢 Gabriel: ${gabriel.id} (Comissão Serviços: ${gabriel.serviceCommissionRate * 100}%, Produtos: ${gabriel.productCommissionRate * 100}%)`);

    // 3. Buscar admin
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.error('❌ Nenhum admin encontrado!');
      process.exit(1);
    }
    console.log('✅ Admin encontrado:', admin.email);

    // 4. Criar caixa
    const date = '2026-08-24';
    
    let cashRegister = await CashRegister.findOne({
      where: { date: date, isOpen: true }
    });

    if (cashRegister) {
      console.log('⚠️ Caixa já existe para esta data. Removendo...');
      await CashRegister.destroy({ where: { id: cashRegister.id } });
    }

    cashRegister = await CashRegister.create({
      userId: admin.id,
      date: date,
      isOpen: true,
      openingTime: '09:00',
      initialCash: 0,
      totalRevenue: 0,
      totalCommissions: 0,
      servicesCount: 0,
      services: []
    });
    console.log('✅ Caixa criado para:', date);

    // ============================================================
    // 🔥 PARTE 1: DENIS E GABRIEL (PEDIDO ANTERIOR)
    // ============================================================
    console.log('\n📋 ===== CRIANDO SERVIÇOS DENIS E GABRIEL =====');

    // 1.1 Buscar ou criar cliente
    let client = await Client.findOne({ where: { phone: '(48) 99999-9999' } });
    if (!client) {
      client = await Client.create({
        name: 'Cliente Exemplo',
        phone: '(48) 99999-9999',
        isActive: true,
      });
      console.log('✅ Cliente criado');
    }

    // 1.2 Criar produto para Denis
    let product = await Product.findOne({ where: { name: 'Produto Denis' } });
    if (!product) {
      product = await Product.create({
        name: 'Produto Denis',
        description: 'Produto vendido por Denis',
        price: 280.00,
        costPrice: 140.00,
        stock: 100,
        category: 'outros',
        hasCommission: true,
        isActive: true,
      });
      console.log('✅ Produto Denis criado');
    }

    // 1.3 Serviço Denis (R$ 2.350,00)
    const appointmentDenis = await Appointment.create({
      barberId: denis.id,
      clientId: client.id,
      date: '2026-08-16',
      time: '10:00',
      service: 'Serviço Completo',
      serviceDescription: 'Serviço completo realizado por Denis (01 a 16/08)',
      price: 2350.00,
      commission: 1175.00,
      status: 'completed',
      notes: 'Serviço do período 01 a 16/08'
    });
    console.log('   ✅ Denis - Serviço: R$ 2.350,00 (Comissão: R$ 1.175,00)');

    // 1.4 Serviço Gabriel (R$ 1.620,00)
    const appointmentGabriel = await Appointment.create({
      barberId: gabriel.id,
      clientId: client.id,
      date: '2026-08-16',
      time: '14:00',
      service: 'Serviço Premium',
      serviceDescription: 'Serviço premium realizado por Gabriel (01 a 16/08)',
      price: 1620.00,
      commission: 567.00,
      status: 'completed',
      notes: 'Serviço do período 01 a 16/08'
    });
    console.log('   ✅ Gabriel - Serviço: R$ 1.620,00 (Comissão: R$ 567,00)');

    // 1.5 Venda produto Denis (R$ 280,00)
    const sale = await Sale.create({
      barberId: denis.id,
      clientId: client.id,
      productId: product.id,
      quantity: 1,
      salePrice: 280.00,
      costPrice: 140.00,
      profit: 140.00,
      commission: 70.00,
      date: '2026-08-16',
      paymentMethod: 'dinheiro'
    });
    await product.update({ stock: product.stock - 1 });
    console.log('   ✅ Denis - Produto: R$ 280,00 (Comissão: R$ 70,00)');

    // 1.6 Criar revenues para Denis e Gabriel
    await Revenue.create({
      cashRegisterId: cashRegister.id,
      barberId: denis.id,
      date: '2026-08-16',
      total: 2350.00,
      commissions: 1175.00,
      servicesCount: 1,
      initialCash: 0,
      finalCash: 2350.00,
    });

    await Revenue.create({
      cashRegisterId: cashRegister.id,
      barberId: gabriel.id,
      date: '2026-08-16',
      total: 1620.00,
      commissions: 567.00,
      servicesCount: 1,
      initialCash: 0,
      finalCash: 1620.00,
    });

    await Revenue.create({
      cashRegisterId: cashRegister.id,
      barberId: denis.id,
      date: '2026-08-16',
      total: 280.00,
      commissions: 70.00,
      servicesCount: 1,
      initialCash: 0,
      finalCash: 280.00,
    });

    // Adicionar ao caixa
    const servicesList = [];

    servicesList.push({
      id: appointmentDenis.id,
      type: 'service',
      client: client.name,
      barberId: denis.id,
      barberName: 'Denis',
      service: 'Serviço Completo',
      price: 2350.00,
      commission: 1175.00,
      paymentMethod: 'dinheiro',
      time: '10:00',
      date: '2026-08-16'
    });

    servicesList.push({
      id: appointmentGabriel.id,
      type: 'service',
      client: client.name,
      barberId: gabriel.id,
      barberName: 'Gabriel',
      service: 'Serviço Premium',
      price: 1620.00,
      commission: 567.00,
      paymentMethod: 'dinheiro',
      time: '14:00',
      date: '2026-08-16'
    });

    servicesList.push({
      id: sale.id,
      type: 'product',
      client: client.name,
      barberId: denis.id,
      barberName: 'Denis',
      product: 'Produto Denis',
      price: 280.00,
      commission: 70.00,
      paymentMethod: 'dinheiro',
      time: '11:00',
      date: '2026-08-16'
    });

    console.log('✅ Denis e Gabriel adicionados com sucesso!');

    // ============================================================
    // 🔥 PARTE 2: CRIAR MENSALISTAS (CLIENTES + PAGAMENTOS)
    // ============================================================
    console.log('\n📋 ===== CRIANDO MENSALISTAS =====');

    const mensalistasData = [
      { name: 'Ramon', phone: '(48) 99999-0001', monthlyFee: 150 },
      { name: 'Júnior', phone: '(48) 99999-0002', monthlyFee: 180 },
      { name: 'Júnior Filho', phone: '(48) 99999-0003', monthlyFee: 100 },
      { name: 'Beto', phone: '(48) 99999-0004', monthlyFee: 100 },
      { name: 'Diogo', phone: '(48) 99999-0005', monthlyFee: 100 },
      { name: 'Lipe', phone: '(48) 99999-0006', monthlyFee: 100 },
      { name: 'Gabriel', phone: '(48) 99999-0007', monthlyFee: 180 },
      { name: 'Emerson', phone: '(48) 99999-0008', monthlyFee: 140 },
      { name: 'Welerson', phone: '(48) 99999-0009', monthlyFee: 140 },
      { name: 'Marlon', phone: '(48) 99999-0010', monthlyFee: 100 },
      { name: 'Gui', phone: '(48) 99999-0011', monthlyFee: 100 },
      { name: 'Eduardo', phone: '(48) 99999-0012', monthlyFee: 100 }
    ];

    let totalMensalistas = 0;
    let totalMensalidades = 0;
    const mensalistasClients = [];

    for (const data of mensalistasData) {
      let client = await Client.findOne({ where: { phone: data.phone } });
      
      if (!client) {
        client = await Client.create({
          name: data.name,
          phone: data.phone,
          isMonthly: true,
          monthlyFee: data.monthlyFee,
          isActive: true,
        });
        console.log(`   ✅ Cliente criado: ${data.name} (R$ ${data.monthlyFee})`);
      } else {
        await client.update({
          isMonthly: true,
          monthlyFee: data.monthlyFee,
          isActive: true,
        });
        console.log(`   ♻️ Cliente atualizado: ${data.name} (R$ ${data.monthlyFee})`);
      }

      await MonthlyPayment.create({
        clientId: client.id,
        month: '2026-08',
        amount: data.monthlyFee,
        paid: true,
        paidAt: new Date(),
        notes: `Pagamento mensalidade - Agosto 2026`
      });

      await Revenue.create({
        cashRegisterId: cashRegister.id,
        date: date,
        total: data.monthlyFee,
        commissions: 0,
        servicesCount: 1,
        initialCash: 0,
        finalCash: data.monthlyFee,
      });

      mensalistasClients.push(client);
      totalMensalistas++;
      totalMensalidades += data.monthlyFee;
    }

    console.log(`\n✅ ${totalMensalistas} mensalistas criados! Total: R$ ${totalMensalidades.toFixed(2)}`);

    // ============================================================
    // 🔥 PARTE 3: CRIAR CORTES AVULSOS
    // ============================================================
    console.log('\n📋 ===== CRIANDO CORTES AVULSOS =====');

    // Usar o primeiro barbeiro disponível (se não for Denis nem Gabriel)
    const barberForCortes = barbers[0];

    const cortesAvulsos = [
      { name: 'Ramon', price: 150 },
      { name: 'Júnior', price: 180 },
      { name: 'Júnior Filho', price: 100 },
      { name: 'Beto', price: 100 },
      { name: 'Diogo', price: 100 },
      { name: 'Lipe', price: 100 },
      { name: 'Gabriel', price: 180 },
      { name: 'Emerson', price: 140 },
      { name: 'Welerson', price: 140 },
      { name: 'Marlon', price: 100 },
      { name: 'Gui', price: 100 },
      { name: 'Eduardo', price: 100 }
    ];

    for (const corte of cortesAvulsos) {
      let client = await Client.findOne({ 
        where: { name: corte.name }
      });

      if (!client) {
        const mensalista = mensalistasClients.find(c => c.name === corte.name);
        if (mensalista) {
          client = mensalista;
        } else {
          client = await Client.create({
            name: corte.name,
            phone: `(48) 99999-${String(100 + cortesAvulsos.indexOf(corte)).padStart(4, '0')}`,
            isMonthly: false,
            monthlyFee: 0,
            isActive: true,
          });
          console.log(`   ✅ Cliente criado para corte: ${corte.name}`);
        }
      }

      const commission = corte.price * (barberForCortes.serviceCommissionRate || 0.50);
      const appointment = await Appointment.create({
        barberId: barberForCortes.id,
        clientId: client.id,
        date: date,
        time: `${String(9 + cortesAvulsos.indexOf(corte) % 8).padStart(2, '0')}:00`,
        service: 'Corte Avulso',
        serviceDescription: `Corte avulso - ${corte.name}`,
        price: corte.price,
        commission: commission,
        status: 'completed',
        notes: `Corte avulso do dia ${date}`
      });

      await Revenue.create({
        cashRegisterId: cashRegister.id,
        barberId: barberForCortes.id,
        date: date,
        total: corte.price,
        commissions: commission,
        servicesCount: 1,
        initialCash: 0,
        finalCash: corte.price,
      });

      servicesList.push({
        id: appointment.id,
        type: 'service',
        client: client.name,
        barberId: barberForCortes.id,
        barberName: barberForCortes.name,
        service: 'Corte Avulso',
        price: corte.price,
        commission: commission,
        paymentMethod: 'dinheiro',
        time: appointment.time,
        date: date
      });

      console.log(`   ✅ Corte: ${corte.name} - R$ ${corte.price} (Comissão: R$ ${commission.toFixed(2)})`);
    }

    // ============================================================
    // 🔥 PARTE 4: ADICIONAR SERVIÇOS AO CAIXA E ATUALIZAR
    // ============================================================
    console.log('\n📋 ===== ATUALIZANDO CAIXA =====');

    const existingServices = cashRegister.services || [];
    const allServices = [...existingServices, ...servicesList];

    const totalRevenue = allServices.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalCommissions = allServices.reduce((sum, s) => sum + (s.commission || 0), 0);

    await cashRegister.update({
      services: allServices,
      totalRevenue: totalRevenue,
      totalCommissions: totalCommissions,
      servicesCount: allServices.length
    });
    console.log('✅ Caixa atualizado com todos os serviços!');

    // ============================================================
    // 🔥 PARTE 5: RESUMO FINAL
    // ============================================================
    console.log('\n✅ ===== INSERÇÃO CONCLUÍDA COM SUCESSO! =====');
    console.log('📊 RESUMO FINAL:');
    console.log(`   📅 Data: ${date}`);
    console.log(`   🟢 Denis - Serviço: R$ 2.350,00 (Comissão: R$ 1.175,00)`);
    console.log(`   🟢 Denis - Produto: R$ 280,00 (Comissão: R$ 70,00)`);
    console.log(`   🟢 Gabriel - Serviço: R$ 1.620,00 (Comissão: R$ 567,00)`);
    console.log(`   📋 Mensalistas: ${totalMensalistas} clientes`);
    console.log(`   💰 Total Mensalidades: R$ ${totalMensalidades.toFixed(2)}`);
    console.log(`   ✂️ Cortes Avulsos: ${cortesAvulsos.length} serviços`);
    console.log(`   💰 Total Cortes: R$ ${cortesAvulsos.reduce((s, c) => s + c.price, 0).toFixed(2)}`);
    console.log(`   💰 Receita Total: R$ ${(2350 + 1620 + 280 + totalMensalidades + cortesAvulsos.reduce((s, c) => s + c.price, 0)).toFixed(2)}`);
    console.log(`   💵 Comissões: R$ ${totalCommissions.toFixed(2)}`);
    console.log('==================================================\n');

    console.log('🚀 AGORA RECARREGUE A PÁGINA DE FATURAMENTO E MENSALISTAS!');

    process.exit(0);
  } catch(e) {
    console.error('❌ ERRO:', e);
    process.exit(1);
  }
})();