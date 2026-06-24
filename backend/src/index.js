const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const academicRoutes = require('./modules/academic-structure/academic.routes');
const admissionsRoutes = require('./modules/admissions/admissions.routes');
const curriculumRoutes = require('./modules/curriculum/curriculum.routes');
const registrationRoutes = require('./modules/registration/registration.routes');
const marksRoutes = require('./modules/marks/marks.routes');
const financeRoutes = require('./modules/finance/finance.routes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/finance', financeRoutes);

// Global error handler — catches all unhandled async errors, never crashes the process
app.use((err, req, res, next) => {
  console.error(err.message);
  // PostgreSQL unique violation
  if (err.code === '23505') {
    const match = err.detail?.match(/Key \((\w+)\)=\((.+)\) already exists/);
    const field = match ? match[1] : 'field';
    const value = match ? match[2] : '';
    return res.status(409).json({ error: `${field} "${value}" already exists` });
  }
  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Latech MIS backend running on port ${PORT}`);
});

module.exports = app;
