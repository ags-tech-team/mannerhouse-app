require('dotenv').config();
const { sequelize } = require('./models');
const { User, Barber } = require('./models');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Criar interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => {
  rl.question(query, resolve);
});

// Cores para terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
};

// 🔥 NOVA FUNÇÃO: Verificar se admin existe
const verificarAdminExistente = async () => {
  const admin = await User.findOne({ where: { role: 'admin' } });
  return admin;
};

// 🔥 FUNÇÃO ATUALIZADA: Criar admin com proteção
const criarUsuarioAdmin = async () => {
  try {
    // VERIFICAR SE JÁ EXISTE ADMIN
    const adminExistente = await verificarAdminExistente();
    
    if (adminExistente) {
      log.error('❌ Já existe um administrador cadastrado no sistema!');
      log.info(`📧 Admin atual: ${adminExistente.email}`);
      log.warning('⚠️ Não é permitido criar mais de um administrador por questões de segurança.');
      log.info('💡 Se precisar resetar a senha do admin, use a opção "Resetar Senha"');
      log.info('💡 Se precisar desativar o admin atual, use a opção "Desativar Usuário"');
      
      const confirm = await question('\nDeseja sobrescrever o admin atual? (s/N): ');
      if (confirm.toLowerCase() !== 's') {
        log.info('Operação cancelada.');
        return;
      }
      
      log.warning('⚠️ ATENÇÃO: Isso irá REMOVER o admin atual e criar um novo!');
      const confirm2 = await question('Tem certeza? (s/N): ');
      if (confirm2.toLowerCase() !== 's') {
        log.info('Operação cancelada.');
        return;
      }
      
      // Deletar admin existente
      await User.destroy({ where: { role: 'admin' } });
      log.info('Admin antigo removido.');
    }

    console.log('\n📝 CRIANDO USUÁRIO ADMINISTRADOR\n');
    console.log('⚠️  Lembre-se: só pode existir UM administrador no sistema.\n');

    const name = await question('Nome: ');
    const email = await question('Email: ');
    const password = await question('Senha: ');
    const confirmPassword = await question('Confirmar senha: ');

    if (password !== confirmPassword) {
      log.error('As senhas não coincidem!');
      return;
    }

    // Criar novo admin
    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      isActive: true,
    });

    log.success(`✅ Administrador criado com sucesso!`);
    log.info(`📧 Email: ${admin.email}`);
    log.info(`🔑 Senha: ${password}`);
    log.info(`👑 Role: Administrador`);
    
    return admin;
  } catch (error) {
    log.error(`Erro ao criar admin: ${error.message}`);
  }
};

// 🔥 FUNÇÃO ATUALIZADA: Criar usuário da barbearia
const criarUsuarioBarbearia = async () => {
  try {
    console.log('\n📝 CRIANDO USUÁRIO DA BARBEARIA\n');
    console.log('Este usuário será usado pelos barbeiros no dia a dia.');
    console.log('Recomendação: email: barbearia@mannerhouse.com\n');

    const name = await question('Nome (ex: Barbearia Manner House): ');
    const email = await question('Email: ');
    const password = await question('Senha: ');
    const confirmPassword = await question('Confirmar senha: ');

    if (password !== confirmPassword) {
      log.error('As senhas não coincidem!');
      return;
    }

    // Verificar se já existe um usuário com este email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      log.warning(`Já existe um usuário com o email ${email}!`);
      const confirm = await question('Deseja sobrescrever? (s/N): ');
      if (confirm.toLowerCase() !== 's') {
        log.info('Operação cancelada.');
        return;
      }
      
      // Remover usuário existente e seus relacionamentos
      await User.destroy({ where: { email } });
      log.info('Usuário antigo removido.');
    }

    // Criar o usuário da barbearia
    const user = await User.create({
      name,
      email,
      password,
      role: 'barber',
      isActive: true,
    });

    // Perguntar se quer criar um barbeiro associado
    console.log('\nDeseja criar um perfil de barbeiro para este usuário?');
    const criarBarbeiro = await question('(Recomendado para usar o caixa) (s/N): ');

    if (criarBarbeiro.toLowerCase() === 's') {
      const barberName = await question('Nome do barbeiro (ex: Carlos): ');
      const barberPhone = await question('Telefone: ');
      const barberUsername = await question('Username (login): ');
      const commissionRate = await question('Comissão (% ex: 20): ');

      await Barber.create({
        userId: user.id,
        name: barberName || user.name,
        email: user.email,
        phone: barberPhone || '(11) 99999-9999',
        username: barberUsername || user.email.split('@')[0],
        password: user.password,
        commissionRate: parseFloat(commissionRate) / 100 || 0.20,
        isActive: true,
      });
      
      log.success('✅ Perfil de barbeiro criado!');
    }

    log.success(`✅ Usuário da barbearia criado com sucesso!`);
    log.info(`📧 Email: ${user.email}`);
    log.info(`🔑 Senha: ${password}`);
    log.info(`👤 Role: ${user.role}`);
    
    return user;
  } catch (error) {
    log.error(`Erro ao criar usuário: ${error.message}`);
  }
};

