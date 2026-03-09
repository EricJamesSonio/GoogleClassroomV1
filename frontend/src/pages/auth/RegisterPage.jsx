import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register } from '../../api/auth'
import useAuthStore from '../../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (res) => {
      setAuth(res.data.access_token, res.data.user)
      navigate('/dashboard')
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Registration failed')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>🎓</div>
          <span style={styles.logoText}>ClassRoom</span>
        </div>

        <h1 style={styles.heading}>Create account</h1>
        <p style={styles.sub}>Join your classroom today</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="Juan Dela Cruz"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>I am a...</label>
            <div style={styles.roleRow}>
              {['student', 'educator'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  style={{
                    ...styles.roleBtn,
                    ...(form.role === r ? styles.roleBtnActive : {}),
                  }}
                >
                  {r === 'student' ? '🎒 Student' : '📚 Educator'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            style={{
              ...styles.btn,
              opacity: mutation.isPending ? 0.7 : 1,
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Georgia', serif",
    padding: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
  },
  logoIcon: { fontSize: '28px' },
  logoText: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '0.5px',
  },
  heading: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
  },
  sub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '15px',
    margin: '0 0 32px 0',
  },
  error: {
    background: 'rgba(255,80,80,0.15)',
    border: '1px solid rgba(255,80,80,0.4)',
    color: '#ff8080',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    fontFamily: "'Arial', sans-serif",
  },
  input: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '14px 16px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    fontFamily: "'Arial', sans-serif",
  },
  roleRow: {
    display: 'flex',
    gap: '12px',
  },
  roleBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Arial', sans-serif",
    transition: 'all 0.2s',
  },
  roleBtnActive: {
    background: 'rgba(102,126,234,0.25)',
    border: '1px solid rgba(102,126,234,0.6)',
    color: '#a78bfa',
    fontWeight: '700',
  },
  btn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '15px',
    fontSize: '15px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginTop: '8px',
    boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
    fontFamily: "'Arial', sans-serif",
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    marginTop: '24px',
    fontFamily: "'Arial', sans-serif",
  },
  link: {
    color: '#a78bfa',
    textDecoration: 'none',
    fontWeight: '600',
  },
}