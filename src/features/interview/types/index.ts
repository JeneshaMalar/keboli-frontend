import type { Invitation } from '../../candidate/services/invitationService';

export interface TranscriptMessage {
  id: string;
  side: 'ai' | 'you';
  text: string;
}

export interface DbTranscript {
  role?: string;
  content?: string;
  text?: string;
}

export interface TimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
  syncedSecs?: number;
}

export interface WaveBarsProps {
  active: boolean;
  color: string;
}

export interface VideoCardProps {
  children: React.ReactNode;
  isActive: boolean;
  activeColor: string;
  ringClass: string;
}

export interface TranscriptPanelProps {
  label: string;
  dotColor: string;
  messages: TranscriptMessage[];
  showTyping: boolean;
  typingRole: 'ai' | 'you';
  hint: string;
}

export interface MsgProps {
  side: 'ai' | 'you';
  text: string;
  isTyping?: boolean;
}

export interface LoadingScreenProps {
  validating: boolean;
  error: string | null;
  alreadyCompleted?: boolean;
  onRetry: () => void;
}

export interface InterviewStageProps {
  onDisconnect: () => void;
  sessionId: string | null;
  invitation: Invitation | null;
}