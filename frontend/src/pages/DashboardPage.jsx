import useAuthStore from '../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>Dashboard</h1>
            <p style={styles.sub}>
              Welcome back, <strong style={{ color: '#a78bfa' }}>{user?.name}</strong>
            </p>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>

        <div style={styles.infoRow}>
          <div style={styles.badge}>
            {user?.role === 'educator' ? '📚 Educator' : '🎒 Student'}
          </div>
          <span style={styles.email}>{user?.email}</span>
        </div>

        <p style={styles.placeholder}>
          🚧 Classes, meetings, and video will appear here in the next phases.
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
    padding: '40px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  heading: {
    color: '#fff',
    fontSize: '26px',
    margin: '0 0 4px 0',
    fontWeight: '700',
  },
  sub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '15px',
    margin: 0,
    fontFamily: "'Arial', sans-serif",
  },
  logoutBtn: {
    background: 'rgba(255,80,80,0.15)',
    border: '1px solid rgba(255,80,80,0.3)',
    color: '#ff8080',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'Arial', sans-serif",
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  badge: {
    background: 'rgba(102,126,234,0.2)',
    border: '1px solid rgba(102,126,234,0.4)',
    color: '#a78bfa',
    borderRadius: '20px',
    padding: '4px 14px',
    fontSize: '13px',
    fontFamily: "'Arial', sans-serif",
  },
  email: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '14px',
    fontFamily: "'Arial', sans-serif",
  },
  placeholder: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '14px',
    fontFamily: "'Arial', sans-serif",
    textAlign: 'center',
    padding: '32px',
    border: '1px dashed rgba(255,255,255,0.1)',
    borderRadius: '12px',
  },
}