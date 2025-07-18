const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class JobAdvert extends Model {}

JobAdvert.init({
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  location: DataTypes.GEOGRAPHY, // PostGIS extension is required for this data type
  payRate: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  requiredSkills: {
    type: DataTypes.ARRAY(DataTypes.STRING), // Only for PostgreSQL
    allowNull: true
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true
  },
  contractorId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users', // 'Users' is the table name
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'JobAdvert'
});

module.exports = JobAdvert;
