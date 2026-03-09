import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClassDetail, inviteStudent, getJoinRequests, acceptJoinReq, rejectJoinReq } from '../../api/classes'
import { getClassMeetings, createMeeting, inviteAllToMeeting } from '../../api/meetings'
import useAuthStore from '../../store/authStore'

export default function ClassDetailPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isEducator = user?.role === 'educator'

  const [activeTab, setActiveTab]         = useState('members')
  const [showInvite, setShowInvite]       = useState(false)
  const [showMeeting, setShowMeeting]     = useState(false)
  const [inviteEmail, setInviteEmail]     = useState('')
  const [inviteMsg, setInviteMsg]         = useState('')
  const [meetingForm, setMeetingForm]     = useState({ title: '', start_in_minutes: '', scheduled_at: '' })
  const [scheduleMode, setScheduleMode]   = useState('relative')
  const [meetingError, setMeetingError]   = useState('')

  // ── Queries ───────────────────────────────────────────────
  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => getClassDetail(classId).then(r => r.data),
  })

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', classId],
    queryFn: () => getClassMeetings(classId).then(r => r.data),
    refetchInterval: 10000,
  })

  const { data: joinRequests = [] } = useQuery({
    queryKey: ['joinRequests', classId],
    queryFn: () => getJoinRequests(classId).then(r => r.data),
    enabled: isEducator,
  })

  // ── Mutations ─────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: (email) => inviteStudent(classId, { email }),
    onSuccess: () => { setInviteMsg('✅ Invitation sent!'); setInviteEmail('') },
    onError: (e) => setInviteMsg('❌ ' + (e.response?.data?.detail || 'Failed')),
  })

  const meetingMutation = useMutation({
    mutationFn: (data) => createMeeting(classId, data),
    onSuccess: () => {
      qc.invalidateQueries(['meetings', classId])
      setShowMeeting(false)
      setMeetingForm({ title: '', start_in_minutes: '', scheduled_at: '' })
      setMeetingError('')
    },
    onError: (e) => setMeetingError(e.response?.data?.detail || 'Failed to create meeting'),
  })

  const inviteAllMutation = useMutation({
    mutationFn: (meetingId) => inviteAllToMeeting(meetingId),
    onSuccess: () => alert('All students invited!'),
    onError: (e) => alert(e.response?.data?.detail || 'Failed to invite'),
  })

  const acceptMutation = useMutation({
    mutationFn: acceptJoinReq,
    onSuccess: () => { qc.invalidateQueries(['joinRequests', classId]); qc.invalidateQueries(['class', classId]) },
  })

  const rejectMutation = useMutation({
    mutationFn: rejectJoinReq,
    onSuccess: () => qc.invalidateQueries(['joinRequests', classId]),
  })

  const handleCreateMeeting = () => {
    if (!meetingForm.title.trim()) return
    const payload = { title: meetingForm.title }
    if (scheduleMode === 'relative') {
      if (!meetingForm.start_in_minutes) { setMeetingError('Please enter minutes'); return }
      payload.start_in_minutes = parseInt(meetingForm.start_in_minutes)
    } else {
      if (!meetingForm.scheduled_at) { setMeetingError('Please pick a date/time'); return }
      payload.scheduled_at = new Date(meetingForm.scheduled_at).toISOString()
    }
    meetingMutation.mutate(payload)
  }

  // ── Helpers ───────────────────────────────────────────────
  const statusColor = { live: '#4ade80', scheduled: '#facc15', ended: 'rgba(255,255,255,0.25)' }
  const statusLabel = { live: '🔴 LIVE', scheduled: '⏳ Scheduled', ended: '✅ Ended' }

  if (isLoading) return <div style={s.loadingPage}>Loading class...</div>
  if (!cls) return <div style={s.loadingPage}>Class not found</div>

  const educators = cls.members?.filter(m => m.role === 'educator') || []
  const students  = cls.members?.filter(m => m.role === 'student')  || []
  const liveMeetings = meetings.filter(m => m.status === 'live')

  const tabs = [
    { key: 'members',  label: `👥 Members (${cls.members?.length || 0})` },
    { key: 'meetings', label: `🎥 Meetings (${meetings.length})` },
    ...(isEducator ? [{ key: 'requests', label: `📋 Requests (${joinRequests.length})` }] : []),
  ]

  return (
    <div style={s.page}>

      {/* Nav */}
      <nav style={s.nav}>
        <button style={s.backBtn} onClick={() => navigate('/classes')}>← Classes</button>
        <div style={s.navLogo}>🎓 <span style={s.navLogoText}>ClassRoom</span></div>
        <div style={s.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
      </nav>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroLeft}>
          <div style={s.heroIcon}>{cls.name[0].toUpperCase()}</div>
          <div>
            <h1 style={s.heroTitle}>{cls.name}</h1>
            {cls.description && <p style={s.heroDesc}>{cls.description}</p>}
            <div style={s.heroBadges}>
              <span style={s.badge}>👥 {cls.members?.length || 0} members</span>
              {liveMeetings.length > 0 && (
                <span style={{ ...s.badge, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                  🔴 {liveMeetings.length} live now
                </span>
              )}
            </div>
          </div>
        </div>
        {isEducator && (
          <div style={s.heroActions}>
            <button style={s.secondaryBtn} onClick={() => setShowInvite(true)}>+ Invite Student</button>
            <button style={s.primaryBtn}   onClick={() => setShowMeeting(true)}>+ New Meeting</button>
          </div>
        )}
      </div>

      {/* Live meeting banner */}
      {liveMeetings.length > 0 && (
        <div style={s.liveBanner}>
          <div style={s.livePulse} />
          <span style={s.liveBannerText}>
            <strong>{liveMeetings[0].title}</strong> is live now!
          </span>
          <button style={s.joinBannerBtn} onClick={() => navigate(`/meetings/${liveMeetings[0].id}`)}>
            Join Meeting →
          </button>
        </div>
      )}

      <div style={s.content}>
        {/* Tabs */}
        <div style={s.tabs}>
          {tabs.map(t => (
            <button key={t.key}
              style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Members tab ── */}
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
            {cls.members?.length === 0 && <div style={s.empty}>No members yet</div>}
          </div>
        )}

        {/* ── Meetings tab ── */}
        {activeTab === 'meetings' && (
          <div style={s.section}>
            {meetings.length === 0 ? (
              <div style={s.emptyMeetings}>
                <div style={{ fontSize: '40px' }}>🎥</div>
                <p style={s.emptyText}>No meetings yet.</p>
                {isEducator && (
                  <button style={s.primaryBtn} onClick={() => setShowMeeting(true)}>
                    + Schedule First Meeting
                  </button>
                )}
              </div>
            ) : (
              meetings.map(m => (
                <div key={m.id} style={s.meetingCard}>
                  <div style={s.meetingLeft}>
                    <div style={{ ...s.statusDot, background: statusColor[m.status] || '#fff',
                      boxShadow: m.status === 'live' ? `0 0 8px ${statusColor.live}` : 'none' }} />
                    <div>
                      <div style={s.meetingTitle}>{m.title}</div>
                      <div style={s.meetingMeta}>
                        <span style={{ color: statusColor[m.status], fontSize: '12px', fontWeight: '600' }}>
                          {statusLabel[m.status] || m.status}
                        </span>
                        <span style={s.meetingTime}>
                          {new Date(m.scheduled_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={s.meetingActions}>
                    {/* Educator controls */}
                    {isEducator && m.status === 'scheduled' && (
                      <button style={s.inviteAllBtn}
                        onClick={() => inviteAllMutation.mutate(m.id)}
                        disabled={inviteAllMutation.isPending}>
                        📩 Invite All Students
                      </button>
                    )}
                    {isEducator && m.status === 'live' && (
                      <button style={s.inviteAllBtn}
                        onClick={() => inviteAllMutation.mutate(m.id)}
                        disabled={inviteAllMutation.isPending}>
                        📩 Invite All
                      </button>
                    )}
                    {/* Join button */}
                    {m.status === 'live' && (
                      <button style={s.joinBtn} onClick={() => navigate(`/meetings/${m.id}`)}>
                        Join →
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Join Requests tab ── */}
        {activeTab === 'requests' && isEducator && (
          <div style={s.section}>
            {joinRequests.length === 0 ? (
              <div style={s.empty}>No pending join requests</div>
            ) : joinRequests.map(req => (
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

      {/* ── Invite Student Modal ── */}
      {showInvite && (
        <div style={s.overlay} onClick={() => { setShowInvite(false); setInviteMsg('') }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Invite Student</h2>
            <p style={s.modalSub}>Enter the student's email address to send an invitation</p>
            {inviteMsg && (
              <div style={{ ...s.msgBox,
                color: inviteMsg.startsWith('✅') ? '#43e97b' : '#ff8080',
                borderColor: inviteMsg.startsWith('✅') ? 'rgba(67,233,122,0.3)' : 'rgba(255,80,80,0.3)' }}>
                {inviteMsg}
              </div>
            )}
            <div style={s.field}>
              <label style={s.label}>Student Email</label>
              <input style={s.input} type="email" placeholder="stud1@gmail.com"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && inviteMutation.mutate(inviteEmail)} />
            </div>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => { setShowInvite(false); setInviteMsg('') }}>Close</button>
              <button style={s.primaryBtn} disabled={inviteMutation.isPending || !inviteEmail}
                onClick={() => inviteMutation.mutate(inviteEmail)}>
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Meeting Modal ── */}
      {showMeeting && (
        <div style={s.overlay} onClick={() => { setShowMeeting(false); setMeetingError('') }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Schedule Meeting</h2>
            <p style={s.modalSub}>Create a video meeting for this class</p>

            {meetingError && (
              <div style={{ ...s.msgBox, color: '#ff8080', borderColor: 'rgba(255,80,80,0.3)' }}>
                ❌ {meetingError}
              </div>
            )}

            <div style={s.field}>
              <label style={s.label}>Meeting Title</label>
              <input style={s.input} placeholder="e.g. Lecture 3: Arrays & Loops"
                value={meetingForm.title}
                onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })} />
            </div>

            <div style={s.field}>
              <label style={s.label}>Schedule Type</label>
              <div style={s.toggleRow}>
                <button
                  style={{ ...s.toggleBtn, ...(scheduleMode === 'relative' ? s.toggleActive : {}) }}
                  onClick={() => setScheduleMode('relative')}>
                  ⏱ In X minutes
                </button>
                <button
                  style={{ ...s.toggleBtn, ...(scheduleMode === 'datetime' ? s.toggleActive : {}) }}
                  onClick={() => setScheduleMode('datetime')}>
                  📅 Pick date & time
                </button>
              </div>
            </div>

            {scheduleMode === 'relative' ? (
              <div style={s.field}>
                <label style={s.label}>Start in (minutes)</label>
                <input style={s.input} type="number" min="1" placeholder="e.g. 30"
                  value={meetingForm.start_in_minutes}
                  onChange={e => setMeetingForm({ ...meetingForm, start_in_minutes: e.target.value })} />
                <span style={s.hint}>Meeting goes live automatically after this many minutes</span>
              </div>
            ) : (
              <div style={s.field}>
                <label style={s.label}>Date & Time</label>
                <input style={s.input} type="datetime-local"
                  value={meetingForm.scheduled_at}
                  onChange={e => setMeetingForm({ ...meetingForm, scheduled_at: e.target.value })} />
              </div>
            )}

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => { setShowMeeting(false); setMeetingError('') }}>Cancel</button>
              <button style={s.primaryBtn}
                disabled={meetingMutation.isPending || !meetingForm.title}
                onClick={handleCreateMeeting}>
                {meetingMutation.isPending ? 'Scheduling...' : 'Schedule Meeting'}
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
      <div style={s.rolePill}>{member.role === 'educator' ? '📚 Educator' : '🎒 Student'}</div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#0f0c29', fontFamily: "'Arial', sans-serif" },
  loadingPage: { minHeight: '100vh', background: '#0f0c29', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: "'Arial', sans-serif" },

  // Nav
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  backBtn: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '14px', cursor: 'pointer', padding: '4px 0', fontFamily: "'Arial', sans-serif" },
  navLogo: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: '#fff', fontWeight: '700' },
  navLogoText: { fontFamily: "'Georgia', serif" },
  avatar: { width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' },

  // Hero
  hero: { background: 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.08))', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '40px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
  heroLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  heroIcon: { width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', flexShrink: 0 },
  heroTitle: { color: '#fff', fontSize: '26px', fontWeight: '700', margin: '0 0 6px 0', fontFamily: "'Georgia', serif" },
  heroDesc: { color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 10px 0' },
  heroBadges: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  badge: { background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '4px 12px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' },
  heroActions: { display: 'flex', gap: '10px', flexShrink: 0 },

  // Live banner
  liveBanner: { background: 'rgba(74,222,128,0.08)', borderBottom: '1px solid rgba(74,222,128,0.2)', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '12px' },
  livePulse: { width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', flexShrink: 0, animation: 'pulse 1.5s infinite' },
  liveBannerText: { flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: '14px' },
  joinBannerBtn: { background: '#4ade80', color: '#0a1a0a', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },

  // Content
  content: { maxWidth: '900px', margin: '0 auto', padding: '32px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' },
  tab: { flex: 1, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Arial', sans-serif", fontWeight: '500' },
  tabActive: { background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '700' },
  section: { display: 'flex', flexDirection: 'column', gap: '4px' },
  sectionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', padding: '16px 0 8px 0' },

  // Members
  memberRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '4px' },
  memberAvatar: { width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', flexShrink: 0 },
  memberInfo: { flex: 1 },
  memberName: { color: '#fff', fontSize: '14px', fontWeight: '600' },
  memberEmail: { color: 'rgba(255,255,255,0.35)', fontSize: '12px' },
  rolePill: { background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '4px 12px', color: 'rgba(255,255,255,0.5)', fontSize: '12px' },

  // Meetings
  meetingCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.06)', gap: '12px', flexWrap: 'wrap' },
  meetingLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  statusDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  meetingTitle: { color: '#fff', fontSize: '15px', fontWeight: '600', marginBottom: '4px' },
  meetingMeta: { display: 'flex', alignItems: 'center', gap: '12px' },
  meetingTime: { color: 'rgba(255,255,255,0.35)', fontSize: '12px' },
  meetingActions: { display: 'flex', gap: '8px', flexShrink: 0 },
  inviteAllBtn: { background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  joinBtn: { background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#0a1a0a', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  emptyMeetings: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 40px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: '14px' },

  // Join requests
  reqRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '4px' },
  reqInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  reqAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(102,126,234,0.3)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' },
  reqName: { color: '#fff', fontSize: '14px', fontWeight: '600' },
  reqEmail: { color: 'rgba(255,255,255,0.35)', fontSize: '12px' },
  reqActions: { display: 'flex', gap: '8px' },
  acceptBtn: { background: 'rgba(67,233,122,0.12)', border: '1px solid rgba(67,233,122,0.3)', color: '#43e97b', borderRadius: '7px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  rejectBtn: { background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', color: '#ff8080', borderRadius: '7px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  empty: { color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '48px', fontSize: '14px' },

  // Buttons
  primaryBtn: { background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 22px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  secondaryBtn: { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '11px 18px', fontSize: '14px', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' },
  modal: { background: '#1a1733', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '440px' },
  modalTitle: { color: '#fff', fontSize: '20px', fontWeight: '700', margin: '0 0 6px 0', fontFamily: "'Georgia', serif" },
  modalSub: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 24px 0' },
  msgBox: { background: 'rgba(255,255,255,0.05)', border: '1px solid', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' },
  input: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', outline: 'none', fontFamily: "'Arial', sans-serif" },
  hint: { color: 'rgba(255,255,255,0.3)', fontSize: '12px' },
  toggleRow: { display: 'flex', gap: '8px' },
  toggleBtn: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  toggleActive: { background: 'rgba(102,126,234,0.2)', border: '1px solid rgba(102,126,234,0.4)', color: '#a78bfa', fontWeight: '700' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' },
  cancelBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: '9px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
}