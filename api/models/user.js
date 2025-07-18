const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 

class User extends Model {}

User.init({
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('contractor', 'laborer', 'admin'),
    allowNull: false
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User'
});

module.exports = User;
