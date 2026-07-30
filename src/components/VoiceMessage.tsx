import { useRef, useState } from 'react';

export function VoiceMessage({ url }: { url: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  async function toggle() {
    const player = audio.current;
    if (!player) return;
    if (playing) {
      player.pause();
      return;
    }
    if (player.ended || player.currentTime >= player.duration) player.currentTime = 0;
    try {
      await player.play();
    } catch {
      setFailed(true);
    }
  }
  return <div className="mine voice-message">
    <button onClick={() => void toggle()} aria-label={playing ? 'Пауза' : 'Прослушать снова'}>{playing ? 'Ⅱ' : '▶'}</button>
    <span><i style={{ width: `${progress}%` }} /></span>
    <small>{failed ? 'Не удалось загрузить' : formatTime(duration)}</small>
    <audio ref={audio} src={url} preload="metadata" onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(100); }}
      onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onTimeUpdate={(event) => setProgress(event.currentTarget.duration ? (event.currentTarget.currentTime / event.currentTarget.duration) * 100 : 0)}
      onError={() => setFailed(true)} />
  </div>;
}

function formatTime(seconds: number) {
  if (!seconds) return '0:00';
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
