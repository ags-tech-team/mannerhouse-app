const { sequelize, User, Barber, Client, Appointment, Sale, CashRegister, Revenue, MonthlyPayment } = require('../src/models');
const { Op } = require('sequelize');

(async () => {
  try {
    console.log('🔄 ===== INICIANDO INSERÇÃO EM MASSA =====');

    // 1. Verificar conexão
    await sequelize.authenticate();
    console.log('✅ Banco conectado!');

    // 2. Buscar barbeiros para os cortes
    const barbers = await Barber.findAll({ 
      where: { isActive: true },
      attributes: ['id', 'name', 'serviceCommissionRate']
    });
    
    if (barbers.length === 0) {
      console.error('❌ Nenhum barbeiro encontrado!');
      process.exit(1);
    }

    console.log('✅ Barbeiros disponíveis:');
    barbers.forEach(b => console.log(`   - ${b.name} (${b.id})`));

    // Usar o primeiro barbeiro para os cortes
    const barber = barbers[0];
    console.log(`\n📌 Usando barbeiro: ${barber.name} para os cortes`);

    // 3. Buscar admin
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.error('❌ Nenhum admin encontrado!');
      process.exit(1);
    }
    console.log('✅ Admin encontrado:', admin.email);

    // 4. Criar caixa para 24/08/2026
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
    // 🔥 PARTE 1: CRIAR MENSALISTAS (CLIENTES + PAGAMENTOS)
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
      // Verificar se cliente já existe
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

      // Criar pagamento (já pago)
      await MonthlyPayment.create({
        clientId: client.id,
        month: '2026-08',
        amount: data.monthlyFee,
        paid: true,
        paidAt: new Date(),
        notes: `Pagamento mensalidade - Agosto 2026`
      });

      // Criar Revenue do pagamento
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
    // 🔥 PARTE 2: CRIAR CORTES AVULSOS
    // ============================================================
    console.log('\n📋 ===== CRIANDO CORTES AVULSOS =====');

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

    const servicesList = [];

    for (const corte of cortesAvulsos) {
      // Buscar cliente existente
      let client = await Client.findOne({ 
        where: { name: corte.name }
      });

      if (!client) {
        // Verificar se é um mensalista que já foi criado
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

      // Criar appointment (serviço)
      const commission = corte.price * (barber.serviceCommissionRate || 0.50);
      const appointment = await Appointment.create({
        barberId: barber.id,
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

      // Criar Revenue
      await Revenue.create({
        cashRegisterId: cashRegister.id,
        barberId: barber.id,
        date: date,
        total: corte.price,
        commissions: commission,
        servicesCount: 1,
        initialCash: 0,
        finalCash: corte.price,
      });

      // Adicionar ao caixa
      servicesList.push({
        id: appointment.id,
        type: 'service',
        client: client.name,
        barberId: barber.id,
        barberName: barber.name,
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
    // 🔥 PARTE 3: ADICIONAR SERVIÇOS AO CAIXA E ATUALIZAR
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
    // 🔥 PARTE 4: RESUMO FINAL
    // ============================================================
    console.log('\n✅ ===== INSERÇÃO CONCLUÍDA COM SUCESSO! =====');
    console.log('📊 RESUMO FINAL:');
    console.log(`   📅 Data: ${date}`);
    console.log(`   👤 Barbeiro: ${barber.name}`);
    console.log(`   📋 Mensalistas: ${totalMensalistas} clientes`);
    console.log(`   💰 Total Mensalidades: R$ ${totalMensalidades.toFixed(2)}`);
    console.log(`   ✂️ Cortes Avulsos: ${cortesAvulsos.length} serviços`);
    console.log(`   💰 Total Cortes: R$ ${cortesAvulsos.reduce((s, c) => s + c.price, 0).toFixed(2)}`);
    console.log(`   💰 Receita Total do Dia: R$ ${(totalMensalidades + cortesAvulsos.reduce((s, c) => s + c.price, 0)).toFixed(2)}`);
    console.log(`   💵 Comissões: R$ ${totalCommissions.toFixed(2)}`);
    console.log(`   📈 Lucro: R$ ${(totalRevenue - totalCommissions).toFixed(2)}`);
    console.log('==================================================\n');

    console.log('🚀 AGORA RECARREGUE A PÁGINA DE FATURAMENTO E MENSALISTAS!');

    process.exit(0);
  } catch(e) {
    console.error('❌ ERRO:', e);
    process.exit(1);
  }
})();