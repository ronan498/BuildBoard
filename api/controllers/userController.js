const User = require('../models/user');

const createUser = async (req, res) => {
  const { username, email, password, role, profilePicture } = req.body;
  try {
    const newUser = await User.create({ username, email, password, role, profilePicture });
    res.json(newUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.update(req.body, { where: { id: req.params.id } });
    if (updatedUser) {
      res.json(updatedUser);
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await User.destroy({ where: { id: req.params.id } });
    if (result) {
      res.send('User deleted');
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser
};
