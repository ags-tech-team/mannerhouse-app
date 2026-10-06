module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    days: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'display_order',
    },
  }, {
    tableName: 'plans',
    underscored: true,
    timestamps: true,
  });

  return Plan;
};