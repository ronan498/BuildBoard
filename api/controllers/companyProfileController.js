const CompanyProfile = require('../models/companyProfile');

const createCompanyProfile = async (req, res) => {
  const { name, logo, contactInformation, images, description, workHistory, contractors } = req.body;
  try {
    const newCompanyProfile = await CompanyProfile.create({
      name, logo, contactInformation, images, description, workHistory, contractors
    });
    res.json(newCompanyProfile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const getCompanyProfile = async (req, res) => {
  try {
    const companyProfile = await CompanyProfile.findByPk(req.params.id);
    if (companyProfile) {
      res.json(companyProfile);
    } else {
      res.status(404).send('Company profile not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const updateCompanyProfile = async (req, res) => {
  try {
    const updatedCompanyProfile = await CompanyProfile.update(req.body, {
      where: { id: req.params.id },
      returning: true,
      plain: true
    });
    res.json(updatedCompanyProfile[1]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const deleteCompanyProfile = async (req, res) => {
  try {
    const result = await CompanyProfile.destroy({ where: { id: req.params.id } });
    if (result) {
      res.send('Company profile deleted');
    } else {
      res.status(404).send('Company profile not found');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = {
  createCompanyProfile,
  getCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile
};
