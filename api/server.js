require('dotenv').config();
const express = require('express');
const pool = require('./config/database');
const app = express();

// Require route files
const userRoutes = require('./routes/userRoutes');
const jobAdvertRoutes = require('./routes/jobAdvertRoutes');
const companyProfileRoutes = require('./routes/companyProfileRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const chatMessageRoutes = require('./routes/chatMessageRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const port = process.env.PORT || 3000;

app.use(express.json());

// Use the imported routes
app.use('/api/users', userRoutes);
app.use('/api/jobadverts', jobAdvertRoutes);
app.use('/api/companyprofiles', companyProfileRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/chatmessages', chatMessageRoutes);
app.use('/api/payments', paymentRoutes);

// Define a GET route for the root path
app.get('/', (req, res) => {
    res.send('Welcome to the Construction App API!');
  });

// A simple route to test the database connection
app.get('/test-db', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT NOW()');
      res.json({ message: 'Database connection successful', time: rows[0].now });
    } catch (err) {
      console.error('Database connection error', err);
      res.status(500).json({ message: 'Database connection error' });
    }
  });
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });