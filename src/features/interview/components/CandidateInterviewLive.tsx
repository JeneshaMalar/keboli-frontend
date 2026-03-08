import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useRoomContext,
  VideoTrack,
  useTracks,
  useTranscriptions,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import api from '../../../lib/axios';
import Modal from '../../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import type { Invitation } from '../../candidate/services/invitationService';


// --- Styling ---
const glassmorphism =
  'bg-white/80 backdrop-blur-2xl border border-slate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]';

const customStyles = `
  .mirror {
    transform: scaleX(-1);
  }
`;

const RecordingIndicator = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">REC</span>
  </div>
);

const Timer = ({ durationMinutes, onTimeUp }: { durationMinutes: number; onTimeUp: () => void }) => {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, onTimeUp]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const timeStr = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return timeStr;
  };

  const isLow = secondsLeft < 300; // 5 minutes

  return (
    <div className={`flex items-center gap-2 px-4 py-1.5 border rounded-full font-mono text-sm font-bold transition-colors ${secondsLeft <= 0 ? 'bg-rose-600 border-rose-600 text-white animate-pulse' : isLow ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
      <span className={`material-symbols-outlined text-sm ${isLow || secondsLeft <= 0 ? 'animate-pulse' : 'opacity-60'}`}>
        {secondsLeft <= 0 ? 'timer_off' : 'schedule'}
      </span>
      {secondsLeft <= 0 ? '00:00' : formatTime(secondsLeft)}
    </div>
  );
};

const InterviewStage: React.FC<{ onDisconnect: () => void, sessionId: string | null, invitation: Invitation | null }> = ({ onDisconnect, sessionId, invitation }) => {
  const room = useRoomContext();
  const voiceAssistant = useVoiceAssistant();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [bufferLeft, setBufferLeft] = useState(120); // 2 minutes buffer

  const isAgentSpeaking = voiceAssistant.state === 'speaking';
  const isListening = voiceAssistant.state === 'listening';
  const duration = invitation?.assessment?.duration_minutes || 20;

  // --- Auto-submit Logic ---
  useEffect(() => {
    if (!isTimeUp) return;

    const someoneSpeaking = isAgentSpeaking || isListening;

    // If no one is speaking OR the buffer is completely exhausted, submit immediately
    if (!someoneSpeaking || bufferLeft <= 0) {
      onDisconnect();
      return;
    }

    // Otherwise, decrement buffer while someone is speaking
    const timer = setInterval(() => {
      setBufferLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimeUp, isAgentSpeaking, isListening, bufferLeft, onDisconnect]);

  // --- Heartbeat Logic ---
  useEffect(() => {
    if (!sessionId || room.state !== 'connected') return;

    const interval = setInterval(async () => {
      try {
        await api.post(`/livekit/session/heartbeat/${sessionId}`);
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    }, 5000); // 5 seconds, matching backend logic

    return () => clearInterval(interval);
  }, [sessionId, room.state]);

  // Get the agent's video track (BeyondPresence avatar)
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false }
    ],
    { onlySubscribed: true }
  );

  // Get local camera track
  const localTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false }
  ).filter(t => t.participant.identity === room.localParticipant.identity);

  const localVideoTrack = localTracks[0] as any;

  // Find the agent's video track (not the candidate's)
  const agentVideoTrack = tracks.find(
    (t) => t.participant.identity !== room.localParticipant.identity
  ) as any;

  const segments = useTranscriptions();

  // Robust transcript filtering: Agent is usually any identity that is NOT the local one
  const agentTranscripts = segments.filter(s => {
    const p = (s as any).participant;
    return p && p.identity !== room.localParticipant.identity;
  });

  const candidateTranscripts = segments.filter(s => {
    const p = (s as any).participant;
    return p && p.identity === room.localParticipant.identity;
  });

  // Get the actual text content from segments
  const lastAgentText = agentTranscripts.length > 0
    ? agentTranscripts[agentTranscripts.length - 1].text
    : (isAgentSpeaking ? 'Interviewer is speaking...' : 'Interviewer is ready...');

  const lastCandidateText = candidateTranscripts.length > 0
    ? candidateTranscripts[candidateTranscripts.length - 1].text
    : (isListening ? 'Listening to your response...' : 'Waiting for prompt...');

  return (
    <>
      <style>{customStyles}</style>
      {/* Glassy Header */}
      <header
        className={`fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl z-50 p-3 rounded-2xl flex justify-between items-center ${glassmorphism}`}
      >
        <div className="flex items-center gap-4">
          <RecordingIndicator />
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <Timer durationMinutes={duration} onTimeUp={() => setIsTimeUp(true)} />
          <div className="h-6 w-px bg-slate-200 mx-2" />
          {isTimeUp && (
            <div className="px-4 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
              <span className="material-symbols-outlined text-xs">auto_mode</span>
              Auto-Submitting in {Math.floor(bufferLeft / 60)}:{(bufferLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
          <button
            onClick={() => setShowConfirm(true)}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
          >
            Submit Interview
            <span className="material-symbols-outlined text-sm">check_circle</span>
          </button>
        </div>

        <div className="flex items-center gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[8px] uppercase tracking-[0.2em] font-black text-slate-400">Secure Session</span>
              <span className="text-[10px] font-mono text-slate-600">{sessionId?.slice(0, 8)}</span>
            </div>
            <div className={`size-2.5 rounded-full ${room.state === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'}`} />
          </div>
        </div>
      </header>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Finalize Interview?"
        footer={
          <div className="flex gap-4 w-full">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Review Work
            </button>
            <button
              onClick={onDisconnect}
              className="flex-1 py-3 px-6 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              Confirm & Submit
            </button>
          </div>
        }
      >
        <div className="p-2">
          <p className="text-slate-600 font-medium leading-relaxed">
            Are you sure you want to end your assessment now? This action is irreversible and your current progress will be submitted for evaluation.
          </p>
        </div>
      </Modal>

      {/* Main Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-7xl mt-28 px-6">
        {/* Interviewer (Agent) Side */}
        <section className="flex flex-col items-center gap-8">
          <div className="relative w-full aspect-square md:aspect-auto md:h-[480px] rounded-[3rem] overflow-hidden border border-slate-200 bg-white shadow-xl flex items-center justify-center p-8 group">
            {/* Ambient Aura */}
            <div
              className={`absolute inset-0 bg-blue-500/5 blur-3xl transition-opacity duration-1000 ${isAgentSpeaking ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Avatar Video or Placeholder */}
            <div
              className={`relative size-64 md:size-80 rounded-full p-1 transition-all duration-500 ${isAgentSpeaking
                ? 'scale-105 shadow-[0_0_80px_rgba(59,130,246,0.2)]'
                : 'opacity-60 scale-95'
                }`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 rotate-45 rounded-full" />
              <div className="relative w-full h-full rounded-full overflow-hidden border-8 border-white bg-slate-50 flex items-center justify-center">
                {agentVideoTrack ? (
                  <VideoTrack
                    trackRef={agentVideoTrack}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-8xl text-blue-500/20">smart_toy</span>
                )}
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-10">
              <div className="px-4 py-1 rounded-full bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20">AI Interviewer</div>

              {/* Agent Visualizer */}
              <div className="w-full flex justify-center">
                <BarVisualizer
                  state={voiceAssistant.state}
                  barCount={24}
                  trackRef={voiceAssistant.audioTrack}
                  className="h-10 w-full max-w-[200px]"
                />
              </div>
            </div>
          </div>

          {/* Interviewer Transcript Box */}
          <div className={`w-full p-8 rounded-[2.5rem] min-h-[160px] transition-all duration-500 ${glassmorphism}`}>
            <div className="flex items-center gap-2 mb-4 opacity-40">
              <span className="material-symbols-outlined text-sm text-blue-600">forum</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-900">Interviewer Feed</span>
            </div>
            <p className="text-xl font-bold leading-relaxed text-slate-800 line-clamp-3 italic">
              "{lastAgentText}"
            </p>
          </div>
        </section>

        {/* Candidate (Self) Side */}
        <section className="flex flex-col items-center gap-8">
          <div className="relative w-full aspect-square md:aspect-auto md:h-[480px] rounded-[3rem] overflow-hidden border border-slate-200 bg-white shadow-xl flex items-center justify-center group">
            {/* Candidate Video Feed - Now correctly placed in Candidate Space */}
            <div className="absolute inset-0 z-0">
              {localVideoTrack ? (
                <VideoTrack trackRef={localVideoTrack} className="w-full h-full object-cover mirror" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white/20 gap-4">
                  <div className="size-20 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl">videocam_off</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">Camera Feed Inactive</p>
                </div>
              )}
            </div>

            {/* Candidate Activity Overlay */}
            <div className="absolute top-6 right-6 z-10 flex flex-col items-end gap-3">
              <div className={`px-4 py-1.5 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isListening ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/90 text-slate-400 border border-slate-200'}`}>
                <span className={`material-symbols-outlined text-xs ${isListening ? 'animate-pulse' : 'opacity-40'}`}>
                  {isListening ? 'mic' : 'mic_none'}
                </span>
                {isListening ? 'Listening' : 'Ready'}
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-10 z-10 text-center">
              <div className="px-4 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">Candidate Feed</div>
              {isListening && <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter animate-pulse">Audio Input Active</p>}
            </div>
          </div>

          {/* Candidate Transcript Box */}
          <div className={`w-full p-8 rounded-[2.5rem] min-h-[160px] transition-all duration-500 ${glassmorphism}`}>
            <div className="flex items-center gap-2 mb-4 opacity-40">
              <span className="material-symbols-outlined text-sm text-indigo-600">record_voice_over</span>
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-900">Your Voice Feed</span>
            </div>
            <p className="text-xl font-bold leading-relaxed text-slate-800 line-clamp-3">
              {lastCandidateText}
            </p>
          </div>
        </section>
      </div>

      {/* Renders all remote audio — required for hearing the agent */}
      <RoomAudioRenderer />
    </>
  );
};

// ---------------------------------------------------------
// Outer component — handles token fetching and LiveKitRoom
// ---------------------------------------------------------
const CandidateInterviewLive: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  const connect = useCallback(async () => {
    if (!token) {
      setClientError('No invitation token found in URL.');
      return;
    }
    setIsValidating(true);
    setClientError(null);

    try {
      // Validate invitation and get duration
      const invResponse = await api.get(`/invitation/validate/${token}`);
      setInvitation(invResponse.data);

      // Call our backend to get a LiveKit token
      const response = await api.post(`/livekit/token`, null, {
        params: { invitation_token: token },
      });
      setLivekitToken(response.data.token);
      setLivekitUrl(response.data.url);
      setSessionId(response.data.session_id);
      setIsConnected(true);
    } catch (err: any) {
      setClientError(err.response?.data?.detail || 'Failed to start session.');
    } finally {
      setIsValidating(false);
    }
  }, [token]);

  const disconnect = useCallback(async () => {
    if (sessionId) {
      try {
        await api.post(`/livekit/session/${sessionId}/complete`, null, {
          params: { auto_evaluate: true }
        });
      } catch (err) {
        console.error('Failed to complete session on disconnect:', err);
      }
    }
    setLivekitToken(null);
    setLivekitUrl('');
    setSessionId(null);
    setIsConnected(false);
    navigate(`/candidate/completion?token=${token}`);
  }, [sessionId, navigate, token]);

  // --- Auto-connect on mount ---
  useEffect(() => {
    if (token && !isConnected && !isValidating) {
      connect();
    }
  }, [token, isConnected, isValidating, connect]);

  // --- Not yet connected: show the start screen ---
  if (!isConnected || !livekitToken) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 flex flex-col items-center justify-center font-sans">
        {/* Dynamic Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px]" />
        </div>

        <header
          className={`fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 p-4 rounded-2xl flex justify-between items-center ${glassmorphism}`}
        >
          <div className="flex items-center gap-3">
            <div className="size-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
            <span className="text-xs font-black tracking-widest uppercase text-slate-400">
              Disconnected
            </span>
          </div>

          <button
            onClick={connect}
            disabled={isValidating || !token}
            className={`px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all font-black text-sm shadow-lg shadow-blue-600/20 ${isValidating || !token ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
              }`}
          >
            {isValidating ? 'Establishing Feed...' : 'Reconnect System'}
          </button>
        </header>

        {clientError && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 text-[10px] uppercase font-bold tracking-tighter">
            System Warning: {clientError}
          </div>
        )}
      </div>
    );
  }

  // --- Connected: render the LiveKit room ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px]" />
      </div>

      <LiveKitRoom
        serverUrl={livekitUrl}
        token={livekitToken}
        connect={true}
        audio={true}
        video={true}
        onDisconnected={disconnect}
        className="w-full h-full flex flex-col items-center"
      >
        <InterviewStage onDisconnect={disconnect} sessionId={sessionId} invitation={invitation} />
      </LiveKitRoom>
    </div>
  );
};

export default CandidateInterviewLive;
