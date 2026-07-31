import { useState } from 'react';
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
  const embed = youtubeEmbed(resource.url);
  return <div className="video-lesson-backdrop"><section className="video-lesson">
    <header><div><small>ВИДЕОУРОК</small><h2>{resource.title}</h2></div><button onClick={onClose}>×</button></header>
    <div className="video-lesson-layout"><div className="video-workspace">
      <div className="video-frame"><iframe src={embed ?? ''} title={resource.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen /></div>
      <div className="video-fallback"><span>Если автор запретил просмотр внутри приложения:</span>
        <a href={resource.url} target="_blank" rel="noreferrer">Открыть в YouTube</a>
        <a href={youtubeSearch(resource.title, task)} target="_blank" rel="noreferrer">Найти похожий урок</a>
      </div>
      <label>Заметки к уроку<textarea value={notes} onChange={(event) => onNotes(event.target.value)}
        placeholder="Записывай важные мысли во время просмотра…" /></label>
    </div><div className="video-q"><TaskMentor task={`${task}. Видео: ${resource.title}`}
      notes={notes} initialMessages={chat} onMessages={onChat} /></div></div>
  </section></div>;
}

function youtubeSearch(title: string, task: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${task.slice(0, 90)}`)}`;
}

function youtubeEmbed(value: string) {
  try {
    const url = new URL(value);
    let id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v');
    if (!id && url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2];
    return id && /^[\w-]{6,15}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
