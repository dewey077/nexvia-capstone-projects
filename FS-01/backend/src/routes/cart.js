// Cart is stored in Redis (key cart:<userId>) as { productId: qty }
const router = require('express').Router();
const cache = require('../config/redis');
const Product = require('../models/Product');
const { protect, allow } = require('../middleware/auth');

router.use(protect, allow('customer'));
const key = (u) => `cart:${u._id}`;
const load = async (u) => JSON.parse((await cache.get(key(u))) || '{}');

async function view(u) {
  const cart = await load(u);
  const products = await Product.find({ _id: { $in: Object.keys(cart) } });
  const items = products.map((p) => ({ product: p, qty: cart[p._id] }));
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  return { items, subtotal, store: cache.engine() };
}

router.get('/', async (req, res) => res.json(await view(req.user)));

router.post('/', async (req, res) => {
  const { productId, qty = 1 } = req.body;
  const p = await Product.findById(productId);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  const cart = await load(req.user);
  const next = (cart[productId] || 0) + Number(qty);
  if (next < 1) delete cart[productId];
  else if (next > p.stock) return res.status(400).json({ message: `Only ${p.stock} in stock` });
  else cart[productId] = next;
  await cache.set(key(req.user), JSON.stringify(cart));
  res.json(await view(req.user));
});

router.delete('/:productId', async (req, res) => {
  const cart = await load(req.user);
  delete cart[req.params.productId];
  await cache.set(key(req.user), JSON.stringify(cart));
  res.json(await view(req.user));
});
module.exports = router;
