import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import CourseDetail from './pages/CourseDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import MyLearning from './pages/MyLearning';
import Learn from './pages/Learn';
import Instructor from './pages/Instructor';
import ManageCourse from './pages/ManageCourse';
import LiveClass from './pages/LiveClass';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my-learning" element={<ProtectedRoute roles={['student']}><MyLearning /></ProtectedRoute>} />
        <Route path="/learn/:id" element={<ProtectedRoute roles={['student']}><Learn /></ProtectedRoute>} />
        <Route path="/instructor" element={<ProtectedRoute roles={['instructor']}><Instructor /></ProtectedRoute>} />
        <Route path="/instructor/course/:id" element={<ProtectedRoute roles={['instructor']}><ManageCourse /></ProtectedRoute>} />
        <Route path="/live/:id" element={<ProtectedRoute roles={['student', 'instructor']}><LiveClass /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}