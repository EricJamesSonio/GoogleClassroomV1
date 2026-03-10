import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import AgoraRTC from 'agora-rtc-sdk-ng'
import { getMeeting, getAgoraToken, endMeeting } from '../../api/meetings'
import useAuthStore from '../../store/authStore'

export default function MeetingRoomPage() {
  const { meetingId } = useParams()
  const { user, token: jwt } = useAuthStore()
  const navigate = useNavigate()
  const isEducator = user?.role === 'educator'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [chatOpen, setChatOpen] = useState(!isMobile)

  // Handle responsive window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 1024) setChatOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => getMeeting(meetingId).then((r) => r.data),
    refetchInterval: (data) => data?.status === 'scheduled' ? 5000 : false,
  })

  // ── Countdown ─────────────────────────────────────────────
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!meeting || meeting.status !== 'scheduled') return
    const interval = setInterval(() => {
      const diff = new Date(meeting.scheduled_at) - new Date()
      if (diff <= 0) { setCountdown('Starting...'); clearInterval(interval); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [meeting])

  // ── Agora video ───────────────────────────────────────────
  const [client] = useState(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }))
  const [localTracks, setLocalTracks] = useState({ audio: null, video: null })
  const [remoteUsers, setRemoteUsers] = useState([])
  const [joined, setJoined] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [agoraError, setAgoraError] = useState('')
  const localVideoRef = useRef(null)

  const joinVideo = useCallback(async () => {
    try {
      const res = await getAgoraToken(meetingId)
      const { token, channel, app_id, uid } = res.data

      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType)
        setRemoteUsers((prev) => {
          const exists = prev.find((u) => u.uid === remoteUser.uid)
          return exists ? prev.map((u) => u.uid === remoteUser.uid ? remoteUser : u) : [...prev, remoteUser]
        })
        if (mediaType === 'video') setTimeout(() => remoteUser.videoTrack?.play(`remote-${remoteUser.uid}`), 100)
        if (mediaType === 'audio') remoteUser.audioTrack?.play()
      })
      client.on('user-unpublished', (u) => setRemoteUsers((prev) => prev.filter((r) => r.uid !== u.uid)))
      client.on('user-left', (u) => setRemoteUsers((prev) => prev.filter((r) => r.uid !== u.uid)))

      await client.join(app_id, channel, token, uid)
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, ANS: true },
        {
          encoderConfig: {
            width: 640, height: 360,
            frameRate: 15,
            bitrateMin: 200, bitrateMax: 500,
          },
        }
      )
      setLocalTracks({ audio: audioTrack, video: videoTrack })
      await client.publish([audioTrack, videoTrack])
      if (localVideoRef.current) videoTrack.play(localVideoRef.current)
      setJoined(true)
    } catch (err) {
      setAgoraError(err.message || 'Failed to join video')
    }
  }, [client, meetingId])

  useEffect(() => {
    if (meeting?.status === 'live' && !joined) joinVideo()
  }, [meeting?.status, joined, joinVideo])

  useEffect(() => {
    return () => { localTracks.audio?.close(); localTracks.video?.close(); client.leave() }
  }, [])

  const toggleMic = async () => { if (localTracks.audio) { await localTracks.audio.setEnabled(!micOn); setMicOn(!micOn) } }
  const toggleCam = async () => { if (localTracks.video) { await localTracks.video.setEnabled(!camOn); setCamOn(!camOn) } }

  const leaveVideo = async () => {
    localTracks.audio?.close(); localTracks.video?.close()
    await client.leave()
    setJoined(false); setLocalTracks({ audio: null, video: null }); setRemoteUsers([])
  }

  const endMeetingMutation = useMutation({
    mutationFn: () => endMeeting(meetingId),
    onSuccess: async () => { await leaveVideo(); navigate(-1) },
  })

  // ── WebSocket chat ────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)
  const chatBottomRef = useRef(null)

  useEffect(() => {
    if (!meeting || meeting.status === 'ended' || !jwt) return
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL || "ws://localhost:8000"}/ws/meetings/${meetingId}?token=${jwt}`)
    wsRef.current = ws
    ws.onopen = () => setWsConnected(true)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'history') { setMessages(data.messages || []); setOnlineUsers(data.online_users || []) }
      else if (data.type === 'message') setMessages((prev) => [...prev, data])
      else if (data.type === 'user_joined' || data.type === 'user_left') setOnlineUsers(data.online_users || [])
    }
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)
    return () => ws.close()
  }, [meeting?.status, meetingId, jwt])

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = () => {
    if (!chatInput.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ message: chatInput.trim() }))
    setChatInput('')
  }

  // ── Helper function for video grid columns ────────────────
  const getGridCols = () => {
    if (isMobile) {
      return remoteUsers.length === 0 ? '1fr' : '1fr 1fr'
    }
    if (remoteUsers.length === 0) return '1fr'
    if (remoteUsers.length === 1) return '1fr 1fr'
    return 'repeat(3, 1fr)'
  }

  // ── Screens ───────────────────────────────────────────────
  if (isLoading) return <div style={s.fullCenter}><div style={s.loadingText}>Loading meeting...</div></div>

  if (meeting?.status === 'ended') return (
    <div style={s.fullCenter}>
      <div style={s.endedCard}>
        <div style={{ fontSize: 'clamp(32px, 8vw, 48px)', marginBottom: '16px' }}>🏁</div>
        <h2 style={s.endedTitle}>Meeting Ended</h2>
        <p style={s.endedSub}>{meeting.title}</p>
        <button style={s.btnPrimary} onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </div>
  )

  if (meeting?.status === 'scheduled') return (
    <div style={s.fullCenter}>
      <div style={s.waitCard}>
        <div style={{ fontSize: 'clamp(32px, 8vw, 48px)', marginBottom: '16px' }}>⏳</div>
        <h2 style={s.waitTitle}>{meeting.title}</h2>
        <p style={s.waitSub}>Meeting starts in</p>
        <div style={s.countdown}>{countdown}</div>
        <p style={s.waitTime}>{new Date(meeting.scheduled_at).toLocaleString()}</p>
        <button style={s.btnSecondary} onClick={() => navigate(-1)}>← Back to Class</button>
      </div>
    </div>
  )

  // ── Live room ─────────────────────────────────────────────
  return (
    <div style={s.room}>
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <div style={s.liveDot} />
          <span style={s.liveLabel}>LIVE</span>
          <span style={s.meetingTitle}>{meeting?.title}</span>
        </div>
        <div style={s.topRight}>
          <span style={s.participantCount}>👥 {remoteUsers.length + (joined ? 1 : 0)}</span>
          {!isMobile && isEducator && (
            <button style={s.endBtn} onClick={() => { if (confirm('End meeting for everyone?')) endMeetingMutation.mutate() }}>
              End Meeting
            </button>
          )}
          {!isMobile && !isEducator && (
            <button style={s.leaveBtn} onClick={() => { leaveVideo(); navigate(-1) }}>Leave</button>
          )}
          {isMobile && (
            <button style={s.chatToggleBtn} onClick={() => setChatOpen(!chatOpen)} title="Toggle chat">
              💬 {!chatOpen && onlineUsers.length > 0 && <span style={s.badge}>{onlineUsers.length}</span>}
            </button>
          )}
        </div>
      </div>

      <div style={s.body}>
        {/* Video Section */}
        <div style={{ ...s.videoSection, flex: isMobile && chatOpen ? 0 : 1 }}>
          {agoraError && <div style={s.agoraError}>⚠️ {agoraError}</div>}
          {!joined && !agoraError && (
            <div style={s.joiningOverlay}>
              <div style={s.spinner} />
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '16px', fontFamily: "'Arial', sans-serif" }}>Connecting to video...</p>
            </div>
          )}
          <div style={{ ...s.videoGrid, gridTemplateColumns: getGridCols() }}>
            <div style={s.videoTile}>
              <div ref={localVideoRef} style={s.videoEl} />
              {!camOn && <div style={s.camOffOverlay}>📷 Camera off</div>}
              <div style={s.videoLabel}>
                <span>{user?.name} (You)</span>
                {!micOn && <span>🔇</span>}
              </div>
            </div>
            {remoteUsers.map((u) => (
              <div key={u.uid} style={s.videoTile}>
                <div id={`remote-${u.uid}`} style={s.videoEl} />
                <div style={s.videoLabel}><span>Participant</span></div>
              </div>
            ))}
          </div>
          <div style={s.controls}>
            <button style={{ ...s.controlBtn, ...(micOn ? {} : s.controlBtnOff) }} onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'}>
              {micOn ? '🎤' : '🔇'}
              {!isMobile && <span style={s.controlLabel}>{micOn ? 'Mute' : 'Unmute'}</span>}
            </button>
            <button style={{ ...s.controlBtn, ...(camOn ? {} : s.controlBtnOff) }} onClick={toggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
              {camOn ? '📷' : '🚫'}
              {!isMobile && <span style={s.controlLabel}>{camOn ? 'Cam Off' : 'Cam On'}</span>}
            </button>
            {isMobile && isEducator && (
              <button style={s.controlBtn} onClick={() => { if (confirm('End meeting?')) endMeetingMutation.mutate() }} title="End meeting">
                🛑
              </button>
            )}
            {isMobile && !isEducator && (
              <button style={s.controlBtn} onClick={() => { leaveVideo(); navigate(-1) }} title="Leave meeting">
                📴
              </button>
            )}
          </div>
        </div>

        {/* Chat Section - Desktop/Tablet Sidebar */}
        {!isMobile && (
          <ChatPanel 
            s={s}
            messages={messages}
            onlineUsers={onlineUsers}
            user={user}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendMessage={sendMessage}
            wsConnected={wsConnected}
            chatBottomRef={chatBottomRef}
          />
        )}
      </div>

      {/* Chat Drawer - Mobile */}
      {isMobile && chatOpen && (
        <ChatDrawer
          s={s}
          messages={messages}
          onlineUsers={onlineUsers}
          user={user}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendMessage={sendMessage}
          wsConnected={wsConnected}
          chatBottomRef={chatBottomRef}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}

// Chat Panel Component (Desktop/Tablet)
function ChatPanel({ s, messages, onlineUsers, user, chatInput, setChatInput, sendMessage, wsConnected, chatBottomRef }) {
  return (
    <div style={s.chatSection}>
      <div style={s.onlineBar}>
        <span style={s.onlineTitle}>Online ({onlineUsers.length})</span>
        <div style={s.onlineAvatars}>
          {onlineUsers.slice(0, 5).map((u) => (
            <div key={u.user_id} style={s.onlineAvatar} title={u.name}>{u.name?.[0]}</div>
          ))}
          {onlineUsers.length > 5 && <div style={s.onlineMore}>+{onlineUsers.length - 5}</div>}
        </div>
      </div>
      <div style={s.messages}>
        {messages.length === 0 && <div style={s.noMessages}>No messages yet. Say hi! 👋</div>}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id
          return (
            <div key={msg.id || i} style={{ ...s.msgRow, ...(isMe ? s.msgRowMe : {}) }}>
              {!isMe && <div style={s.msgAvatar}>{msg.sender_name?.[0]}</div>}
              <div style={{ ...s.msgBubble, ...(isMe ? s.msgBubbleMe : {}) }}>
                {!isMe && <div style={s.msgSender}>{msg.sender_name}</div>}
                <div style={s.msgText}>{msg.message}</div>
                <div style={s.msgTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )
        })}
        <div ref={chatBottomRef} />
      </div>
      <div style={s.chatInputRow}>
        <div style={{ ...s.wsIndicator, background: wsConnected ? '#4ade80' : '#ff8080' }} />
        <input
          style={s.chatInput}
          placeholder="Message..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
        />
        <button style={s.sendBtn} onClick={sendMessage} disabled={!chatInput.trim()}>➤</button>
      </div>
    </div>
  )
}

// Chat Drawer Component (Mobile)
function ChatDrawer({ s, messages, onlineUsers, user, chatInput, setChatInput, sendMessage, wsConnected, chatBottomRef, onClose }) {
  return (
    <div style={s.chatDrawer}>
      <div style={s.drawerHead}>
        <h3 style={s.drawerTitle}>Chat ({onlineUsers.length})</h3>
        <button style={s.drawerClose} onClick={onClose}>✕</button>
      </div>
      <div style={s.messages}>
        {messages.length === 0 && <div style={s.noMessages}>No messages yet. Say hi! 👋</div>}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id
          return (
            <div key={msg.id || i} style={{ ...s.msgRow, ...(isMe ? s.msgRowMe : {}) }}>
              {!isMe && <div style={s.msgAvatar}>{msg.sender_name?.[0]}</div>}
              <div style={{ ...s.msgBubble, ...(isMe ? s.msgBubbleMe : {}) }}>
                {!isMe && <div style={s.msgSender}>{msg.sender_name}</div>}
                <div style={s.msgText}>{msg.message}</div>
                <div style={s.msgTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )
        })}
        <div ref={chatBottomRef} />
      </div>
      <div style={s.chatInputRow}>
        <div style={{ ...s.wsIndicator, background: wsConnected ? '#4ade80' : '#ff8080' }} />
        <input
          style={s.chatInput}
          placeholder="Message..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
        />
        <button style={s.sendBtn} onClick={sendMessage} disabled={!chatInput.trim()}>➤</button>
      </div>
    </div>
  )
}

const s = {
  room: { display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font-body)' },
  
  topBar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 24px)', background:'var(--bg2)', borderBottom:'1px solid var(--border)', flexShrink:0, gap:'12px', flexWrap:'wrap' },
  topLeft: { display:'flex', alignItems:'center', gap:'clamp(8px, 2vw, 14px)', minWidth:0 },
  liveDot: { width:'8px', height:'8px', borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 10px var(--green)', animation:'blink 1.2s infinite', display:'inline-block', flexShrink:0 },
  liveLabel: { fontSize:'clamp(9px, 2vw, 11px)', fontWeight:'800', color:'var(--green)', letterSpacing:'1.5px', textTransform:'uppercase', background:'var(--green-bg)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:'20px', padding:'3px 9px', flexShrink:0 },
  meetingTitle: { fontFamily:'var(--font-head)', fontSize:'clamp(13px, 3vw, 15px)', fontWeight:'700', color:'var(--text)', letterSpacing:'-0.2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  
  topRight: { display:'flex', alignItems:'center', gap:'clamp(6px, 2vw, 10px)', flexShrink:0 },
  participantCount: { fontSize:'clamp(10px, 2vw, 12px)', color:'var(--text3)', background:'var(--surface)', padding:'5px 11px', borderRadius:'20px', border:'1px solid var(--border)', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' },
  chatToggleBtn: { background:'var(--stu-bg)', border:'1px solid var(--stu-border)', color:'var(--stu)', borderRadius:'var(--r)', padding:'clamp(6px, 1vw, 8px) clamp(10px, 2vw, 14px)', fontSize:'clamp(12px, 2vw, 14px)', cursor:'pointer', fontFamily:'var(--font-body)', position:'relative', minHeight:'40px', minWidth:'40px', display:'flex', alignItems:'center', gap:'6px' },
  badge: { background:'var(--red)', color:'#fff', borderRadius:'50%', padding:'0 4px', fontSize:'10px', fontWeight:'700', marginLeft:'4px' },
  endBtn: { background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.25)', color:'var(--red)', borderRadius:'var(--r)', padding:'clamp(6px, 1vw, 8px) clamp(10px, 2vw, 16px)', fontSize:'clamp(11px, 2vw, 13px)', fontWeight:'600', cursor:'pointer', fontFamily:'var(--font-body)', minHeight:'40px' },
  leaveBtn: { background:'var(--surface)', border:'1px solid var(--border2)', color:'var(--text2)', borderRadius:'var(--r)', padding:'clamp(6px, 1vw, 8px) clamp(10px, 2vw, 16px)', fontSize:'clamp(11px, 2vw, 13px)', cursor:'pointer', fontFamily:'var(--font-body)', minHeight:'40px' },
  
  body: { display:'flex', flex:1, overflow:'hidden' },
  videoSection: { flex:1, display:'flex', flexDirection:'column', position:'relative', background:'#07060d', overflow:'hidden' },
  videoGrid: { flex:1, display:'grid', gap:'clamp(6px, 2vw, 8px)', padding:'clamp(8px, 2vw, 16px)', overflow:'auto' },
  videoTile: { position:'relative', background:'var(--bg3)', borderRadius:'var(--r-md)', overflow:'hidden', minHeight:'clamp(150px, 30vh, 250px)', border:'1px solid var(--border)' },
  videoEl: { width:'100%', height:'100%', objectFit:'cover' },
  camOffOverlay: { position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg3)', color:'var(--text3)', fontSize:'clamp(12px, 3vw, 14px)', flexDirection:'column', gap:'8px' },
  videoLabel: { position:'absolute', bottom:'10px', left:'10px', display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', borderRadius:'var(--r-sm)', padding:'clamp(4px, 1vw, 5px) clamp(6px, 2vw, 10px)', fontSize:'clamp(10px, 2vw, 12px)', color:'#fff', border:'1px solid rgba(255,255,255,0.08)', fontFamily:'var(--font-body)' },
  
  controls: { display:'flex', justifyContent:'center', gap:'clamp(6px, 2vw, 10px)', padding:'clamp(10px, 2vw, 16px)', borderTop:'1px solid var(--border)', flexShrink:0, background:'var(--bg2)', flexWrap:'wrap' },
  controlBtn: { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--r-md)', padding:'clamp(8px, 1vw, 12px) clamp(10px, 2vw, 18px)', cursor:'pointer', color:'var(--text)', fontSize:'clamp(14px, 4vw, 18px)', minHeight:'44px', minWidth:'44px', fontFamily:'var(--font-body)', transition:'all 0.15s' },
  controlBtnOff: { background:'var(--red-bg)', borderColor:'rgba(248,113,113,0.25)', color:'var(--red)' },
  controlLabel: { fontSize:'clamp(8px, 2vw, 10px)', color:'var(--text3)', fontWeight:'600' },
  
  joiningOverlay: { position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#07060d', zIndex:10 },
  spinner: { width:'36px', height:'36px', border:'3px solid var(--border2)', borderTop:'3px solid var(--stu)', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  agoraError: { position:'absolute', top:'16px', left:'50%', transform:'translateX(-50%)', background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.25)', color:'var(--red)', borderRadius:'var(--r)', padding:'clamp(8px, 1vw, 10px) clamp(12px, 2vw, 20px)', fontSize:'clamp(11px, 2vw, 13px)', zIndex:20, whiteSpace:'nowrap' },
  
  chatSection: { width:'clamp(200px, 25vw, 312px)', display:'flex', flexDirection:'column', borderLeft:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0 },
  chatDrawer: { position:'fixed', bottom:0, right:0, width:'100%', maxWidth:'100%', height:'50vh', background:'var(--bg2)', borderTop:'1px solid var(--border)', zIndex:40, display:'flex', flexDirection:'column', borderRadius:'var(--r-lg) var(--r-lg) 0 0', boxShadow:'var(--shadow-xl)' },
  drawerHead: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'clamp(12px, 2vw, 16px)', borderBottom:'1px solid var(--border)' },
  drawerTitle: { fontFamily:'var(--font-head)', fontSize:'clamp(13px, 2vw, 14px)', fontWeight:'700', color:'var(--text)', margin:0 },
  drawerClose: { background:'transparent', border:'none', color:'var(--text3)', fontSize:'18px', cursor:'pointer', padding:'4px 8px', minHeight:'40px', minWidth:'40px' },
  
  onlineBar: { padding:'clamp(8px, 2vw, 12px) clamp(12px, 2vw, 16px)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'10px' },
  onlineTitle: { fontSize:'clamp(9px, 2vw, 11px)', color:'var(--text3)', fontWeight:'700', letterSpacing:'0.5px', textTransform:'uppercase', flex:1 },
  onlineAvatars: { display:'flex', gap:'3px', overflow:'hidden' },
  onlineAvatar: { width:'22px', height:'22px', borderRadius:'6px', background:'linear-gradient(135deg,var(--stu),#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'#fff', fontWeight:'800', fontFamily:'var(--font-head)', flexShrink:0 },
  onlineMore: { width:'22px', height:'22px', borderRadius:'6px', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'var(--text3)', border:'1px solid var(--border)' },
  
  messages: { flex:1, overflowY:'auto', padding:'clamp(10px, 2vw, 14px)', display:'flex', flexDirection:'column', gap:'10px' },
  noMessages: { color:'var(--text4)', fontSize:'clamp(11px, 2vw, 13px)', textAlign:'center', marginTop:'40px', lineHeight:'1.7' },
  msgRow: { display:'flex', gap:'8px', alignItems:'flex-end' },
  msgRowMe: { flexDirection:'row-reverse' },
  msgAvatar: { width:'24px', height:'24px', borderRadius:'6px', background:'linear-gradient(135deg,var(--stu),#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'#fff', fontWeight:'800', flexShrink:0, fontFamily:'var(--font-head)' },
  msgBubble: { maxWidth:'84%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'10px 10px 10px 2px', padding:'8px 12px' },
  msgBubbleMe: { background:'rgba(129,140,248,0.15)', border:'1px solid var(--stu-border)', borderRadius:'10px 10px 2px 10px' },
  msgSender: { fontSize:'clamp(9px, 2vw, 10px)', color:'var(--stu2)', fontWeight:'700', marginBottom:'3px', letterSpacing:'0.2px' },
  msgText: { fontSize:'clamp(11px, 2vw, 13px)', color:'var(--text)', lineHeight:'1.5', wordBreak:'break-word' },
  msgTime: { fontSize:'clamp(8px, 2vw, 10px)', color:'var(--text4)', marginTop:'4px', textAlign:'right' },
  
  chatInputRow: { padding:'clamp(8px, 2vw, 12px)', borderTop:'1px solid var(--border)', display:'flex', gap:'8px', alignItems:'center', flexShrink:0 },
  wsIndicator: { width:'5px', height:'5px', borderRadius:'50%', flexShrink:0 },
  chatInput: { flex:1, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'clamp(8px, 1vw, 10px) clamp(10px, 2vw, 13px)', color:'var(--text)', fontSize:'clamp(12px, 2vw, 13px)', outline:'none', fontFamily:'var(--font-body)', minHeight:'40px', transition:'all 0.2s' },
  sendBtn: { background:'linear-gradient(135deg,var(--stu),#6366f1)', border:'none', borderRadius:'var(--r)', padding:'clamp(8px, 1vw, 10px) clamp(10px, 2vw, 14px)', color:'#fff', cursor:'pointer', fontSize:'14px', flexShrink:0, minHeight:'40px', minWidth:'40px' },
  
  fullCenter: { minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-body)', padding:'clamp(12px, 3vw, 24px)' },
  waitCard: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-xl)', padding:'clamp(24px, 5vw, 52px) clamp(20px, 4vw, 48px)', textAlign:'center', maxWidth:'420px', width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', boxShadow:'var(--shadow-xl)' },
  waitTitle: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'clamp(20px, 5vw, 24px)', fontWeight:'900', margin:0, letterSpacing:'-0.4px' },
  waitSub: { color:'var(--text3)', fontSize:'clamp(12px, 2vw, 14px)', margin:0 },
  countdown: { fontFamily:'var(--font-head)', fontSize:'clamp(36px, 10vw, 56px)', fontWeight:'900', color:'var(--stu)', margin:'10px 0', letterSpacing:'-3px', lineHeight:1 },
  waitTime: { color:'var(--text3)', fontSize:'clamp(11px, 2vw, 13px)', marginBottom:'20px', fontFamily:'var(--font-mono)' },
  endedCard: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-xl)', padding:'clamp(24px, 5vw, 52px) clamp(20px, 4vw, 48px)', textAlign:'center', maxWidth:'380px', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', boxShadow:'var(--shadow-xl)' },
  endedTitle: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'clamp(20px, 5vw, 24px)', fontWeight:'900', margin:0 },
  endedSub: { color:'var(--text3)', fontSize:'clamp(12px, 2vw, 14px)', margin:0 },
  loadingText: { color:'var(--text3)', fontSize:'clamp(13px, 2vw, 15px)' },
  btnPrimary: { background:'linear-gradient(135deg,var(--stu),#6366f1)', color:'#fff', border:'none', borderRadius:'var(--r)', padding:'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 24px)', fontSize:'clamp(12px, 2vw, 14px)', fontWeight:'700', cursor:'pointer', fontFamily:'var(--font-body)', minHeight:'44px' },
  btnSecondary: { background:'var(--surface)', color:'var(--text2)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 24px)', fontSize:'clamp(12px, 2vw, 14px)', cursor:'pointer', fontFamily:'var(--font-body)', minHeight:'44px' },
}