import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function Layout({ children }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { to: '/classes', icon: '🏫', label: 'Classes' },
    ...(user?.role === 'student'
      ? [{ to: '/invitations', icon: '📩', label: 'Invitations' }]
      : []
    ),
  ]

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>🎓</span>
          <span style={styles.logoText}>ClassRoom</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.userRow}>
            <div style={styles.avatar}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user?.name}</div>
              <div style={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        {children}
      </main>
    </div>
  )
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0f0c29',
    fontFamily: "'Arial', sans-serif",
  },
  sidebar: {
    width: '240px',
    minHeight: '100vh',
    background: 'rgba(255,255,255,0.04)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 8px',
    marginBottom: '36px',
  },
  logoIcon: { fontSize: '22px' },
  logoText: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '0.3px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: 'rgba(102,126,234,0.2)',
    color: '#a78bfa',
    fontWeight: '700',
  },
  navIcon: { fontSize: '16px' },
  sidebarBottom: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
  },
  userInfo: { overflow: 'hidden' },
  userName: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    padding: '7px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
  },
  main: {
    marginLeft: '240px',
    flex: 1,
    padding: '40px',
    color: '#fff',
  },
}