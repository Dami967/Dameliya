import { useEffect } from 'react';
import { readExerciseNotes, replaceGeneralNotes } from '../lib/exerciseAnswers';
import { useLessonVideos } from '../lib/useLessonVideos';
import type { QuestResource } from '../lib/questData';
import type { TaskChatMessage } from '../lib/taskRecords';
import { TaskMentor } from './TaskMentor';
import { YouTubePlayer } from './YouTubePlayer';
import { videoInLanguage, youtubeEmbed } from '../lib/questVideos';

export function VideoLesson({ resource, language, open, notes, task, chat, readOnly, onNotes, onChat, onVideo, onClose }: {
  resource: QuestResource | null; language: string; open: boolean; notes: string; task: string; chat: TaskChatMessage[];
  readOnly: boolean;
  onVideo: (resource: QuestResource) => void;
  onNotes: (value: string) => void; onChat: (messages: TaskChatMessage[]) => void; onClose: () => void;
}) {
  const history = useLessonVideos(task, resource && videoInLanguage(resource, language) ? resource : null, open);
  const activeVideo = history.video;
  useEffect(() => { if (activeVideo) onVideo(activeVideo); }, [activeVideo, onVideo]);
  const savedNotes = readExerciseNotes(notes);
  const embed = activeVideo ? youtubeEmbed(activeVideo.url) : null;
  if (!open) return null;
  return <div className="video-lesson-backdrop" role="dialog" aria-modal="true" aria-label="Видеоурок"><section className="video-lesson">
    <header><div><small>ВИДЕОУРОК</small><h2>{activeVideo?.title ?? 'Подбираем урок по твоей цели'}</h2></div><button onClick={onClose}>×</button></header>
    <div className="video-lesson-layout"><div className="video-workspace">
      <nav className="video-history" aria-label="История видео">
        <button disabled={history.index === 0 || history.busy} onClick={history.previous} aria-label="Предыдущее видео">←</button>
        <span>{history.count ? `${history.index + 1} из ${history.count}` : 'Поиск урока'}</span>
        <button disabled={history.index >= history.count - 1 || history.busy} onClick={history.next} aria-label="Следующее видео">→</button>
      </nav>
      <div className="video-frame">{embed ? <YouTubePlayer key={activeVideo?.url} videoId={embed.split('/').pop() ?? ''}
        onUnavailable={() => void history.find()} /> : <p role="status">{history.busy ? 'Ищем подходящее видео…' : history.error || 'Подготавливаем поиск урока…'}</p>}</div>
      <div className="video-fallback">
        <button disabled={history.busy} onClick={() => void history.find()}>
          {history.busy ? 'Ищем урок…' : activeVideo ? 'Подобрать другое видео' : 'Подобрать видео'}
        </button>
        {history.error && <small role="alert">{history.error}</small>}
      </div>
      <label>Заметки к уроку<textarea value={savedNotes.notes} readOnly={readOnly} onChange={(event) => onNotes(replaceGeneralNotes(notes, event.target.value))}
        placeholder="Записывай важные мысли во время просмотра…" /></label>
    </div><div className="video-q"><TaskMentor task={`${task}. Видео: ${activeVideo?.title ?? 'Подбираем урок по твоей цели'}`} readOnly={readOnly}
      notes={notes} initialMessages={chat} onMessages={onChat} /></div></div>
  </section></div>;
}
