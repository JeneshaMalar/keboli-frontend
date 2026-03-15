import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewService } from '../services/interviewService';
import type { Invitation } from '../../candidate/services/invitationService';

export const useInterviewSession = (token: string) => {
  const navigate = useNavigate();
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkUrl, setLkUrl] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  const connect = useCallback(async () => {
    if (!token) { 
      setError('No invitation token found in URL.'); 
      return; 
    }
    setValidating(true); 
    setError(null); 
    setAlreadyCompleted(false);
    
    try {
      const inv = await interviewService.validateInvitation(token);
      setInvitation(inv.data);
      
      const lk = await interviewService.getLivekitToken(token);
      setLkToken(lk.data.token); 
      setLkUrl(lk.data.url); 
      setSessionId(lk.data.session_id); 
      setConnected(true);
    } catch (e: any) {
      if (e.response?.status === 409) {
        setAlreadyCompleted(true);
        setError('This interview has already been completed and cannot be restarted.');
      } else {
        setError(e.response?.data?.detail || 'Failed to start session. Please try again.');
      }
    } finally { 
      setValidating(false); 
    }
  }, [token]);

  const disconnect = useCallback(async () => {
    if (sessionId) {
      try { 
        await interviewService.completeSession(sessionId); 
      } catch { 
        // Ignore errors on disconnect
      }
    }
    setLkToken(null); 
    setLkUrl(''); 
    setSessionId(null); 
    setConnected(false);
    navigate(`/candidate/completion?token=${token}`);
  }, [sessionId, navigate, token]);

  useEffect(() => {
    if (token && !connected && !validating) connect();
  }, [token, connected, validating, connect]);

  return {
    lkToken,
    lkUrl,
    validating,
    error,
    alreadyCompleted,
    connected,
    sessionId,
    invitation,
    connect,
    disconnect
  };
};