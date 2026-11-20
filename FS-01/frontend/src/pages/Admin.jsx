import { useEffect, useState } from 'react';
import api from '../api';

const emptyCoupon = { code: '', type: 'percent', value: '', minOrder: '', maxUses: '' };

export default function Admin() {
  const [tab, setTab] = useState('analytics');
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyCoupon);
  const [error, setError] = useState('');

  const loadStats = async () => setStats((await api.get('/admin/analytics')).data);
  const loadVendors = async () => setVendors((await api.get('/admin/vendors')).data);
  const loadCoupons = async () => setCoupons((await api.get('/admin/coupons')).data);

  useEffect(() => { loadStats(); loadVendors(); loadCoupons(); }, []);

  const setStatus = async (id, status) => {
    await api.patch(`/admin/vendors/${id}`, { status });
    loadVendors();
  };

  const addCoupon = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/coupons', {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder || 0),
        maxUses: Number(form.maxUses || 0),
      });
      setForm(emptyCoupon);
      loadCoupons();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create coupon');
    }
  };

  const delCoupon = async (id) => {
    await api.delete(`/admin/coupons/${id}`);
    loadCoupons();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const maxDay = stats ? Math.max(1, ...stats.byDay.map((d) => d.revenue)) : 1;

  const statusColor = { approved: 'text-green-600', pending: 'text-yellow-600', rejected: 'text-red-600' };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Admin panel</h1>

      <div className="flex gap-2 mt-4">
        {['analytics', 'vendors', 'coupons'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded capitalize ${tab === t ? 'bg-slate-900 text-white' : 'bg-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'analytics' && stats && (
        <div className="mt-4 space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[
              ['Revenue', `₹${stats.revenue}`],
              ['Commission', `₹${stats.commission}`],
              ['Paid orders', stats.orders],
              ['Customers', stats.users],
              ['Vendors', stats.vendors],
              ['Products', stats.products],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-3">Revenue by day</h2>
            {!stats.byDay.length && <p className="text-slate-500 text-sm">No paid orders yet.</p>}
            <div className="flex items-end gap-3 h-40">
              {stats.byDay.map((d) => (
                <div key={d._id} className="flex flex-col items-center flex-1">
                  <span className="text-xs">₹{d.revenue}</span>
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(d.revenue / maxDay) * 100}px` }} />
                  <span className="text-[10px] text-slate-500 mt-1">{d._id.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold mb-2">Orders by status</h2>
              {stats.byStatus.map((s) => (
                <div key={s._id} className="flex justify-between text-sm py-1"><span className="capitalize">{s._id}</span><span>{s.count}</span></div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold mb-2">Top products</h2>
              {stats.topProducts.map((p) => (
                <div key={p._id} className="flex justify-between text-sm py-1"><span>{p._id}</span><span>₹{p.revenue}</span></div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold mb-2">Top vendors</h2>
              {stats.topVendors.map((v) => (
                <div key={v._id} className="flex justify-between text-sm py-1"><span>{v.shop}</span><span>₹{v.gross}</span></div>
              ))}
            </div>
          </div>
          <button onClick={loadStats} className="text-sm underline">Refresh</button>
        </div>
      )}

      {tab === 'vendors' && (
        <div className="mt-4 space-y-3">
          {vendors.map((v) => (
            <div key={v._id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold">{v.shopName}</p>
                <p className="text-sm text-slate-500">{v.name} · {v.email}</p>
              </div>
              <span className={`text-sm capitalize ${statusColor[v.vendorStatus]}`}>{v.vendorStatus}</span>
              <button onClick={() => setStatus(v._id, 'approved')} disabled={v.vendorStatus === 'approved'}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded disabled:opacity-30">Approve</button>
              <button onClick={() => setStatus(v._id, 'rejected')} disabled={v.vendorStatus === 'rejected'}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded disabled:opacity-30">Reject</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'coupons' && (
        <div className="grid gap-6 md:grid-cols-3 mt-4">
          <form onSubmit={addCoupon} className="bg-white rounded-xl shadow p-4 space-y-3 h-fit">
            <h2 className="font-bold">New coupon</h2>
            <input className="w-full border rounded p-2 uppercase" placeholder="Code (e.g. DIWALI15)" required value={form.code} onChange={set('code')} />
            <select className="w-full border rounded p-2" value={form.type} onChange={set('type')}>
              <option value="percent">Percent off</option>
              <option value="flat">Flat ₹ off</option>
            </select>
            <input className="w-full border rounded p-2" type="number" min="0" placeholder="Value" required value={form.value} onChange={set('value')} />
            <input className="w-full border rounded p-2" type="number" min="0" placeholder="Minimum order ₹ (optional)" value={form.minOrder} onChange={set('minOrder')} />
            <input className="w-full border rounded p-2" type="number" min="0" placeholder="Max uses (optional)" value={form.maxUses} onChange={set('maxUses')} />
            <button className="w-full bg-slate-900 text-white rounded p-2">Create coupon</button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </form>

          <div className="md:col-span-2 space-y-3">
            {coupons.map((c) => (
              <div key={c._id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{c.code}</p>
                  <p className="text-sm text-slate-500">
                    {c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`} · min ₹{c.minOrder} · used {c.used}{c.maxUses ? `/${c.maxUses}` : ''}
                  </p>
                </div>
                <button onClick={() => delCoupon(c._id)} className="text-red-600 text-sm">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}