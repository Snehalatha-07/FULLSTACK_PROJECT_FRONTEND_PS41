import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import ToastContainer from './components/ToastContainer'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/AdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'

function getStoredUser() {
  try {
    const saved = localStorage.getItem('sessionUser')
    return saved ? JSON.parse(saved) : null
  } catch {
    localStorage.removeItem('sessionUser')
    localStorage.removeItem('sessionToken')
    return null
  }
}

function ProtectedRoute({ user, role, children }) {
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (role && user.role !== role) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const [user, setUser] = useState(() => getStoredUser())

  useEffect(() => {
    const syncAuthState = () => setUser(getStoredUser())

    window.addEventListener('auth:changed', syncAuthState)
    window.addEventListener('storage', syncAuthState)

    return () => {
      window.removeEventListener('auth:changed', syncAuthState)
      window.removeEventListener('storage', syncAuthState)
    }
  }, [])

  return (
    <div className="app-shell">
      <Navbar user={user} setUser={setUser} />
      <ToastContainer />
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="/register" element={<RegisterPage setUser={setUser} />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} role="ADMIN">
                <AdminDashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute user={user} role="TEACHER">
                <TeacherDashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute user={user} role="USER">
                <StudentDashboard user={user} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
