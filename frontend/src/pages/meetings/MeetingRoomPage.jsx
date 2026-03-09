import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import AgoraRTC from 'agora-rtc-sdk-ng'
import {
  getMeeting, getAgoraToken, endMeeting,
  startRecording, stopRecording,
} from '../../api/meetings'
import useAuthStore from '../../store/authStore'

export default function MeetingRoomPage() {
  const { meetingId } = useParams()
  const { user, token: jwt } = useAuthStore()
  const navigate = useNavigate()
  const isEducator = user?.role === 'educator'

  // ── Meeting data ──────────────────────────────────────────
  const { data: meeting, isLoading, refetch } = useQuery({
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
          return exists
            ? prev.map((u) => u.uid === remoteUser.uid ? remoteUser : u)
            : [...prev, remoteUser]
        })
        if (mediaType === 'video') {
          setTimeout(() => remoteUser.videoTrack?.play(`remote-${remoteUser.uid}`), 100)
        }
        if (mediaType === 'audio') remoteUser.audioTrack?.play()
      })

      client.on('user-unpublished', (remoteUser) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid))
      })
      client.on('user-left', (remoteUser) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid))
      })

      await client.join(app_id, channel, token, uid)
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks()
      setLocalTracks({ audio: audioTrack, video: videoTrack })
      await client.publish([audioTrack, videoTrack])
      if (localVideoRef.current) videoTrack.play(localVideoRef.current)
      setJoined(true)
    } catch (err) {
      console.error(err)
      setAgoraError(err.message || 'Failed to join video')
    }
  }, [client, meetingId])

  useEffect(() => {
    if (meeting?.status === 'live' && !joined) joinVideo()
  }, [meeting?.status, joined, joinVideo])

  useEffect(() => {
    return () => {
      localTracks.audio?.close()
      localTracks.video?.close()
      client.leave()
    }
  }, [])

  const toggleMic = async () => {
    if (localTracks.audio) {
      await localTracks.audio.setEnabled(!micOn)
      setMicOn(!micOn)
    }
  }

  const toggleCam = async () => {
    if (localTracks.video) {
      await localTracks.video.setEnabled(!camOn)
      setCamOn(!camOn)
    }
  }

  const leaveVideo = async () => {
    localTracks.audio?.close()
    localTracks.video?.close()
    await client.leave()
    setJoined(false)
    setLocalTracks({ audio: null, video: null })
    setRemoteUsers([])
  }

  // ── End meeting ───────────────────────────────────────────
  const endMeetingMutation = useMutation({
    mutationFn: () => endMeeting(meetingId),
    onSuccess: async () => {
      await leaveVideo()
      navigate(-1)
    },
  })

  // ── Recording ─────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recordingUrl, setRecordingUrl] = useState(meeting?.recording_url || null)
  const [recordingMsg, setRecordingMsg] = useState('')

  const startRecMutation = useMutation({
    mutationFn: () => startRecording(meetingId),
    onSuccess: () => {
      setIsRecording(true)
      setRecordingMsg('Recording started')
      setTimeout(() => setRecordingMsg(''), 3000)
    },
    onError: (err) => setRecordingMsg(err.response?.data?.detail || 'Failed to start recording'),
  })

  const stopRecMutation = useMutation({
    mutationFn: () => stopRecording(meetingId),
    onSuccess: (res) => {
      setIsRecording(false)
      setRecordingUrl(res.data.recording_url)
      setRecordingMsg('Recording saved!')
      setTimeout(() => setRecordingMsg(''), 4000)
    },
    onError: (err) => setRecordingMsg(err.response?.data?.detail || 'Failed to stop recording'),
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
    const ws = new WebSocket(`ws://localhost:8000/ws/meetings/${meetingId}?token=${jwt}`)
    wsRef.current = ws
    ws.onopen = () => setWsConnected(true)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'history') {
        setMessages(data.messages || [])
        setOnlineUsers(data.online_users || [])
      } else if (data.type === 'message') {
        setMessages((prev) => [...prev, data])
      } else if (data.type === 'user_joined' || data.type === 'user_left') {
        setOnlineUsers(data.online_users || [])
      }
    }
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)
    return () => ws.close()
  }, [meeting?.status, meetingId, jwt])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!chatInput.trim() || !wsRef.current) return
    wsRef.current.send(JSON.stringify({ message: chatInput.trim() }))
    setChatInput('')
  }

  const handleChatKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── States: loading / scheduled / ended ──────────────────
  if (isLoading) return (
    <div style={styles.fullCenter}>
      <div style={styles.loadingText}>Loading meeting...</div>
    </div>
  )

  if (meeting?.status === 'ended') return (
    <div style={styles.fullCenter}>
      <div style={styles.endedCard}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏁</div>
        <h2 style={styles.endedTitle}>Meeting Ended</h2>
        <p style={styles.endedSub}>{meeting.title}</p>
        {meeting.recording_url && (
          <a href={meeting.recording_url} target="_blank" rel="noreferrer" style={styles.recordingLink}>
            🎬 View Recording
          </a>
        )}
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
  const allParticipants = remoteUsers.length + (joined ? 1 : 0)

  return (
    <div style={styles.room}>

      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topLeft}>
          <div style={styles.liveDot} />
          <span style={styles.liveLabel}>LIVE</span>
          <span style={styles.meetingTitle}>{meeting?.title}</span>
        </div>
        <div style={styles.topRight}>
          {/* Recording indicator */}
          {isRecording && (
            <div style={styles.recIndicator}>
              <div style={styles.recDot} />
              <span style={styles.recLabel}>REC</span>
            </div>
          )}
          {recordingMsg && <span style={styles.recMsg}>{recordingMsg}</span>}
          {recordingUrl && !isRecording && (
            <a href={recordingUrl} target="_blank" rel="noreferrer" style={styles.recLink}>
              🎬 Recording
            </a>
          )}
          <span style={styles.participantCount}>👥 {allParticipants}</span>
          {isEducator && (
            <>
              {!isRecording ? (
                <button
                  style={styles.recBtn}
                  onClick={() => startRecMutation.mutate()}
                  disabled={startRecMutation.isPending}
                >
                  ⏺ Record
                </button>
              ) : (
                <button
                  style={styles.recStopBtn}
                  onClick={() => stopRecMutation.mutate()}
                  disabled={stopRecMutation.isPending}
                >
                  ⏹ Stop Rec
                </button>
              )}
              <button
                style={styles.endBtn}
                onClick={() => { if (confirm('End meeting for everyone?')) endMeetingMutation.mutate() }}
              >
                End Meeting
              </button>
            </>
          )}
          {!isEducator && (
            <button style={styles.leaveBtn} onClick={() => { leaveVideo(); navigate(-1) }}>
              Leave
            </button>
          )}
        </div>
      </div>

      <div style={styles.body}>
        {/* Video area */}
        <div style={styles.videoSection}>
          {agoraError && <div style={styles.agoraError}>⚠️ {agoraError}</div>}
          {!joined && !agoraError && (
            <div style={styles.joiningOverlay}>
              <div style={styles.spinner} />
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '16px', fontFamily: "'Arial', sans-serif" }}>
                Connecting to video...
              </p>
            </div>
          )}

          <div style={{
            ...styles.videoGrid,
            gridTemplateColumns: remoteUsers.length === 0
              ? '1fr'
              : remoteUsers.length <= 1 ? '1fr 1fr'
              : 'repeat(3, 1fr)',
          }}>
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

          {/* Controls */}
          <div style={styles.controls}>
            <button
              style={{ ...styles.controlBtn, ...(micOn ? {} : styles.controlBtnOff) }}
              onClick={toggleMic}
            >
              {micOn ? '🎤' : '🔇'}
              <span style={styles.controlLabel}>{micOn ? 'Mute' : 'Unmute'}</span>
            </button>
            <button
              style={{ ...styles.controlBtn, ...(camOn ? {} : styles.controlBtnOff) }}
              onClick={toggleCam}
            >
              {camOn ? '📷' : '🚫'}
              <span style={styles.controlLabel}>{camOn ? 'Cam Off' : 'Cam On'}</span>
            </button>
          </div>
        </div>

        {/* Chat */}
        <div style={styles.chatSection}>
          <div style={styles.onlineBar}>
            <span style={styles.onlineTitle}>Online ({onlineUsers.length})</span>
            <div style={styles.onlineAvatars}>
              {onlineUsers.slice(0, 5).map((u) => (
                <div key={u.user_id} style={styles.onlineAvatar} title={u.name}>
                  {u.name?.[0]}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div style={styles.onlineMore}>+{onlineUsers.length - 5}</div>
              )}
            </div>
          </div>

          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.noMessages}>No messages yet. Say hi! 👋</div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id
              return (
                <div key={msg.id || i} style={{ ...styles.msgRow, ...(isMe ? styles.msgRowMe : {}) }}>
                  {!isMe && <div style={styles.msgAvatar}>{msg.sender_name?.[0]}</div>}
                  <div style={{ ...styles.msgBubble, ...(isMe ? styles.msgBubbleMe : {}) }}>
                    {!isMe && <div style={styles.msgSender}>{msg.sender_name}</div>}
                    <div style={styles.msgText}>{msg.message}</div>
                    <div style={styles.msgTime}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
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
              onKeyDown={handleChatKey}
            />
            <button style={styles.sendBtn} onClick={sendMessage} disabled={!chatInput.trim()}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  room: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a14', color: '#fff', fontFamily: "'Arial', sans-serif" },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, flexWrap: 'wrap', gap: '10px' },
  topLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  liveDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'pulse 1.5s infinite' },
  liveLabel: { fontSize: '11px', fontWeight: '800', color: '#4ade80', letterSpacing: '1px' },
  meetingTitle: { fontSize: '15px', fontWeight: '600', color: '#fff' },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  participantCount: { fontSize: '13px', color: 'rgba(255,255,255,0.5)' },
  recIndicator: { display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '20px', padding: '4px 10px' },
  recDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#ff5050', animation: 'pulse 1s infinite' },
  recLabel: { fontSize: '11px', fontWeight: '800', color: '#ff8080', letterSpacing: '1px' },
  recMsg: { fontSize: '12px', color: '#4ade80' },
  recLink: { fontSize: '12px', color: '#a78bfa', textDecoration: 'none', background: 'rgba(167,139,250,0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(167,139,250,0.2)' },
  recBtn: { background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff8080', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  recStopBtn: { background: 'rgba(255,80,80,0.3)', border: '1px solid rgba(255,80,80,0.5)', color: '#fff', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  endBtn: { background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', color: '#ff8080', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  leaveBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', padding: '7px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  videoSection: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: '#0d0d1a' },
  videoGrid: { flex: 1, display: 'grid', gap: '8px', padding: '16px', overflow: 'hidden' },
  videoTile: { position: 'relative', background: '#1a1a2e', borderRadius: '12px', overflow: 'hidden', minHeight: '200px' },
  videoEl: { width: '100%', height: '100%', objectFit: 'cover' },
  camOffOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: 'rgba(255,255,255,0.4)', fontSize: '14px' },
  videoLabel: { position: 'absolute', bottom: '8px', left: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', color: '#fff' },
  controls: { display: 'flex', justifyContent: 'center', gap: '16px', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 },
  controlBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '12px 20px', cursor: 'pointer', color: '#fff', fontSize: '20px', minWidth: '70px', fontFamily: "'Arial', sans-serif" },
  controlBtnOff: { background: 'rgba(255,80,80,0.2)' },
  controlLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.6)' },
  joiningOverlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a', zIndex: 10 },
  spinner: { width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  agoraError: { position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', color: '#ff8080', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', zIndex: 20 },
  chatSection: { width: '320px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 },
  onlineBar: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' },
  onlineTitle: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  onlineAvatars: { display: 'flex', gap: '4px' },
  onlineAvatar: { width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: '700' },
  onlineMore: { width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.5)' },
  messages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  noMessages: { color: 'rgba(255,255,255,0.2)', fontSize: '13px', textAlign: 'center', marginTop: '40px' },
  msgRow: { display: 'flex', gap: '8px', alignItems: 'flex-end' },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: '700', flexShrink: 0 },
  msgBubble: { maxWidth: '80%', background: 'rgba(255,255,255,0.08)', borderRadius: '12px 12px 12px 4px', padding: '8px 12px' },
  msgBubbleMe: { background: 'rgba(102,126,234,0.3)', borderRadius: '12px 12px 4px 12px' },
  msgSender: { fontSize: '11px', color: '#a78bfa', fontWeight: '600', marginBottom: '3px' },
  msgText: { fontSize: '13px', color: '#fff', lineHeight: '1.4', wordBreak: 'break-word' },
  msgTime: { fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', textAlign: 'right' },
  chatInputRow: { padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', alignItems: 'center' },
  wsIndicator: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0 },
  chatInput: { flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: "'Arial', sans-serif" },
  sendBtn: { background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', borderRadius: '10px', padding: '10px 14px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontFamily: "'Arial', sans-serif" },
  fullCenter: { minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Arial', sans-serif" },
  waitCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '48px 40px', textAlign: 'center', maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  waitTitle: { color: '#fff', fontSize: '22px', fontWeight: '700', margin: 0 },
  waitSub: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 },
  countdown: { fontSize: '48px', fontWeight: '800', color: '#a78bfa', margin: '8px 0', letterSpacing: '-1px' },
  waitTime: { color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '24px' },
  endedCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '48px 40px', textAlign: 'center', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  endedTitle: { color: '#fff', fontSize: '22px', fontWeight: '700', margin: 0 },
  endedSub: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 },
  recordingLink: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', textDecoration: 'none', fontWeight: '600' },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: '16px' },
  btnPrimary: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
  btnSecondary: { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', cursor: 'pointer', fontFamily: "'Arial', sans-serif" },
}