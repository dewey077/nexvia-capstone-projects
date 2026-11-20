import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function ProductCard({ p }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');

  const addToCart = async () => {
    if (!user) return navigate('/login');
    if (user.role !== 'customer') return setMsg('Only customers can buy');
    try {
      await api.post('/cart', { productId: p._id, qty: 1 });
      setMsg('Added to cart');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not add');
    }
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden flex flex-col">
      <Link to={`/product/${p._id}`}>
        <img src={p.images?.[0]} alt={p.name} className="h-44 w-full object-cover bg-slate-200" />
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-slate-500">{p.category} · {p.vendor?.shopName}</p>
        <Link to={`/product/${p._id}`} className="font-semibold mt-1 hover:underline">{p.name}</Link>
        <p className="text-sm text-slate-500">{p.brand}</p>
        <p className="text-sm mt-1">
          {p.ratingCount ? `★ ${p.ratingAvg} (${p.ratingCount})` : 'No reviews yet'}
        </p>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-lg font-bold">₹{p.price}</span>
          <span className={`text-xs ${p.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
          </span>
        </div>
        <button
          onClick={addToCart}
          disabled={p.stock < 1}
          className="mt-3 bg-slate-900 text-white rounded p-2 text-sm disabled:opacity-40"
        >
          Add to cart
        </button>
        {msg && <p className="text-xs text-center mt-2 text-blue-600">{msg}</p>}
      </div>
    </div>
  );
}