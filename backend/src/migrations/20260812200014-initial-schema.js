'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ============================================
    // 1. TABELA USERS
    // ============================================
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('admin', 'barber'),
        defaultValue: 'barber',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 2. TABELA BARBERS
    // ============================================
    await queryInterface.createTable('barbers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      commission_rate: {
        type: Sequelize.FLOAT,
        defaultValue: 0.20,
      },
      service_commission_rate: {
        type: Sequelize.FLOAT,
        defaultValue: 0.50,
      },
      product_commission_rate: {
        type: Sequelize.FLOAT,
        defaultValue: 0.50,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 3. TABELA CLIENTS
    // ============================================
    await queryInterface.createTable('clients', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_monthly: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      monthly_fee: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 4. TABELA PRODUCTS
    // ============================================
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      cost_price: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      stock: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      category: {
        type: Sequelize.ENUM('higiene', 'cabelo', 'barba', 'acessorios', 'outros'),
        defaultValue: 'outros',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 5. TABELA APPOINTMENTS
    // ============================================
    await queryInterface.createTable('appointments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      barber_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'barbers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'clients',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      time: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      service: {
        type: Sequelize.ENUM('corte', 'barba', 'corte_barba', 'sobrancelha', 'outro'),
        allowNull: false,
      },
      service_description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      commission: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
        defaultValue: 'pending',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      reminder_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 6. TABELA CASH_REGISTERS
    // ============================================
    await queryInterface.createTable('cash_registers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      is_open: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      opening_time: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      closing_time: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      initial_cash: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      final_cash: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      services: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      total_revenue: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      total_commissions: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      services_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 7. TABELA REVENUES
    // ============================================
    await queryInterface.createTable('revenues', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      cash_register_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'cash_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      total: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      commissions: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      services_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      initial_cash: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      final_cash: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 8. TABELA EXPENSES
    // ============================================
    await queryInterface.createTable('expenses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM('agua', 'luz', 'internet', 'aluguel', 'salario', 'produtos', 'manutencao', 'outros'),
        allowNull: false,
      },
      value: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM('dinheiro', 'cartao', 'pix', 'debito'),
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 9. TABELA SALES
    // ============================================
    await queryInterface.createTable('sales', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      barber_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'barbers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'clients',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      sale_price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      cost_price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      profit: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      commission: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM('dinheiro', 'cartao', 'pix', 'debito'),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ============================================
    // 10. TABELA MONTHLY_PAYMENTS
    // ============================================
    await queryInterface.createTable('monthly_payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'clients',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      month: {
        type: Sequelize.STRING(7),
        allowNull: false,
      },
      amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  // ============================================
  // DOWN: Remove todas as tabelas
  // ============================================
  down: async (queryInterface, Sequelize) => {
    // Ordem reversa (respeitando foreign keys)
    await queryInterface.dropTable('monthly_payments');
    await queryInterface.dropTable('sales');
    await queryInterface.dropTable('expenses');
    await queryInterface.dropTable('revenues');
    await queryInterface.dropTable('cash_registers');
    await queryInterface.dropTable('appointments');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('clients');
    await queryInterface.dropTable('barbers');
    await queryInterface.dropTable('users');
    
    // Remover ENUMs (opcional, mas limpo)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_users_role;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_products_category;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_appointments_service;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_appointments_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_expenses_category;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_expenses_payment_method;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_sales_payment_method;');
  },
};