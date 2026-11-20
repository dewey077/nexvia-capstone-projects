require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// converted videos (HLS playlists and chunks) are served from here
app.use('/media/hls', express.static(path.join(__dirname, '../media/hls')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/instructor', require('./routes/instructor'));
app.use('/api/courses', require('./routes/video'));
app.use('/api/courses', require('./routes/quizzes'));
app.use('/api/courses', require('./routes/certificates'));
app.use('/api/courses', require('./routes/courses'));

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'lms' }));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;