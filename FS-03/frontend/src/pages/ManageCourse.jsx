import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

const blankQ = () => ({ text: '', options: ['', '', '', ''], correctIndex: 0 });

export default function ManageCourse() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [quizTitle, setQuizTitle] = useState('Course quiz');
  const [passMark, setPassMark] = useState(60);
  const [questions, setQuestions] = useState([blankQ()]);
  const [quizMsg, setQuizMsg] = useState('');

  const load = async () => setCourse((await api.get(`/courses/${id}`)).data.course);

  useEffect(() => {
    load();
    api.get(`/courses/${id}/quiz`).then((r) => {
      setQuizTitle(r.data.title);
      setPassMark(r.data.passMark);
      setQuestions(r.data.questions.map((q) => ({
        text: q.text,
        options: [...q.options, '', '', '', ''].slice(0, 4),
        correctIndex: q.correctIndex,
      })));
    }).catch(() => {});
  }, [id]);

  // refresh every 4 seconds while a video is being converted
  useEffect(() => {
    if (!course?.lessons.some((l) => l.videoStatus === 'processing')) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [course]);

  const togglePublish = async () => {
    await api.put(`/courses/${id}`, { published: !course.published });
    load();
  };

  const addLesson = async (e) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    await api.post(`/courses/${id}/lessons`, { title: lessonTitle });
    setLessonTitle('');
    load();
  };

  const upload = async (lessonId, file) => {
    if (!file) return;
    setError('');
    setUploading(lessonId);
    const fd = new FormData();
    fd.append('video', file);
    try {
      await api.post(`/courses/${id}/lessons/${lessonId}/video`, fd);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading('');
    }
  };

  const setQ = (i, patch) => setQuestions(questions.map((q, qi) => (qi === i ? { ...q, ...patch } : q)));
  const setOpt = (i, oi, val) => setQ(i, { options: questions[i].options.map((o, k) => (k === oi ? val : o)) });

  const saveQuiz = async () => {
    setQuizMsg('');
    for (const q of questions) {
      if (!q.text.trim() || q.options.some((o) => !o.trim())) return setQuizMsg('Fill the question text and all 4 options');
    }
    try {
      await api.put(`/courses/${id}/quiz`, { title: quizTitle, passMark: Number(passMark), questions });
      setQuizMsg('Quiz saved');
    } catch (err) {
      setQuizMsg(err.response?.data?.message || 'Could not save quiz');
    }
  };

  if (!course) return <p className="p-8">Loading...</p>;

  const badge = { none: 'No video', processing: 'Converting...', ready: 'Video ready', failed: 'Failed' };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link to="/instructor" className="text-sm text-blue-600">Back to dashboard</Link>
            <Link to={`/live/${id}`} className="inline-block ml-4 text-sm bg-red-600 text-white px-3 py-1 rounded">Go to live class</Link>

      <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-slate-500">{course.published ? 'Published: students can enroll' : 'Draft: only you can see it'}</p>
        </div>
        <button onClick={togglePublish} className={`px-4 py-2 rounded text-white ${course.published ? 'bg-yellow-600' : 'bg-green-600'}`}>
          {course.published ? 'Unpublish' : 'Publish'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-bold">Lessons</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {course.lessons.map((l, i) => (
          <div key={l._id} className="flex items-center gap-3 border-b pb-2 text-sm">
            <span className="flex-1">{i + 1}. {l.title}</span>
            <span className={`text-xs px-2 py-1 rounded ${l.videoStatus === 'ready' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>{badge[l.videoStatus]}</span>
            <label className="text-xs bg-indigo-900 text-white px-3 py-1 rounded cursor-pointer">
              {uploading === l._id ? 'Uploading...' : 'Upload video'}
              <input type="file" accept="video/*" className="hidden" disabled={!!uploading}
                onChange={(e) => { upload(l._id, e.target.files[0]); e.target.value = ''; }} />
            </label>
          </div>
        ))}
        <form onSubmit={addLesson} className="flex gap-2">
          <input className="border rounded p-2 flex-1" placeholder="New lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
          <button className="bg-indigo-900 text-white rounded px-4">Add lesson</button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <h2 className="font-bold">Quiz</h2>
        <div className="flex gap-2">
          <input className="border rounded p-2 flex-1" placeholder="Quiz title" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
          <input className="border rounded p-2 w-32" type="number" min="1" max="100" title="Pass mark %" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
        </div>
        {questions.map((q, i) => (
          <div key={i} className="border rounded p-3 space-y-2 bg-slate-50">
            <input className="w-full border rounded p-2" placeholder={`Question ${i + 1}`} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
            {q.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" name={`correct${i}`} checked={q.correctIndex === oi} onChange={() => setQ(i, { correctIndex: oi })} title="Correct answer" />
                <input className="border rounded p-1 flex-1 text-sm" placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => setOpt(i, oi, e.target.value)} />
              </div>
            ))}
            <p className="text-xs text-slate-500">Select the radio button next to the correct option.</p>
            {questions.length > 1 && (
              <button onClick={() => setQuestions(questions.filter((_, qi) => qi !== i))} className="text-xs text-red-600">Remove question</button>
            )}
          </div>
        ))}
        <div className="flex gap-2 items-center">
          <button onClick={() => setQuestions([...questions, blankQ()])} className="text-sm bg-slate-200 rounded px-3 py-1">Add question</button>
          <button onClick={saveQuiz} className="text-sm bg-indigo-900 text-white rounded px-4 py-1">Save quiz</button>
          {quizMsg && <span className="text-sm text-blue-600">{quizMsg}</span>}
        </div>
      </div>
    </div>
  );
}