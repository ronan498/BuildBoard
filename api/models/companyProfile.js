const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class CompanyProfile extends Model {}

CompanyProfile.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactInformation: DataTypes.JSONB, // This can store an object with various contact details
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  workHistory: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true
  },
  contractors: {
    type: DataTypes.ARRAY(DataTypes.INTEGER), // Array of User IDs
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'CompanyProfile'
});

module.exports = CompanyProfile;
