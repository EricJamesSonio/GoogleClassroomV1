import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function Layout({ children }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isEducator = user?.role === 'educator'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { to:'/dashboard', label:'Dashboard', icon:HomeIcon },
    { to:'/classes',   label:'Classes',   icon:ClassIcon },
    ...(!isEducator ? [{ to:'/invitations', label:'Invitations', icon:InboxIcon }] : []),
  ]

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div style={s.shell}>
      {/* MOBILE HEADER WITH HAMBURGER MENU */}
      <div style={s.mobileHeader} data-mobile-header>
        <button 
          style={s.hamburger} 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
          title="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div style={s.mobileLogoArea}>
          <span style={s.mobileLogo}>ClassRoom</span>
        </div>
      </div>

      {/* MOBILE OVERLAY - Click to close sidebar */}
      {sidebarOpen && (
        <div 
          style={s.overlay} 
          onClick={closeSidebar}
          aria-hidden="true"
          data-overlay
        />
      )}

      {/* SIDEBAR - MAIN NAVIGATION */}
      <aside 
        style={{ 
          ...s.sidebar, 
          ...(sidebarOpen ? s.sidebarOpen : s.sidebarClosed) 
        }}
        data-sidebar
        className={sidebarOpen ? 'open' : ''}
      >
        {/* Brand Section */}
        <div style={s.brand}>
          <div style={{ ...s.brandMark, background: isEducator ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#818cf8,#6366f1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={s.brandName}>ClassRoom</span>
        </div>

        {/* Role Badge */}
        <div style={{ ...s.roleBadge, ...(isEducator ? s.roleBadgeEdu : s.roleBadgeStu) }}>
          <span style={s.roleDot}>{isEducator ? '◆' : '●'}</span>
          <span>{isEducator ? 'Educator' : 'Student'}</span>
        </div>

        {/* Navigation Menu */}
        <nav style={s.nav}>
          <div style={s.navGroup}>
            <div style={s.navGroupLabel}>Menu</div>
            {navItems.map((item) => (
              <NavLink 
                key={item.to} 
                to={item.to}
                onClick={closeSidebar}
                style={({ isActive }) => ({ 
                  ...s.navItem, 
                  ...(isActive ? (isEducator ? s.navItemActiveEdu : s.navItemActiveStu) : {}) 
                })}
              >
                {({ isActive }) => (
                  <>
                    <span style={{ 
                      ...s.navIcon, 
                      ...(isActive ? (isEducator ? s.navIconActiveEdu : s.navIconActiveStu) : {}) 
                    }}>
                      <item.icon size={15} />
                    </span>
                    <span style={s.navLabel}>{item.label}</span>
                    {isActive && <span style={{ ...s.navPip, ...(isEducator ? s.navPipEdu : s.navPipStu) }} />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Info Footer */}
        <div style={s.foot}>
          <div style={s.userRow}>
            <div style={{ ...s.avatar, ...(isEducator ? s.avatarEdu : s.avatarStu) }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={s.userInfo}>
              <div style={s.userName}>{user?.name || 'User'}</div>
              <div style={s.userMeta}>{user?.email || 'email@example.com'}</div>
            </div>
          </div>
          <button 
            style={s.logoutBtn} 
            onClick={() => { 
              logout()
              navigate('/login') 
            }}
            title="Sign out of your account"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={s.main} data-main>
        <div style={s.mainInner} data-main-inner>
          {children}
        </div>
      </main>
    </div>
  )
}

// ICON COMPONENTS
const HomeIcon = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const ClassIcon = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)

const InboxIcon = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
)

// RESPONSIVE STYLES OBJECT
const s = {
  // SHELL & MAIN CONTAINER
  shell: { 
    display:'flex', 
    minHeight:'100vh', 
    background:'var(--bg)', 
    fontFamily:'var(--font-body)',
    position:'relative'
  },

  // MOBILE HEADER & HAMBURGER MENU
  mobileHeader: { 
    display:'none',
    position:'fixed', 
    top:0, 
    left:0, 
    right:0, 
    height:'56px', 
    background:'var(--bg2)', 
    borderBottom:'1px solid var(--border)', 
    zIndex:30, 
    alignItems:'center', 
    paddingLeft:'12px', 
    paddingRight:'12px', 
    gap:'12px',
  },

  hamburger: { 
    background:'none', 
    border:'none', 
    color:'var(--text)', 
    fontSize:'20px', 
    padding:'8px', 
    display:'flex', 
    alignItems:'center', 
    justifyContent:'center', 
    cursor:'pointer',
    minHeight:'44px',
    minWidth:'44px',
    transition:'all 0.15s',
    borderRadius:'var(--r)',
  },

  mobileLogoArea: { 
    flex:1, 
    display:'flex', 
    alignItems:'center', 
    justifyContent:'center' 
  },

  mobileLogo: { 
    fontFamily:'var(--font-head)', 
    fontSize:'16px', 
    fontWeight:'800', 
    color:'var(--text)' 
  },

  overlay: { 
    position:'fixed', 
    inset:0, 
    background:'rgba(0,0,0,0.5)', 
    zIndex:25,
    backdropFilter:'blur(4px)',
  },

  // SIDEBAR - MAIN NAVIGATION
  sidebar: { 
    width:'240px', 
    minHeight:'100vh', 
    background:'var(--bg2)', 
    borderRight:'1px solid var(--border)', 
    display:'flex', 
    flexDirection:'column', 
    padding:'20px 14px 20px', 
    position:'fixed', 
    top:0, 
    left:0, 
    bottom:0, 
    zIndex:20,
    transition:'all 0.3s ease',
    overflowY:'auto',
    WebkitOverflowScrolling:'touch'
  },

  sidebarOpen: { 
    transform:'translateX(0)',
  },

  sidebarClosed: { 
    transform:'translateX(0)',
  },

  // SIDEBAR - BRAND SECTION
  brand: { 
    display:'flex', 
    alignItems:'center', 
    gap:'9px', 
    padding:'4px 8px', 
    marginBottom:'16px'
  },

  brandMark: { 
    width:'30px', 
    height:'30px', 
    borderRadius:'8px', 
    display:'flex', 
    alignItems:'center', 
    justifyContent:'center', 
    flexShrink:0, 
    transition:'background 0.4s'
  },

  brandName: { 
    fontFamily:'var(--font-head)', 
    fontSize:'16px', 
    fontWeight:'800', 
    color:'var(--text)', 
    letterSpacing:'-0.2px'
  },

  // SIDEBAR - ROLE BADGE
  roleBadge: { 
    display:'inline-flex', 
    alignItems:'center', 
    gap:'6px', 
    borderRadius:'6px', 
    padding:'5px 10px', 
    fontSize:'11px', 
    fontWeight:'700', 
    letterSpacing:'0.4px', 
    textTransform:'uppercase', 
    marginBottom:'20px', 
    marginLeft:'8px', 
    width:'fit-content'
  },

  roleBadgeEdu: { 
    background:'var(--edu-bg)', 
    color:'var(--edu)', 
    border:'1px solid var(--edu-border)' 
  },

  roleBadgeStu: { 
    background:'var(--stu-bg)', 
    color:'var(--stu)', 
    border:'1px solid var(--stu-border)' 
  },

  roleDot: { 
    fontSize:'8px',
    marginRight:'-2px'
  },

  // SIDEBAR - NAVIGATION
  nav: { 
    flex:1
  },

  navGroup: { 
    display:'flex', 
    flexDirection:'column', 
    gap:'1px' 
  },

  navGroupLabel: { 
    color:'var(--text4)', 
    fontSize:'10px', 
    fontWeight:'700', 
    letterSpacing:'1px', 
    textTransform:'uppercase', 
    padding:'0 12px', 
    marginBottom:'6px', 
    marginTop:'4px'
  },

  navItem: { 
    display:'flex', 
    alignItems:'center', 
    gap:'10px', 
    padding:'9px 12px', 
    borderRadius:'var(--r)', 
    color:'var(--text3)', 
    textDecoration:'none', 
    fontSize:'14px', 
    fontWeight:'500', 
    transition:'all 0.15s', 
    position:'relative',
    cursor:'pointer',
    minHeight:'44px'
  },

  navItemActiveEdu: { 
    background:'var(--edu-bg)', 
    color:'var(--edu)', 
    fontWeight:'600' 
  },

  navItemActiveStu: { 
    background:'var(--stu-bg)', 
    color:'var(--stu)', 
    fontWeight:'600' 
  },

  navIcon: { 
    width:'26px', 
    height:'26px', 
    borderRadius:'6px', 
    display:'flex', 
    alignItems:'center', 
    justifyContent:'center', 
    color:'var(--text3)', 
    transition:'all 0.15s', 
    flexShrink:0
  },

  navIconActiveEdu: { 
    background:'rgba(245,158,11,0.15)', 
    color:'var(--edu)' 
  },

  navIconActiveStu: { 
    background:'rgba(129,140,248,0.15)', 
    color:'var(--stu)' 
  },

  navLabel: { 
    flex:1
  },

  navPip: { 
    width:'5px', 
    height:'5px', 
    borderRadius:'50%', 
    flexShrink:0
  },

  navPipEdu: { 
    background:'var(--edu)' 
  },

  navPipStu: { 
    background:'var(--stu)' 
  },

  // SIDEBAR - FOOTER (USER INFO)
  foot: { 
    borderTop:'1px solid var(--border)', 
    paddingTop:'14px', 
    display:'flex', 
    flexDirection:'column', 
    gap:'10px',
    marginTop:'auto'
  },

  userRow: { 
    display:'flex', 
    alignItems:'center', 
    gap:'10px', 
    padding:'6px 8px', 
    borderRadius:'var(--r)'
  },

  avatar: { 
    width:'30px', 
    height:'30px', 
    borderRadius:'8px', 
    display:'flex', 
    alignItems:'center', 
    justifyContent:'center', 
    color:'#fff', 
    fontSize:'12px', 
    fontWeight:'800', 
    flexShrink:0, 
    fontFamily:'var(--font-head)'
  },

  avatarEdu: { 
    background:'linear-gradient(135deg,#f59e0b,#d97706)' 
  },

  avatarStu: { 
    background:'linear-gradient(135deg,#818cf8,#6366f1)' 
  },

  userInfo: { 
    flex:1, 
    overflow:'hidden',
    minWidth:0
  },

  userName: { 
    color:'var(--text)', 
    fontSize:'13px', 
    fontWeight:'600', 
    whiteSpace:'nowrap', 
    overflow:'hidden', 
    textOverflow:'ellipsis'
  },

  userMeta: { 
    color:'var(--text4)', 
    fontSize:'11px', 
    whiteSpace:'nowrap', 
    overflow:'hidden', 
    textOverflow:'ellipsis'
  },

  logoutBtn: { 
    display:'flex', 
    alignItems:'center', 
    justifyContent:'center',
    gap:'7px', 
    background:'transparent', 
    border:'1px solid var(--border)', 
    borderRadius:'var(--r)', 
    color:'var(--text3)', 
    fontSize:'12px', 
    padding:'8px 12px', 
    transition:'all 0.15s', 
    width:'100%', 
    fontFamily:'var(--font-body)', 
    fontWeight:'500',
    cursor:'pointer',
    minHeight:'44px',
  },

  // MAIN CONTENT AREA
  main: { 
    marginLeft:'240px', 
    flex:1, 
    minHeight:'100vh', 
    background:'var(--bg)',
    transition:'margin-left 0.3s ease'
  },

  mainInner: { 
    maxWidth:'1080px', 
    margin:'0 auto', 
    padding:'44px 44px'
  },
}

export { HomeIcon, ClassIcon, InboxIcon }