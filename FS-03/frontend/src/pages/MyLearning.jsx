import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function MyLearning() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses/enrolled').then((r) => { setList(r.data); setLoading(false); });
  }, []);

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">My learning</h1>
      {!list.length && <p className="text-slate-500">You have not enrolled in any course yet.</p>}
      {list.map((e) => (
        <Link key={e._id} to={`/learn/${e.course._id}`} className="block bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">{e.course.title}</p>
              <p className="text-sm text-slate-500">by {e.course.instructor?.name}</p>
            </div>
            <span className={`text-sm font-semibold ${e.completed ? 'text-green-600' : 'text-indigo-600'}`}>
              {e.completed ? 'Completed' : `${e.progress}%`}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded h-2 mt-3">
            <div className="bg-green-500 h-2 rounded" style={{ width: `${e.progress}%` }} />
          </div>
        </Link>
      ))}
    </div>
  );
}