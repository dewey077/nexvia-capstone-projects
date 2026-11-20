const mongoose = require('mongoose');
const { Schema } = mongoose;
const STATUSES = ['placed', 'packed', 'shipped', 'delivered'];

const itemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  vendor: { type: Schema.Types.ObjectId, ref: 'User' },
  name: String, image: String,
  price: Number, qty: Number,
  net: Number, commission: Number, payout: Number,
  status: { type: String, enum: STATUSES, default: 'placed' },
});

const orderSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [itemSchema],
  address: { name: String, phone: String, line1: String, city: String, state: String, pincode: String },
  subtotal: Number, discount: { type: Number, default: 0 }, total: Number, coupon: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMode: { type: String, enum: ['razorpay', 'mock'], default: 'mock' },
  razorpayOrderId: String, razorpayPaymentId: String,
  splits: [{ vendor: { type: Schema.Types.ObjectId, ref: 'User' }, gross: Number, commission: Number,
    payout: Number, transferStatus: { type: String, default: 'recorded' } }],
  status: { type: String, enum: STATUSES, default: 'placed' },
}, { timestamps: true });

orderSchema.methods.refreshStatus = function () {
  const idx = this.items.map((i) => STATUSES.indexOf(i.status));
  this.status = STATUSES[Math.min(...idx)];
};
orderSchema.statics.STATUSES = STATUSES;
module.exports = mongoose.model('Order', orderSchema);
