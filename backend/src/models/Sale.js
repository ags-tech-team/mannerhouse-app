const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Barber = require('./Barber');
const Client = require('./Client');
const Product = require('./Product');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  barberId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'barbers',
      key: 'id',
    },
    field: 'barber_id',
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'clients',
      key: 'id',
    },
    field: 'client_id',
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id',
    },
    field: 'product_id',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
    },
  },
  // 🔥 Preço de venda no momento da venda
  salePrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
    field: 'sale_price',
  },
  // 🔥 Preço de custo no momento da venda
  costPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
    field: 'cost_price',
  },
  // 🔥 Lucro da venda
  profit: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  // 🔥 Comissão do barbeiro sobre a venda
  commission: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.ENUM('dinheiro', 'cartao', 'pix', 'debito'),
    allowNull: false,
    field: 'payment_method',
  },
}, {
  tableName: 'sales',
  underscored: true,
});

// 🔥 Hook para calcular comissão antes de salvar
Sale.beforeCreate(async (sale) => {
  // Calcular lucro
  sale.profit = sale.salePrice - sale.costPrice;
  
  // Buscar barbeiro para pegar a taxa de comissão
  const barber = await Barber.findByPk(sale.barberId);
  if (barber) {
    // Comissão = Lucro * Taxa de comissão do barbeiro
    sale.commission = sale.profit * barber.productCommissionRate;
  }
});

Sale.beforeUpdate(async (sale) => {
  if (sale.changed('salePrice') || sale.changed('costPrice') || sale.changed('barberId')) {
    sale.profit = sale.salePrice - sale.costPrice;
    
    const barber = await Barber.findByPk(sale.barberId);
    if (barber) {
      sale.commission = sale.profit * barber.productCommissionRate;
    }
  }
});

Sale.belongsTo(Barber, { foreignKey: 'barberId' });
Sale.belongsTo(Client, { foreignKey: 'clientId' });
Sale.belongsTo(Product, { foreignKey: 'productId' });
Barber.hasMany(Sale, { foreignKey: 'barberId' });
Client.hasMany(Sale, { foreignKey: 'clientId' });
Product.hasMany(Sale, { foreignKey: 'productId' });

module.exports = Sale;