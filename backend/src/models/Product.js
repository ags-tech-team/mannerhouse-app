module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    costPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      field: 'cost_price',
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    category: {
      type: DataTypes.ENUM('higiene', 'cabelo', 'barba', 'acessorios', 'outros'),
      defaultValue: 'outros',
    },
    // 🔥 NOVO CAMPO
    hasCommission: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'has_commission',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  }, {
    tableName: 'products',
    underscored: true,
    timestamps: true,
  });

  Product.prototype.getProfit = function() {
    return this.price - this.costPrice;
  };

  Product.prototype.getCommission = function(commissionRate = 0.50) {
    if (!this.hasCommission) return 0;
    const profit = this.getProfit();
    return profit * commissionRate;
  };

  return Product;
};
