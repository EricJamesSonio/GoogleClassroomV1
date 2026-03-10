import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register } from '../../api/auth'
import useAuthStore from '../../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'student' })
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(null)

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (res) => { setAuth(res.data.access_token, res.data.user); navigate('/dashboard') },
    onError: (err) => setError(err.response?.data?.detail || 'Registration failed'),
  })

  const isEdu = form.role === 'educator'

  return (
    <div style={s.page}>
      <div style={{ ...s.blob1, ...(isEdu ? s.blob1Edu : {}) }} />
      <div style={{ ...s.blob2, ...(isEdu ? s.blob2Edu : {}) }} />
      <div style={s.dots} />

      <div style={s.card} className="fade-up">
        {/* Top brand */}
        <div style={s.topBar}>
          <div style={s.brand}>
            <div style={{ ...s.brandIcon, background: isEdu ? 'linear-gradient(135deg, #f59e0b, #fcd34d)' : 'linear-gradient(135deg, #818cf8, #a78bfa)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={s.brandName}>ClassRoom</span>
          </div>
          <Link to="/login" style={s.signInLink}>Sign in instead →</Link>
        </div>

        <div style={s.body}>
          <h1 style={s.heading}>Create your account</h1>
          <p style={s.sub}>Choose your role to get the right experience</p>

          {/* Role toggle — the centrepiece */}
          <div style={s.roleGrid}>
            <button style={{ ...s.roleCard, ...(isEdu ? s.roleCardEdu : s.roleCardInactive) }}
              onClick={() => setForm({...form, role:'educator'})}>
              <div style={{ ...s.roleIconWrap, ...(isEdu ? s.roleIconWrapEdu : s.roleIconWrapInactive) }}>
                <span style={s.roleEmoji}>📚</span>
              </div>
              <div style={s.roleInfo}>
                <div style={{ ...s.roleName, ...(isEdu ? {color:'var(--edu)'} : {}) }}>Educator</div>
                <div style={s.roleDesc}>Create classes, schedule meetings, invite students</div>
              </div>
              <div style={{ ...s.roleCheck, ...(isEdu ? s.roleCheckEdu : {}) }}>
                {isEdu && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            </button>

            <button style={{ ...s.roleCard, ...(!isEdu ? s.roleCardStu : s.roleCardInactive) }}
              onClick={() => setForm({...form, role:'student'})}>
              <div style={{ ...s.roleIconWrap, ...(!isEdu ? s.roleIconWrapStu : s.roleIconWrapInactive) }}>
                <span style={s.roleEmoji}>🎒</span>
              </div>
              <div style={s.roleInfo}>
                <div style={{ ...s.roleName, ...(!isEdu ? {color:'var(--stu)'} : {}) }}>Student</div>
                <div style={s.roleDesc}>Join classes, attend live meetings, learn</div>
              </div>
              <div style={{ ...s.roleCheck, ...(!isEdu ? s.roleCheckStu : {}) }}>
                {!isEdu && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            </button>
          </div>

          {error && <div style={s.errBox}><span>⚠</span>{error}</div>}

          <div style={s.fields}>
            {[
              { key:'name', label:'Full Name', type:'text', placeholder:'Jane Doe', icon:'person' },
              { key:'email', label:'Email Address', type:'email', placeholder:'you@example.com', icon:'email' },
              { key:'password', label:'Password', type:'password', placeholder:'Min. 6 characters', icon:'lock' },
            ].map(f => (
              <div key={f.key} style={s.field}>
                <label style={s.label}>{f.label}</label>
                <div style={{ ...s.inputWrap, ...(focused===f.key ? (isEdu ? s.inputWrapFocusEdu : s.inputWrapFocusStu) : {}) }}>
                  <input style={s.inputEl} type={f.type} placeholder={f.placeholder}
                    value={form[f.key]}
                    onFocus={() => setFocused(f.key)}
                    onBlur={() => setFocused(null)}
                    onChange={e => setForm({...form, [f.key]: e.target.value})} />
                </div>
              </div>
            ))}
          </div>

          <button
            style={{ ...s.submitBtn, background: isEdu ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #818cf8, #6366f1)', boxShadow: isEdu ? '0 4px 20px rgba(245,158,11,0.3)' : '0 4px 20px rgba(129,140,248,0.3)', opacity: mutation.isPending ? 0.75 : 1 }}
            disabled={mutation.isPending}
            onClick={() => { setError(''); mutation.mutate(form) }}>
            {mutation.isPending ? 'Creating account...' : `Join as ${isEdu ? 'Educator' : 'Student'} →`}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', overflow:'hidden' },
  blob1: { position:'fixed', top:'-20%', right:'-10%', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 65%)', pointerEvents:'none', transition:'all 0.6s ease' },
  blob1Edu: { background:'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 65%)' },
  blob2: { position:'fixed', bottom:'-20%', left:'-10%', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 65%)', pointerEvents:'none', transition:'all 0.6s ease' },
  blob2Edu: { background:'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 65%)' },
  dots: { position:'fixed', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' },
  card: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-xl)', width:'100%', maxWidth:'480px', boxShadow:'var(--shadow-xl)', overflow:'hidden', position:'relative', zIndex:1 },
  topBar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 28px', borderBottom:'1px solid var(--border)' },
  brand: { display:'flex', alignItems:'center', gap:'9px' },
  brandIcon: { width:'30px', height:'30px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.4s' },
  brandName: { fontFamily:'var(--font-head)', fontSize:'16px', fontWeight:'800', color:'var(--text)' },
  signInLink: { color:'var(--text3)', fontSize:'13px', fontWeight:'500' },
  body: { padding:'32px 28px 36px' },
  heading: { fontFamily:'var(--font-head)', fontSize:'26px', fontWeight:'800', color:'var(--text)', letterSpacing:'-0.4px', marginBottom:'6px' },
  sub: { color:'var(--text3)', fontSize:'14px', marginBottom:'24px' },
  roleGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'24px' },
  roleCard: { display:'flex', flexDirection:'column', gap:'10px', padding:'16px', borderRadius:'var(--r-md)', border:'1px solid var(--border2)', cursor:'pointer', textAlign:'left', transition:'all 0.25s', fontFamily:'var(--font-body)', position:'relative', overflow:'hidden' },
  roleCardEdu: { background:'rgba(245,158,11,0.06)', border:'1.5px solid rgba(245,158,11,0.3)', boxShadow:'0 0 24px rgba(245,158,11,0.08)' },
  roleCardStu: { background:'rgba(129,140,248,0.06)', border:'1.5px solid rgba(129,140,248,0.3)', boxShadow:'0 0 24px rgba(129,140,248,0.08)' },
  roleCardInactive: { background:'var(--surface)', opacity:0.6 },
  roleIconWrap: { width:'40px', height:'40px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' },
  roleIconWrapEdu: { background:'rgba(245,158,11,0.15)' },
  roleIconWrapStu: { background:'rgba(129,140,248,0.15)' },
  roleIconWrapInactive: { background:'var(--surface2)' },
  roleEmoji: { fontSize:'20px' },
  roleInfo: { flex:1 },
  roleName: { fontFamily:'var(--font-head)', fontSize:'14px', fontWeight:'700', color:'var(--text)', marginBottom:'3px' },
  roleDesc: { color:'var(--text3)', fontSize:'11px', lineHeight:'1.5' },
  roleCheck: { width:'20px', height:'20px', borderRadius:'50%', border:'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, alignSelf:'flex-start' },
  roleCheckEdu: { background:'var(--edu)', border:'none', color:'#422006' },
  roleCheckStu: { background:'var(--stu)', border:'none', color:'#1e1b4b' },
  errBox: { background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.25)', color:'#fca5a5', borderRadius:'var(--r)', padding:'10px 14px', fontSize:'13px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' },
  fields: { display:'flex', flexDirection:'column', gap:'14px', marginBottom:'20px' },
  field: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { color:'var(--text3)', fontSize:'12px', fontWeight:'600', letterSpacing:'0.5px', textTransform:'uppercase' },
  inputWrap: { background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'0 14px', transition:'all 0.2s' },
  inputWrapFocusStu: { background:'rgba(129,140,248,0.05)', borderColor:'rgba(129,140,248,0.35)', boxShadow:'0 0 0 3px rgba(129,140,248,0.08)' },
  inputWrapFocusEdu: { background:'rgba(245,158,11,0.05)', borderColor:'rgba(245,158,11,0.35)', boxShadow:'0 0 0 3px rgba(245,158,11,0.08)' },
  inputEl: { width:'100%', background:'transparent', border:'none', outline:'none', padding:'13px 0', color:'var(--text)', fontSize:'14px', fontFamily:'var(--font-body)' },
  submitBtn: { width:'100%', color:'#fff', border:'none', borderRadius:'var(--r)', padding:'14px', fontSize:'15px', fontWeight:'700', letterSpacing:'-0.1px', transition:'all 0.3s', fontFamily:'var(--font-body)' },
}