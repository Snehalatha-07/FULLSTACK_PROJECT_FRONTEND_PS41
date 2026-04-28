import { Link, useNavigate } from 'react-router-dom'

function Navbar({ user, setUser }) {
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('sessionUser')
    setUser(null)
    navigate('/login')
  }

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-badge"></span>
        <h1>Workshop Platform</h1>
      </div>
      <nav>
        {!user && <Link className="nav-link" to="/login">Login</Link>}
        {!user && <Link className="nav-link" to="/register">Register</Link>}
        {user?.role === 'ADMIN' && <Link className="nav-link" to="/admin">Admin</Link>}
        {user?.role === 'TEACHER' && <Link className="nav-link" to="/teacher">Teacher</Link>}
        {user?.role === 'USER' && <Link className="nav-link" to="/student">Student</Link>}
        {user && <span className="role-pill">{user.role}</span>}
        {user && <button onClick={logout}>Logout</button>}
      </nav>
    </header>
  )
}

export default Navbar
