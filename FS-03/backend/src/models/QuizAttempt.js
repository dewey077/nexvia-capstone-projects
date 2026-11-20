const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers: [Number],
  correct: Number,
  total: Number,
  score: Number,
  passed: Boolean,
}, { timestamps: true });

module.exports = mongoose.model('QuizAttempt', attemptSchema);