const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const cache = require('../config/redis');
const invoice = require('../utils/invoice');
const { calcSplit, couponDiscount, round2 } = require('../utils/commission');
const { protect, allow } = require('../middleware/auth');

router.use(protect);
const COMMISSION = () => Number(process.env.COMMISSION_PERCENT || 10);
const liveRazorpay = () => process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
const rzp = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

// 1) Checkout: cart -> order (payment pending) + gateway order
router.post('/checkout', allow('customer'), async (req, res) => {
  const { address = {}, couponCode } = req.body;
  if (!address.line1 || !address.city || !address.pincode) return res.status(400).json({ message: 'Address line1, city and pincode required' });
  const cart = JSON.parse((await cache.get(`cart:${req.user._id}`)) || '{}');
  const products = await Product.find({ _id: { $in: Object.keys(cart) } });
  if (!products.length) return res.status(400).json({ message: 'Cart is empty' });

  const lines = [];
  for (const p of products) {
    const qty = cart[p._id];
    if (p.stock < qty) return res.status(400).json({ message: `${p.name}: only ${p.stock} left` });
    lines.push({ product: p._id, vendor: p.vendor, name: p.name, image: p.images[0], price: p.price, qty });
  }
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0));
  let discount = 0, coupon;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    try { discount = couponDiscount(coupon, subtotal); } catch (e) { return res.status(400).json({ message: e.message }); }
  }
  const { items, splits } = calcSplit(lines, discount, COMMISSION());
  const total = round2(subtotal - discount);
  const order = await Order.create({
    customer: req.user._id, items, splits, address, subtotal, discount, total,
    coupon: coupon?.code, paymentMode: liveRazorpay() ? 'razorpay' : 'mock',
  });
  if (liveRazorpay()) {
    const ro = await rzp().orders.create({ amount: Math.round(total * 100), currency: 'INR', receipt: String(order._id) });
    order.razorpayOrderId = ro.id;
  } else {
    order.razorpayOrderId = `order_mock_${order._id}`;
  }
  await order.save();
  res.status(201).json({ order, payment: { mode: order.paymentMode, razorpayOrderId: order.razorpayOrderId, amount: Math.round(total * 100), key: process.env.RAZORPAY_KEY_ID || null } });
});

// 2) Verify payment: signature check, stock deduction, split payouts
router.post('/:id/verify', allow('customer'), async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.paymentStatus === 'paid') return res.json(order);
  const { razorpay_payment_id, razorpay_signature } = req.body;

  if (order.paymentMode === 'razorpay') {
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${order.razorpayOrderId}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) { order.paymentStatus = 'failed'; await order.save(); return res.status(400).json({ message: 'Payment signature mismatch' }); }
    order.razorpayPaymentId = razorpay_payment_id;
  } else {
    order.razorpayPaymentId = `pay_mock_${Date.now()}`; // test mode: no real money moves
  }
  order.paymentStatus = 'paid';

  await Product.bulkWrite(order.items.map((i) => ({ updateOne: { filter: { _id: i.product }, update: { $inc: { stock: -i.qty } } } })));
  if (order.coupon) await Coupon.updateOne({ code: order.coupon }, { $inc: { used: 1 } });
  await cache.del(`cart:${req.user._id}`);

  // Razorpay Route: transfer vendor payouts if vendors have linked accounts
  if (order.paymentMode === 'razorpay') {
    const User = require('../models/User');
    const vendors = await User.find({ _id: { $in: order.splits.map((s) => s.vendor) } });
    const transfers = order.splits.map((s) => ({ s, acc: vendors.find((v) => String(v._id) === String(s.vendor))?.razorpayAccountId }))
      .filter((t) => t.acc).map((t) => ({ account: t.acc, amount: Math.round(t.s.payout * 100), currency: 'INR' }));
    if (transfers.length) {
      try { await rzp().payments.transfer(order.razorpayPaymentId, { transfers }); order.splits.forEach((s) => (s.transferStatus = 'transferred')); }
      catch { order.splits.forEach((s) => (s.transferStatus = 'failed')); }
    }
  }
  await order.save();
  res.json(order);
});

router.get('/mine', allow('customer'), async (req, res) => res.json(await Order.find({ customer: req.user._id }).sort('-createdAt')));

// Vendor view: only their own items + earnings
router.get('/vendor', allow('vendor'), async (req, res) => {
  const orders = await Order.find({ 'items.vendor': req.user._id, paymentStatus: 'paid' }).populate('customer', 'name email').sort('-createdAt');
  const result = orders.map((o) => ({ _id: o._id, createdAt: o.createdAt, customer: o.customer, address: o.address,
    items: o.items.filter((i) => String(i.vendor) === String(req.user._id)) }));
  const earnings = result.flatMap((o) => o.items).reduce((s, i) => s + i.payout, 0);
  res.json({ orders: result, earnings: round2(earnings) });
});

// Order lifecycle: placed -> packed -> shipped -> delivered (vendor moves own items forward one step)
router.patch('/:id/items/:itemId/status', allow('vendor', 'admin'), async (req, res) => {
  const order = await Order.findById(req.params.id);
  const item = order?.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (order.paymentStatus !== 'paid') return res.status(400).json({ message: 'Order not paid' });
  if (req.user.role === 'vendor' && String(item.vendor) !== String(req.user._id)) return res.status(403).json({ message: 'Not your item' });
  const S = Order.STATUSES;
  if (S.indexOf(req.body.status) !== S.indexOf(item.status) + 1) return res.status(400).json({ message: `Next status must be "${S[S.indexOf(item.status) + 1] || 'none'}"` });
  item.status = req.body.status;
  order.refreshStatus();
  await order.save();
  res.json(order);
});

router.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (req.user.role === 'customer' && String(order.customer) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
  res.json(order);
});

router.get('/:id/invoice', allow('customer', 'admin'), async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customer', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (req.user.role === 'customer' && String(order.customer._id) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
  if (order.paymentStatus !== 'paid') return res.status(400).json({ message: 'Invoice available after payment' });
  invoice(order, order.customer, res);
});
module.exports = router;
