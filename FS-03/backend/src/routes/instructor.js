const router = require('express').Router();
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { protect, allow } = require('../middleware/auth');

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const FEE = () => Number(process.env.PLATFORM_FEE_PERCENT || 20);

// Instructor earnings: gross sales, platform fee, net earnings (test-mode payments)
router.get('/revenue', protect, allow('instructor'), async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id }).select('title price');
  const ids = courses.map((c) => c._id);
  const enrollments = await Enrollment.find({ course: { $in: ids } }).populate('student', 'name').sort('-createdAt');

  const byCourse = courses.map((c) => {
    const list = enrollments.filter((e) => String(e.course) === String(c._id));
    const gross = list.reduce((s, e) => s + e.paid, 0);
    const platformFee = round2((gross * FEE()) / 100);
    return { courseId: c._id, title: c.title, students: list.length, gross, platformFee, earnings: round2(gross - platformFee) };
  });

  const gross = byCourse.reduce((s, c) => s + c.gross, 0);
  const platformFee = round2(byCourse.reduce((s, c) => s + c.platformFee, 0));

  const dayMap = {};
  for (const e of enrollments) {
    const day = e.createdAt.toISOString().slice(0, 10);
    dayMap[day] = round2((dayMap[day] || 0) + e.paid * (1 - FEE() / 100));
  }
  const byDay = Object.entries(dayMap).sort().map(([day, earnings]) => ({ day, earnings }));

  res.json({
    feePercent: FEE(),
    totals: { students: enrollments.length, gross, platformFee, earnings: round2(gross - platformFee) },
    byCourse,
    byDay,
    recent: enrollments.slice(0, 10).map((e) => ({ student: e.student?.name, paid: e.paid, date: e.createdAt })),
  });
});

module.exports = router;