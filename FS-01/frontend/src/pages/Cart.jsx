import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const emptyAddress = { name: '', phone: '', line1: '', city: '', state: '', pincode: '' };

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState({ code: '', discount: 0 });
  const [couponMsg, setCouponMsg] = useState('');
  const [address, setAddress] = useState(emptyAddress);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  const load = async () => {
    const { data } = await api.get('/cart');
    setCart(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetCoupon = () => {
    if (applied.code) setCouponMsg('Cart changed, please apply the coupon again');
    setApplied({ code: '', discount: 0 });
  };

  const change = async (productId, qty) => {
    setError('');
    try {
      const { data } = await api.post('/cart', { productId, qty });
      setCart(data);
      resetCoupon();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update cart');
    }
  };

  const remove = async (productId) => {
    const { data } = await api.delete(`/cart/${productId}`);
    setCart(data);
    resetCoupon();
  };

  const applyCoupon = async () => {
    setCouponMsg('');
    try {
      const { data } = await api.post('/coupons/validate', { code: couponInput, subtotal: cart.subtotal });
      setApplied({ code: data.code, discount: data.discount });
      setCouponMsg(`${data.code} applied: you save ₹${data.discount}`);
    } catch (err) {
      setApplied({ code: '', discount: 0 });
      setCouponMsg(err.response?.data?.message || 'Invalid coupon');
    }
  };

  const setAddr = (k) => (e) => setAddress({ ...address, [k]: e.target.value });

  const pay = async (e) => {
    e.preventDefault();
    setError('');
    setPaying(true);
    try {
      const { data } = await api.post('/orders/checkout', {
        address,
        couponCode: applied.code || undefined,
      });
      if (data.payment.mode === 'mock') {
        await api.post(`/orders/${data.order._id}/verify`, {});
        navigate('/orders');
      } else {
        setError('Razorpay keys are set in the backend, but the payment popup is not added yet.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setPaying(false);
    }
  };

  const total = cart.subtotal - applied.discount;

  if (loading) return <p className="p-8">Loading cart...</p>;
  if (!cart.items.length)
    return <p className="p-8 text-center text-slate-500">Your cart is empty. Add some products first.</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-3">
        <h1 className="text-2xl font-bold">Your cart</h1>
        {cart.items.map(({ product: p, qty }) => (
          <div key={p._id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <img src={p.images?.[0]} alt="" className="w-20 h-20 object-cover rounded bg-slate-200" />
            <div className="flex-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-slate-500">₹{p.price} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => change(p._id, -1)} className="w-8 h-8 border rounded">-</button>
              <span className="w-6 text-center">{qty}</span>
              <button onClick={() => change(p._id, 1)} className="w-8 h-8 border rounded">+</button>
            </div>
            <p className="w-20 text-right font-semibold">₹{p.price * qty}</p>
            <button onClick={() => remove(p._id)} className="text-red-600 text-sm">Remove</button>
          </div>
        ))}
      </div>

      <form onSubmit={pay} className="bg-white rounded-xl shadow p-4 space-y-3 h-fit">
        <h2 className="font-bold text-lg">Checkout</h2>

        <div className="flex gap-2">
          <input className="border rounded p-2 w-full uppercase" placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
          <button type="button" onClick={applyCoupon} className="bg-slate-200 rounded px-3 text-sm">Apply</button>
        </div>
        {couponMsg && <p className="text-xs text-blue-600">{couponMsg}</p>}

        <input className="w-full border rounded p-2" placeholder="Full name" required value={address.name} onChange={setAddr('name')} />
        <input className="w-full border rounded p-2" placeholder="Phone" required value={address.phone} onChange={setAddr('phone')} />
        <input className="w-full border rounded p-2" placeholder="Address line" required value={address.line1} onChange={setAddr('line1')} />
        <div className="flex gap-2">
          <input className="w-full border rounded p-2" placeholder="City" required value={address.city} onChange={setAddr('city')} />
          <input className="w-full border rounded p-2" placeholder="State" required value={address.state} onChange={setAddr('state')} />
        </div>
        <input className="w-full border rounded p-2" placeholder="Pincode" required value={address.pincode} onChange={setAddr('pincode')} />

        <div className="border-t pt-3 text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{cart.subtotal}</span></div>
          <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{applied.discount}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{total}</span></div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={paying} className="w-full bg-slate-900 text-white rounded p-2 disabled:opacity-50">
          {paying ? 'Processing...' : `Pay ₹${total} (test mode)`}
        </button>
        <p className="text-xs text-slate-400 text-center">No real money is charged.</p>
      </form>
    </div>
  );
}