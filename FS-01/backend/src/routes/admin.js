const router = require('express').Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { protect, allow } = require('../middleware/auth');

router.use(protect, allow('admin'));

router.get('/vendors', async (req, res) => res.json(await User.find({ role: 'vendor' }).sort('-createdAt')));
router.patch('/vendors/:id', async (req, res) => {
  const { status, razorpayAccountId } = req.body;
  const update = {};
  if (status) { if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ message: 'Bad status' }); update.vendorStatus = status; }
  if (razorpayAccountId) update.razorpayAccountId = razorpayAccountId;
  const v = await User.findOneAndUpdate({ _id: req.params.id, role: 'vendor' }, update, { new: true });
  if (!v) return res.status(404).json({ message: 'Vendor not found' });
  res.json(v);
});

router.get('/coupons', async (req, res) => res.json(await Coupon.find().sort('-createdAt')));
router.post('/coupons', async (req, res) => {
  try { res.status(201).json(await Coupon.create(req.body)); } catch (e) { res.status(400).json({ message: e.message }); }
});
router.delete('/coupons/:id', async (req, res) => { await Coupon.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); });

// Analytics page data
router.get('/analytics', async (req, res) => {
  const paid = { paymentStatus: 'paid' };
  const [totals] = await Order.aggregate([{ $match: paid }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 }, commission: { $sum: { $sum: '$splits.commission' } } } }]);
  const byDay = await Order.aggregate([{ $match: paid }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 30 }]);
  const byStatus = await Order.aggregate([{ $match: paid }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const topProducts = await Order.aggregate([{ $match: paid }, { $unwind: '$items' }, { $group: { _id: '$items.name', units: { $sum: '$items.qty' }, revenue: { $sum: '$items.net' } } }, { $sort: { revenue: -1 } }, { $limit: 5 }]);
  const topVendors = await Order.aggregate([{ $match: paid }, { $unwind: '$splits' }, { $group: { _id: '$splits.vendor', gross: { $sum: '$splits.gross' }, payout: { $sum: '$splits.payout' } } }, { $sort: { gross: -1 } }, { $limit: 5 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'v' } }, { $project: { gross: 1, payout: 1, shop: { $arrayElemAt: ['$v.shopName', 0] } } }]);
  res.json({
    revenue: totals?.revenue || 0, orders: totals?.orders || 0, commission: totals?.commission || 0,
    users: await User.countDocuments({ role: 'customer' }), vendors: await User.countDocuments({ role: 'vendor' }),
    products: await Product.countDocuments(), byDay, byStatus, topProducts, topVendors,
  });
});
module.exports = router;
