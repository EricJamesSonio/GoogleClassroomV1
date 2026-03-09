import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClassDetail, inviteStudent, getJoinRequests, acceptJoinReq, rejectJoinReq } from '../../api/classes'
import useAuthStore from '../../store/authStore'

export default function ClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isEducator = user?.role === 'educator'

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [activeTab, setActiveTab] = useState('members')

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => getClassDetail(classId).then(r => r.data),
  })

  const { data: joinRequests } = useQuery({
    queryKey: ['joinRequests', classId],
    queryFn: () => getJoinRequests(classId).then(r => r.data),
    enabled: isEducator,
  })

  const inviteMutation = useMutation({
    mutationFn: (email) => inviteStudent(classId, { email }),
    onSuccess: () => { setInviteMsg('✅ Invitation sent!'); setInviteEmail('') },
    onError: (e) => setInviteMsg('❌ ' + (e.response?.data?.detail || 'Failed')),
  })

  const acceptMutation = useMutation({
    mutationFn: acceptJoinReq,
    onSuccess: () => { qc.invalidateQueries(['joinRequests', classId]); qc.invalidateQueries(['class', classId]) },
  })

  const rejectMutation = useMutation({
    mutationFn: rejectJoinReq,
    onSuccess: () => qc.invalidateQueries(['joinRequests', classId]),
  })

  if (isLoading) return <div style={s.loadingPage}>Loading class...</div>
  if (!cls) return <div style={s.loadingPage}>Class not found</div>

  const educators = cls.members?.filter(m => m.role === 'educator') || []
  const students  = cls.members?.filter(m => m.role === 'student')  || []

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard')}>← Back</button>
        <div style={s.navLogo}>🎓 <span style={s.navLogoText}>ClassRoom</span></div>
        <div style={s.navUser}>
          <div style={s.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
        </div>
      </nav>

      {/* Class hero */}
      <div style={s.hero}>
        <div style={s.heroContent}>
          <div style={s.heroIcon}>{cls.name[0].toUpperCase()}</div>
          <div>
            <h1 style={s.heroTitle}>{cls.name}</h1>
            {cls.description && <p style={s.heroDesc}>{cls.description}</p>}
            <div style={s.heroBadges}>
              <span style={s.badge}>👥 {cls.members?.length || 0} members</span>
              <span style={s.badge}>📅 Created {new Date(cls.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        {isEducator && (
          <button style={s.inviteBtn} onClick={() => setShowInvite(true)}>
            + Invite Student
          </button>
        )}
      </div>

      <div style={s.content}>
        {/* Tabs */}
        <div style={s.tabs}>
          {['members', isEducator && 'requests'].filter(Boolean).map(tab => (
            <button key={tab} style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
              onClick={() => setActiveTab(tab)}>
              {tab === 'members' ? `Members (${cls.members?.length || 0})` : `Join Requests (${joinRequests?.length || 0})`}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {activeTab === 'members' && (
          <div style={s.section}>
            {educators.length > 0 && (
              <>
                <div style={s.sectionLabel}>Educators</div>
                {educators.map(m => <MemberRow key={m.user_id} member={m} />)}
              </>
            )}
            {students.length > 0 && (
              <>
                <div style={s.sectionLabel}>Students ({students.length})</div>
                {students.map(m => <MemberRow key={m.user_id} member={m} />)}
              </>
            )}
            {cls.members?.length === 0 && (
              <div style={s.empty}>No members yet</div>
            )}
          </div>
        )}

        {/* Join requests tab */}
        {activeTab === 'requests' && isEducator && (
          <div style={s.section}>
            {joinRequests?.length === 0 ? (
              <div style={s.empty}>No pending join requests</div>
            ) : joinRequests?.map(req => (
              <div key={req.id} style={s.reqRow}>
                <div style={s.reqInfo}>
                  <div style={s.reqAvatar}>{req.student_name[0].toUpperCase()}</div>
                  <div>
                    <div style={s.reqName}>{req.student_name}</div>
                    <div style={s.reqEmail}>{req.student_email}</div>
                  </div>
                </div>
                <div style={s.reqActions}>
                  <button style={s.acceptBtn} onClick={() => acceptMutation.mutate(req.id)}>Accept</button>
                  <button style={s.rejectBtn} onClick={() => rejectMutation.mutate(req.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={s.overlay} onClick={() => { setShowInvite(false); setInviteMsg('') }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Invite Student</h2>
            <p style={s.modalSub}>Enter the student's email address</p>
            {inviteMsg && (
              <div style={{ ...s.msgBox, color: inviteMsg.startsWith('✅') ? '#43e97b' : '#ff8080', borderColor: inviteMsg.startsWith('✅') ? 'rgba(67,233,122,0.3)' : 'rgba(255,80,80,0.3)' }}>
                {inviteMsg}
              </div>
            )}
            <div style={s.field}>
              <label style={s.label}>Student Email</label>
              <input style={s.input} type="email" placeholder="stud1@gmail.com"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => { setShowInvite(false); setInviteMsg('') }}>Close</button>
              <button style={s.submitBtn} disabled={inviteMutation.isPending || !inviteEmail}
                onClick={() => inviteMutation.mutate(inviteEmail)}>
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MemberRow({ member }) {
  return (
    <div style={s.memberRow}>
      <div style={s.memberAvatar}>{member.name[0].toUpperCase()}</div>
      <div style={s.memberInfo}>
        <div style={s.memberName}>{member.name}</div>
        <div style={s.memberEmail}>{member.email}</div>
      </div>
      <div style={s.rolePill}>
        {member.role === 'educator' ? '📚 Educator' : '🎒 Student'}
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#0f0c29', fontFamily: "'Arial', sans-serif" },
  loadingPage: { minHeight: '100vh', background: '#0f0c29', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: "'Arial', sans-serif" },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  backBtn: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '14px', cursor: 'pointer', padding: '4px 0' },
  navLogo: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' },
  navLogoText: { color: '#fff', fontWeight: '700', fontFamily: "'Georgia', serif" },
  navUser: {},
  avatar: { width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' },
  hero: { background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.1))', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '40px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  heroContent: { display: 'flex', alignItems: 'center', gap: '20px' },
  heroIcon: { width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', flexShrink: 0 },
  heroTitle: { color: '#fff', fontSize: '26px', fontWeight: '700', margin: '0 0 6px 0', fontFamily: "'Georgia', serif" },
  heroDesc: { color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 12px 0' },
  heroBadges: { display: 'flex', gap: '10px' },
  badge: { background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '4px 12px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' },
  inviteBtn: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 22px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },
  content: { maxWidth: '860px', margin: '0 auto', padding: '32px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' },
  tab: { flex: 1, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  tabActive: { background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '600' },
  section: { display: 'flex', flexDirection: 'column', gap: '2px' },
  sectionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', padding: '16px 0 8px 0' },
  memberRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '4px' },
  memberAvatar: { width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', flexShrink: 0 },
  memberInfo: { flex: 1 },
  memberName: { color: '#fff', fontSize: '14px', fontWeight: '600' },
  memberEmail: { color: 'rgba(255,255,255,0.35)', fontSize: '12px' },
  rolePill: { background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '4px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '12px' },
  reqRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '4px' },
  reqInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  reqAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(102,126,234,0.3)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' },
  reqName: { color: '#fff', fontSize: '14px', fontWeight: '600' },
  reqEmail: { color: 'rgba(255,255,255,0.35)', fontSize: '12px' },
  reqActions: { display: 'flex', gap: '8px' },
  acceptBtn: { background: 'rgba(67,233,122,0.12)', border: '1px solid rgba(67,233,122,0.3)', color: '#43e97b', borderRadius: '7px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer' },
  rejectBtn: { background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', color: '#ff8080', borderRadius: '7px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer' },
  empty: { color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '48px', fontSize: '14px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' },
  modal: { background: '#1a1733', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px' },
  modalTitle: { color: '#fff', fontSize: '20px', fontWeight: '700', margin: '0 0 6px 0', fontFamily: "'Georgia', serif" },
  modalSub: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 24px 0' },
  msgBox: { background: 'rgba(255,255,255,0.05)', border: '1px solid', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '20px' },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' },
  input: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none', fontFamily: "'Arial', sans-serif" },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: '9px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' },
  submitBtn: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 22px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
}