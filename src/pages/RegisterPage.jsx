import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { authApi } from '../api/services'

function getErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data?.details && typeof data.details === 'object') {
    const entries = Object.entries(data.details)
    if (entries.length > 0) {
      return entries.map(([field, message]) => `${field}: ${message}`).join(', ')
    }
  }
  if (data?.error) return data.error
  if (data?.message) return data.message
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors[0]
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach server. Please check the deployed backend URL.'
  return fallback
}

function RegisterPage({ setUser }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase()
      }
      const { data } = await authApi.register(payload)
      setUser(data)
      localStorage.setItem('sessionToken', data.token)
      localStorage.setItem('sessionUser', JSON.stringify(data))
      window.dispatchEvent(new Event('auth:changed'))
      setMessage('Registered successfully.')
      if (data.role === 'ADMIN') navigate('/admin')
      if (data.role === 'TEACHER') navigate('/teacher')
      if (data.role === 'USER') navigate('/student')
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'))
    }
  }

  return (
    <section className="auth-template register-template">
      <aside className="auth-visual register-visual">
        <span className="auth-logo">WS</span>
        <h3>Create Your Space</h3>
        <p>Join as student, teacher, or admin and start managing sessions instantly.</p>
      </aside>

      <div className="card auth-card template-panel">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Set up your profile to access workshops.</p>
        <form onSubmit={onSubmit} className="grid-form auth-form">
          <input name="name" placeholder="Full Name" value={form.name} onChange={onChange} required />
          <input name="email" placeholder="Email" value={form.email} onChange={onChange} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={onChange} required />
          <select name="role" value={form.role} onChange={onChange}>
            <option value="USER">Student</option>
            <option value="TEACHER">Teacher</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit">Create Account</button>
        </form>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </section>
  )
}

export default RegisterPage
