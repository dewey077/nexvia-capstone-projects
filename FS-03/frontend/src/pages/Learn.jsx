import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import VideoPlayer from '../components/VideoPlayer';

const blobError = async (err) => {
  try { return JSON.parse(await err.response.data.text()).message; } catch { return 'Could not download'; }
};

export default function Learn() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [active, setActive] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => setData((await api.get(`/courses/${id}`)).data);

  useEffect(() => {
    load();
    api.get(`/courses/${id}/quiz`)
      .then((r) => { setQuiz(r.data); setAnswers(new Array(r.data.questions.length).fill(-1)); })
      .catch(() => setQuiz(null));
  }, [id]);

  const markComplete = async (lessonId) => {
    await api.post(`/courses/${id}/lessons/${lessonId}/complete`);
    load();
  };

  const submitQuiz = async () => {
    setMsg('');
    if (answers.includes(-1)) return setMsg('Answer every question first');
    try {
      setResult((await api.post(`/courses/${id}/quiz/submit`, { answers })).data);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not submit');
    }
  };

  const downloadCertificate = async () => {
    setMsg('');
    try {
      const res = await api.get(`/courses/${id}/certificate`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'certificate.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMsg(await blobError(err));
    }
  };

  if (!data) return <p className="p-8">Loading...</p>;
  const { course, enrollment, canWatch } = data;
  if (!canWatch)
    return <p className="p-8">You are not enrolled yet. <Link className="text-blue-600" to={`/course/${id}`}>Go to the course page</Link></p>;

  const lesson = course.lessons[active];
  const done = (lid) => enrollment?.completedLessons?.includes(lid);

  return (
    <div className="max-w-6xl mx-auto p-6 grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold">{course.title}</h1>

        {lesson ? (
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <h2 className="font-semibold">{active + 1}. {lesson.title}</h2>
            {lesson.videoStatus === 'ready' && lesson.videoUrl ? (
              <VideoPlayer key={lesson._id} src={lesson.videoUrl} />
            ) : (
              <div className="aspect-video rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                {lesson.videoStatus === 'processing' ? 'Video is being processed...' : 'No video for this lesson yet'}
              </div>
            )}
            {done(lesson._id)
              ? <p className="text-green-600 text-sm font-semibold">Lesson completed</p>
              : <button onClick={() => markComplete(lesson._id)} className="bg-indigo-900 text-white rounded px-4 py-2 text-sm">Mark as complete</button>}
          </div>
        ) : <p className="text-slate-500">This course has no lessons yet.</p>}

        {quiz && (
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <h2 className="font-bold">{quiz.title} (pass mark {quiz.passMark}%)</h2>
            {quiz.questions.map((q, qi) => (
              <div key={q._id}>
                <p className="font-medium text-sm">{qi + 1}. {q.text}</p>
                {q.options.map((o, oi) => (
                  <label key={oi} className="flex items-center gap-2 text-sm mt-1">
                    <input type="radio" name={`q${qi}`} checked={answers[qi] === oi}
                      onChange={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))} />
                    {o}
                  </label>
                ))}
              </div>
            ))}
            <button onClick={submitQuiz} className="bg-indigo-900 text-white rounded px-4 py-2 text-sm">Submit quiz</button>
            {result && (
              <p className={`text-sm font-semibold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                Score {result.score}% ({result.correct}/{result.total}) - {result.passed ? 'Passed' : 'Not passed, try again'}
              </p>
            )}
          </div>
        )}
      </div>
      
            <div className="space-y-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">{enrollment?.progress}% complete</p>
          <div className="w-full bg-slate-200 rounded h-2 mt-1">
            <div className="bg-green-500 h-2 rounded" style={{ width: `${enrollment?.progress || 0}%` }} />
          </div>
          <button onClick={downloadCertificate} className="mt-4 w-full bg-green-600 text-white rounded p-2 text-sm">Download certificate</button>
          <p className="text-xs text-slate-400 mt-1">Available after all lessons are done and the quiz is passed.</p>
          {msg && <p className="text-red-600 text-sm mt-2">{msg}</p>}
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-2">Lessons</h2>
          {course.lessons.map((l, i) => (
            <button key={l._id} onClick={() => setActive(i)}
              className={`w-full text-left text-sm p-2 rounded flex justify-between ${i === active ? 'bg-indigo-50 font-semibold' : ''}`}>
              <span>{i + 1}. {l.title}</span>
              <span className={done(l._id) ? 'text-green-600' : 'text-slate-400'}>{done(l._id) ? 'Done' : ''}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-1">Live classes</h2>
          <p className="text-xs text-slate-500 mb-3">Join your instructor live and chat with the class.</p>
          <Link to={`/live/${id}`} className="block text-center w-full bg-red-600 text-white rounded p-2 text-sm">Join live class</Link>
        </div>
      </div>
    </div>
  );
}ccd 
      