import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import Layout from '../components/Layout'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isEdu = user?.role === 'educator'
  const hr = new Date().getHours()
  const greeting = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'

  const cards = isEdu ? [
    { icon:'🏫', label:'My Classes', desc:'Create and manage your classrooms', path:'/classes', color:'var(--edu)', bg:'var(--edu-bg)', border:'var(--edu-border)' },
    { icon:'🎥', label:'Host a Meeting', desc:'Schedule a live video session', path:'/classes', color:'#a78bfa', bg:'rgba(167,139,250,0.08)', border:'rgba(167,139,250,0.2)' },
  ] : [
    { icon:'🏫', label:'My Classes', desc:'View your enrolled classrooms', path:'/classes', color:'var(--stu)', bg:'var(--stu-bg)', border:'var(--stu-border)' },
    { icon:'📩', label:'Invitations', desc:'Accept pending class invitations', path:'/invitations', color:'var(--green)', bg:'var(--green-bg)', border:'rgba(74,222,128,0.2)' },
  ]

  return (
    <Layout>
      <div className="fade-up">
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.greeting}>{greeting}</span>
            <h1 style={s.heading}>{user?.name}</h1>
            <p style={s.sub}>
              {isEdu
                ? 'Your educator dashboard. Create classes, host live meetings, and manage students.'
                : 'Your student dashboard. Join classes, attend meetings, and keep learning.'}
            </p>
          </div>
          <div style={{ ...s.roleBubble, ...(isEdu ? s.roleBubbleEdu : s.roleBubbleStu) }}>
            <span style={s.roleBubbleEmoji}>{isEdu ? '📚' : '🎒'}</span>
            <span>{isEdu ? 'Educator' : 'Student'}</span>
          </div>
        </div>

        {/* Quick cards */}
        <div style={s.cardRow} className="stagger">
          {cards.map(c => (
            <div key={c.label} style={s.card} className="fade-up" onClick={() => navigate(c.path)}>
              <div style={{ ...s.cardIconBox, background:c.bg, border:`1px solid ${c.border}` }}>
                <span style={s.cardEmoji}>{c.icon}</span>
              </div>
              <div style={s.cardContent}>
                <div style={s.cardTitle}>{c.label}</div>
                <div style={s.cardDesc}>{c.desc}</div>
              </div>
              <div style={{ ...s.cardArrow, color:c.color }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                </svg>
              </div>
              <div style={{ ...s.cardGlow, background:`radial-gradient(circle at 80% 50%, ${c.bg}, transparent)` }} />
            </div>
          ))}
        </div>

        {/* Info section */}
        <div style={s.infoSection}>
          <div style={s.infoTitle}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            How it works
          </div>
          <div style={s.infoGrid}>
            {(isEdu ? [
              { num:'01', title:'Create a class', desc:'Set up a virtual classroom with a name and description.' },
              { num:'02', title:'Invite students', desc:'Send invitations by email or share your class ID.' },
              { num:'03', title:'Host meetings', desc:'Schedule and start live video sessions with chat.' },
            ] : [
              { num:'01', title:'Join a class', desc:'Accept an invitation or request to join using a class ID.' },
              { num:'02', title:'Attend meetings', desc:'Join live video sessions when your educator starts one.' },
              { num:'03', title:'Engage & learn', desc:'Participate via video, mic, and real-time chat.' },
            ]).map(step => (
              <div key={step.num} style={s.step}>
                <div style={{ ...s.stepNum, color: isEdu ? 'var(--edu)' : 'var(--stu)' }}>{step.num}</div>
                <div style={s.stepTitle}>{step.title}</div>
                <div style={s.stepDesc}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

const s = {
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'24px', flexWrap:'wrap', marginBottom:'40px' },
  headerLeft: {},
  greeting: { display:'block', color:'var(--text3)', fontSize:'13px', fontWeight:'500', letterSpacing:'0.2px', marginBottom:'6px' },
  heading: { fontFamily:'var(--font-head)', fontSize:'38px', fontWeight:'900', color:'var(--text)', letterSpacing:'-1.2px', lineHeight:'1', marginBottom:'14px' },
  sub: { color:'var(--text2)', fontSize:'15px', maxWidth:'460px', lineHeight:'1.65' },
  roleBubble: { display:'flex', alignItems:'center', gap:'8px', borderRadius:'20px', padding:'10px 18px', fontSize:'13px', fontWeight:'700', flexShrink:0, marginTop:'6px' },
  roleBubbleEdu: { background:'var(--edu-bg)', color:'var(--edu)', border:'1px solid var(--edu-border)' },
  roleBubbleStu: { background:'var(--stu-bg)', color:'var(--stu)', border:'1px solid var(--stu-border)' },
  roleBubbleEmoji: { fontSize:'16px' },

  cardRow: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'14px', marginBottom:'40px' },
  card: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-md)', padding:'22px', display:'flex', alignItems:'center', gap:'16px', cursor:'pointer', transition:'transform 0.2s, box-shadow 0.2s, border-color 0.2s', position:'relative', overflow:'hidden' },
  cardIconBox: { width:'46px', height:'46px', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  cardEmoji: { fontSize:'22px' },
  cardContent: { flex:1, minWidth:0 },
  cardTitle: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'15px', fontWeight:'700', marginBottom:'3px' },
  cardDesc: { color:'var(--text3)', fontSize:'13px', lineHeight:'1.4' },
  cardArrow: { flexShrink:0, opacity:0.7 },
  cardGlow: { position:'absolute', inset:0, pointerEvents:'none', opacity:0.4 },

  infoSection: { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'28px 32px' },
  infoTitle: { display:'flex', alignItems:'center', gap:'7px', color:'var(--text3)', fontSize:'12px', fontWeight:'700', letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:'24px' },
  infoGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'28px' },
  step: {},
  stepNum: { fontFamily:'var(--font-head)', fontSize:'22px', fontWeight:'900', marginBottom:'8px', letterSpacing:'-0.5px' },
  stepTitle: { color:'var(--text)', fontSize:'14px', fontWeight:'700', marginBottom:'5px' },
  stepDesc: { color:'var(--text3)', fontSize:'13px', lineHeight:'1.6' },
}