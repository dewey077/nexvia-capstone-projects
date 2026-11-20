const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Allocates the discount across items proportionally, then splits each line
// into platform commission and vendor payout. Returns items + per-vendor splits.
function calcSplit(lines, discount, percent) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const items = lines.map((l) => {
    const gross = l.price * l.qty;
    const share = subtotal ? (gross / subtotal) * discount : 0;
    const net = round2(gross - share);
    const commission = round2((net * percent) / 100);
    return { ...l, net, commission, payout: round2(net - commission) };
  });
  const map = {};
  for (const i of items) {
    const k = String(i.vendor);
    map[k] = map[k] || { vendor: i.vendor, gross: 0, commission: 0, payout: 0 };
    map[k].gross = round2(map[k].gross + i.net);
    map[k].commission = round2(map[k].commission + i.commission);
    map[k].payout = round2(map[k].payout + i.payout);
  }
  return { items, splits: Object.values(map) };
}

function couponDiscount(coupon, subtotal) {
  if (!coupon || !coupon.active) throw new Error('Invalid coupon');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error('Coupon expired');
  if (coupon.maxUses && coupon.used >= coupon.maxUses) throw new Error('Coupon usage limit reached');
  if (subtotal < coupon.minOrder) throw new Error(`Minimum order is ${coupon.minOrder}`);
  const d = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  return round2(Math.min(d, subtotal));
}
module.exports = { calcSplit, couponDiscount, round2 };
