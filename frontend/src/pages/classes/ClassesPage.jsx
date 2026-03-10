import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClasses, createClass, requestJoin } from '../../api/classes'
import useAuthStore from '../../store/authStore'
import Layout from '../../components/Layout'

const PALETTE = [
  { from:'#818cf8', to:'#6366f1' }, { from:'#34d399', to:'#059669' },
  { from:'#f59e0b', to:'#d97706' }, { from:'#f87171', to:'#dc2626' },
  { from:'#38bdf8', to:'#0284c7' }, { from:'#a78bfa', to:'#7c3aed' },
]

export default function ClassesPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdu = user?.role === 'educator'

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin,   setShowJoin]   = useState(false)
  const [form,  setForm]  = useState({ name:'', description:'' })
  const [joinId, setJoinId] = useState('')
  const [error,  setError]  = useState('')

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => { qc.invalidateQueries(['classes']); setShowCreate(false); setForm({ name:'', description:'' }); setError('') },
    onError: (e) => setError(e.response?.data?.detail || 'Failed'),
  })
  const joinMutation = useMutation({
    mutationFn: requestJoin,
    onSuccess: () => { setShowJoin(false); setJoinId(''); alert('Join request sent!') },
    onError: (e) => setError(e.response?.data?.detail || 'Failed'),
  })

  return (
    <Layout>
      <div className="fade-up">
        <div style={s.header}>
          <div>
            <h1 style={s.heading}>Classes</h1>
            <p style={s.sub}>
              {isEdu ? `${classes.length} classroom${classes.length!==1?'s':''} managed` : `Enrolled in ${classes.length} class${classes.length!==1?'es':''}`}
            </p>
          </div>
          <div style={s.headerActions}>
            {!isEdu && <button style={s.btnOutline} onClick={() => { setError(''); setShowJoin(true) }}>+ Request to Join</button>}
            {isEdu  && <button style={s.btnPrimary} onClick={() => { setError(''); setShowCreate(true) }}>+ New Class</button>}
          </div>
        </div>

        {isLoading ? (
          <div style={s.skeletonGrid}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={s.skeletonCard} />)}
          </div>
        ) : classes.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyArt}>
              {isEdu ? '🏫' : '📚'}
            </div>
            <h3 style={s.emptyTitle}>{isEdu ? 'No classes yet' : 'Not enrolled anywhere'}</h3>
            <p style={s.emptyDesc}>{isEdu ? 'Create your first classroom to get started teaching.' : 'Request to join a class or wait for an invitation from an educator.'}</p>
            {isEdu && <button style={s.btnPrimary} onClick={() => { setError(''); setShowCreate(true) }}>Create First Class</button>}
          </div>
        ) : (
          <div style={s.grid} className="stagger">
            {classes.map((cls, i) => {
              const { from, to } = PALETTE[i % PALETTE.length]
              return (
                <div key={cls.id} style={s.card} className="fade-up" onClick={() => navigate(`/classes/${cls.id}`)}>
                  {/* Top stripe */}
                  <div style={{ ...s.cardStripe, background:`linear-gradient(90deg, ${from}, ${to})` }}>
                    <div style={s.cardAvatarWrap}>
                      <div style={{ ...s.cardAvatar, background:`linear-gradient(135deg, ${from}, ${to})` }}>
                        {cls.name[0].toUpperCase()}
                      </div>
                    </div>
                    <div style={s.cardStripeGlow} />
                  </div>
                  {/* Body */}
                  <div style={s.cardBody}>
                    <h3 style={s.cardTitle}>{cls.name}</h3>
                    {cls.description
                      ? <p style={s.cardDesc}>{cls.description}</p>
                      : <p style={{ ...s.cardDesc, fontStyle:'italic', opacity:0.5 }}>No description</p>}
                    <div style={s.cardFoot}>
                      <span style={s.cardDate}>
                        {new Date(cls.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                      </span>
                      <span style={{ ...s.cardBadge, color:from, background:`${from}15`, border:`1px solid ${from}30` }}>
                        Open →
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Create New Class" sub="Set up a new classroom for your students" onClose={() => { setShowCreate(false); setError('') }}>
          {error && <ErrBox msg={error} />}
          <Field label="Class Name"><input style={s.input} placeholder="e.g. Data Structures & Algorithms" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label="Description (optional)"><textarea style={{...s.input,height:'76px',resize:'vertical'}} placeholder="What will students learn in this class?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></Field>
          <ModalFoot>
            <button style={s.btnOutline} onClick={() => { setShowCreate(false); setError('') }}>Cancel</button>
            <button style={s.btnPrimary} disabled={!form.name||createMutation.isPending} onClick={()=>createMutation.mutate(form)}>
              {createMutation.isPending ? 'Creating...' : 'Create Class'}
            </button>
          </ModalFoot>
        </Modal>
      )}

      {showJoin && (
        <Modal title="Request to Join" sub="Enter the class ID from your educator" onClose={() => { setShowJoin(false); setError('') }}>
          {error && <ErrBox msg={error} />}
          <Field label="Class ID">
            <input style={{ ...s.input, fontFamily:'var(--font-mono)', letterSpacing:'0.5px' }} placeholder="e.g. 64f2a8c1b3e9d0001a23bc45" value={joinId} onChange={e=>setJoinId(e.target.value)} />
          </Field>
          <ModalFoot>
            <button style={s.btnOutline} onClick={() => setShowJoin(false)}>Cancel</button>
            <button style={s.btnPrimary} disabled={!joinId||joinMutation.isPending} onClick={()=>joinMutation.mutate(joinId)}>
              {joinMutation.isPending ? 'Sending...' : 'Send Request'}
            </button>
          </ModalFoot>
        </Modal>
      )}
    </Layout>
  )
}

function Modal({ title, sub, onClose, children }) {
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} className="fade-up" onClick={e=>e.stopPropagation()}>
        <div style={ms.head}>
          <div><h2 style={ms.title}>{title}</h2>{sub&&<p style={ms.sub}>{sub}</p>}</div>
          <button style={ms.close} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function ModalFoot({ children }) { return <div style={ms.foot}>{children}</div> }
function Field({ label, children }) {
  return <div style={ms.field}><label style={ms.label}>{label}</label>{children}</div>
}
function ErrBox({ msg }) {
  return <div style={ms.err}><span>⚠</span>{msg}</div>
}

const ms = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'24px' },
  modal: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-lg)', padding:'0', width:'100%', maxWidth:'440px', boxShadow:'var(--shadow-xl)', overflow:'hidden' },
  head: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'28px 28px 0', marginBottom:'24px' },
  title: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'20px', fontWeight:'800', letterSpacing:'-0.3px', marginBottom:'4px' },
  sub: { color:'var(--text3)', fontSize:'13px' },
  close: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text3)', fontSize:'13px', padding:'5px 8px', lineHeight:1, flexShrink:0, marginTop:'2px' },
  field: { display:'flex', flexDirection:'column', gap:'7px', marginBottom:'16px', padding:'0 28px' },
  label: { color:'var(--text3)', fontSize:'11px', fontWeight:'700', letterSpacing:'0.7px', textTransform:'uppercase' },
  foot: { display:'flex', gap:'10px', justifyContent:'flex-end', padding:'20px 28px', borderTop:'1px solid var(--border)', marginTop:'8px' },
  err: { background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.2)', color:'#fca5a5', borderRadius:'var(--r)', padding:'10px 14px', fontSize:'13px', margin:'0 28px 16px', display:'flex', gap:'8px', alignItems:'center' },
}

