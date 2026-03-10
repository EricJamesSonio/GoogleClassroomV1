import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '../../api/auth'
import useAuthStore from '../../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(null)

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (res) => { setAuth(res.data.access_token, res.data.user); navigate('/dashboard') },
    onError: (err) => setError(err.response?.data?.detail || 'Invalid email or password'),
  })

  return (
    <div style={s.page}>
      {/* Ambient blobs */}
      <div style={s.blob1} />
      <div style={s.blob2} />
      <div style={s.blob3} />
      {/* Dot grid */}
      <div style={s.dots} />

      <div style={s.wrap} className="fade-up">
        {/* Left panel — branding */}
        <div style={s.left}>
          <div style={s.brand}>
            <div style={s.brandIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={s.brandName}>ClassRoom</span>
          </div>

          <div style={s.leftBody}>
            <h1 style={s.leftHeading}>Learn without<br/>limits.</h1>
            <p style={s.leftSub}>A modern classroom platform connecting educators and students through live video, real-time chat, and structured learning.</p>
            <div style={s.leftFeatures} className="stagger">
              {['Live video meetings','Real-time class chat','Student invitations','Educator dashboard'].map(f => (
                <div key={f} style={s.feat} className="fade-up">
                  <div style={s.featDot} />
                  <span style={s.featText}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={s.leftFoot}>
            <div style={s.avatarStack}>
              {['E','S','A','J','M'].map((l,i) => (
                <div key={i} style={{ ...s.stackAvatar, marginLeft: i===0?0:'-8px', zIndex:5-i, background: AVATAR_COLORS[i] }}>{l}</div>
              ))}
            </div>
            <span style={s.stackLabel}>Join 1,200+ learners</span>
          </div>
        </div>

        {/* Right panel — form */}
        <div style={s.right}>
          <div style={s.formCard}>
            <h2 style={s.formTitle}>Welcome back</h2>
            <p style={s.formSub}>Sign in to your account to continue</p>

            {error && (
              <div style={s.errBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <div style={s.fields}>
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <div style={{ ...s.inputWrap, ...(focused==='email' ? s.inputWrapFocus : {}) }}>
                  <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input style={s.inputEl} type="email" placeholder="you@example.com"
                    value={form.email}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Password</label>
                <div style={{ ...s.inputWrap, ...(focused==='password' ? s.inputWrapFocus : {}) }}>
                  <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input style={s.inputEl} type="password" placeholder="••••••••"
                    value={form.password}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    onChange={e => setForm({...form, password: e.target.value})}
                    onKeyDown={e => e.key==='Enter' && mutation.mutate(form)} />
                </div>
              </div>
            </div>

            <button style={{ ...s.submitBtn, opacity: mutation.isPending ? 0.75 : 1 }}
              disabled={mutation.isPending}
              onClick={() => { setError(''); mutation.mutate(form) }}>
              {mutation.isPending
                ? <><span style={s.spinnerSm} /> Signing in...</>
                : <>Sign In <span style={s.btnArrow}>→</span></>}
            </button>

            <p style={s.switchLine}>
              Don't have an account? <Link to="/register" style={s.switchLink}>Create one free</Link>
            </p>

            <div style={s.devZone}>
              <div style={s.devLabel}>
                <div style={s.devLine} />
                <span style={s.devText}>quick fill for demo</span>
                <div style={s.devLine} />
              </div>
              <div style={s.devBtns}>
                <button style={s.devBtn} onClick={() => setForm({email:'edu1@gmail.com',password:'edu1'})}>
                  <span style={{...s.devDot, background:'var(--edu)'}} /> Educator
                </button>
                <button style={s.devBtn} onClick={() => setForm({email:'stud1@gmail.com',password:'stud1'})}>
                  <span style={{...s.devDot, background:'var(--stu)'}} /> Student
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const AVATAR_COLORS = ['#818cf8','#f59e0b','#4ade80','#f87171','#38bdf8']

const s = {
  page: { minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', overflow:'hidden' },
  blob1: { position:'fixed', top:'-15%', left:'-10%', width:'700px', height:'700px', borderRadius:'50%', background:'radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 65%)', pointerEvents:'none' },
  blob2: { position:'fixed', bottom:'-20%', right:'-5%', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 65%)', pointerEvents:'none' },
  blob3: { position:'fixed', top:'40%', left:'40%', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 65%)', pointerEvents:'none' },
  dots: { position:'fixed', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize:'28px 28px', pointerEvents:'none' },
  wrap: { display:'flex', width:'100%', maxWidth:'1000px', minHeight:'600px', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-xl)', overflow:'hidden', boxShadow:'var(--shadow-xl)', position:'relative', zIndex:1 },

  left: { flex:'1', background:'linear-gradient(160deg, #1a1726 0%, #110f1a 60%, #0d0b14 100%)', padding:'48px 44px', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden', borderRight:'1px solid var(--border)' },
  brand: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'auto' },
  brandIcon: { width:'38px', height:'38px', borderRadius:'10px', background:'linear-gradient(135deg, #818cf8, #a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  brandName: { fontFamily:'var(--font-head)', fontSize:'19px', fontWeight:'800', color:'var(--text)', letterSpacing:'-0.3px' },
  leftBody: { paddingTop:'48px', paddingBottom:'40px', flex:1 },
  leftHeading: { fontFamily:'var(--font-head)', fontSize:'42px', fontWeight:'900', color:'var(--text)', lineHeight:'1.1', letterSpacing:'-1.5px', marginBottom:'18px' },
  leftSub: { color:'var(--text2)', fontSize:'15px', lineHeight:'1.7', marginBottom:'32px', maxWidth:'320px' },
  leftFeatures: { display:'flex', flexDirection:'column', gap:'12px' },
  feat: { display:'flex', alignItems:'center', gap:'10px' },
  featDot: { width:'6px', height:'6px', borderRadius:'50%', background:'linear-gradient(135deg, #818cf8, #a78bfa)', flexShrink:0 },
  featText: { color:'var(--text2)', fontSize:'14px' },
  leftFoot: { display:'flex', alignItems:'center', gap:'12px', marginTop:'auto', paddingTop:'32px' },
  avatarStack: { display:'flex' },
  stackAvatar: { width:'30px', height:'30px', borderRadius:'50%', border:'2px solid var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'11px', fontWeight:'700', flexShrink:0 },
  stackLabel: { color:'var(--text3)', fontSize:'13px' },

  right: { flex:'0 0 420px', display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 44px' },
  formCard: { width:'100%' },
  formTitle: { fontFamily:'var(--font-head)', fontSize:'28px', fontWeight:'800', color:'var(--text)', letterSpacing:'-0.5px', marginBottom:'6px' },
  formSub: { color:'var(--text3)', fontSize:'14px', marginBottom:'28px' },
  errBox: { background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.25)', color:'#fca5a5', borderRadius:'var(--r)', padding:'11px 14px', fontSize:'13px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px' },
  fields: { display:'flex', flexDirection:'column', gap:'16px', marginBottom:'20px' },
  field: { display:'flex', flexDirection:'column', gap:'6px' },
  label: { color:'var(--text3)', fontSize:'12px', fontWeight:'600', letterSpacing:'0.6px', textTransform:'uppercase' },
  inputWrap: { display:'flex', alignItems:'center', gap:'10px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'0 14px', transition:'all 0.2s' },
  inputWrapFocus: { background:'rgba(129,140,248,0.06)', borderColor:'rgba(129,140,248,0.4)', boxShadow:'0 0 0 3px rgba(129,140,248,0.08)' },
  inputIcon: { color:'var(--text4)', flexShrink:0 },
  inputEl: { flex:1, background:'transparent', border:'none', outline:'none', padding:'13px 0', color:'var(--text)', fontSize:'14px', fontFamily:'var(--font-body)' },
  submitBtn: { width:'100%', background:'linear-gradient(135deg, #818cf8, #6366f1)', color:'#fff', border:'none', borderRadius:'var(--r)', padding:'14px', fontSize:'15px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', letterSpacing:'-0.1px', boxShadow:'0 4px 20px rgba(129,140,248,0.3)', transition:'all 0.2s', fontFamily:'var(--font-body)' },
  btnArrow: { fontSize:'16px', transition:'transform 0.2s' },
  spinnerSm: { width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' },
  switchLine: { textAlign:'center', color:'var(--text3)', fontSize:'13px', marginTop:'20px' },
  switchLink: { color:'var(--stu2)', fontWeight:'600' },
  devZone: { marginTop:'24px', paddingTop:'20px', borderTop:'1px solid var(--border)' },
  devLabel: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' },
  devLine: { flex:1, height:'1px', background:'var(--border)' },
  devText: { color:'var(--text4)', fontSize:'10px', fontWeight:'600', letterSpacing:'0.8px', textTransform:'uppercase', whiteSpace:'nowrap' },
  devBtns: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' },
  devBtn: { background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', padding:'9px 12px', color:'var(--text3)', fontSize:'12px', fontWeight:'500', display:'flex', alignItems:'center', gap:'7px', transition:'all 0.15s', fontFamily:'var(--font-body)' },
  devDot: { width:'6px', height:'6px', borderRadius:'50%', flexShrink:0 },
}