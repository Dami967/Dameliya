import { useEffect, useRef, useState } from 'react';
import { videoPlaybackError } from '../lib/videoPlaybackError';
import { loadYoutubePlayerApi, type YoutubePlayer } from '../lib/youtubePlayerApi';

export function YouTubePlayer({ videoId, onUnavailable }: { videoId: string; onUnavailable: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YoutubePlayer | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [, setErrorCode] = useState<number | null>(null);
  const recovered = useRef(false);
  useEffect(() => {
    let active = true;
    setError(''); setErrorCode(null); setReady(false); setPlaying(false);
    const frame = document.createElement('iframe');
    frame.title = 'Видеоурок по заданию';
    const domain = attempt % 2 ? 'www.youtube-nocookie.com' : 'www.youtube.com';
    frame.src = `https://${domain}/embed/${videoId}?enablejsapi=1&rel=0&playsinline=1&origin=${encodeURIComponent(location.origin)}`;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    host.current?.replaceChildren(frame);
    void loadYoutubePlayerApi().then((api) => {
      if (!active) return;
      player.current = new api.Player(frame, { events: {
        onReady: () => { if (active) setReady(true); },
        onStateChange: ({ data }) => {
          if (!active) return;
          setPlaying(data === 1);
          if (data === 1) { setError(''); setErrorCode(null); }
        },
        onError: ({ data }) => {
          if (!active) return;
          const supportsH264 = Boolean(document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"'));
          if (data === 5 && supportsH264 && !recovered.current) {
            recovered.current = true;
            setAttempt((value) => value + 1);
            return;
          }
          setErrorCode(data);
          setError(videoPlaybackError(data, supportsH264));
        },
      } });
    }).catch(() => { if (active) setError('Не удалось подключить плеер. Проверь соединение и попробуй ещё раз.'); });
    return () => { active = false; player.current?.destroy(); player.current = null; };
  }, [videoId, attempt]);
  return <div className="lesson-player"><div ref={host} className="lesson-player__frame" />
    {error ? <div className="lesson-player__message" role="alert"><p>{error}</p>
      <button onClick={() => setAttempt((value) => value + 1)}>Повторить</button>
      <a className="lesson-player__browser" href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank" rel="noopener noreferrer">Открыть видео на YouTube</a>
      <button onClick={onUnavailable}>Подобрать другой урок</button></div>
      : ready && !playing && <button className="lesson-player__play" onClick={() => player.current?.playVideo()}>▶ Смотреть урок</button>}
  </div>;
}