const s = {
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'32px', gap:'16px', flexWrap:'wrap' },
  heading: { fontFamily:'var(--font-head)', fontSize:'30px', fontWeight:'900', color:'var(--text)', letterSpacing:'-0.6px', marginBottom:'4px' },
  sub: { color:'var(--text3)', fontSize:'14px' },
  headerActions: { display:'flex', gap:'10px' },
  btnPrimary: { background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', border:'none', borderRadius:'var(--r)', padding:'10px 18px', fontSize:'14px', fontWeight:'600', boxShadow:'0 4px 16px rgba(129,140,248,0.25)', transition:'all 0.2s', fontFamily:'var(--font-body)' },
  btnOutline: { background:'transparent', color:'var(--text2)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'10px 16px', fontSize:'14px', fontFamily:'var(--font-body)', transition:'all 0.2s' },
  input: { background:'rgba(255,255,255,0.04)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'12px 14px', color:'var(--text)', fontSize:'14px', width:'100%', fontFamily:'var(--font-body)', transition:'all 0.2s' },

  skeletonGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' },
  skeletonCard: { height:'200px' },

  empty: { display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', padding:'80px 40px', border:'1px dashed var(--border2)', borderRadius:'var(--r-lg)', textAlign:'center' },
  emptyArt: { fontSize:'52px', lineHeight:1, marginBottom:'4px' },
  emptyTitle: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'20px', fontWeight:'800' },
  emptyDesc: { color:'var(--text3)', fontSize:'14px', maxWidth:'340px', lineHeight:'1.65', marginBottom:'8px' },

  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' },
  card: { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden', cursor:'pointer', transition:'transform 0.2s, box-shadow 0.2s, border-color 0.2s' },
  cardStripe: { height:'6px', position:'relative' },
  cardStripeGlow: { position:'absolute', inset:0, opacity:0.4 },
  cardAvatarWrap: { position:'absolute', top:'-2px', left:'20px' },
  cardAvatar: { width:'44px', height:'44px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'20px', fontFamily:'var(--font-head)', fontWeight:'900', border:'2px solid var(--bg3)', marginTop:'8px', boxShadow:'var(--shadow)' },
  cardBody: { padding:'16px 20px 20px', paddingTop:'22px' },
  cardTitle: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'16px', fontWeight:'800', marginBottom:'7px', letterSpacing:'-0.2px', marginTop:'4px' },
  cardDesc: { color:'var(--text3)', fontSize:'13px', lineHeight:'1.55', marginBottom:'16px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  cardFoot: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  cardDate: { color:'var(--text4)', fontSize:'12px', fontFamily:'var(--font-mono)' },
  cardBadge: { fontSize:'12px', fontWeight:'700', padding:'3px 10px', borderRadius:'20px' },
}