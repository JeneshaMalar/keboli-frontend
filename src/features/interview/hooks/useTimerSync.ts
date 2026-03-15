import { useState, useEffect, useRef } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';

export const useTimerSync = (online: boolean, onInterviewEnded: () => void) => {
  const room = useRoomContext();
  const [serverRemainingSeconds, setServerRemainingSeconds] = useState<number | undefined>(undefined);
  const interviewEndedRef = useRef(false);

  useEffect(() => {
    if (!room || !online) return;

    const handleDataReceived = (payload: Uint8Array, _participant: any, _kind: any, topic?: string) => {
      if (topic !== 'interview_control') return;

      try {
        const data = JSON.parse(new TextDecoder().decode(payload));

        if (data.type === 'timer_sync' && typeof data.remaining_seconds === 'number') {
          setServerRemainingSeconds(data.remaining_seconds);
          return;
        }

        if (data.type === 'interview_ended' && data.auto_submit) {
          if (interviewEndedRef.current) return;
          interviewEndedRef.current = true;
          console.log(`[Interview] Received interview_ended signal (reason=${data.reason}). Auto-submitting in 3s...`);
          setTimeout(() => {
            if (!interviewEndedRef.current) return;
            onInterviewEnded();
          }, 3000);
        }
      } catch (e) {
        console.warn('[Interview] Failed to parse data message:', e);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => { room.off(RoomEvent.DataReceived, handleDataReceived); };
  }, [room, online, onInterviewEnded]);

  return { serverRemainingSeconds, interviewEndedRef };
};