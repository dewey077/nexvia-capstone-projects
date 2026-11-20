const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: { type: [String], validate: (v) => v.length >= 2 },
  correctIndex: { type: Number, required: true, min: 0 },
});

const quizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
  title: { type: String, default: 'Course quiz' },
  passMark: { type: Number, default: 60 },
  questions: [questionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);