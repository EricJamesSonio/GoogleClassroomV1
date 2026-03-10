import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClassDetail, inviteStudent, getJoinRequests, acceptJoinReq, rejectJoinReq } from '../../api/classes'
import { getClassMeetings, createMeeting, inviteAllToMeeting } from '../../api/meetings'
import useAuthStore from '../../store/authStore'
import Layout from '../../components/Layout'

export default function ClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isEdu = user?.role === 'educator'

  const [tab, setTab] = useState('members')
  const [showInvite,  setShowInvite]  = useState(false)
  const [showMeeting, setShowMeeting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg,   setInviteMsg]   = useState('')
  const [meetForm,    setMeetForm]    = useState({ title:'', start_in_minutes:'', scheduled_at:'' })
  const [schedMode,   setSchedMode]   = useState('relative')
  const [meetError,   setMeetError]   = useState('')

  const { data:cls, isLoading } = useQuery({ queryKey:['class',classId], queryFn:()=>getClassDetail(classId).then(r=>r.data) })
  const { data:meetings=[] } = useQuery({ queryKey:['meetings',classId], queryFn:()=>getClassMeetings(classId).then(r=>r.data), refetchInterval:10000 })
  const { data:requests=[] } = useQuery({ queryKey:['joinRequests',classId], queryFn:()=>getJoinRequests(classId).then(r=>r.data), enabled:isEdu })

  const inviteMutation    = useMutation({ mutationFn:(email)=>inviteStudent(classId,{email}), onSuccess:()=>{setInviteMsg('✅ Sent!');setInviteEmail('')}, onError:(e)=>setInviteMsg('❌ '+(e.response?.data?.detail||'Failed')) })
  const meetMutation      = useMutation({ mutationFn:(d)=>createMeeting(classId,d), onSuccess:()=>{qc.invalidateQueries(['meetings',classId]);setShowMeeting(false);setMeetForm({title:'',start_in_minutes:'',scheduled_at:''});setMeetError('')}, onError:(e)=>setMeetError(e.response?.data?.detail||'Failed') })
  const inviteAllMutation = useMutation({ mutationFn:inviteAllToMeeting, onSuccess:()=>alert('All students invited!') })
  const acceptMutation    = useMutation({ mutationFn:acceptJoinReq, onSuccess:()=>{qc.invalidateQueries(['joinRequests',classId]);qc.invalidateQueries(['class',classId])} })
  const rejectMutation    = useMutation({ mutationFn:rejectJoinReq, onSuccess:()=>qc.invalidateQueries(['joinRequests',classId]) })

  const handleCreateMeeting = () => {
    if (!meetForm.title.trim()) return
    const payload = { title: meetForm.title }
    if (schedMode==='relative') payload.start_in_minutes = parseInt(meetForm.start_in_minutes)
    else payload.scheduled_at = new Date(meetForm.scheduled_at).toISOString()
    meetMutation.mutate(payload)
  }

  const liveMeetings = meetings.filter(m=>m.status==='live')
  const educators = cls?.members?.filter(m=>m.role==='educator')||[]
  const students  = cls?.members?.filter(m=>m.role==='student') ||[]

  const tabs = [
    { key:'members',  label:'Members',  count:cls?.members?.length||0 },
    { key:'meetings', label:'Meetings', count:meetings.length },
    ...(isEdu ? [{ key:'requests', label:'Requests', count:requests.length }] : []),
  ]

  if (isLoading) return <Layout><div style={{color:'var(--text3)',padding:'80px',textAlign:'center'}}>Loading class...</div></Layout>

  return (
    <Layout>
      <div className="fade-up">
        <button style={s.back} onClick={()=>navigate('/classes')}>← Back to Classes</button>

        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroLeft}>
            <div style={s.heroAvatar}>{cls.name[0].toUpperCase()}</div>
            <div>
              <h1 style={s.heroTitle}>{cls.name}</h1>
              {cls.description && <p style={s.heroDesc}>{cls.description}</p>}
              <div style={s.heroPills}>
                <span style={s.pill}>👥 {cls.members?.length||0} members</span>
                <span style={s.pill}>🎥 {meetings.length} meetings</span>
                {liveMeetings.length>0 && <span style={{...s.pill,...s.pillLive}}><span style={s.liveDotSm}/>Live now</span>}
              </div>
            </div>
          </div>
          {isEdu && (
            <div style={s.heroActions}>
              <button style={s.btnSec} onClick={()=>setShowInvite(true)}>+ Invite Student</button>
              <button style={s.btnPri} onClick={()=>setShowMeeting(true)}>+ New Meeting</button>
            </div>
          )}
        </div>

        {/* Class ID row */}
        <div style={s.idRow}>
          <span style={s.idLabel}>Class ID</span>
          <code style={s.idValue}>{cls.id}</code>
          <button style={s.copyBtn} onClick={()=>{navigator.clipboard.writeText(cls.id);alert('Copied!')}}>Copy</button>
        </div>

        {/* Live banner */}
        {liveMeetings.length>0 && (
          <div style={s.liveBanner}>
            <span style={s.livePulse} />
            <span style={s.liveBannerText}><strong>{liveMeetings[0].title}</strong> is live right now</span>
            <button style={s.liveJoinBtn} onClick={()=>navigate(`/meetings/${liveMeetings[0].id}`)}>Join →</button>
          </div>
        )}

        {/* Tabs */}
        <div style={s.tabs}>
          {tabs.map(t=>(
            <button key={t.key} style={{...s.tab,...(tab===t.key?s.tabActive:{})}} onClick={()=>setTab(t.key)}>
              {t.label}
              {t.count>0 && <span style={{...s.tabBadge,...(tab===t.key?s.tabBadgeActive:{})}}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {tab==='members' && (
          <div style={s.list}>
            {educators.length>0 && <>
              <SectionLabel>{`Educators · ${educators.length}`}</SectionLabel>
              {educators.map(m=><MemberCard key={m.user_id} m={m} isEdu />)}
            </>}
            {students.length>0 && <>
              <SectionLabel>{`Students · ${students.length}`}</SectionLabel>
              {students.map(m=><MemberCard key={m.user_id} m={m} />)}
            </>}
            {!cls.members?.length && <Empty icon="👥" text="No members yet" />}
          </div>
        )}

        {/* Meetings tab */}
        {tab==='meetings' && (
          <div style={s.list}>
            {meetings.length===0
              ? <Empty icon="🎥" text="No meetings scheduled yet" action={isEdu && <button style={s.btnPri} onClick={()=>setShowMeeting(true)}>Schedule First</button>} />
              : meetings.map(m=>(
                <div key={m.id} style={s.meetCard}>
                  <div style={{...s.meetStatus,...STATUS_STYLE[m.status||'ended']}}>
                    {m.status==='live' && <span style={s.liveDotSm}/>}
                    {STATUS_LABEL[m.status||'ended']}
                  </div>
                  <div style={s.meetInfo}>
                    <div style={s.meetTitle}>{m.title}</div>
                    <div style={s.meetTime}>{new Date(m.scheduled_at).toLocaleString()}</div>
                  </div>
                  <div style={s.meetActions}>
                    {isEdu && m.status!=='ended' && (
                      <button style={s.inviteAllBtn} disabled={inviteAllMutation.isPending} onClick={()=>inviteAllMutation.mutate(m.id)}>📩 Invite all</button>
                    )}
                    {m.status==='live' && (
                      <button style={s.joinMeetBtn} onClick={()=>navigate(`/meetings/${m.id}`)}>Join Live →</button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Requests tab */}
        {tab==='requests' && isEdu && (
          <div style={s.list}>
            {requests.length===0
              ? <Empty icon="📬" text="No pending join requests" />
              : requests.map(req=>(
                <div key={req.id} style={s.reqCard}>
                  <div style={s.reqAvatar}>{req.student_name[0].toUpperCase()}</div>
                  <div style={s.reqInfo}>
                    <div style={s.reqName}>{req.student_name}</div>
                    <div style={s.reqEmail}>{req.student_email}</div>
                  </div>
                  <div style={s.reqActions}>
                    <button style={s.rejectBtn} onClick={()=>rejectMutation.mutate(req.id)}>Reject</button>
                    <button style={s.acceptBtn} onClick={()=>acceptMutation.mutate(req.id)}>Accept</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <Overlay onClose={()=>{setShowInvite(false);setInviteMsg('')}}>
          <MHead title="Invite Student" sub="Send a class invitation by email" onClose={()=>{setShowInvite(false);setInviteMsg('')}} />
          {inviteMsg && <div style={{...s.msgBox, color:inviteMsg.startsWith('✅')?'var(--green)':'var(--red)', borderColor:inviteMsg.startsWith('✅')?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'}}>{inviteMsg}</div>}
          <MField label="Email Address"><input style={s.input} type="email" placeholder="student@example.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&inviteMutation.mutate(inviteEmail)} /></MField>
          <MFoot>
            <button style={s.btnSec} onClick={()=>{setShowInvite(false);setInviteMsg('')}}>Close</button>
            <button style={s.btnPri} disabled={!inviteEmail||inviteMutation.isPending} onClick={()=>inviteMutation.mutate(inviteEmail)}>{inviteMutation.isPending?'Sending...':'Send Invite'}</button>
          </MFoot>
        </Overlay>
      )}

      {/* Meeting modal */}
      {showMeeting && (
        <Overlay onClose={()=>{setShowMeeting(false);setMeetError('')}}>
          <MHead title="Schedule Meeting" sub="Create a live video session for this class" onClose={()=>{setShowMeeting(false);setMeetError('')}} />
          {meetError && <div style={s.errBox}>{meetError}</div>}
          <MField label="Meeting Title"><input style={s.input} placeholder="e.g. Lecture 4: Binary Trees" value={meetForm.title} onChange={e=>setMeetForm({...meetForm,title:e.target.value})} /></MField>
          <MField label="When">
            <div style={s.segmented}>
              <button style={{...s.seg,...(schedMode==='relative'?s.segActive:{})}} onClick={()=>setSchedMode('relative')}>⏱ In X minutes</button>
              <button style={{...s.seg,...(schedMode==='datetime'?s.segActive:{})}} onClick={()=>setSchedMode('datetime')}>📅 Pick date & time</button>
            </div>
          </MField>
          {schedMode==='relative'
            ? <MField label="Minutes from now"><input style={s.input} type="number" min="1" placeholder="e.g. 15" value={meetForm.start_in_minutes} onChange={e=>setMeetForm({...meetForm,start_in_minutes:e.target.value})} /></MField>
            : <MField label="Date & Time"><input style={s.input} type="datetime-local" value={meetForm.scheduled_at} onChange={e=>setMeetForm({...meetForm,scheduled_at:e.target.value})} /></MField>
          }
          <MFoot>
            <button style={s.btnSec} onClick={()=>{setShowMeeting(false);setMeetError('')}}>Cancel</button>
            <button style={s.btnPri} disabled={!meetForm.title||meetMutation.isPending} onClick={handleCreateMeeting}>{meetMutation.isPending?'Scheduling...':'Schedule Meeting'}</button>
          </MFoot>
        </Overlay>
      )}
    </Layout>
  )
}

const STATUS_STYLE = {
  live:      { background:'var(--green-bg)', color:'var(--green)', border:'1px solid rgba(74,222,128,0.2)' },
  scheduled: { background:'rgba(251,191,36,0.08)', color:'var(--yellow)', border:'1px solid rgba(251,191,36,0.2)' },
  ended:     { background:'var(--surface)', color:'var(--text3)', border:'1px solid var(--border)' },
}
const STATUS_LABEL = { live:'Live', scheduled:'Scheduled', ended:'Ended' }

function SectionLabel({ children }) {
  return <div style={{ color:'var(--text4)', fontSize:'11px', fontWeight:'700', letterSpacing:'0.8px', textTransform:'uppercase', padding:'12px 0 6px' }}>{children}</div>
}
function MemberCard({ m, isEdu }) {
  return (
    <div style={s.memberCard}>
      <div style={{ ...s.memberAvatar, ...(isEdu ? {background:'linear-gradient(135deg,#f59e0b,#d97706)'} : {background:'linear-gradient(135deg,#818cf8,#6366f1)'}) }}>
        {m.name[0].toUpperCase()}
      </div>
      <div style={s.memberInfo}>
        <div style={s.memberName}>{m.name}</div>
        <div style={s.memberEmail}>{m.email}</div>
      </div>
      <div style={{ ...s.memberBadge, ...(isEdu ? {color:'var(--edu)',background:'var(--edu-bg)',border:'1px solid var(--edu-border)'} : {color:'var(--stu)',background:'var(--stu-bg)',border:'1px solid var(--stu-border)'}) }}>
        {isEdu ? 'Educator' : 'Student'}
      </div>
    </div>
  )
}
function Empty({ icon, text, action }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', padding:'60px 40px', border:'1px dashed var(--border2)', borderRadius:'var(--r-md)', textAlign:'center' }}>
      <span style={{fontSize:'36px'}}>{icon}</span>
      <p style={{ color:'var(--text3)', fontSize:'14px' }}>{text}</p>
      {action}
    </div>
  )
}
function Overlay({ onClose, children }) {
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} className="fade-up" onClick={e=>e.stopPropagation()}>{children}</div>
    </div>
  )
}
function MHead({ title, sub, onClose }) {
  return (
    <div style={ms.head}>
      <div><h2 style={ms.title}>{title}</h2>{sub&&<p style={ms.sub}>{sub}</p>}</div>
      <button style={ms.close} onClick={onClose}>✕</button>
    </div>
  )
}
function MField({ label, children }) {
  return <div style={ms.field}><label style={ms.label}>{label}</label>{children}</div>
}
function MFoot({ children }) { return <div style={ms.foot}>{children}</div> }

const ms = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'24px' },
  modal: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:'440px', boxShadow:'var(--shadow-xl)', overflow:'hidden' },
  head: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'28px 28px 0', marginBottom:'22px' },
  title: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'20px', fontWeight:'800', letterSpacing:'-0.3px', marginBottom:'5px' },
  sub: { color:'var(--text3)', fontSize:'13px' },
  close: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'6px', color:'var(--text3)', fontSize:'13px', padding:'5px 8px', lineHeight:1, flexShrink:0 },
  field: { display:'flex', flexDirection:'column', gap:'7px', marginBottom:'16px', padding:'0 28px' },
  label: { color:'var(--text3)', fontSize:'11px', fontWeight:'700', letterSpacing:'0.7px', textTransform:'uppercase' },
  foot: { display:'flex', gap:'10px', justifyContent:'flex-end', padding:'20px 28px', borderTop:'1px solid var(--border)', marginTop:'8px' },
}

const s = {
  back: { background:'none', border:'none', color:'var(--text3)', fontSize:'13px', cursor:'pointer', padding:'0', marginBottom:'24px', fontFamily:'var(--font-body)', display:'flex', alignItems:'center', gap:'4px' },
  hero: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'24px', flexWrap:'wrap', marginBottom:'20px' },
  heroLeft: { display:'flex', alignItems:'center', gap:'18px', flex:1 },
  heroAvatar: { width:'60px', height:'60px', borderRadius:'16px', background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px', fontFamily:'var(--font-head)', fontWeight:'900', flexShrink:0 },
  heroTitle: { fontFamily:'var(--font-head)', fontSize:'26px', fontWeight:'900', color:'var(--text)', letterSpacing:'-0.5px', marginBottom:'5px' },
  heroDesc: { color:'var(--text3)', fontSize:'14px', marginBottom:'10px', lineHeight:'1.5' },
  heroPills: { display:'flex', gap:'8px', flexWrap:'wrap' },
  pill: { background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'20px', padding:'4px 12px', color:'var(--text3)', fontSize:'12px' },
  pillLive: { background:'var(--green-bg)', color:'var(--green)', border:'1px solid rgba(74,222,128,0.2)', display:'flex', alignItems:'center', gap:'6px' },
  liveDotSm: { width:'6px', height:'6px', borderRadius:'50%', background:'currentColor', display:'inline-block', animation:'blink 1.2s infinite' },
  heroActions: { display:'flex', gap:'10px', flexShrink:0 },
  idRow: { display:'flex', alignItems:'center', gap:'10px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'10px 16px', marginBottom:'14px' },
  idLabel: { color:'var(--text4)', fontSize:'11px', fontWeight:'700', letterSpacing:'0.5px', textTransform:'uppercase', flexShrink:0 },
  idValue: { color:'var(--text2)', fontSize:'13px', fontFamily:'var(--font-mono)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  copyBtn: { background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', color:'var(--text3)', fontSize:'12px', padding:'4px 10px', fontFamily:'var(--font-body)' },
  liveBanner: { display:'flex', alignItems:'center', gap:'12px', background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:'var(--r)', padding:'12px 16px', marginBottom:'20px' },
  livePulse: { width:'8px', height:'8px', borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)', flexShrink:0, animation:'blink 1.2s infinite', display:'inline-block' },
  liveBannerText: { flex:1, color:'var(--text2)', fontSize:'14px' },
  liveJoinBtn: { background:'var(--green)', color:'#052e16', border:'none', borderRadius:'var(--r-sm)', padding:'8px 16px', fontSize:'13px', fontWeight:'800', fontFamily:'var(--font-body)' },
  tabs: { display:'flex', gap:'0', marginBottom:'20px', borderBottom:'1px solid var(--border)' },
  tab: { background:'none', border:'none', color:'var(--text3)', fontSize:'14px', fontWeight:'500', padding:'10px 16px', cursor:'pointer', borderBottom:'2px solid transparent', marginBottom:'-1px', display:'flex', alignItems:'center', gap:'7px', fontFamily:'var(--font-body)', transition:'color 0.15s' },
  tabActive: { color:'var(--text)', borderBottomColor:'var(--stu)', fontWeight:'700' },
  tabBadge: { background:'var(--surface2)', borderRadius:'20px', padding:'2px 7px', fontSize:'11px', color:'var(--text3)' },
  tabBadgeActive: { background:'var(--stu-bg)', color:'var(--stu)' },
  list: { display:'flex', flexDirection:'column', gap:'6px' },
  memberCard: { display:'flex', alignItems:'center', gap:'12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'12px 16px', transition:'border-color 0.15s' },
  memberAvatar: { width:'34px', height:'34px', borderRadius:'8px', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'14px', fontFamily:'var(--font-head)', flexShrink:0 },
  memberInfo: { flex:1 },
  memberName: { color:'var(--text)', fontSize:'14px', fontWeight:'600', marginBottom:'2px' },
  memberEmail: { color:'var(--text3)', fontSize:'12px' },
  memberBadge: { fontSize:'11px', fontWeight:'700', padding:'3px 10px', borderRadius:'20px' },
  meetCard: { display:'flex', alignItems:'center', gap:'12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'14px 18px', flexWrap:'wrap' },
  meetStatus: { borderRadius:'6px', padding:'4px 10px', fontSize:'11px', fontWeight:'700', display:'flex', alignItems:'center', gap:'6px', flexShrink:0 },
  meetInfo: { flex:1 },
  meetTitle: { color:'var(--text)', fontSize:'14px', fontWeight:'600', marginBottom:'3px' },
  meetTime: { color:'var(--text3)', fontSize:'12px', fontFamily:'var(--font-mono)' },
  meetActions: { display:'flex', gap:'8px', flexShrink:0 },
  inviteAllBtn: { background:'var(--stu-bg)', border:'1px solid var(--stu-border)', color:'var(--stu)', borderRadius:'var(--r-sm)', padding:'7px 12px', fontSize:'12px', fontWeight:'600', fontFamily:'var(--font-body)' },
  joinMeetBtn: { background:'var(--green)', color:'#052e16', border:'none', borderRadius:'var(--r-sm)', padding:'7px 14px', fontSize:'13px', fontWeight:'800', fontFamily:'var(--font-body)' },
  reqCard: { display:'flex', alignItems:'center', gap:'12px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'12px 16px' },
  reqAvatar: { width:'34px', height:'34px', borderRadius:'8px', background:'var(--surface2)', color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'14px', fontFamily:'var(--font-head)', flexShrink:0 },
  reqInfo: { flex:1 },
  reqName: { color:'var(--text)', fontSize:'14px', fontWeight:'600', marginBottom:'2px' },
  reqEmail: { color:'var(--text3)', fontSize:'12px' },
  reqActions: { display:'flex', gap:'8px' },
  acceptBtn: { background:'var(--green-bg)', border:'1px solid rgba(74,222,128,0.2)', color:'var(--green)', borderRadius:'var(--r-sm)', padding:'7px 14px', fontSize:'13px', fontWeight:'600', fontFamily:'var(--font-body)' },
  rejectBtn: { background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.2)', color:'var(--red)', borderRadius:'var(--r-sm)', padding:'7px 14px', fontSize:'13px', fontFamily:'var(--font-body)' },
  btnPri: { background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', border:'none', borderRadius:'var(--r)', padding:'10px 18px', fontSize:'14px', fontWeight:'600', boxShadow:'0 4px 16px rgba(129,140,248,0.2)', fontFamily:'var(--font-body)' },
  btnSec: { background:'transparent', color:'var(--text2)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'10px 16px', fontSize:'14px', fontFamily:'var(--font-body)' },
  input: { background:'rgba(255,255,255,0.04)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'12px 14px', color:'var(--text)', fontSize:'14px', width:'100%', fontFamily:'var(--font-body)', transition:'all 0.2s' },
  segmented: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' },
  seg: { padding:'10px 12px', borderRadius:'var(--r)', border:'1px solid var(--border2)', background:'var(--surface)', color:'var(--text3)', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-body)', transition:'all 0.2s' },
  segActive: { background:'var(--stu-bg)', border:'1px solid var(--stu-border)', color:'var(--stu)', fontWeight:'600' },
  msgBox: { background:'var(--surface)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:'13px', margin:'0 28px 16px', border:'1px solid var(--border)' },
  errBox: { background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.2)', color:'#fca5a5', borderRadius:'var(--r)', padding:'10px 14px', fontSize:'13px', margin:'0 28px 16px', display:'flex', gap:'8px' },
}