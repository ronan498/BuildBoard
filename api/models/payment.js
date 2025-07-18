const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Payment extends Model {}

Payment.init({
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  paymentDate: DataTypes.DATEONLY,
  subscriptionPeriod: DataTypes.RANGE(DataTypes.DATEONLY)
}, {
  sequelize,
  modelName: 'Payment'
});

module.exports = Payment;
