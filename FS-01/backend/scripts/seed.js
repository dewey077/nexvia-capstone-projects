~require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');
const { initES, indexProduct } = require('../src/config/es');

const catalog = [
  ['Wireless Headphones', 'Electronics', 'Sonic', 2999], ['Smart Watch', 'Electronics', 'Fitly', 4499],
  ['Bluetooth Speaker', 'Electronics', 'Sonic', 1999], ['Running Shoes', 'Fashion', 'Stride', 3299],
  ['Denim Jacket', 'Fashion', 'Urban', 2499], ['Cotton T-Shirt', 'Fashion', 'Urban', 599],
  ['Non-stick Pan', 'Home', 'Cookwell', 899], ['Table Lamp', 'Home', 'Glow', 1299],
  ['Yoga Mat', 'Sports', 'Flexi', 799], ['Dumbbell Set', 'Sports', 'IronX', 2599],
  ['Novel: Midnight Library', 'Books', 'Canon', 399], ['JavaScript Handbook', 'Books', 'DevPress', 549],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await initES();
  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Coupon.deleteMany({})]);
  await User.create({ name: 'Admin', email: 'admin@demo.com', password: 'Admin@123', role: 'admin' });
  const vendors = [];
  for (const [i, shop] of ['TechHub', 'StyleStreet'].entries())
    vendors.push(await User.create({ name: `Vendor ${i + 1}`, email: `vendor${i + 1}@demo.com`, password: 'Vendor@123', role: 'vendor', shopName: shop, vendorStatus: 'approved' }));
  await User.create({ name: 'Demo Customer', email: 'customer@demo.com', password: 'Customer@123', role: 'customer' });
  for (const [i, [name, category, brand, price]] of catalog.entries()) {
    const p = await Product.create({ vendor: vendors[i % 2]._id, name, category, brand, price, stock: 25,
      description: `${name} by ${brand}. Quality ${category.toLowerCase()} product.`, images: [`https://picsum.photos/seed/${i + 10}/600/450`] });
    await indexProduct(p);
  }
  await Coupon.create([{ code: 'WELCOME10', type: 'percent', value: 10, minOrder: 500 }, { code: 'FLAT200', type: 'flat', value: 200, minOrder: 1500 }]);
  console.log('Seeded. Logins: admin@demo.com/Admin@123, vendor1@demo.com/Vendor@123, customer@demo.com/Customer@123. Coupons: WELCOME10, FLAT200');
  process.exit(0);
})();