// 🔥 FUNÇÃO ATUALIZADA: Criar ambos com proteção
const criarAmbos = async () => {
  try {
    console.log('\n🔄 CRIANDO ADMIN E USUÁRIO DA BARBEARIA\n');
    
    // Verificar se já existe admin
    const adminExistente = await verificarAdminExistente();
    
    if (adminExistente) {
      log.error('❌ Já existe um administrador cadastrado no sistema!');
      log.info(`📧 Admin atual: ${adminExistente.email}`);
      log.warning('⚠️ Não é permitido criar mais de um administrador.');
      log.info('💡 Você pode criar apenas o usuário da barbearia separadamente (opção 2).');
      
      const confirm = await question('\nDeseja sobrescrever o admin atual e criar ambos? (s/N): ');
      if (confirm.toLowerCase() !== 's') {
        log.info('Operação cancelada.');
        return;
      }
      
      log.warning('⚠️ ATENÇÃO: Isso irá REMOVER o admin atual!');
      const confirm2 = await question('Tem certeza? (s/N): ');
      if (confirm2.toLowerCase() !== 's') {
        log.info('Operação cancelada.');
        return;
      }
      
      // Deletar admin existente
      await User.destroy({ where: { role: 'admin' } });
      log.info('Admin antigo removido.');
    }

    // Perguntar senha para ambos
    const password = await question('Senha padrão para ambos os usuários: ');
    const confirmPassword = await question('Confirmar senha: ');
    
    if (password !== confirmPassword) {
      log.error('As senhas não coincidem!');
      return;
    }

    // Criar Admin
    console.log('\n--- CRIANDO ADMIN ---');
    const adminName = await question('Nome do Admin (ex: Administrador): ');
    const adminEmail = await question('Email do Admin: ');

    // Criar Barbearia
    console.log('\n--- CRIANDO USUÁRIO DA BARBEARIA ---');
    const barberShopName = await question('Nome da Barbearia (ex: Barbearia Manner House): ');
    const barberShopEmail = await question('Email da Barbearia: ');

    // Criar Admin
    const admin = await User.create({
      name: adminName || 'Administrador',
      email: adminEmail || 'admin@mannerhouse.com',
      password,
      role: 'admin',
      isActive: true,
    });

    log.success(`✅ Admin criado: ${admin.email}`);

    // Criar Usuário da Barbearia
    const barberShop = await User.create({
      name: barberShopName || 'Barbearia Manner House',
      email: barberShopEmail || 'barbearia@mannerhouse.com',
      password,
      role: 'barber',
      isActive: true,
    });

    log.success(`✅ Usuário da barbearia criado: ${barberShop.email}`);

    // Criar perfil de barbeiro para o usuário da barbearia
    const barber = await Barber.create({
      userId: barberShop.id,
      name: 'Barbeiro Principal',
      email: barberShop.email,
      phone: '(11) 99999-9999',
      username: barberShop.email.split('@')[0],
      password: password,
      commissionRate: 0.20,
      isActive: true,
    });

    log.success(`✅ Perfil de barbeiro criado para ${barberShop.email}`);

    console.log('\n✅ AMBOS OS USUÁRIOS CRIADOS COM SUCESSO!\n');
    console.log('👑 ADMIN:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Senha: ${password}`);
    console.log('\n✂️ BARBEARIA:');
    console.log(`   Email: ${barberShop.email}`);
    console.log(`   Senha: ${password}`);
    console.log('\n');

  } catch (error) {
    log.error(`Erro ao criar usuários: ${error.message}`);
  }
};

// 🔥 FUNÇÃO ATUALIZADA: Desativar usuário com proteção
const desativarUsuario = async () => {
  try {
    console.log('\n⛔ DESATIVAR USUÁRIO\n');
    
    const email = await question('Email do usuário: ');
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      log.error('Usuário não encontrado!');
      return;
    }

    // ⚠️ NÃO PERMITIR DESATIVAR O ADMIN
    if (user.role === 'admin') {
      log.error('❌ Não é possível desativar o administrador!');
      log.info('💡 O administrador é essencial para o sistema.');
      log.info('💡 Se precisar trocar o admin, use a opção "Criar Administrador" que irá sobrescrever.');
      return;
    }

    const confirm = await question(`Tem certeza que deseja desativar ${user.email}? (s/N): `);
    if (confirm.toLowerCase() !== 's') {
      log.info('Operação cancelada.');
      return;
    }

    await user.update({ isActive: false });
    log.success(`Usuário ${user.email} desativado com sucesso!`);
  } catch (error) {
    log.error(`Erro ao desativar usuário: ${error.message}`);
  }
};

