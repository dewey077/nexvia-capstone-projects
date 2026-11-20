const router = require('express').Router();
const PDFDocument = require('pdfkit');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { protect, allow } = require('../middleware/auth');

router.get('/:id/certificate', protect, allow('student'), async (req, res) => {
  const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.params.id });
  if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });
  if (!enrollment.completed) return res.status(400).json({ message: 'Complete all lessons first' });

  const course = await Course.findById(req.params.id).populate('instructor', 'name');
  const quiz = await Quiz.findOne({ course: course._id });
  if (quiz && !(await QuizAttempt.findOne({ student: req.user._id, course: course._id, passed: true })))
    return res.status(400).json({ message: 'Pass the course quiz first' });

  const certId = String(enrollment._id).slice(-8).toUpperCase();
  const date = enrollment.updatedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=certificate-${certId}.pdf`);
  doc.pipe(res);

  const W = doc.page.width;
  const H = doc.page.height;
  const SIDE = 90;

  // every centered line uses the same box, so everything lines up on the page center
  const line = (text, y, size, color, font = 'Helvetica') =>
    doc.font(font).fontSize(size).fillColor(color).text(text, SIDE, y, { width: W - SIDE * 2, align: 'center' });

  // borders
  doc.rect(25, 25, W - 50, H - 50).lineWidth(4).stroke('#1e3a8a');
  doc.rect(36, 36, W - 72, H - 72).lineWidth(1).stroke('#93c5fd');

  line('Certificate of Completion', 90, 40, '#1e3a8a', 'Helvetica-Bold');
  doc.moveTo(W / 2 - 60, 148).lineTo(W / 2 + 60, 148).lineWidth(2).stroke('#93c5fd');

  line('This is to certify that', 175, 16, '#475569');
  line(req.user.name, 210, 36, '#0f172a', 'Helvetica-Bold');
  doc.moveTo(W / 2 - 170, 262).lineTo(W / 2 + 170, 262).lineWidth(1).stroke('#94a3b8');

  line('has successfully completed the course', 282, 16, '#475569');
  line(course.title, 315, 28, '#1e3a8a', 'Helvetica-Bold');

  // footer: instructor on the left, date on the right
  const colW = 200;
  const leftX = SIDE + 30;
  const rightX = W - SIDE - 30 - colW;
  const footY = 440;

  doc.moveTo(leftX, footY).lineTo(leftX + colW, footY).lineWidth(1).stroke('#94a3b8');
  doc.moveTo(rightX, footY).lineTo(rightX + colW, footY).lineWidth(1).stroke('#94a3b8');

  doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
  doc.text(course.instructor.name, leftX, footY - 24, { width: colW, align: 'center' });
  doc.text(date, rightX, footY - 24, { width: colW, align: 'center' });

  doc.font('Helvetica').fontSize(11).fillColor('#64748b');
  doc.text('Instructor', leftX, footY + 8, { width: colW, align: 'center' });
  doc.text('Date of completion', rightX, footY + 8, { width: colW, align: 'center' });

  line(`Certificate ID: ${certId}`, H - 80, 10, '#94a3b8');
  doc.end();
});

module.exports = router;