const router = require('express').Router();
const Product = require('../models/Product');
const es = require('../config/es');
const { protect, allow } = require('../middleware/auth');
const { upload, saveFile } = require('../middleware/upload');

const owns = (p, u) => String(p.vendor) === String(u._id) || u.role === 'admin';

router.get('/', async (req, res) => {
  const { q, category, minPrice, maxPrice, sort } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 12);

  if (es.isESAvailable()) {
    const { ids, total } = await es.searchIds({ q, category, minPrice, maxPrice, sort, page, limit });
    const docs = await Product.find({ _id: { $in: ids } }).populate('vendor', 'shopName');
    const products = ids.map((id) => docs.find((d) => String(d._id) === id)).filter(Boolean);
    return res.json({ products, total, page, engine: 'elasticsearch' });
  }
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (minPrice || maxPrice) filter.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
  const sortMap = { price_asc: 'price', price_desc: '-price', rating: '-ratingAvg', newest: '-createdAt' };
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter).sort(sortMap[sort] || '-createdAt')
    .skip((page - 1) * limit).limit(limit).populate('vendor', 'shopName');
  res.json({ products, total, page, engine: 'mongodb' });
});

router.get('/categories', async (req, res) => res.json(await Product.distinct('category')));
router.get('/mine', protect, allow('vendor'), async (req, res) => res.json(await Product.find({ vendor: req.user._id }).sort('-createdAt')));

router.post('/reindex', protect, allow('admin'), async (req, res) => {
  const all = await Product.find();
  for (const p of all) await es.indexProduct(p);
  res.json({ indexed: all.length, engine: es.isESAvailable() ? 'elasticsearch' : 'unavailable' });
});

router.get('/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).populate('vendor', 'shopName name');
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json(p);
});

router.post('/', protect, allow('vendor', 'admin'), upload.array('images', 5), async (req, res) => {
  if (req.user.role === 'vendor' && req.user.vendorStatus !== 'approved') return res.status(403).json({ message: 'Vendor account not approved yet' });
  const { name, description, category, brand, price, stock } = req.body;
  if (!name || !category || price === undefined) return res.status(400).json({ message: 'name, category and price required' });
  const images = await Promise.all((req.files || []).map(saveFile));
  const p = await Product.create({ vendor: req.user._id, name, description, category, brand, price: Number(price), stock: Number(stock || 0), images });
  await es.indexProduct(p);
  res.status(201).json(p);
});

router.put('/:id', protect, allow('vendor', 'admin'), upload.array('images', 5), async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  if (!owns(p, req.user)) return res.status(403).json({ message: 'Not your product' });
  ['name', 'description', 'category', 'brand'].forEach((k) => { if (req.body[k] !== undefined) p[k] = req.body[k]; });
  if (req.body.price !== undefined) p.price = Number(req.body.price);
  if (req.body.stock !== undefined) p.stock = Number(req.body.stock);
  const added = await Promise.all((req.files || []).map(saveFile));
  if (added.length) p.images.push(...added);
  await p.save();
  await es.indexProduct(p);
  res.json(p);
});

router.delete('/:id', protect, allow('vendor', 'admin'), async (req, res) => {
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  if (!owns(p, req.user)) return res.status(403).json({ message: 'Not your product' });
  await p.deleteOne();
  await es.removeProduct(p._id);
  res.json({ message: 'Deleted' });
});
module.exports = router;