// 🔥 FUNÇÃO ATUALIZADA: Listar usuários com destaque para admin
const listarUsuarios = async () => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    if (users.length === 0) {
      log.warning('Nenhum usuário cadastrado.');
      return;
    }

    console.log('\n👥 USUÁRIOS CADASTRADOS:\n');
    console.log('=' .repeat(85));
    console.log('ID | NOME | EMAIL | ROLE | STATUS');
    console.log('=' .repeat(85));
    
    users.forEach((user) => {
      const status = user.isActive ? '✅ Ativo' : '❌ Inativo';
      const roleIcon = user.role === 'admin' ? '👑' : '✂️';
      const roleName = user.role === 'admin' ? 'ADMIN' : 'BARBER';
      
      console.log(
        `${user.id.slice(0, 8)} | ${user.name.padEnd(20)} | ${user.email.padEnd(25)} | ${roleIcon} ${roleName.padEnd(8)} | ${status}`
      );
    });
    console.log('=' .repeat(85));
    console.log(`Total: ${users.length} usuários`);
    
    // 🔥 Mostrar quantos admins existem
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (adminCount > 1) {
      log.warning(`⚠️ ATENÇÃO: Existem ${adminCount} administradores! Só deveria ter 1.`);
    } else if (adminCount === 1) {
      log.info(`✅ Sistema possui 1 administrador (correto)`);
    } else {
      log.warning(`⚠️ Nenhum administrador encontrado!`);
    }
    
    console.log('');
  } catch (error) {
    log.error(`Erro ao listar usuários: ${error.message}`);
  }
};

// Função para verificar integridade (nova)
const verificarIntegridade = async () => {
  try {
    console.log('\n🔍 VERIFICANDO INTEGRIDADE DO SISTEMA\n');
    
    const users = await User.findAll();
    const admins = users.filter(u => u.role === 'admin');
    
    if (admins.length === 0) {
      log.warning('⚠️ Nenhum administrador encontrado!');
      log.info('💡 Execute a opção 1 para criar um administrador.');
    } else if (admins.length > 1) {
      log.warning(`⚠️ ATENÇÃO: ${admins.length} administradores encontrados!`);
      log.info('💡 Deve haver apenas 1 administrador. Use a opção 1 para sobrescrever.');
      admins.forEach((admin, i) => {
        log.info(`   ${i + 1}. ${admin.email} (${admin.name})`);
      });
    } else {
      log.success(`✅ 1 administrador encontrado: ${admins[0].email}`);
    }
    
    const barberUsers = users.filter(u => u.role === 'barber');
    log.info(`✂️ ${barberUsers.length} usuários barbeiros encontrados`);
    
    console.log('');
  } catch (error) {
    log.error(`Erro na verificação: ${error.message}`);
  }
};

const exibirMenu = () => {
  console.log('\n🔧 GERENCIADOR DE USUÁRIOS - MANNER HOUSE\n');
  console.log('1. Criar Administrador (apenas 1 permitido)');
  console.log('2. Criar Usuário da Barbearia');
  console.log('3. Listar Usuários');
  console.log('4. Resetar Senha');
  console.log('5. Desativar Usuário');
  console.log('6. Ativar Usuário');
  console.log('7. Criar Ambos (Admin + Barbearia)');
  console.log('8. 🔍 Verificar Integridade do Sistema');
  console.log('0. Sair\n');
};

const main = async () => {
  try {
    await sequelize.authenticate();
    log.success('Conectado ao banco de dados');

    await sequelize.sync();
    log.info('Modelos sincronizados');

    let option = -1;

    while (option !== 0) {
      exibirMenu();
      option = parseInt(await question('Escolha uma opção: '));

      switch (option) {
        case 1:
          await criarUsuarioAdmin();
          break;
        case 2:
          await criarUsuarioBarbearia();
          break;
        case 3:
          await listarUsuarios();
          break;
        case 4:
          await resetarSenha();
          break;
        case 5:
          await desativarUsuario();
          break;
        case 6:
          await ativarUsuario();
          break;
        case 7:
          await criarAmbos();
          break;
        case 8:
          await verificarIntegridade();
          break;
        case 0:
          log.info('Saindo...');
          break;
        default:
          log.warning('Opção inválida!');
      }

      if (option !== 0) {
        await question('\nPressione Enter para continuar...');
        console.clear();
      }
    }

  } catch (error) {
    log.error(`Erro: ${error.message}`);
  } finally {
    rl.close();
    await sequelize.close();
  }
};

main();