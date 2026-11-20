const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Course = require('../models/Course');
const { protect, allow } = require('../middleware/auth');
const { addVideoJob } = require('../config/queue');

const uploadDir = path.join(__dirname, '../../media/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith('video/') ? cb(null, true) : cb(new Error('Only video files allowed')),
});

// Instructor uploads a video for one lesson
router.post('/:id/lessons/:lessonId/video', protect, allow('instructor'), upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Video file is required' });

  const course = await Course.findOne({ _id: req.params.id, instructor: req.user._id });
  const lesson = course?.lessons.id(req.params.lessonId);
  if (!lesson) {
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ message: 'Lesson not found' });
  }

  lesson.videoStatus = 'processing';
  lesson.videoUrl = undefined;
  await course.save();

  await addVideoJob({ courseId: String(course._id), lessonId: String(lesson._id), inputPath: req.file.path });
  res.status(202).json({ message: 'Upload received, converting video', lessonId: lesson._id, videoStatus: 'processing' });
});

module.exports = router;