import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [showPay, setShowPay] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setData((await api.get(`/courses/${id}`)).data);
    } catch {
      setError('Course not found');
    }
  };
  useEffect(() => { load(); }, [id]);

  const startEnroll = () => {
    setError('');
    if (!user) return navigate('/login');
    if (user.role !== 'student') return setError('Only students can enroll');
    setShowPay(true);
  };

  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      await api.post(`/courses/${id}/enroll`);
      setShowPay(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Enrollment failed');
    } finally {
      setPaying(false);
    }
  };

  if (!data) return <p className="p-8">{error || 'Loading...'}</p>;
  const { course, enrollment, canWatch } = data;
  const isOwner = user?.role === 'instructor' && canWatch && !enrollment;

  return (
    <div className="max-w-4xl mx-auto p-6 grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-xs text-indigo-600 font-semibold">{course.category}</p>
          <h1 className="text-2xl font-bold mt-1">{course.title}</h1>
          <p className="text-slate-600 mt-2">{course.description}</p>
          <p className="text-sm text-slate-500 mt-3">Instructor: {course.instructor?.name}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-bold">Lessons ({course.lessons.length})</h2>
          {!course.lessons.length && <p className="text-slate-500 text-sm mt-2">No lessons yet.</p>}
          {course.lessons.map((l, i) => (
            <div key={l._id} className="flex items-center justify-between border-b py-2 text-sm">
              <span>{i + 1}. {l.title}</span>
              <span className="text-slate-500">
                {canWatch ? (enrollment?.completedLessons?.includes(l._id) ? 'Completed' : l.videoStatus === 'ready' ? 'Video ready' : 'No video yet') : 'Locked'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 h-fit space-y-3">
        <p className="text-3xl font-bold">{course.price > 0 ? `₹${course.price}` : 'Free'}</p>

        {enrollment ? (
          <>
            <p className="text-green-600 font-semibold">You are enrolled</p>
            <div className="w-full bg-slate-200 rounded h-2">
              <div className="bg-green-500 h-2 rounded" style={{ width: `${enrollment.progress}%` }} />
            </div>
            <p className="text-sm text-slate-500">{enrollment.progress}% complete</p>
                        <button onClick={() => navigate(`/learn/${id}`)} className="w-full bg-indigo-900 text-white rounded p-2">Continue learning</button>
          </>
        ) : isOwner ? (
          <p className="text-sm text-slate-500">This is your course.</p>
        ) : !showPay ? (
          <button onClick={startEnroll} className="w-full bg-indigo-900 text-white rounded p-2">Enroll now</button>
        ) : (
          <div className="border rounded p-3 space-y-2 bg-slate-50">
            <p className="font-semibold text-sm">Checkout (test mode)</p>
            <div className="flex justify-between text-sm"><span>{course.title}</span><span>₹{course.price}</span></div>
            <button onClick={pay} disabled={paying} className="w-full bg-green-600 text-white rounded p-2 disabled:opacity-50">
              {paying ? 'Processing...' : `Pay ₹${course.price}`}
            </button>
            <button onClick={() => setShowPay(false)} className="w-full text-sm text-slate-500">Cancel</button>
            <p className="text-xs text-slate-400 text-center">No real money is charged.</p>
          </div>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}