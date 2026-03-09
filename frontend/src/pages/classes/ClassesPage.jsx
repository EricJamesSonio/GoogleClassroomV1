import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClasses, createClass, requestJoin } from '../../api/classes'
import useAuthStore from '../../store/authStore'
import Layout from '../../components/Layout'

export default function ClassesPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEducator = user?.role === 'educator'

  const [showModal, setShowModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [joinClassId, setJoinClassId] = useState('')
  const [error, setError] = useState('')

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries(['classes'])
      setShowModal(false)
      setForm({ name: '', description: '' })
      setError('')
    },
    onError: (err) => setError(err.response?.data?.detail || 'Failed to create class'),
  })

  const joinMutation = useMutation({
    mutationFn: requestJoin,
    onSuccess: () => {
      setShowJoinModal(false)
      setJoinClassId('')
      alert('Join request sent to educator!')
    },
    onError: (err) => setError(err.response?.data?.detail || 'Failed to send request'),
  })

  const colors = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  ]

  return (
    <Layout>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Classes</h1>
          <p style={styles.sub}>
            {isEducator ? 'Manage your classrooms' : 'Your enrolled classes'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isEducator && (
            <button style={styles.btnSecondary} onClick={() => setShowJoinModal(true)}>
              + Request to Join
            </button>
          )}
          {isEducator && (
            <button style={styles.btnPrimary} onClick={() => setShowModal(true)}>
              + Create Class
            </button>
          )}
        </div>
      </div>

      {/* Classes Grid */}
      {isLoading ? (
        <div style={styles.empty}>Loading...</div>
      ) : classes.length === 0 ? (
        <div style={styles.emptyBox}>
          <div style={styles.emptyIcon}>🏫</div>
          <p style={styles.emptyText}>
            {isEducator ? 'No classes yet. Create your first one!' : 'You have no classes yet.'}
          </p>
          {isEducator && (
            <button style={styles.btnPrimary} onClick={() => setShowModal(true)}>
              Create Class
            </button>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {classes.map((cls, i) => (
            <div
              key={cls.id}
              style={styles.card}
              onClick={() => navigate(`/classes/${cls.id}`)}
            >
              <div style={{ ...styles.cardBanner, background: colors[i % colors.length] }}>
                <span style={styles.cardInitial}>{cls.name[0]}</span>
              </div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{cls.name}</h3>
                {cls.description && (
                  <p style={styles.cardDesc}>{cls.description}</p>
                )}
                <div style={styles.cardMeta}>
                  <span style={styles.metaBadge}>
                    {new Date(cls.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create New Class</h2>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.field}>
              <label style={styles.label}>Class Name</label>
              <input
                style={styles.input}
                placeholder="e.g. Software Engineering 101"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Description (optional)</label>
              <textarea
                style={{ ...styles.input, height: '80px', resize: 'vertical' }}
                placeholder="What is this class about?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div style={styles.modalBtns}>
              <button style={styles.btnSecondary} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                style={styles.btnPrimary}
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Join Modal */}
      {showJoinModal && (
        <div style={styles.overlay} onClick={() => setShowJoinModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Request to Join a Class</h2>
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.field}>
              <label style={styles.label}>Class ID</label>
              <input
                style={styles.input}
                placeholder="Paste the class ID here"
                value={joinClassId}
                onChange={(e) => setJoinClassId(e.target.value)}
              />
              <span style={styles.hint}>Ask your educator for the Class ID</span>
            </div>
            <div style={styles.modalBtns}>
              <button style={styles.btnSecondary} onClick={() => setShowJoinModal(false)}>
                Cancel
              </button>
              <button
                style={styles.btnPrimary}
                onClick={() => joinMutation.mutate(joinClassId)}
                disabled={!joinClassId || joinMutation.isPending}
              >
                {joinMutation.isPending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  heading: { fontSize: '26px', fontWeight: '700', color: '#fff', margin: '0 0 4px 0' },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: '14px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardBanner: {
    height: '90px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInitial: {
    fontSize: '36px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  cardBody: { padding: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#fff', margin: '0 0 6px 0' },
  cardDesc: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 12px 0', lineHeight: '1.5' },
  cardMeta: { display: 'flex', gap: '8px' },
  metaBadge: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.06)',
    padding: '3px 8px',
    borderRadius: '20px',
  },
  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '80px 40px',
    border: '1px dashed rgba(255,255,255,0.1)',
    borderRadius: '16px',
  },
  emptyIcon: { fontSize: '48px' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: '15px' },
  empty: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '60px' },
  btnPrimary: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: "'Arial', sans-serif",
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.07)',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Arial', sans-serif",
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  modalTitle: { color: '#fff', fontSize: '20px', fontWeight: '700', margin: 0 },
  modalBtns: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  input: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    fontFamily: "'Arial', sans-serif",
  },
  hint: { fontSize: '12px', color: 'rgba(255,255,255,0.3)' },
  error: {
    background: 'rgba(255,80,80,0.12)',
    border: '1px solid rgba(255,80,80,0.3)',
    color: '#ff8080',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
  },
}