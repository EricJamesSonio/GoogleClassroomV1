import api from './axios'

export const createClass     = (data)         => api.post('/classes', data)
export const getClasses      = ()              => api.get('/classes')
export const getClassDetail  = (classId)       => api.get(`/classes/${classId}`)
export const inviteStudent   = (classId, data) => api.post(`/classes/${classId}/invite`, data)
export const requestJoin     = (classId)       => api.post(`/classes/${classId}/request-join`)
export const getInvitations  = ()              => api.get('/invitations')
export const acceptInvite    = (id)            => api.post(`/invitations/${id}/accept`)
export const rejectInvite    = (id)            => api.post(`/invitations/${id}/reject`)
export const getJoinRequests = (classId)       => api.get(`/classes/${classId}/join-requests`)
export const acceptJoinReq   = (id)            => api.post(`/join-requests/${id}/accept`)
export const rejectJoinReq   = (id)            => api.post(`/join-requests/${id}/reject`)