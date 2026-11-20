const router = require('express').Router();
const Coupon = require('../models/Coupon');
const { couponDiscount } = require('../utils/commission');
const { protect } = require('../middleware/auth');

router.post('/validate', protect, async (req, res) => {
  const { code, subtotal } = req.body;
  const coupon = await Coupon.findOne({ code: String(code || '').toUpperCase() });
  if (!coupon) return res.status(400).json({ message: 'Invalid coupon' });
  try {
    res.json({ code: coupon.code, discount: couponDiscount(coupon, Number(subtotal)) });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});
module.exports = router;