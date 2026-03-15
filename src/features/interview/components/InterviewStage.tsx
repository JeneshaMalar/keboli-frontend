import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRoomContext, useVoiceAssistant, BarVisualizer, useTracks, useTranscriptions, VideoTrack, RoomAudioRenderer } from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import Modal from '../../../components/ui/Modal';
import { Timer } from './Timer';
import { WaveBars } from './WaveBars';
import { VideoCard } from './VideoCard';
import { TranscriptPanel } from './TranscriptPanel';
import { STYLES } from '../styles/styles';
import { useTimerSync } from '../hooks/useTimerSync';
import { interviewService } from '../services/interviewService';
import type { InterviewStageProps, DbTranscript, TranscriptMessage } from '../types';

// Define the transcription segment type locally since it's not exported
interface TranscriptionSegment {
  id: string;
  text: string;
  participantIdentity?: string;
  language?: string;
  final?: boolean;
  timestamp?: number;
}

export const InterviewStage: React.FC<InterviewStageProps> = ({ onDisconnect, sessionId, invitation }) => {
  const room = useRoomContext();
  const va = useVoiceAssistant();
  const [confirm, setConfirm] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [buffer, setBuffer] = useState(120);
  const [dbTx, setDbTx] = useState<DbTranscript[]>([]);
  const [liveTranscripts, setLiveTranscripts] = useState<TranscriptionSegment[]>([]);

  const speaking = va.state === 'speaking';
  const listening = va.state === 'listening';
  const duration = invitation?.assessment?.duration_minutes ?? 20;
  const online = room.state === 'connected';

  const { serverRemainingSeconds, interviewEndedRef } = useTimerSync(online, onDisconnect);

  // Fetch transcripts from database
  useEffect(() => {
    if (!sessionId || !online) return;
    
    const fetchTranscripts = async () => {
      try { 
        const r = await interviewService.getTranscript(sessionId); 
        if (Array.isArray(r.data)) {
          console.log('Fetched transcripts:', r.data);
          setDbTx(r.data); 
        }
      } catch (error) {
        console.error('Error fetching transcripts:', error);
      }
    };
    
    fetchTranscripts(); 
    const id = setInterval(fetchTranscripts, 3000); 
    return () => clearInterval(id);
  }, [sessionId, online]);

  // Listen for live transcription segments using RoomEvent
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any, kind: any) => {
      try {
        // Try to parse as transcription data
        const text = new TextDecoder().decode(payload);
        // Check if this might be transcription data
        if (text && text.length > 0 && !text.startsWith('{')) {
          // This is likely plain text transcription
          const segment: TranscriptionSegment = {
            id: `live-${Date.now()}-${Math.random()}`,
            text: text,
            participantIdentity: participant?.identity,
            timestamp: Date.now()
          };
          setLiveTranscripts(prev => [...prev, segment]);
        }
      } catch (error) {
        // Not valid text data, ignore
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // Get all transcriptions from LiveKit hook
  const transcriptions = useTranscriptions();
  
  // Combine and process all transcript sources
  const { aiMsgs, youMsgs } = useMemo(() => {
    const aiMessages: TranscriptMessage[] = [];
    const youMessages: TranscriptMessage[] = [];
    const seenTexts = new Set<string>(); // For deduplication

    // Process database transcripts
    dbTx.forEach((t, i) => {
      const role = t.role?.toLowerCase() || '';
      const text = t.content || t.text || '';
      
      if (!text || text.trim() === '') return;
      if (seenTexts.has(text)) return;
      seenTexts.add(text);

      if (role === 'interviewer' && text) {
        aiMessages.push({ 
          id: `db-ai-${i}`, 
          side: 'ai', 
          text 
        });
      } else if (role === 'candidate' && text) {
        youMessages.push({ 
          id: `db-you-${i}`, 
          side: 'you', 
          text 
        });
      }
    });

    // Process LiveKit transcriptions
    if (transcriptions && Array.isArray(transcriptions) && transcriptions.length > 0) {
      transcriptions.forEach((segment: any, i: number) => {
        // Handle different possible structures of transcription data
        const text = segment?.text || segment?.transcript || '';
        const participantId = segment?.participant?.identity || segment?.participantIdentity || '';
        
        if (!text || text.trim() === '') return;
        if (seenTexts.has(text)) return;
        seenTexts.add(text);

        // Determine if this is AI or candidate
        const isAI = participantId.includes('ai') || 
                     participantId.includes('agent') || 
                     (participantId && participantId !== room.localParticipant.identity);

        if (isAI) {
          aiMessages.push({ 
            id: `live-ai-${i}-${Date.now()}`, 
            side: 'ai', 
            text 
          });
        } else {
          youMessages.push({ 
            id: `live-you-${i}-${Date.now()}`, 
            side: 'you', 
            text 
          });
        }
      });
    }

    // Process liveTranscripts from data channel
    liveTranscripts.forEach((segment, i) => {
      const text = segment.text || '';
      if (!text || text.trim() === '') return;
      if (seenTexts.has(text)) return;
      seenTexts.add(text);

      // Determine if this is AI or candidate
      const isAI = segment.participantIdentity?.includes('ai') || 
                   segment.participantIdentity?.includes('agent') ||
                   (segment.participantIdentity && segment.participantIdentity !== room.localParticipant.identity);

      if (isAI) {
        aiMessages.push({ 
          id: `live2-ai-${i}`, 
          side: 'ai', 
          text 
        });
      } else {
        youMessages.push({ 
          id: `live2-you-${i}`, 
          side: 'you', 
          text 
        });
      }
    });

    // Sort messages by some criteria if needed (assuming they might have timestamps)
    // For now, keep them in the order they were added

    console.log('Processed AI messages:', aiMessages.length);
    console.log('Processed You messages:', youMessages.length);
    if (aiMessages.length > 0) console.log('Sample AI message:', aiMessages[0]);
    if (youMessages.length > 0) console.log('Sample You message:', youMessages[0]);

    return { aiMsgs: aiMessages, youMsgs: youMessages };
  }, [dbTx, transcriptions, liveTranscripts, room.localParticipant.identity]);

  // Rest of the effects remain the same...
  useEffect(() => {
    if (!timeUp) return;
    if (!(speaking || listening) || buffer <= 0) { onDisconnect(); return; }
    const id = setInterval(() => setBuffer(p => p - 1), 1000);
    return () => clearInterval(id);
  }, [timeUp, speaking, listening, buffer, onDisconnect]);

  useEffect(() => {
    if (!sessionId || !online) return;
    const id = setInterval(async () => { 
      try { 
        await interviewService.sendHeartbeat(sessionId); 
      } catch (error) {
        console.error('Heartbeat error:', error);
      } 
    }, 5000);
    return () => clearInterval(id);
  }, [sessionId, online]);

  useEffect(() => {
    if (!sessionId || !online) return;
    const id = setInterval(async () => {
      if (interviewEndedRef.current) return;
      try {
        const res = await interviewService.getSessionStatus(sessionId);
        if (res.data?.is_completed) {
          interviewEndedRef.current = true;
          console.log('[Interview] Session status polling detected completion. Auto-submitting...');
          setTimeout(() => onDisconnect(), 2000);
        }
      } catch (error) {
        console.error('Error checking session status:', error);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [sessionId, online, onDisconnect, interviewEndedRef]);

  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], { onlySubscribed: true });
  const localTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], { onlySubscribed: false })
    .filter(t => t.participant.identity === room.localParticipant.identity);

  const agentTrack = allTracks.find(t => t.participant.identity !== room.localParticipant.identity) as any;
  const localTrack = localTracks[0] as any;

  return (
    <>
      <style>{STYLES}</style>

      <div className="fixed inset-0 canvas-bg -z-10" />
      <div className="fixed top-[-20%] right-[-10%] w-[480px] h-[480px] rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(91,60,245,.06) 0%, transparent 70%)' }} />
      <div className="fixed bottom-[-15%] left-[-8%] w-[400px] h-[400px] rounded-full -z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(14,168,160,.05) 0%, transparent 70%)' }} />

      <header className="sticky top-0 z-50 fade-up"
        style={{ background: 'rgba(247,246,242,.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-8 h-[64px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative size-9 shrink-0">
              <div className="absolute inset-0 rounded-xl rotate-6" style={{ background: 'var(--violet-l)' }} />
              <div className="absolute inset-0 rounded-xl flex items-center justify-center" style={{ background: 'var(--violet)' }}>
                <span className="material-symbols-outlined text-white text-[17px]">smart_toy</span>
              </div>
            </div>
            <div className="leading-none">
              <p className="text-[8px] font-black uppercase tracking-[.18em] mb-1" style={{ color: 'var(--ink-3)' }}>Interview Session</p>
              <p className="text-[14px] font-bold truncate max-w-[200px]" style={{ color: 'var(--ink)' }}>
                {invitation?.assessment?.title ?? 'Assessment'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <Timer durationMinutes={duration} onTimeUp={() => setTimeUp(true)} syncedSecs={serverRemainingSeconds} />
            <div className="h-8 w-px" style={{ background: 'var(--border)' }} />

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-300"
              style={speaking
                ? { background: 'var(--violet-l)', color: 'var(--violet)', border: '1px solid #c4b5fd' }
                : listening
                  ? { background: 'var(--teal-l)', color: 'var(--teal)', border: '1px solid #99e0dd' }
                  : { background: 'var(--canvas)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
              <span className="size-1.5 rounded-full blink"
                style={{ background: speaking ? 'var(--violet)' : listening ? 'var(--teal)' : 'var(--ink-4)' }} />
              {speaking ? 'AI Speaking' : listening ? 'Listening…' : 'Standby'}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
              style={{ background: '#fff1f2', color: 'var(--rose)', border: '1px solid #fecdd3' }}>
              <span className="size-1.5 rounded-full blink" style={{ background: 'var(--rose)' }} />
              REC
            </div>

            {timeUp && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black"
                style={{ background: '#fff8ed', color: 'var(--amber)', border: '1px solid #fed7aa' }}>
                <span className="material-symbols-outlined text-[13px]">timer</span>
                Submitting {Math.floor(buffer / 60)}:{(buffer % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}>
              <span className={`size-1.5 rounded-full ${online ? '' : ''}`}
                style={{ background: online ? 'var(--teal)' : 'var(--rose)' }} />
              <span className="mono text-[9px]" style={{ color: 'var(--ink-3)' }}>{sessionId?.slice(0, 12) ?? '—'}</span>
            </div>
            <button onClick={() => setConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all active:scale-[.97]"
              style={{
                background: 'var(--ink)', color: '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,.12), 0 4px 16px rgba(14,14,17,.18)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e24')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}>
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              Submit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 pt-8 pb-12">
        <div className="flex items-center gap-4 mb-7 fade-up delay-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] mb-0.5" style={{ color: 'var(--ink-3)' }}>Live Interview</p>
            <p className="text-lg font-black" style={{ color: 'var(--ink)' }}>Two-way session in progress</p>
          </div>
          <div className="flex-1 grad-divider ml-4" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--paper)', border: '1px solid var(--border)' }}>
            <span className="size-1.5 rounded-full" style={{ background: online ? 'var(--teal)' : 'var(--rose)' }} />
            <span className="text-[10px] font-bold" style={{ color: 'var(--ink-3)' }}>{online ? 'Connected' : 'Reconnecting…'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 fade-up delay-2">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--violet)', boxShadow: '0 3px 10px rgba(91,60,245,.3)' }}>
                <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
              </div>
              <div className="leading-none">
                <p className="text-[13px] font-black" style={{ color: 'var(--ink)' }}>AI Interviewer</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--ink-3)' }}>Automated assessment agent</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <WaveBars active={speaking} color="var(--violet)" />
                {speaking && (
                  <span className="text-[10px] font-bold animate-pulse" style={{ color: 'var(--violet)' }}>Speaking</span>
                )}
              </div>
            </div>

            <VideoCard isActive={speaking} activeColor="var(--violet)" ringClass="ring-violet">
              {agentTrack
                ? <VideoTrack trackRef={agentTrack} className="absolute inset-0 w-full h-full object-cover" />
                : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-7"
                    style={{
                      background: speaking
                        ? 'linear-gradient(135deg, #f0eeff 0%, #fafafe 60%, #f0f9ff 100%)'
                        : 'linear-gradient(160deg, var(--canvas) 0%, var(--paper) 100%)'
                    }}>
                    <div className="relative flex items-center justify-center">
                      {speaking && <>
                        <div className="absolute size-56 rounded-full opacity-20 animate-ping"
                          style={{ border: '1px solid var(--violet)', animationDuration: '2s' }} />
                        <div className="absolute size-44 rounded-full opacity-30"
                          style={{ border: '1px dashed var(--violet)' }} />
                      </>}
                      <div className="absolute size-36 rounded-full opacity-10"
                        style={{ border: '1px solid var(--violet)' }} />
                      <div className="relative size-[88px] rounded-full p-[2.5px] transition-all duration-700"
                        style={{
                          background: speaking
                            ? 'linear-gradient(135deg, var(--violet) 0%, #38bdf8 100%)'
                            : 'var(--border)',
                          boxShadow: speaking ? '0 8px 32px rgba(91,60,245,.35)' : '0 4px 16px rgba(0,0,0,.06)',
                        }}>
                        <div className="size-full rounded-full flex items-center justify-center"
                          style={{ background: 'var(--paper)' }}>
                          <span className="material-symbols-outlined text-[44px] transition-colors duration-500"
                            style={{ color: speaking ? 'var(--violet)' : 'var(--ink-4)' }}>smart_toy</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-36">
                      <BarVisualizer state={va.state} barCount={14} trackRef={va.audioTrack} className="h-7 w-full" />
                    </div>
                    <div className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all duration-400"
                      style={speaking
                        ? { background: 'var(--violet-l)', color: 'var(--violet)', border: '1px solid #c4b5fd' }
                        : { background: 'var(--canvas)', color: 'var(--ink-3)', border: '1px solid var(--border)' }}>
                      {speaking ? '● Speaking now…' : 'Ready for session'}
                    </div>
                  </div>
                )}
              <div className="absolute bottom-4 left-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.8)', boxShadow: '0 1px 6px rgba(0,0,0,.08)' }}>
                  <span className="size-1.5 rounded-full blink" style={{ background: speaking ? 'var(--violet)' : 'var(--ink-4)' }} />
                  <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
                    {speaking ? 'Interviewing' : 'AI Interviewer'}
                  </span>
                </div>
              </div>
            </VideoCard>

            <TranscriptPanel
              label="Interviewer Transcript"
              dotColor="var(--violet)"
              messages={aiMsgs}
              showTyping={speaking && aiMsgs.length === 0}
              typingRole="ai"
              hint="Questions and prompts appear here as the interview unfolds"
            />
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--teal)', boxShadow: '0 3px 10px rgba(14,168,160,.3)' }}>
                <span className="material-symbols-outlined text-white text-[16px]">person</span>
              </div>
              <div className="leading-none">
                <p className="text-[13px] font-black" style={{ color: 'var(--ink)' }}>You</p>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--ink-3)' }}>Candidate feed</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <WaveBars active={listening} color="var(--teal)" />
                {listening && (
                  <span className="text-[10px] font-bold animate-pulse" style={{ color: 'var(--teal)' }}>Responding</span>
                )}
              </div>
            </div>

            <VideoCard isActive={listening} activeColor="var(--teal)" ringClass="ring-teal">
              {localTrack
                ? <VideoTrack trackRef={localTrack} className="absolute inset-0 w-full h-full object-cover mirror" />
                : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                    style={{ background: 'linear-gradient(160deg, var(--canvas) 0%, var(--paper) 100%)' }}>
                    <div className="size-20 rounded-full flex items-center justify-center"
                      style={{ border: '2px dashed var(--border)' }}>
                      <span className="material-symbols-outlined text-4xl" style={{ color: 'var(--ink-4)' }}>videocam_off</span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--ink-4)' }}>Camera Inactive</p>
                  </div>
                )}
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300"
                  style={listening
                    ? { background: 'var(--teal)', color: '#fff', boxShadow: '0 2px 10px rgba(14,168,160,.4)' }
                    : { background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}>
                  <span className={`material-symbols-outlined text-[14px] ${listening ? 'blink' : ''}`}>
                    {listening ? 'mic' : 'mic_none'}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider">{listening ? 'Live' : 'Ready'}</span>
                </div>
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.8)', boxShadow: '0 1px 6px rgba(0,0,0,.08)' }}>
                  <span className="size-1.5 rounded-full blink" style={{ background: listening ? 'var(--teal)' : 'var(--ink-4)' }} />
                  <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>
                    {listening ? 'Responding' : 'Candidate'}
                  </span>
                </div>
              </div>
            </VideoCard>

            <TranscriptPanel
              label="Your Responses"
              dotColor="var(--teal)"
              messages={youMsgs}
              showTyping={listening && youMsgs.length === 0}
              typingRole="you"
              hint="Your spoken responses are transcribed here in real time"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 fade-up delay-3">
          <div className="h-px w-12" style={{ background: 'var(--border)' }} />
          <p className="text-[11px] font-medium" style={{ color: 'var(--ink-4)' }}>
            Speak naturally — transcripts refresh automatically
          </p>
          <div className="h-px w-12" style={{ background: 'var(--border)' }} />
        </div>
      </main>

      <Modal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        title="Submit Interview?"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setConfirm(false)}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'var(--canvas)', color: 'var(--ink-2)', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#eeeee8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--canvas)')}>
              Continue Interview
            </button>
            <button onClick={onDisconnect}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'var(--ink)', boxShadow: '0 4px 14px rgba(14,14,17,.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e1e24')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}>
              Confirm & Submit
            </button>
          </div>
        }>
        <div className="space-y-3 py-1">
          <div className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: '#fff8ed', border: '1px solid #fed7aa' }}>
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" style={{ color: 'var(--amber)' }}>warning</span>
            <p className="text-sm font-medium leading-relaxed" style={{ color: '#92400e' }}>
              This is <strong>permanent</strong>. Your responses will be submitted for AI evaluation — you cannot re-enter the session once closed.
            </p>
          </div>
          <p className="mono text-[10px] px-0.5" style={{ color: 'var(--ink-4)' }}>
            {sessionId?.slice(0, 24) ?? '—'}…
          </p>
        </div>
      </Modal>

      <RoomAudioRenderer />
    </>
  );
};