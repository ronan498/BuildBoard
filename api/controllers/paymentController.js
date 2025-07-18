const Payment = require('../models/payment');

const createPayment = async (req, res) => {
  const { userId, amount, paymentDate, subscriptionPeriod } = req.body;
  try {
    const newPayment = await Payment.create({
      userId, amount, paymentDate, subscriptionPeriod
    });
    res.json(newPayment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (payment) {
      res.json(payment);
    } else {
      res.status(404).send('Payment not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const updatePayment = async (req, res) => {
  try {
    const updatedPayment = await Payment.update(req.body, {
      where: { id: req.params.id },
      returning: true,
      plain: true
    });
    res.json(updatedPayment[1]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const deletePayment = async (req, res) => {
  try {
    const result = await Payment.destroy({ where: { id: req.params.id } });
    if (result) {
      res.send('Payment deleted');
    } else {
      res.status(404).send('Payment not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  createPayment,
  getPayment,
  updatePayment,
  deletePayment
};
