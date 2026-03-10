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
      console.log('🔑 Agora token response:', res.data)
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

  // ── Screens ───────────────────────────────────────────────
  if (isLoading) return <div style={styles.fullCenter}><div style={styles.loadingText}>Loading meeting...</div></div>

  if (meeting?.status === 'ended') return (
    <div style={styles.fullCenter}>
      <div style={styles.endedCard}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏁</div>
        <h2 style={styles.endedTitle}>Meeting Ended</h2>
        <p style={styles.endedSub}>{meeting.title}</p>
        <button style={styles.btnPrimary} onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </div>
  )

  if (meeting?.status === 'scheduled') return (
    <div style={styles.fullCenter}>
      <div style={styles.waitCard}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <h2 style={styles.waitTitle}>{meeting.title}</h2>
        <p style={styles.waitSub}>Meeting starts in</p>
        <div style={styles.countdown}>{countdown}</div>
        <p style={styles.waitTime}>{new Date(meeting.scheduled_at).toLocaleString()}</p>
        <button style={styles.btnSecondary} onClick={() => navigate(-1)}>← Back to Class</button>
      </div>
    </div>
  )

  // ── Live room ─────────────────────────────────────────────
  return (
    <div style={styles.room}>
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <div style={styles.liveDot} />
          <span style={styles.liveLabel}>LIVE</span>
          <span style={styles.meetingTitle}>{meeting?.title}</span>
        </div>
        <div style={styles.topRight}>
          <span style={styles.participantCount}>👥 {remoteUsers.length + (joined ? 1 : 0)}</span>
          {isEducator && (
            <button style={styles.endBtn} onClick={() => { if (confirm('End meeting for everyone?')) endMeetingMutation.mutate() }}>
              End Meeting
            </button>
          )}
          {!isEducator && (
            <button style={styles.leaveBtn} onClick={() => { leaveVideo(); navigate(-1) }}>Leave</button>
          )}
        </div>
      </div>

      <div style={styles.body}>
        {/* Video */}
        <div style={styles.videoSection}>
          {agoraError && <div style={styles.agoraError}>⚠️ {agoraError}</div>}
          {!joined && !agoraError && (
            <div style={styles.joiningOverlay}>
              <div style={styles.spinner} />
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '16px', fontFamily: "'Arial', sans-serif" }}>Connecting to video...</p>
            </div>
          )}
          <div style={{ ...styles.videoGrid, gridTemplateColumns: remoteUsers.length === 0 ? '1fr' : remoteUsers.length <= 1 ? '1fr 1fr' : 'repeat(3, 1fr)' }}>
            <div style={styles.videoTile}>
              <div ref={localVideoRef} style={styles.videoEl} />
              {!camOn && <div style={styles.camOffOverlay}>📷 Camera off</div>}
              <div style={styles.videoLabel}>
                <span>{user?.name} (You)</span>
                {!micOn && <span>🔇</span>}
              </div>
            </div>
            {remoteUsers.map((u) => (
              <div key={u.uid} style={styles.videoTile}>
                <div id={`remote-${u.uid}`} style={styles.videoEl} />
                <div style={styles.videoLabel}><span>Participant {u.uid}</span></div>
              </div>
            ))}
          </div>
          <div style={styles.controls}>
            <button style={{ ...styles.controlBtn, ...(micOn ? {} : styles.controlBtnOff) }} onClick={toggleMic}>
              {micOn ? '🎤' : '🔇'}<span style={styles.controlLabel}>{micOn ? 'Mute' : 'Unmute'}</span>
            </button>
            <button style={{ ...styles.controlBtn, ...(camOn ? {} : styles.controlBtnOff) }} onClick={toggleCam}>
              {camOn ? '📷' : '🚫'}<span style={styles.controlLabel}>{camOn ? 'Cam Off' : 'Cam On'}</span>
            </button>
          </div>
        </div>

        {/* Chat */}
        <div style={styles.chatSection}>
          <div style={styles.onlineBar}>
            <span style={styles.onlineTitle}>Online ({onlineUsers.length})</span>
            <div style={styles.onlineAvatars}>
              {onlineUsers.slice(0, 5).map((u) => (
                <div key={u.user_id} style={styles.onlineAvatar} title={u.name}>{u.name?.[0]}</div>
              ))}
              {onlineUsers.length > 5 && <div style={styles.onlineMore}>+{onlineUsers.length - 5}</div>}
            </div>
          </div>
          <div style={styles.messages}>
            {messages.length === 0 && <div style={styles.noMessages}>No messages yet. Say hi! 👋</div>}
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id
              return (
                <div key={msg.id || i} style={{ ...styles.msgRow, ...(isMe ? styles.msgRowMe : {}) }}>
                  {!isMe && <div style={styles.msgAvatar}>{msg.sender_name?.[0]}</div>}
                  <div style={{ ...styles.msgBubble, ...(isMe ? styles.msgBubbleMe : {}) }}>
                    {!isMe && <div style={styles.msgSender}>{msg.sender_name}</div>}
                    <div style={styles.msgText}>{msg.message}</div>
                    <div style={styles.msgTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })}
            <div ref={chatBottomRef} />
          </div>
          <div style={styles.chatInputRow}>
            <div style={{ ...styles.wsIndicator, background: wsConnected ? '#4ade80' : '#ff8080' }} />
            <input
              style={styles.chatInput}
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            />
            <button style={styles.sendBtn} onClick={sendMessage} disabled={!chatInput.trim()}>➤</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  room: { display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font-body)' },
  topBar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 24px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', flexShrink:0 },
  topLeft: { display:'flex', alignItems:'center', gap:'14px' },
  liveDot: { width:'8px', height:'8px', borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 10px var(--green)', animation:'blink 1.2s infinite', display:'inline-block' },
  liveLabel: { fontSize:'11px', fontWeight:'800', color:'var(--green)', letterSpacing:'1.5px', textTransform:'uppercase', background:'var(--green-bg)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:'20px', padding:'3px 9px' },
  meetingTitle: { fontFamily:'var(--font-head)', fontSize:'15px', fontWeight:'700', color:'var(--text)', letterSpacing:'-0.2px' },
  topRight: { display:'flex', alignItems:'center', gap:'10px' },
  participantCount: { fontSize:'12px', color:'var(--text3)', background:'var(--surface)', padding:'5px 11px', borderRadius:'20px', border:'1px solid var(--border)', fontFamily:'var(--font-mono)' },
  endBtn: { background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.25)', color:'var(--red)', borderRadius:'var(--r)', padding:'7px 16px', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'var(--font-body)' },
  leaveBtn: { background:'var(--surface)', border:'1px solid var(--border2)', color:'var(--text2)', borderRadius:'var(--r)', padding:'7px 16px', fontSize:'13px', cursor:'pointer', fontFamily:'var(--font-body)' },
  body: { display:'flex', flex:1, overflow:'hidden' },
  videoSection: { flex:1, display:'flex', flexDirection:'column', position:'relative', background:'#07060d' },
  videoGrid: { flex:1, display:'grid', gap:'8px', padding:'16px', overflow:'hidden' },
  videoTile: { position:'relative', background:'var(--bg3)', borderRadius:'var(--r-md)', overflow:'hidden', minHeight:'200px', border:'1px solid var(--border)' },
  videoEl: { width:'100%', height:'100%', objectFit:'cover' },
  camOffOverlay: { position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg3)', color:'var(--text3)', fontSize:'14px', flexDirection:'column', gap:'8px' },
  videoLabel: { position:'absolute', bottom:'10px', left:'10px', display:'flex', alignItems:'center', gap:'6px', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', borderRadius:'var(--r-sm)', padding:'5px 10px', fontSize:'12px', color:'#fff', border:'1px solid rgba(255,255,255,0.08)', fontFamily:'var(--font-body)' },
  controls: { display:'flex', justifyContent:'center', gap:'10px', padding:'16px', borderTop:'1px solid var(--border)', flexShrink:0, background:'var(--bg2)' },
  controlBtn: { display:'flex', flexDirection:'column', alignItems:'center', gap:'5px', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--r-md)', padding:'12px 18px', cursor:'pointer', color:'var(--text)', fontSize:'18px', minWidth:'68px', fontFamily:'var(--font-body)', transition:'all 0.15s' },
  controlBtnOff: { background:'var(--red-bg)', borderColor:'rgba(248,113,113,0.25)', color:'var(--red)' },
  controlLabel: { fontSize:'10px', color:'var(--text3)', fontWeight:'600', letterSpacing:'0.3px' },
  joiningOverlay: { position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#07060d', zIndex:10, gap:'16px' },
  spinner: { width:'36px', height:'36px', border:'3px solid var(--border2)', borderTop:'3px solid var(--stu)', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  agoraError: { position:'absolute', top:'16px', left:'50%', transform:'translateX(-50%)', background:'var(--red-bg)', border:'1px solid rgba(248,113,113,0.25)', color:'var(--red)', borderRadius:'var(--r)', padding:'10px 20px', fontSize:'13px', zIndex:20, whiteSpace:'nowrap' },
  chatSection: { width:'312px', display:'flex', flexDirection:'column', borderLeft:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0 },
  onlineBar: { padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'10px' },
  onlineTitle: { fontSize:'11px', color:'var(--text3)', fontWeight:'700', letterSpacing:'0.5px', textTransform:'uppercase', flex:1 },
  onlineAvatars: { display:'flex', gap:'3px' },
  onlineAvatar: { width:'22px', height:'22px', borderRadius:'6px', background:'linear-gradient(135deg,var(--stu),#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'#fff', fontWeight:'800', fontFamily:'var(--font-head)' },
  onlineMore: { width:'22px', height:'22px', borderRadius:'6px', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'var(--text3)', border:'1px solid var(--border)' },
  messages: { flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:'10px' },
  noMessages: { color:'var(--text4)', fontSize:'13px', textAlign:'center', marginTop:'40px', lineHeight:'1.7' },
  msgRow: { display:'flex', gap:'8px', alignItems:'flex-end' },
  msgRowMe: { flexDirection:'row-reverse' },
  msgAvatar: { width:'24px', height:'24px', borderRadius:'6px', background:'linear-gradient(135deg,var(--stu),#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'#fff', fontWeight:'800', flexShrink:0, fontFamily:'var(--font-head)' },
  msgBubble: { maxWidth:'84%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'10px 10px 10px 2px', padding:'8px 12px' },
  msgBubbleMe: { background:'rgba(129,140,248,0.15)', border:'1px solid var(--stu-border)', borderRadius:'10px 10px 2px 10px' },
  msgSender: { fontSize:'10px', color:'var(--stu2)', fontWeight:'700', marginBottom:'3px', letterSpacing:'0.2px' },
  msgText: { fontSize:'13px', color:'var(--text)', lineHeight:'1.5', wordBreak:'break-word' },
  msgTime: { fontSize:'10px', color:'var(--text4)', marginTop:'4px', textAlign:'right' },
  chatInputRow: { padding:'12px', borderTop:'1px solid var(--border)', display:'flex', gap:'8px', alignItems:'center' },
  wsIndicator: { width:'5px', height:'5px', borderRadius:'50%', flexShrink:0 },
  chatInput: { flex:1, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'10px 13px', color:'var(--text)', fontSize:'13px', outline:'none', fontFamily:'var(--font-body)', transition:'all 0.2s' },
  sendBtn: { background:'linear-gradient(135deg,var(--stu),#6366f1)', border:'none', borderRadius:'var(--r)', padding:'10px 14px', color:'#fff', cursor:'pointer', fontSize:'14px', flexShrink:0 },
  fullCenter: { minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-body)', padding:'24px' },
  waitCard: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-xl)', padding:'52px 48px', textAlign:'center', maxWidth:'420px', width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', boxShadow:'var(--shadow-xl)' },
  waitTitle: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'24px', fontWeight:'900', margin:0, letterSpacing:'-0.4px' },
  waitSub: { color:'var(--text3)', fontSize:'14px', margin:0 },
  countdown: { fontFamily:'var(--font-head)', fontSize:'56px', fontWeight:'900', color:'var(--stu)', margin:'10px 0', letterSpacing:'-3px', lineHeight:1 },
  waitTime: { color:'var(--text3)', fontSize:'13px', marginBottom:'20px', fontFamily:'var(--font-mono)' },
  endedCard: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-xl)', padding:'52px 48px', textAlign:'center', maxWidth:'380px', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', boxShadow:'var(--shadow-xl)' },
  endedTitle: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'24px', fontWeight:'900', margin:0 },
  endedSub: { color:'var(--text3)', fontSize:'14px', margin:0 },
  loadingText: { color:'var(--text3)', fontSize:'15px' },
  btnPrimary: { background:'linear-gradient(135deg,var(--stu),#6366f1)', color:'#fff', border:'none', borderRadius:'var(--r)', padding:'12px 24px', fontSize:'14px', fontWeight:'700', cursor:'pointer', fontFamily:'var(--font-body)', boxShadow:'0 4px 16px rgba(129,140,248,0.25)' },
  btnSecondary: { background:'var(--surface)', color:'var(--text2)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'12px 24px', fontSize:'14px', cursor:'pointer', fontFamily:'var(--font-body)' },
}