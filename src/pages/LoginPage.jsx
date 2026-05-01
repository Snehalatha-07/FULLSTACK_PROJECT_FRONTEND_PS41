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

function LoginPage({ setUser }) {
  const [form, setForm] = useState({ email: '', password: '', role: 'USER' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password
      }
      const { data } = await authApi.login(payload)

      if (form.role && data.role !== form.role) {
        setError(`Selected role ${form.role} does not match this account role (${data.role}).`)
        return
      }

      setUser(data)
      localStorage.setItem('sessionToken', data.token)
      localStorage.setItem('sessionUser', JSON.stringify(data))
      if (data.role === 'ADMIN') navigate('/admin')
      if (data.role === 'TEACHER') navigate('/teacher')
      if (data.role === 'USER') navigate('/student')
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'))
    }
  }

  return (
    <section className="auth-template login-template">
      <div className="login-scene">
        <span className="login-deco login-deco-left" aria-hidden="true" />
        <span className="login-deco login-deco-right" aria-hidden="true" />
        <span className="login-deco login-deco-bottom" aria-hidden="true" />

        <div className="login-glass">
          <p className="login-brand">Your logo</p>
          <h2>Login</h2>
          <form onSubmit={onSubmit} className="grid-form auth-form login-form">
            <input name="email" placeholder="Email" value={form.email} onChange={onChange} required />
            <input name="password" type="password" placeholder="Password" value={form.password} onChange={onChange} required />
            <select name="role" value={form.role} onChange={onChange}>
              <option value="USER">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="button" className="auth-link-btn">Forgot Password?</button>
            <button type="submit">Sign In</button>
          </form>

          {error && <p className="error">{error}</p>}

          <p className="auth-switch">Don&apos;t have an account? <Link to="/register">Sign Up</Link></p>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
