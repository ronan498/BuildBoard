const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class ChatMessage extends Model {}

ChatMessage.init({
  senderId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  receiverId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  messageContent: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: DataTypes.DATE
}, {
  sequelize,
  modelName: 'ChatMessage'
});

module.exports = ChatMessage;
