const Application = require('../models/application');

const createApplication = async (req, res) => {
  const { laborerId, jobAdvertId, applicationDate, status } = req.body;
  try {
    const newApplication = await Application.create({
      laborerId, jobAdvertId, applicationDate, status
    });
    res.json(newApplication);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const getApplication = async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id);
    if (application) {
      res.json(application);
    } else {
      res.status(404).send('Application not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const updateApplication = async (req, res) => {
  try {
    const updatedApplication = await Application.update(req.body, {
      where: { id: req.params.id },
      returning: true,
      plain: true
    });
    res.json(updatedApplication[1]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const deleteApplication = async (req, res) => {
  try {
    const result = await Application.destroy({ where: { id: req.params.id } });
    if (result) {
      res.send('Application deleted');
    } else {
      res.status(404).send('Application not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  createApplication,
  getApplication,
  updateApplication,
  deleteApplication
};
