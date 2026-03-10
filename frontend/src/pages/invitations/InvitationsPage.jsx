import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvitations, acceptInvite, rejectInvite } from '../../api/classes'
import Layout from '../../components/Layout'

export default function InvitationsPage() {
  const qc = useQueryClient()
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => getInvitations().then(r => r.data),
  })
  const acceptMutation = useMutation({ mutationFn: acceptInvite, onSuccess: () => { qc.invalidateQueries(['invitations']); qc.invalidateQueries(['classes']) } })
  const rejectMutation = useMutation({ mutationFn: rejectInvite, onSuccess: () => qc.invalidateQueries(['invitations']) })

  return (
    <Layout>
      <div className="fade-up">
        <div style={s.header}>
          <div>
            <h1 style={s.heading}>Invitations</h1>
            <p style={s.sub}>Respond to class invitations from your educators</p>
          </div>
          {invitations.length > 0 && (
            <div style={s.badge}>{invitations.length} pending</div>
          )}
        </div>

        {isLoading ? (
          <div style={s.skeletons}>
            {[1,2].map(i => <div key={i} className="skeleton" style={s.skeletonCard} />)}
          </div>
        ) : invitations.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3 style={s.emptyTitle}>No pending invitations</h3>
            <p style={s.emptyDesc}>When an educator invites you to a class, it'll show up here. You can also request to join a class by going to Classes and using the "Request to Join" button.</p>
          </div>
        ) : (
          <div style={s.list} className="stagger">
            {invitations.map((inv, i) => (
              <div key={inv.id} style={s.card} className="fade-up">
                <div style={s.cardLeft}>
                  <div style={s.classAvatar}>{inv.class_name?.[0]?.toUpperCase()}</div>
                  <div>
                    <h3 style={s.className}>{inv.class_name}</h3>
                    <div style={s.invMeta}>
                      Invited by <span style={s.invFrom}>{inv.invited_by_name}</span>
                    </div>
                    <div style={s.invDate}>
                      {new Date(inv.created_at).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={s.cardActions}>
                  <button style={s.rejectBtn}
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(inv.id)}>
                    Decline
                  </button>
                  <button style={s.acceptBtn}
                    disabled={acceptMutation.isPending}
                    onClick={() => acceptMutation.mutate(inv.id)}>
                    {acceptMutation.isPending ? '...' : 'Accept →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

const s = {
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'32px', gap:'16px' },
  heading: { fontFamily:'var(--font-head)', fontSize:'30px', fontWeight:'900', color:'var(--text)', letterSpacing:'-0.6px', marginBottom:'4px' },
  sub: { color:'var(--text3)', fontSize:'14px' },
  badge: { background:'rgba(129,140,248,0.12)', color:'var(--stu)', border:'1px solid var(--stu-border)', borderRadius:'20px', padding:'6px 14px', fontSize:'13px', fontWeight:'700', flexShrink:0, alignSelf:'flex-start' },
  skeletons: { display:'flex', flexDirection:'column', gap:'10px' },
  skeletonCard: { height:'88px', borderRadius:'var(--r-md)' },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', gap:'14px', padding:'80px 40px', border:'1px dashed var(--border2)', borderRadius:'var(--r-lg)', textAlign:'center' },
  emptyIcon: { width:'68px', height:'68px', borderRadius:'50%', background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' },
  emptyTitle: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'18px', fontWeight:'800' },
  emptyDesc: { color:'var(--text3)', fontSize:'14px', maxWidth:'380px', lineHeight:'1.65' },
  list: { display:'flex', flexDirection:'column', gap:'10px' },
  card: { background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--r-md)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap:'wrap', transition:'border-color 0.2s' },
  cardLeft: { display:'flex', alignItems:'center', gap:'16px' },
  classAvatar: { width:'48px', height:'48px', borderRadius:'12px', background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontFamily:'var(--font-head)', fontWeight:'900', flexShrink:0 },
  className: { fontFamily:'var(--font-head)', color:'var(--text)', fontSize:'17px', fontWeight:'800', marginBottom:'5px', letterSpacing:'-0.2px' },
  invMeta: { color:'var(--text3)', fontSize:'13px', marginBottom:'2px' },
  invFrom: { color:'var(--stu2)', fontWeight:'600' },
  invDate: { color:'var(--text4)', fontSize:'12px', fontFamily:'var(--font-mono)' },
  cardActions: { display:'flex', gap:'10px', flexShrink:0 },
  acceptBtn: { background:'linear-gradient(135deg,#818cf8,#6366f1)', color:'#fff', border:'none', borderRadius:'var(--r)', padding:'10px 20px', fontSize:'14px', fontWeight:'700', boxShadow:'0 4px 16px rgba(129,140,248,0.2)', fontFamily:'var(--font-body)', transition:'all 0.2s' },
  rejectBtn: { background:'transparent', color:'var(--text3)', border:'1px solid var(--border2)', borderRadius:'var(--r)', padding:'10px 16px', fontSize:'14px', fontFamily:'var(--font-body)', transition:'all 0.2s' },
}