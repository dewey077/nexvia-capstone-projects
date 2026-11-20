import { useEffect, useState } from 'react';
import api from '../api';
import CourseCard from '../components/CourseCard';

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses').then((r) => setCategories([...new Set(r.data.map((c) => c.category))]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = {};
      if (q) params.q = q;
      if (category) params.category = category;
      try {
        setCourses((await api.get('/courses', { params })).data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, category]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white p-4 rounded-xl shadow flex flex-col gap-3 md:flex-row">
        <input className="border rounded p-2 flex-1" placeholder="Search courses..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="border rounded p-2" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <p className="text-sm text-slate-500 mt-4">{loading ? 'Loading...' : `${courses.length} courses found`}</p>

      <div className="grid gap-5 mt-3 sm:grid-cols-2 lg:grid-cols-4">
        {courses.map((c) => <CourseCard key={c._id} c={c} />)}
      </div>

      {!loading && courses.length === 0 && <p className="text-center text-slate-500 mt-10">No courses found.</p>}
    </div>
  );
}