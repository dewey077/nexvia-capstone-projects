const router = require('express').Router();
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { protect, allow } = require('../middleware/auth');

// Instructor creates or replaces the quiz of a course
router.put('/:id/quiz', protect, allow('instructor'), async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  const { title, passMark = 60, questions } = req.body;
  if (!Array.isArray(questions) || !questions.length)
    return res.status(400).json({ message: 'At least one question is required' });
  for (const q of questions) {
    if (!q.text || !Array.isArray(q.options) || q.options.length < 2 || !(q.correctIndex >= 0 && q.correctIndex < q.options.length))
      return res.status(400).json({ message: 'Each question needs text, 2+ options and a valid correctIndex' });
  }
  const quiz = await Quiz.findOneAndUpdate(
    { course: course._id },
    { title: title || 'Course quiz', passMark: Number(passMark), questions },
    { upsert: true, new: true, runValidators: true }
  );
  res.json(quiz);
});

// Owner sees answers; enrolled students get the questions without answers
router.get('/:id/quiz', protect, async (req, res) => {
  const course = await Course.findById(req.params.id);
  const quiz = course && await Quiz.findOne({ course: course._id });
  if (!quiz) return res.status(404).json({ message: 'No quiz for this course' });
  const isOwner = String(course.instructor) === String(req.user._id);
  if (!isOwner && !(await Enrollment.findOne({ student: req.user._id, course: course._id })))
    return res.status(403).json({ message: 'Enroll in the course first' });
  const data = quiz.toObject();
  if (!isOwner) data.questions = data.questions.map(({ correctIndex, ...q }) => q);
  res.json(data);
});

// Student submits answers, server grades automatically
router.post('/:id/quiz/submit', protect, allow('student'), async (req, res) => {
  if (!(await Enrollment.findOne({ student: req.user._id, course: req.params.id })))
    return res.status(403).json({ message: 'Enroll in the course first' });
  const quiz = await Quiz.findOne({ course: req.params.id });
  if (!quiz) return res.status(404).json({ message: 'No quiz for this course' });
  const answers = req.body.answers;
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length)
    return res.status(400).json({ message: `Send ${quiz.questions.length} answers` });
  const correct = quiz.questions.filter((q, i) => Number(answers[i]) === q.correctIndex).length;
  const total = quiz.questions.length;
  const score = Math.round((correct / total) * 100);
  const attempt = await QuizAttempt.create({
    student: req.user._id, course: req.params.id, quiz: quiz._id,
    answers, correct, total, score, passed: score >= quiz.passMark,
  });
  res.status(201).json({ correct, total, score, passed: attempt.passed, passMark: quiz.passMark });
});

// Student's attempt history
router.get('/:id/quiz/attempts', protect, allow('student'), async (req, res) => {
  res.json(await QuizAttempt.find({ student: req.user._id, course: req.params.id }).sort('-createdAt'));
});

module.exports = router;