import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-indigo-900 text-white px-6 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg">LearnHub</Link>
      <div className="flex items-center gap-5 text-sm">
        <Link to="/">Courses</Link>
        {user?.role === 'student' && <Link to="/my-learning">My Learning</Link>}
        {user?.role === 'instructor' && <Link to="/instructor">Instructor</Link>}
        {user ? (
          <>
            <span className="text-indigo-200">{user.name} ({user.role})</span>
            <button onClick={() => { logout(); navigate('/login'); }} className="bg-red-500 px-3 py-1 rounded">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="bg-blue-500 px-3 py-1 rounded">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}