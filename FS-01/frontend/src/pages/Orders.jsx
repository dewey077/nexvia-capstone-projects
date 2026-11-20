import { useEffect, useState } from 'react';
import api from '../api';

const badge = {
  placed: 'bg-blue-100 text-blue-700',
  packed: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/mine').then((r) => { setOrders(r.data); setLoading(false); });
  }, []);

  const downloadInvoice = async (id) => {
    const res = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="p-8">Loading orders...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">My orders</h1>
      {!orders.length && <p className="text-slate-500">No orders yet.</p>}
      {orders.map((o) => (
        <div key={o._id} className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Order #{o._id.slice(-6).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString()}</span>
            <span className={o.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}>Payment: {o.paymentStatus}</span>
          </div>
          <div className="mt-3 space-y-2">
            {o.items.map((i) => (
              <div key={i._id} className="flex items-center gap-3">
                <img src={i.image} alt="" className="w-12 h-12 rounded object-cover bg-slate-200" />
                <span className="flex-1">{i.name} × {i.qty}</span>
                <span className={`text-xs px-2 py-1 rounded ${badge[i.status]}`}>{i.status}</span>
                <span className="w-20 text-right">₹{i.price * i.qty}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t">
            <span className="font-bold">Total ₹{o.total}{o.coupon && <span className="text-xs text-green-600 ml-2">({o.coupon} applied)</span>}</span>
            {o.paymentStatus === 'paid' && (
              <button onClick={() => downloadInvoice(o._id)} className="text-sm bg-slate-900 text-white px-3 py-1 rounded">Download invoice</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}