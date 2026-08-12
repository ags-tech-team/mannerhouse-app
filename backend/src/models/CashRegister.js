module.exports = (sequelize, DataTypes) => {
  const CashRegister = sequelize.define('CashRegister', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'user_id',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    isOpen: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_open',
    },
    openingTime: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'opening_time',
    },
    closingTime: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'closing_time',
    },
    initialCash: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'initial_cash',
    },
    finalCash: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'final_cash',
    },
    services: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const raw = this.getDataValue('services');
        if (!raw) return [];
        if (typeof raw === 'string') {
          try {
            return JSON.parse(raw);
          } catch {
            return [];
          }
        }
        return raw;
      },
      set(value) {
        if (Array.isArray(value)) {
          this.setDataValue('services', JSON.stringify(value));
        } else {
          this.setDataValue('services', value);
        }
      }
    },
    totalRevenue: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'total_revenue',
    },
    totalCommissions: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'total_commissions',
    },
    servicesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'services_count',
    },
  }, {
    tableName: 'cash_registers',
    underscored: true,
  });

  // ❌ REMOVIDAS: associações

  return CashRegister;
};
