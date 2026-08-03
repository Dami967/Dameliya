import { useCallback, useEffect, useRef, useState } from 'react';
import type { SocialUser } from '../lib/socialData';
import { callerName, sendCallSignal, subscribeToCallSignals, type CallSignal } from '../lib/callSignaling';
import { playNotificationSound } from '../lib/notificationSound';

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
  useEffect(() => { callRef.current = call; }, [call]);

  const close = useCallback(() => {
    peer.current?.close(); peer.current = null;
    local.current?.getTracks().forEach((track) => track.stop()); local.current = null;
    iceQueue.current = []; callRef.current = null; setCall(null);
  }, []);

  const receive = useCallback(async (signal: CallSignal) => {
    const current = callRef.current;
    if (signal.signal_type === 'offer' && !current) {
      const person = await callerName(signal.sender_id);
      const next: CallState = { callId: signal.call_id, peerId: signal.sender_id,
        direction: 'incoming', offer: signal.payload as unknown as RTCSessionDescriptionInit,
        name: person.name, avatarUrl: person.avatarUrl, status: 'Входящий аудиозвонок' };
      callRef.current = next; setCall(next); playNotificationSound('call'); return;
    }
    if (!current || current.callId !== signal.call_id) return;
    if (signal.signal_type === 'answer' && peer.current) {
      await peer.current.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit);
      await flushIce(peer.current); setCall((old) => old ? { ...old, status: 'Разговор идёт' } : old);
    } else if (signal.signal_type === 'ice') {
      const candidate = signal.payload as RTCIceCandidateInit;
      if (peer.current?.remoteDescription) await peer.current.addIceCandidate(candidate).catch(() => undefined);
      else iceQueue.current.push(candidate);
    } else if (signal.signal_type === 'hangup' || signal.signal_type === 'reject') close();
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
      if (['failed', 'closed'].includes(connection.connectionState)) close();
    };
    return connection;
  }

  async function startOutgoing(user: SocialUser) {
    if (callRef.current) return;
    const callId = crypto.randomUUID();
    const next: CallState = { callId, peerId: user.id, name: user.name,
      direction: 'outgoing', status: 'Звоним…' };
    callRef.current = next; setCall(next);
    try {
      const connection = await createPeer(callId, user.id);
      const offer = await connection.createOffer(); await connection.setLocalDescription(offer);
      await sendCallSignal(callId, user.id, 'offer', offer as unknown as Record<string, unknown>);
    } catch { setCall((old) => old ? { ...old, status: 'Не удалось получить доступ к микрофону' } : old); }
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
    if (call) await sendCallSignal(call.callId, call.peerId, reject ? 'reject' : 'hangup');
    close();
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
