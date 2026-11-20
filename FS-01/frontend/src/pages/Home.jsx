import { useEffect, useState } from 'react';
import api from '../api';
import ProductCard from '../components/ProductCard';

const LIMIT = 8;

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', category: '', minPrice: '', maxPrice: '', sort: 'newest' });

  useEffect(() => {
    api.get('/products/categories').then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = { page, limit: LIMIT };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      try {
        const { data } = await api.get('/products', { params });
        setProducts(data.products);
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, page]);

  const change = (k) => (e) => {
    setPage(1);
    setFilters({ ...filters, [k]: e.target.value });
  };
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white p-4 rounded-xl shadow grid gap-3 md:grid-cols-5">
        <input className="border rounded p-2 md:col-span-2" placeholder="Search products..." value={filters.q} onChange={change('q')} />
        <select className="border rounded p-2" value={filters.category} onChange={change('category')}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="border rounded p-2" value={filters.sort} onChange={change('sort')}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
        <div className="flex gap-2">
          <input className="border rounded p-2 w-full" type="number" placeholder="Min ₹" value={filters.minPrice} onChange={change('minPrice')} />
          <input className="border rounded p-2 w-full" type="number" placeholder="Max ₹" value={filters.maxPrice} onChange={change('maxPrice')} />
        </div>
      </div>

      <p className="text-sm text-slate-500 mt-4">{loading ? 'Loading...' : `${total} products found`}</p>

      <div className="grid gap-5 mt-3 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p._id} p={p} />)}
      </div>

      {!loading && products.length === 0 && <p className="text-center text-slate-500 mt-10">No products match your search.</p>}

      <div className="flex justify-center items-center gap-4 mt-8">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white rounded shadow disabled:opacity-40">Prev</button>
        <span className="text-sm">Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white rounded shadow disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}