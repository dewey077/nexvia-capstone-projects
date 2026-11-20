import { useEffect, useState } from 'react';
import api from '../api';

const NEXT = { placed: 'packed', packed: 'shipped', shipped: 'delivered' };
const emptyForm = { name: '', category: '', brand: '', price: '', stock: '', description: '' };

export default function Vendor() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadProducts = async () => setProducts((await api.get('/products/mine')).data);
  const loadOrders = async () => {
    const { data } = await api.get('/orders/vendor');
    setOrders(data.orders);
    setEarnings(data.earnings);
  };

  useEffect(() => { loadProducts(); loadOrders(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const addProduct = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    Array.from(files).forEach((f) => fd.append('images', f));
    try {
      await api.post('/products', fd);
      setMsg('Product added');
      setForm(emptyForm);
      setFiles([]);
      e.target.reset();
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add product');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  };

  const advance = async (orderId, item) => {
    try {
      await api.patch(`/orders/${orderId}/items/${item._id}/status`, { status: NEXT[item.status] });
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendor panel</h1>
        <div className="bg-white rounded-xl shadow px-4 py-2 text-sm">
          Total earnings: <span className="font-bold text-green-600">₹{earnings}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {['products', 'orders'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded capitalize ${tab === t ? 'bg-slate-900 text-white' : 'bg-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      {tab === 'products' && (
        <div className="grid gap-6 md:grid-cols-3 mt-4">
          <form onSubmit={addProduct} className="bg-white rounded-xl shadow p-4 space-y-3 h-fit">
            <h2 className="font-bold">Add product</h2>
            <input className="w-full border rounded p-2" placeholder="Name" required value={form.name} onChange={set('name')} />
            <input className="w-full border rounded p-2" placeholder="Category (e.g. Electronics)" required value={form.category} onChange={set('category')} />
            <input className="w-full border rounded p-2" placeholder="Brand" value={form.brand} onChange={set('brand')} />
            <div className="flex gap-2">
              <input className="w-full border rounded p-2" type="number" min="0" placeholder="Price ₹" required value={form.price} onChange={set('price')} />
              <input className="w-full border rounded p-2" type="number" min="0" placeholder="Stock" required value={form.stock} onChange={set('stock')} />
            </div>
            <textarea className="w-full border rounded p-2" rows="3" placeholder="Description" value={form.description} onChange={set('description')} />
            <input type="file" accept="image/*" multiple className="text-sm" onChange={(e) => setFiles(e.target.files)} />
            <button className="w-full bg-slate-900 text-white rounded p-2">Add product</button>
            {msg && <p className="text-green-600 text-sm">{msg}</p>}
          </form>

          <div className="md:col-span-2 space-y-3">
            {!products.length && <p className="text-slate-500">You have no products yet.</p>}
            {products.map((p) => (
              <div key={p._id} className="bg-white rounded-xl shadow p-3 flex items-center gap-3">
                <img src={p.images?.[0]} alt="" className="w-16 h-16 rounded object-cover bg-slate-200" />
                <div className="flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.category} · stock {p.stock}</p>
                </div>
                <span className="font-semibold">₹{p.price}</span>
                <button onClick={() => remove(p._id)} className="text-red-600 text-sm">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="mt-4 space-y-4">
          {!orders.length && <p className="text-slate-500">No paid orders yet.</p>}
          {orders.map((o) => (
            <div key={o._id} className="bg-white rounded-xl shadow p-4">
              <p className="text-sm text-slate-500">
                Order #{o._id.slice(-6).toUpperCase()} · {o.customer?.name} · {o.address?.city}
              </p>
              {o.items.map((i) => (
                <div key={i._id} className="flex items-center gap-3 mt-2">
                  <span className="flex-1">{i.name} × {i.qty}</span>
                  <span className="text-sm text-green-600">You earn ₹{i.payout}</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">{i.status}</span>
                  {NEXT[i.status] ? (
                    <button onClick={() => advance(o._id, i)} className="text-sm bg-slate-900 text-white px-3 py-1 rounded">
                      Mark {NEXT[i.status]}
                    </button>
                  ) : (
                    <span className="text-xs text-green-600 w-24 text-center">Done</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}