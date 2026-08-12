module.exports = (sequelize, DataTypes) => {
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
    salePrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
      },
      field: 'sale_price',
    },
    costPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
      },
      field: 'cost_price',
    },
    profit: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
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

  // ❌ REMOVIDAS: associações

  return Sale;
};