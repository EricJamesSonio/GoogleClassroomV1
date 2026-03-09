import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import Layout from '../components/Layout'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return (
    <Layout>
      <h1 style={styles.heading}>Welcome back, <span style={styles.name}>{user?.name}</span> 👋</h1>
      <p style={styles.sub}>
        {user?.role === 'educator'
          ? 'Manage your classes and schedule meetings from the sidebar.'
          : 'View your classes and join meetings from the sidebar.'}
      </p>

      <div style={styles.cards}>
        <div style={styles.card} onClick={() => navigate('/classes')}>
          <div style={styles.cardIcon}>🏫</div>
          <div style={styles.cardLabel}>My Classes</div>
          <div style={styles.cardArrow}>→</div>
        </div>
        {user?.role === 'student' && (
          <div style={styles.card} onClick={() => navigate('/invitations')}>
            <div style={styles.cardIcon}>📩</div>
            <div style={styles.cardLabel}>Invitations</div>
            <div style={styles.cardArrow}>→</div>
          </div>
        )}
      </div>
    </Layout>
  )
}

const styles = {
  heading: { fontSize: '26px', fontWeight: '700', color: '#fff', marginBottom: '8px' },
  name: { color: '#a78bfa' },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '40px', fontFamily: "'Arial', sans-serif" },
  cards: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  card: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', minWidth: '220px', transition: 'background 0.2s' },
  cardIcon: { fontSize: '28px' },
  cardLabel: { flex: 1, color: '#fff', fontSize: '16px', fontWeight: '600', fontFamily: "'Arial', sans-serif" },
  cardArrow: { color: 'rgba(255,255,255,0.3)', fontSize: '18px' },
}