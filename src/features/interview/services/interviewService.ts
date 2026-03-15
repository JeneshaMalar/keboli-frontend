import api from '../../../lib/axios';


export const interviewService = {
  validateInvitation: (token: string) => 
    api.get(`/invitation/validate/${token}`),

  getLivekitToken: (token: string) => 
    api.post(`/livekit/token`, null, { params: { invitation_token: token } }),

  getTranscript: (sessionId: string) => 
    api.get(`/evaluation/transcript/${sessionId}`),

  sendHeartbeat: (sessionId: string) => 
    api.post(`/livekit/session/heartbeat/${sessionId}`),

  getSessionStatus: (sessionId: string) => 
    api.get(`/livekit/session/${sessionId}/status`),

  completeSession: (sessionId: string) => 
    api.post(`/livekit/session/${sessionId}/complete`, null, { params: { auto_evaluate: true } })
};