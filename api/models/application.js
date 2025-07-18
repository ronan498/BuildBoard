const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Application extends Model {}

Application.init({
  laborerId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  jobAdvertId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'JobAdverts',
      key: 'id'
    }
  },
  applicationDate: DataTypes.DATEONLY,
  status: DataTypes.ENUM('pending', 'accepted', 'rejected')
}, {
  sequelize,
  modelName: 'Application'
});

module.exports = Application;
