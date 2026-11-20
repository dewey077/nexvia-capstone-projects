process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
const request = require('supertest');
const { calcSplit, couponDiscount } = require('../src/utils/commission');
const app = require('../src/app');

describe('commission split', () => {
  const lines = [
    { vendor: 'A', price: 1000, qty: 1 },
    { vendor: 'B', price: 500, qty: 2 },
  ];
  test('10% commission, no discount', () => {
    const { items, splits } = calcSplit(lines, 0, 10);
    expect(items[0].commission).toBe(100);
    expect(splits.find((s) => s.vendor === 'A').payout).toBe(900);
    expect(splits.find((s) => s.vendor === 'B').payout).toBe(900);
  });
  test('discount is shared proportionally and totals reconcile', () => {
    const { items, splits } = calcSplit(lines, 200, 10);
    const net = items.reduce((s, i) => s + i.net, 0);
    expect(Math.round(net)).toBe(1800);
    const sum = splits.reduce((s, x) => s + x.commission + x.payout, 0);
    expect(Math.round(sum)).toBe(1800);
  });
});

describe('coupons', () => {
  test('percent coupon', () => expect(couponDiscount({ active: true, type: 'percent', value: 10, minOrder: 0, used: 0, maxUses: 0 }, 1000)).toBe(100));
  test('flat coupon capped at subtotal', () => expect(couponDiscount({ active: true, type: 'flat', value: 500, minOrder: 0, used: 0, maxUses: 0 }, 300)).toBe(300));
  test('min order enforced', () => expect(() => couponDiscount({ active: true, type: 'flat', value: 50, minOrder: 1000, used: 0, maxUses: 0 }, 500)).toThrow());
  test('expired coupon rejected', () => expect(() => couponDiscount({ active: true, type: 'flat', value: 50, minOrder: 0, expiresAt: new Date(2000, 1, 1) }, 500)).toThrow('expired'));
  test('usage limit enforced', () => expect(() => couponDiscount({ active: true, type: 'flat', value: 50, minOrder: 0, used: 5, maxUses: 5 }, 500)).toThrow());
});

describe('API guards (no database needed)', () => {
  test('health check', async () => { const r = await request(app).get('/api/health'); expect(r.status).toBe(200); expect(r.body.ok).toBe(true); });
  test('protected route without token -> 401', async () => { expect((await request(app).get('/api/cart')).status).toBe(401); });
  test('admin route without token -> 401', async () => { expect((await request(app).get('/api/admin/analytics')).status).toBe(401); });
  test('register rejects invalid role', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'x', email: 'x@x.com', password: '123456', role: 'admin' });
    expect(r.status).toBe(400);
  });
  test('register rejects short password', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'x', email: 'x@x.com', password: '123' });
    expect(r.status).toBe(400);
  });
  test('unknown route -> 404', async () => { expect((await request(app).get('/api/nope')).status).toBe(404); });
});
