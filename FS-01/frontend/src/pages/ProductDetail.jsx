import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setProduct((await api.get(`/products/${id}`)).data);
    setReviews((await api.get(`/products/${id}/reviews`)).data);
  };
  useEffect(() => { load(); }, [id]);

  const addToCart = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/cart', { productId: id, qty: 1 });
      setMsg('Added to cart');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not add');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/products/${id}/reviews`, { rating, comment });
      setComment('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save review');
    }
  };

  if (!product) return <p className="p-8">Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow p-6 grid gap-6 md:grid-cols-2">
        <img src={product.images?.[0]} alt={product.name} className="w-full h-72 object-cover rounded bg-slate-200" />
        <div>
          <p className="text-sm text-slate-500">{product.category} · {product.vendor?.shopName}</p>
          <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
          <p className="text-slate-500">{product.brand}</p>
          <p className="mt-2">{product.ratingCount ? `★ ${product.ratingAvg} (${product.ratingCount} reviews)` : 'No reviews yet'}</p>
          <p className="mt-3 text-slate-700">{product.description}</p>
          <p className="text-3xl font-bold mt-4">₹{product.price}</p>
          <p className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </p>
          {user?.role !== 'vendor' && user?.role !== 'admin' && (
            <button onClick={addToCart} disabled={product.stock < 1} className="mt-4 bg-slate-900 text-white rounded px-6 py-2 disabled:opacity-40">
              Add to cart
            </button>
          )}
          {msg && <p className="text-sm text-blue-600 mt-2">{msg}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mt-6">
        <h2 className="font-bold text-lg">Reviews</h2>

        {user?.role === 'customer' && (
          <form onSubmit={submitReview} className="mt-3 space-y-2 border-b pb-4">
            <div className="flex gap-2 items-center">
              <label className="text-sm">Your rating</label>
              <select className="border rounded p-1" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
            <textarea className="w-full border rounded p-2" rows="2" placeholder="Write a review (only verified buyers)"
              value={comment} onChange={(e) => setComment(e.target.value)} />
            <button className="bg-slate-900 text-white rounded px-4 py-1 text-sm">Submit review</button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </form>
        )}

        {!reviews.length && <p className="text-slate-500 mt-3">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r._id} className="mt-3 border-b pb-3">
            <p className="text-sm font-semibold">{r.user?.name} <span className="text-yellow-600">{'★'.repeat(r.rating)}</span></p>
            <p className="text-sm text-slate-700">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}