import api from '../../../lib/axios'
import { type AxiosResponse } from 'axios'
import { type Invitation } from '../../candidate/services/invitationService'

export type ValidationResponse = Invitation

export interface LivekitTokenResponse {
  token: string
  url: string
  session_id: string
}

export interface TranscriptResponse {
  transcript: string
}

export interface SessionStatusResponse {
  status: string
  is_active: boolean
  is_completed: boolean
}

export const interviewService = {
  validateInvitation: (token: string): Promise<AxiosResponse<ValidationResponse>> =>
    api.get(`/invitation/validate/${token}`),

  getLivekitToken: (token: string): Promise<AxiosResponse<LivekitTokenResponse>> =>
    api.post(`/livekit/token`, null, { params: { invitation_token: token } }),

  getTranscript: (sessionId: string): Promise<AxiosResponse<TranscriptResponse>> =>
    api.get(`/evaluation/transcript/${sessionId}`),

  sendHeartbeat: (sessionId: string): Promise<AxiosResponse<{ ok: boolean }>> =>
    api.post(`/livekit/session/heartbeat/${sessionId}`),

  getSessionStatus: (sessionId: string): Promise<AxiosResponse<SessionStatusResponse>> =>
    api.get(`/livekit/session/${sessionId}/status`),

  completeSession: (sessionId: string): Promise<AxiosResponse<{ status: string }>> =>
    api.post(`/livekit/session/${sessionId}/complete`, null, { params: { auto_evaluate: true } }),
}
