import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const empty = { title: '', description: '', category: '', price: '' };

export default function Instructor() {
  const [tab, setTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const loadCourses = async () => setCourses((await api.get('/courses/mine')).data);
  const loadRevenue = async () => setRevenue((await api.get('/instructor/revenue')).data);

  useEffect(() => { loadCourses(); loadRevenue(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/courses', { ...form, price: Number(form.price || 0) });
      setForm(empty);
      loadCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create course');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Instructor dashboard</h1>
        {revenue && (
          <div className="bg-white rounded-xl shadow px-4 py-2 text-sm">
            Earnings: <span className="font-bold text-green-600">₹{revenue.totals.earnings}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        {['courses', 'revenue'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded capitalize ${tab === t ? 'bg-indigo-900 text-white' : 'bg-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'courses' && (
        <div className="grid gap-6 md:grid-cols-3 mt-4">
          <form onSubmit={create} className="bg-white rounded-xl shadow p-4 space-y-3 h-fit">
            <h2 className="font-bold">New course</h2>
            <input className="w-full border rounded p-2" placeholder="Title" required value={form.title} onChange={set('title')} />
            <input className="w-full border rounded p-2" placeholder="Category (e.g. Programming)" value={form.category} onChange={set('category')} />
            <input className="w-full border rounded p-2" type="number" min="0" placeholder="Price ₹ (0 = free)" value={form.price} onChange={set('price')} />
            <textarea className="w-full border rounded p-2" rows="3" placeholder="Description" value={form.description} onChange={set('description')} />
            <button className="w-full bg-indigo-900 text-white rounded p-2">Create course</button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </form>

          <div className="md:col-span-2 space-y-3">
            {!courses.length && <p className="text-slate-500">You have no courses yet.</p>}
            {courses.map((c) => (
              <div key={c._id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.category} · {c.lessons.length} lessons · {c.price > 0 ? `₹${c.price}` : 'Free'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${c.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {c.published ? 'Published' : 'Draft'}
                </span>
                <Link to={`/instructor/course/${c._id}`} className="text-sm bg-indigo-900 text-white px-3 py-1 rounded">Manage</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'revenue' && revenue && (
        <div className="mt-4 space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[
              ['Students', revenue.totals.students],
              ['Gross sales', `₹${revenue.totals.gross}`],
              [`Platform fee (${revenue.feePercent}%)`, `₹${revenue.totals.platformFee}`],
              ['Your earnings', `₹${revenue.totals.earnings}`],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-xl font-bold mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-2">By course</h2>
            {revenue.byCourse.map((c) => (
              <div key={c.courseId} className="flex justify-between text-sm py-1 border-b">
                <span>{c.title} ({c.students} students)</span>
                <span>₹{c.earnings}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-2">Recent enrollments</h2>
            {!revenue.recent.length && <p className="text-sm text-slate-500">No sales yet.</p>}
            {revenue.recent.map((r, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b">
                <span>{r.student}</span>
                <span>₹{r.paid} · {new Date(r.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}