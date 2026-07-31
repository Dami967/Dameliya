import { useEffect, useRef, useState } from 'react';
import { askAi, parseAiJson } from '../lib/ai';
import type { QuestResource } from '../lib/questData';
import type { TaskChatMessage } from '../lib/taskRecords';
import { TaskMentor } from './TaskMentor';

export function TaskResources({ resources, notes, task, chat, onNotes, onChat }: {
  resources: QuestResource[]; notes: string; task: string; chat: TaskChatMessage[];
  onNotes: (value: string) => void; onChat: (messages: TaskChatMessage[]) => void;
}) {
  const [video, setVideo] = useState<QuestResource | null>(null);
  if (!resources.length) return null;
  return <><section className="content-card task-resources"><h2>Материалы от Кью</h2>
    <div>{resources.map((resource) => {
      const embed = resource.type === 'video' && youtubeEmbed(resource.url);
      return <article key={resource.url}><span>{resource.type === 'video' ? '▶' : resource.type === 'test' ? '✓' : '↗'}</span>
        <div><b>{resource.title}</b><p>{resource.description}</p></div>
        {embed ? <button onClick={() => setVideo(resource)}>Смотреть</button>
          : <a href={resource.url} target="_blank" rel="noreferrer">Открыть</a>}
      </article>;
    })}</div>
  </section>
  {video && <VideoLesson resource={video} notes={notes} task={task} chat={chat}
    onNotes={onNotes} onChat={onChat} onClose={() => setVideo(null)} />}</>;
}

function VideoLesson({ resource, notes, task, chat, onNotes, onChat, onClose }: {
  resource: QuestResource; notes: string; task: string; chat: TaskChatMessage[];
  onNotes: (value: string) => void; onChat: (messages: TaskChatMessage[]) => void; onClose: () => void;
}) {
  const [activeVideo, setActiveVideo] = useState(resource);
  const [replacing, setReplacing] = useState(false);
  const [message, setMessage] = useState('');
  const embed = youtubeEmbed(activeVideo.url);
  const autoReplaced = useRef(false);

  async function replaceVideo() {
    setReplacing(true); setMessage('Кью ищет похожий видеоурок…');
    const result = await askAi(
      `Тема урока: ${activeVideo.title}. Задание пользователя: ${task}.
Текущее видео недоступно: ${activeVideo.url}. Подбери ДРУГОЙ существующий бесплатный YouTube-видеоурок по той же теме.
Верни только JSON без markdown: {"title":"название","url":"https://www.youtube.com/watch?v=ID","description":"чем поможет"}.`,
      'Ты подбираешь существующие образовательные видео для GoalQuest. Не повторяй исходную ссылку, не выдумывай video ID. Отвечай только JSON.',
    );
    try {
      const alternative = parseAiJson<QuestResource>(result.text ?? '');
      if (!youtubeEmbed(alternative.url) || alternative.url === activeVideo.url) throw new Error();
      setActiveVideo({ ...alternative, type: 'video' }); setMessage('Новое видео готово ✓');
    } catch {
      setMessage(result.error?.message ?? 'Не получилось найти замену. Попробуй ещё раз.');
    }
    setReplacing(false);
  }
  return <div className="video-lesson-backdrop"><section className="video-lesson">
    <header><div><small>ВИДЕОУРОК</small><h2>{activeVideo.title}</h2></div><button onClick={onClose}>×</button></header>
    <div className="video-lesson-layout"><div className="video-workspace">
      <div className="video-frame">{embed && <YouTubePlayer videoId={embed.split('/').pop() ?? ''}
        onUnavailable={() => {
          if (autoReplaced.current) return;
          autoReplaced.current = true;
          void replaceVideo();
        }} />}</div>
      <div className="video-fallback"><span>Видео не открывается? Кью заменит его похожим уроком прямо здесь.</span>
        <button disabled={replacing} onClick={() => void replaceVideo()}>
          {replacing ? 'Ищем замену…' : 'Подобрать другое видео'}
        </button>
        {message && <small>{message}</small>}
      </div>
      <label>Заметки к уроку<textarea value={notes} onChange={(event) => onNotes(event.target.value)}
        placeholder="Записывай важные мысли во время просмотра…" /></label>
    </div><div className="video-q"><TaskMentor task={`${task}. Видео: ${activeVideo.title}`}
      notes={notes} initialMessages={chat} onMessages={onChat} /></div></div>
  </section></div>;
}

function YouTubePlayer({ videoId, onUnavailable }: { videoId: string; onUnavailable: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;
  useEffect(() => {
    let player: { destroy: () => void } | undefined;
    void loadYouTubeApi().then((YT) => {
      if (!host.current) return;
      player = new YT.Player(host.current, {
        videoId, playerVars: { rel: 0, modestbranding: 1 },
        events: { onError: () => unavailable.current() },
      });
    });
    return () => player?.destroy();
  }, [videoId]);
  return <div className="youtube-player" ref={host} />;
}

type YouTubeApi = { Player: new (element: HTMLElement, options: {
  videoId: string; playerVars: Record<string, number>;
  events: { onError: () => void };
}) => { destroy: () => void } };

let youtubeApi: Promise<YouTubeApi> | null = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApi) return youtubeApi;
  youtubeApi = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT) resolve(window.YT); };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });
  return youtubeApi;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function youtubeEmbed(value: string) {
  try {
    const url = new URL(value);
    let id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v');
    if (!id && url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2];
    return id && /^[\w-]{6,15}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
