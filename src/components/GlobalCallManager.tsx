import { useCallback, useEffect, useRef, useState } from 'react';
import type { SocialUser } from '../lib/socialData';
import { callerName, sendCallSignal, subscribeToCallSignals, type CallSignal } from '../lib/callSignaling';
import { playNotificationSound } from '../lib/notificationSound';
import { sendDirectMessage } from '../lib/directMessages';

type CallState = { callId: string; peerId: string; name: string; avatarUrl?: string | null;
  direction: 'incoming' | 'outgoing'; offer?: RTCSessionDescriptionInit; status: string };
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

export function GlobalCallManager({ userId }: { userId: string }) {
  const [call, setCall] = useState<CallState | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const iceQueue = useRef<RTCIceCandidateInit[]>([]);
  const callRef = useRef<CallState | null>(null);
  const acceptedAt = useRef<number | null>(null);
  const logged = useRef(false);
  const answerTimer = useRef<number | null>(null);
  const ringTimer = useRef<number | null>(null);
  useEffect(() => { callRef.current = call; }, [call]);

  const close = useCallback(() => {
    peer.current?.close(); peer.current = null;
    local.current?.getTracks().forEach((track) => track.stop()); local.current = null;
    if (answerTimer.current) window.clearTimeout(answerTimer.current);
    stopRinging();
    iceQueue.current = []; callRef.current = null; setCall(null);
  }, []);

  const receive = useCallback(async (signal: CallSignal) => {
    const current = callRef.current;
    if (signal.signal_type === 'offer' && !current) {
      const person = await callerName(signal.sender_id);
      const next: CallState = { callId: signal.call_id, peerId: signal.sender_id,
        direction: 'incoming', offer: signal.payload as unknown as RTCSessionDescriptionInit,
        name: person.name, avatarUrl: person.avatarUrl, status: 'Входящий звонок · ответь в течение 1:30' };
      callRef.current = next; setCall(next); startRinging(); return;
    }
    if (!current || current.callId !== signal.call_id) return;
    if (signal.signal_type === 'answer' && peer.current) {
      await peer.current.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit);
      acceptedAt.current = Date.now();
      if (answerTimer.current) window.clearTimeout(answerTimer.current);
      stopRinging();
      await flushIce(peer.current); setCall((old) => old ? { ...old, status: 'Разговор идёт' } : old);
    } else if (signal.signal_type === 'ice') {
      const candidate = signal.payload as RTCIceCandidateInit;
      if (peer.current?.remoteDescription) await peer.current.addIceCandidate(candidate).catch(() => undefined);
      else iceQueue.current.push(candidate);
    } else if (signal.signal_type === 'hangup' || signal.signal_type === 'reject') {
      await saveCallHistory(current); close();
    }
  }, [close]);

  useEffect(() => {
    const channel = subscribeToCallSignals(userId, receive);
    const start = (event: Event) => void startOutgoing((event as CustomEvent<SocialUser>).detail);
    window.addEventListener('goalquest-start-call', start);
    return () => { void channel.unsubscribe(); window.removeEventListener('goalquest-start-call', start); close(); };
  }, [close, receive, userId]);

  async function createPeer(callId: string, peerId: string) {
    local.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    const connection = new RTCPeerConnection(rtcConfig); peer.current = connection;
    local.current.getTracks().forEach((track) => connection.addTrack(track, local.current!));
    connection.onicecandidate = (event) => event.candidate && void sendCallSignal(callId, peerId, 'ice',
      event.candidate.toJSON() as unknown as Record<string, unknown>);
    connection.ontrack = (event) => { if (remoteAudio.current) remoteAudio.current.srcObject = event.streams[0]; };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') setCall((old) => old ? { ...old, status: 'Разговор идёт' } : old);
      if (connection.connectionState === 'failed') {
        const current = callRef.current;
        if (current) void saveCallHistory(current).finally(close); else close();
      }
    };
    return connection;
  }

  async function startOutgoing(user: SocialUser) {
    if (callRef.current) return;
    const callId = crypto.randomUUID();
    const next: CallState = { callId, peerId: user.id, name: user.name,
      direction: 'outgoing', status: 'Звоним… ожидание до 1:30' };
    acceptedAt.current = null; logged.current = false;
    callRef.current = next; setCall(next);
    try {
      const connection = await createPeer(callId, user.id);
      const offer = await connection.createOffer(); await connection.setLocalDescription(offer);
      await sendCallSignal(callId, user.id, 'offer', offer as unknown as Record<string, unknown>);
      startRinging();
      answerTimer.current = window.setTimeout(() => void timeoutCall(callId), 90_000);
    } catch {
      logged.current = true;
      setCall((old) => old ? { ...old, status: 'Не удалось начать звонок или получить доступ к микрофону' } : old);
    }
  }

  async function answer() {
    if (!call?.offer) return;
    try {
      const connection = await createPeer(call.callId, call.peerId);
      await connection.setRemoteDescription(call.offer); await flushIce(connection);
      const answer = await connection.createAnswer(); await connection.setLocalDescription(answer);
      await sendCallSignal(call.callId, call.peerId, 'answer', answer as unknown as Record<string, unknown>);
      setCall((old) => old ? { ...old, status: 'Соединяем…' } : old);
    } catch { setCall((old) => old ? { ...old, status: 'Разреши доступ к микрофону' } : old); }
  }
  async function end(reject = false) {
    if (call) {
      await sendCallSignal(call.callId, call.peerId, reject ? 'reject' : 'hangup');
      await saveCallHistory(call);
    }
    close();
  }
  function startRinging() {
    stopRinging();
    playNotificationSound('call');
    ringTimer.current = window.setInterval(() => playNotificationSound('call'), 2_600);
  }
  function stopRinging() {
    if (ringTimer.current) window.clearInterval(ringTimer.current);
    ringTimer.current = null;
  }
  async function timeoutCall(callId: string) {
    const current = callRef.current;
    if (!current || current.callId !== callId || acceptedAt.current) return;
    await sendCallSignal(current.callId, current.peerId, 'hangup');
    await saveCallHistory(current); close();
  }
  async function saveCallHistory(current: CallState) {
    if (current.direction !== 'outgoing' || logged.current) return;
    logged.current = true;
    const content = acceptedAt.current
      ? `📞 Аудиозвонок · ${formatDuration(Date.now() - acceptedAt.current)}`
      : '📵 Пропущенный аудиозвонок';
    await sendDirectMessage(current.peerId, 'call', content);
  }
  async function flushIce(connection: RTCPeerConnection) {
    const queued = iceQueue.current.splice(0);
    await Promise.all(queued.map((candidate) => connection.addIceCandidate(candidate).catch(() => undefined)));
  }

  if (!call) return null;
  return <div className="call-overlay global-call"><audio ref={remoteAudio} autoPlay />
    <div className="call-person"><span className="call-avatar">{call.avatarUrl ? <img src={call.avatarUrl} alt="" /> : call.name[0]}</span>
      <h2>{call.name}</h2><p>{call.status}</p></div>
    <div className="call-controls">{call.direction === 'incoming' && call.status.includes('Входящий') &&
      <button className="answer-call" onClick={() => void answer()}>☎</button>}
      <button className="hang-up" onClick={() => void end(call.direction === 'incoming')}>☎</button></div>
  </div>;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} мин ${seconds % 60} сек` : `${seconds} сек`;
}
