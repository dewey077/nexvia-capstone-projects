import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer', shopName: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const u = await register(form);
      navigate(u.role === 'vendor' ? '/vendor' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-16 bg-white p-6 rounded-xl shadow space-y-4">
      <h1 className="text-2xl font-bold">Register</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <select className="w-full border rounded p-2" value={form.role} onChange={set('role')}>
        <option value="customer">I want to buy (Customer)</option>
        <option value="vendor">I want to sell (Vendor)</option>
      </select>
      <input className="w-full border rounded p-2" placeholder="Full name" required value={form.name} onChange={set('name')} />
      {form.role === 'vendor' && (
        <input className="w-full border rounded p-2" placeholder="Shop name" required value={form.shopName} onChange={set('shopName')} />
      )}
      <input className="w-full border rounded p-2" type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
      <input className="w-full border rounded p-2" type="password" placeholder="Password (min 6)" required minLength={6} value={form.password} onChange={set('password')} />
      <button className="w-full bg-slate-900 text-white rounded p-2">Create account</button>
      <p className="text-sm">Have an account? <Link className="text-blue-600" to="/login">Login</Link></p>
    </form>
  );
}