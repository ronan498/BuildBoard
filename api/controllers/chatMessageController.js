// /api/controllers/chatMessageController.js
const ChatMessage = require('../models/chatMessage');

const createChatMessage = async (req, res) => {
  const { senderId, receiverId, messageContent, timestamp } = req.body;
  try {
    const newChatMessage = await ChatMessage.create({
      senderId, receiverId, messageContent, timestamp
    });
    res.json(newChatMessage);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const getChatMessage = async (req, res) => {
  try {
    const chatMessage = await ChatMessage.findByPk(req.params.id);
    if (chatMessage) {
      res.json(chatMessage);
    } else {
      res.status(404).send('Chat message not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const updateChatMessage = async (req, res) => {
  try {
    const updatedChatMessage = await ChatMessage.update(req.body, {
      where: { id: req.params.id },
      returning: true,
      plain: true
    });
    res.json(updatedChatMessage[1]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const deleteChatMessage = async (req, res) => {
  try {
    const result = await ChatMessage.destroy({ where: { id: req.params.id } });
    if (result) {
      res.send('Chat message deleted');
    } else {
      res.status(404).send('Chat message not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  createChatMessage,
  getChatMessage,
  updateChatMessage,
  deleteChatMessage
};
