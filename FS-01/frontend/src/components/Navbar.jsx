import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg">MarketHub</Link>
      <div className="flex items-center gap-5 text-sm">
        <Link to="/">Products</Link>
        {user?.role === 'customer' && <><Link to="/cart">Cart</Link><Link to="/orders">My Orders</Link></>}
        {user?.role === 'vendor' && <Link to="/vendor">Vendor Panel</Link>}
        {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        {user ? (
          <>
            <span className="text-slate-300">{user.name} ({user.role})</span>
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