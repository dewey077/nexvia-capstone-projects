const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { protect, allow } = require('../middleware/auth');

// Reads the token if there is one, but lets anonymous visitors through
async function optionalUser(req, res, next) {
  try {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) {
      const d = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
      req.user = await User.findById(d.id);
    }
  } catch { /* anonymous */ }
  next();
}

// Public: published courses with search + category filter
router.get('/', async (req, res) => {
  const { q, category } = req.query;
  const filter = { published: true };
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  const courses = await Course.find(filter).populate('instructor', 'name').sort('-createdAt').select('-lessons.videoUrl');
  res.json(courses);
});

router.get('/mine', protect, allow('instructor'), async (req, res) => {
  res.json(await Course.find({ instructor: req.user._id }).sort('-createdAt'));
});

router.get('/enrolled', protect, allow('student'), async (req, res) => {
  const list = await Enrollment.find({ student: req.user._id }).populate({ path: 'course', populate: { path: 'instructor', select: 'name' } }).sort('-createdAt');
  res.json(list);
});

// Course detail: video links are hidden unless you own it or are enrolled
router.get('/:id', optionalUser, async (req, res) => {
  const course = await Course.findById(req.params.id).populate('instructor', 'name');
  if (!course) return res.status(404).json({ message: 'Course not found' });
  const isOwner = req.user && String(course.instructor._id) === String(req.user._id);
  const enrollment = req.user ? await Enrollment.findOne({ student: req.user._id, course: course._id }) : null;
  const canWatch = isOwner || !!enrollment || req.user?.role === 'admin';
  if (!course.published && !isOwner) return res.status(404).json({ message: 'Course not found' });
  const data = course.toObject();
  if (!canWatch) data.lessons = data.lessons.map(({ videoUrl, ...rest }) => rest);
  res.json({ course: data, enrollment, canWatch });
});

router.post('/', protect, allow('instructor'), async (req, res) => {
  const { title, description, category, price } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  const course = await Course.create({ instructor: req.user._id, title, description, category, price: Number(price || 0) });
  res.status(201).json(course);
});

router.put('/:id', protect, allow('instructor'), async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  ['title', 'description', 'category'].forEach((k) => { if (req.body[k] !== undefined) course[k] = req.body[k]; });
  if (req.body.price !== undefined) course.price = Number(req.body.price);
  if (req.body.published !== undefined) course.published = !!req.body.published;
  await course.save();
  res.json(course);
});

router.post('/:id/lessons', protect, allow('instructor'), async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (!req.body.title) return res.status(400).json({ message: 'Lesson title is required' });
  course.lessons.push({ title: req.body.title, order: course.lessons.length + 1 });
  await course.save();
  res.status(201).json(course);
});

// Enroll (payment is test mode: the price is recorded, no money moves)
router.post('/:id/enroll', protect, allow('student'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course || !course.published) return res.status(404).json({ message: 'Course not found' });
  if (await Enrollment.findOne({ student: req.user._id, course: course._id }))
    return res.status(409).json({ message: 'Already enrolled' });
  const enrollment = await Enrollment.create({ student: req.user._id, course: course._id, paid: course.price });
  res.status(201).json(enrollment);
});

// Mark a lesson complete and update progress
router.post('/:id/lessons/:lessonId/complete', protect, allow('student'), async (req, res) => {
  const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.params.id });
  if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });
  const course = await Course.findById(req.params.id);
  if (!course.lessons.id(req.params.lessonId)) return res.status(404).json({ message: 'Lesson not found' });
  if (!enrollment.completedLessons.some((l) => String(l) === req.params.lessonId)) enrollment.completedLessons.push(req.params.lessonId);
  enrollment.progress = Math.round((enrollment.completedLessons.length / course.lessons.length) * 100);
  enrollment.completed = enrollment.progress === 100;
  await enrollment.save();
  res.json(enrollment);
});

module.exports = router;