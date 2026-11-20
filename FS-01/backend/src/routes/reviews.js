const router = require('express').Router({ mergeParams: true });
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, allow } = require('../middleware/auth');

router.get('/', async (req, res) => res.json(await Review.find({ product: req.params.productId }).populate('user', 'name').sort('-createdAt')));

router.post('/', protect, allow('customer'), async (req, res) => {
  const { rating, comment } = req.body;
  const bought = await Order.exists({ customer: req.user._id, paymentStatus: 'paid', 'items.product': req.params.productId });
  if (!bought) return res.status(403).json({ message: 'Only verified buyers can review' });
  const review = await Review.findOneAndUpdate({ product: req.params.productId, user: req.user._id },
    { rating: Number(rating), comment }, { upsert: true, new: true, runValidators: true });
  const [agg] = await Review.aggregate([{ $match: { product: review.product } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Product.findByIdAndUpdate(req.params.productId, { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.n });
  res.status(201).json(review);
});
module.exports = router;
