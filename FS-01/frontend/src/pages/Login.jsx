import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const u = await login(form.email, form.password);
      navigate(u.role === 'admin' ? '/admin' : u.role === 'vendor' ? '/vendor' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-16 bg-white p-6 rounded-xl shadow space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input className="w-full border rounded p-2" type="email" placeholder="Email" required
        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="w-full border rounded p-2" type="password" placeholder="Password" required
        value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <button className="w-full bg-slate-900 text-white rounded p-2">Login</button>
      <p className="text-sm">No account? <Link className="text-blue-600" to="/register">Register</Link></p>
    </form>
  );
}