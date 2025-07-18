const JobAdvert = require('../models/jobAdvert');

const createJobAdvert = async (req, res) => {
  const { title, description, location, payRate, requiredSkills, images, contractorId } = req.body;
  try {
    const newJobAdvert = await JobAdvert.create({
      title, description, location, payRate, requiredSkills, images, contractorId
    });
    res.json(newJobAdvert);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const getJobAdvert = async (req, res) => {
  try {
    const jobAdvert = await JobAdvert.findByPk(req.params.id);
    if (jobAdvert) {
      res.json(jobAdvert);
    } else {
      res.status(404).send('Job advert not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const updateJobAdvert = async (req, res) => {
  try {
    const updatedJobAdvert = await JobAdvert.update(req.body, {
      where: { id: req.params.id },
      returning: true,
      plain: true
    });
    res.json(updatedJobAdvert[1]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const deleteJobAdvert = async (req, res) => {
  try {
    const result = await JobAdvert.destroy({ where: { id: req.params.id } });
    if (result) {
      res.send('Job advert deleted');
    } else {
      res.status(404).send('Job advert not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  createJobAdvert,
  getJobAdvert,
  updateJobAdvert,
  deleteJobAdvert
};
