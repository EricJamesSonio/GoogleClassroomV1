import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInvitations, acceptInvite, rejectInvite,
} from '../../api/classes'
import Layout from '../../components/Layout'

export default function InvitationsPage() {
  const queryClient = useQueryClient()

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => getInvitations().then((r) => r.data),
  })

  const acceptMutation = useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => queryClient.invalidateQueries(['invitations']),
  })

  const rejectMutation = useMutation({
    mutationFn: rejectInvite,
    onSuccess: () => queryClient.invalidateQueries(['invitations']),
  })

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.heading}>Invitations</h1>
        <p style={styles.sub}>Classes you've been invited to join</p>
      </div>

      {isLoading ? (
        <div style={styles.empty}>Loading...</div>
      ) : invitations.length === 0 ? (
        <div style={styles.emptyBox}>
          <div style={styles.emptyIcon}>📩</div>
          <p style={styles.emptyText}>No pending invitations right now.</p>
          <p style={styles.emptyHint}>
            Ask your educator to invite you, or go to Classes and request to join.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {invitations.map((inv) => (
            <div key={inv.id} style={styles.card}>
              <div style={styles.cardLeft}>
                <div style={styles.classIcon}>🏫</div>
                <div style={styles.cardInfo}>
                  <div style={styles.className}>{inv.class_name}</div>
                  <div style={styles.invitedBy}>
                    Invited by <strong style={{ color: '#a78bfa' }}>{inv.invited_by_name}</strong>
                  </div>
                  <div style={styles.inviteDate}>
                    {new Date(inv.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <div style={styles.cardActions}>
                <button
                  style={styles.rejectBtn}
                  onClick={() => rejectMutation.mutate(inv.id)}
                  disabled={rejectMutation.isPending}
                >
                  Decline
                </button>
                <button
                  style={styles.acceptBtn}
                  onClick={() => acceptMutation.mutate(inv.id)}
                  disabled={acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? 'Joining...' : 'Accept'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

const styles = {
  header: { marginBottom: '32px' },
  heading: { fontSize: '26px', fontWeight: '700', color: '#fff', margin: '0 0 4px 0' },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontFamily: "'Arial', sans-serif" },
  empty: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '60px', fontFamily: "'Arial', sans-serif" },
  emptyBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '12px', padding: '80px 40px',
    border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px',
  },
  emptyIcon: { fontSize: '48px' },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontFamily: "'Arial', sans-serif" },
  emptyHint: { color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', maxWidth: '320px', fontFamily: "'Arial', sans-serif" },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px', padding: '20px 24px', gap: '16px', flexWrap: 'wrap',
  },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  classIcon: {
    width: '48px', height: '48px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
  },
  cardInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  className: { color: '#fff', fontSize: '16px', fontWeight: '700', fontFamily: "'Arial', sans-serif" },
  invitedBy: { color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontFamily: "'Arial', sans-serif" },
  inviteDate: { color: 'rgba(255,255,255,0.25)', fontSize: '12px', fontFamily: "'Arial', sans-serif" },
  cardActions: { display: 'flex', gap: '10px', flexShrink: 0 },
  acceptBtn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff', border: 'none', borderRadius: '10px',
    padding: '10px 22px', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer', fontFamily: "'Arial', sans-serif",
  },
  rejectBtn: {
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    padding: '10px 18px', fontSize: '14px', cursor: 'pointer', fontFamily: "'Arial', sans-serif",
  },
}