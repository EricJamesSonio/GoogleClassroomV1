import api from './axios'

export const createMeeting   = (classId, data) => api.post(`/classes/${classId}/meetings`, data)
export const getClassMeetings = (classId)       => api.get(`/classes/${classId}/meetings`)
export const getMeeting      = (meetingId)      => api.get(`/meetings/${meetingId}`)
export const endMeeting      = (meetingId)      => api.patch(`/meetings/${meetingId}/end`)
export const getAgoraToken   = (meetingId)      => api.get(`/meetings/${meetingId}/agora-token`)
export const inviteAllToMeeting = (meetingId)   => api.post(`/meetings/${meetingId}/invite-all`)

export const startRecording = (meetingId) => api.post(`/meetings/${meetingId}/recording/start`)
export const stopRecording  = (meetingId) => api.post(`/meetings/${meetingId}/recording/stop`)