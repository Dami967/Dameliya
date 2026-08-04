import { useCallback, useEffect, useRef, useState } from 'react';
import type { SocialUser } from '../lib/socialData';
import { callerName, loadCallIceCandidates, sendCallSignal, subscribeToCallSignals,
  type CallSignal } from '../lib/callSignaling';
import { playNotificationSound } from '../lib/notificationSound';
import { recordCallMessage } from '../lib/directMessages';
import { callRtcConfig } from '../lib/turnServers';
import { startRealtimeAudioRelay, type AudioRelay } from '../lib/realtimeAudioRelay';

type CallState = { callId: string; peerId: string; name: string; avatarUrl?: string | null;
  direction: 'incoming' | 'outgoing'; offer?: RTCSessionDescriptionInit; status: string };

export function GlobalCallManager({ userId }: { userId: string }) {
  const [call, setCall] = useState<CallState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(90);
  const peer = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioRelay = useRef<AudioRelay | null>(null);
  const iceQueue = useRef<RTCIceCandidateInit[]>([]);
  const callRef = useRef<CallState | null>(null);
  const acceptedAt = useRef<number | null>(null);
  const logged = useRef(false);
  const answerTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);
  const ringTimer = useRef<number | null>(null);
  const relayTimer = useRef<number | null>(null);
  useEffect(() => { callRef.current = call; }, [call]);

  const close = useCallback(() => {
    peer.current?.close(); peer.current = null;
    local.current?.getTracks().forEach((track) => track.stop()); local.current = null;
    remoteStream.current = null;
    audioRelay.current?.stop(); audioRelay.current = null;
    if (relayTimer.current) window.clearTimeout(relayTimer.current);
    void audioContext.current?.close(); audioContext.current = null;
    if (answerTimer.current) window.clearTimeout(answerTimer.current);
    if (countdownTimer.current) window.clearInterval(countdownTimer.current);
    stopRinging();
    iceQueue.current = []; callRef.current = null; setCall(null);
  }, []);

  const receive = useCallback(async (signal: CallSignal) => {
    const current = callRef.current;
    if (signal.signal_type === 'offer' && !current) {
      acceptedAt.current = null; logged.current = false;
      const next: CallState = { callId: signal.call_id, peerId: signal.sender_id,
        direction: 'incoming', offer: signal.payload as unknown as RTCSessionDescriptionInit,
        name: 'Друг', status: 'Входящий звонок · ответь в течение 1:30' };
      callRef.current = next; setCall(next); startRinging(); startAnswerCountdown(next.callId);
      const person = await callerName(signal.sender_id);
      if (callRef.current?.callId === signal.call_id) setCall((old) => old
        ? { ...old, name: person.name, avatarUrl: person.avatarUrl } : old);
      return;
    }
    if (!current || current.callId !== signal.call_id) return;
    if (signal.signal_type === 'answer' && peer.current) {
      await peer.current.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit);
      if (answerTimer.current) window.clearTimeout(answerTimer.current);
      if (countdownTimer.current) window.clearInterval(countdownTimer.current);
      stopRinging();
      await recoverIce(signal.call_id, signal.sender_id);
      await flushIce(peer.current); setCall((old) => old ? { ...old, status: 'Соединяем…' } : old);
      scheduleAudioRelay(signal.call_id);
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
    const connection = new RTCPeerConnection(await callRtcConfig()); peer.current = connection;
    local.current.getTracks().forEach((track) => connection.addTrack(track, local.current!));
    connection.onicecandidate = (event) => event.candidate && void sendCallSignal(callId, peerId, 'ice',
      event.candidate.toJSON() as unknown as Record<string, unknown>);
    connection.ontrack = (event) => {
      remoteStream.current = event.streams[0] ?? new MediaStream([event.track]);
      void playRemoteAudio();
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') {
        if (!acceptedAt.current) acceptedAt.current = Date.now();
        if (relayTimer.current) window.clearTimeout(relayTimer.current);
        stopRinging();
        if (audioRelay.current) setCall((old) => old ? { ...old, status: 'Разговор идёт' } : old);
        else void startAudioRelay(callId);
      }
      if (connection.connectionState === 'failed') {
        const current = callRef.current;
        if (current) void startAudioRelay(current.callId); else close();
      }
    };
    return connection;
  }

  async function startOutgoing(user: SocialUser) {
    if (callRef.current) return;
    prepareAudioContext();
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
      startAnswerCountdown(callId);
    } catch {
      logged.current = true;
      setCall((old) => old ? { ...old, status: 'Не удалось начать звонок или получить доступ к микрофону' } : old);
    }
  }

  async function answer() {
    if (!call?.offer) return;
    try {
      prepareAudioContext();
      if (answerTimer.current) window.clearTimeout(answerTimer.current);
      if (countdownTimer.current) window.clearInterval(countdownTimer.current);
      stopRinging();
      const connection = await createPeer(call.callId, call.peerId);
      await connection.setRemoteDescription(call.offer); await flushIce(connection);
      await recoverIce(call.callId, call.peerId); await flushIce(connection);
      const answer = await connection.createAnswer(); await connection.setLocalDescription(answer);
      await sendCallSignal(call.callId, call.peerId, 'answer', answer as unknown as Record<string, unknown>);
      setCall((old) => old ? { ...old, status: 'Соединяем…' } : old);
      scheduleAudioRelay(call.callId);
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
  function scheduleAudioRelay(callId: string) {
    if (relayTimer.current) window.clearTimeout(relayTimer.current);
    relayTimer.current = window.setTimeout(() => void startAudioRelay(callId), 500);
  }
  function prepareAudioContext() {
    audioContext.current ??= new AudioContext();
    void audioContext.current.resume();
  }
  async function startAudioRelay(callId: string) {
    if (callRef.current?.callId !== callId || !local.current || audioRelay.current) return;
    try {
      const context = audioContext.current ?? new AudioContext(); audioContext.current = context;
      const relay = await startRealtimeAudioRelay(callId, local.current, context);
      if (callRef.current?.callId !== callId) { relay.stop(); return; }
      audioRelay.current = relay;
      if (remoteAudio.current) remoteAudio.current.muted = true;
      if (!acceptedAt.current) acceptedAt.current = Date.now();
      setCall((old) => old?.callId === callId ? { ...old, status: 'Разговор идёт' } : old);
    } catch {
      setCall((old) => old?.callId === callId ? { ...old, status: 'Не удалось подключить звук' } : old);
    }
  }
  function startAnswerCountdown(callId: string) {
    const deadline = Date.now() + 90_000;
    setRemainingSeconds(90);
    if (countdownTimer.current) window.clearInterval(countdownTimer.current);
    countdownTimer.current = window.setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    if (answerTimer.current) window.clearTimeout(answerTimer.current);
    answerTimer.current = window.setTimeout(() => void timeoutCall(callId), 90_000);
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
    if (logged.current) return;
    logged.current = true;
    const content = acceptedAt.current
      ? `📞 Аудиозвонок · ${formatDuration(Date.now() - acceptedAt.current)}`
      : '📵 Пропущенный аудиозвонок';
    await recordCallMessage(current.peerId, current.callId, content);
  }
  async function playRemoteAudio() {
    const audio = remoteAudio.current;
    if (!audio || !remoteStream.current) return;
    audio.srcObject = remoteStream.current;
    audio.muted = Boolean(audioRelay.current); audio.volume = 1;
    await audio.play().catch(() => undefined);
  }
  async function flushIce(connection: RTCPeerConnection) {
    const queued = iceQueue.current.splice(0);
    await Promise.all(queued.map((candidate) => connection.addIceCandidate(candidate).catch(() => undefined)));
  }
  async function recoverIce(callId: string, senderId: string) {
    const candidates = await loadCallIceCandidates(callId, senderId);
    iceQueue.current.push(...candidates);
  }

  if (!call) return null;
  const waiting = call.status.includes('Входящий') || call.status.includes('Звоним');
  return <div className="call-overlay global-call"><audio ref={(element) => {
    remoteAudio.current = element;
    if (element && remoteStream.current) void playRemoteAudio();
  }} autoPlay playsInline />
    <div className="call-person"><span className="call-avatar">{call.avatarUrl ? <img src={call.avatarUrl} alt="" /> : call.name[0]}</span>
      <h2>{call.name}</h2><p>{waiting
        ? `${call.direction === 'incoming' ? 'Входящий звонок' : 'Звоним…'} · ${formatCountdown(remainingSeconds)}`
        : call.status}</p></div>
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

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
