import { Link } from 'react-router-dom';

export default function CourseCard({ c }) {
  return (
    <Link to={`/course/${c._id}`} className="bg-white rounded-xl shadow overflow-hidden flex flex-col hover:shadow-lg transition">
      <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center text-5xl font-bold text-white">
        {c.title.charAt(0).toUpperCase()}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-indigo-600 font-semibold">{c.category}</p>
        <h3 className="font-semibold mt-1">{c.title}</h3>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{c.description}</p>
        <p className="text-xs text-slate-500 mt-2">by {c.instructor?.name} · {c.lessons?.length || 0} lessons</p>
        <p className="mt-auto pt-3 text-lg font-bold">{c.price > 0 ? `₹${c.price}` : 'Free'}</p>
      </div>
    </Link>
  );
}