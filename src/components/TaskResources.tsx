import { useState } from 'react';
import { videoInLanguage, youtubeEmbed } from '../lib/questVideos';
import { VideoLesson } from './VideoLesson';
import type { QuestResource } from '../lib/questData';
import type { TaskChatMessage } from '../lib/taskRecords';
import { TaskMaterial } from './TaskMaterial';
import { TaskQuiz } from './TaskQuiz';

export function TaskResources({ resources, language, loading, expectsVideo, notes, task, chat, readOnly, onNotes, onChat }: {
  resources: QuestResource[]; language: string; loading: boolean; expectsVideo: boolean; notes: string; task: string; chat: TaskChatMessage[];
  readOnly: boolean;
  onNotes: (value: string) => void; onChat: (messages: TaskChatMessage[]) => void;
}) {
  const [video, setVideo] = useState<QuestResource | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [material, setMaterial] = useState<QuestResource | null>(null);
  const [quiz, setQuiz] = useState<QuestResource | null>(null);
  if (!resources.length && !expectsVideo) return null;
  const wantsVideo = expectsVideo || resources.some((item) => item.type === 'video');
  const visibleResources = resources.filter((item) => item.type !== 'video' || (videoInLanguage(item, language) && youtubeEmbed(item.url)));
  if (video && videoInLanguage(video, language) && !visibleResources.some((item) => item.url === video.url)) visibleResources.push(video);
  const hasVideo = visibleResources.some((resource) => resource.type === 'video' && youtubeEmbed(resource.url));
  return <><section className="content-card task-resources"><h2>Материалы от Кью</h2>
    <div>{visibleResources.map((resource) => {
      const embed = resource.type === 'video' && youtubeEmbed(resource.url);
      return <article key={resource.url}><span>{resource.type === 'video' ? '▶' : resource.type === 'test' ? '✓' : '↗'}</span>
        <div><b>{resource.title}</b><p>{resource.description.replace(/Проверено: video-v\d+/g, '').trim()}</p></div>
        {embed ? <button onClick={() => { setVideo(resource); setVideoOpen(true); }}>Видеоурок</button>
          : resource.type === 'test' ? <button onClick={() => setQuiz(resource)}>Пройти тест</button>
            : <button onClick={() => setMaterial(resource)}>Открыть</button>}
      </article>;
    })}{wantsVideo && !hasVideo && <article className="resource-loading"><span>▶</span>
      <div><b>Видеоурок</b>
        <p>{loading ? 'Кью подбирает урок по теме…' : 'Открой видео по теме задания.'}</p></div>
      <button aria-label="Подобрать видео по текущему заданию" onClick={() => setVideoOpen(true)}>
        Видеоурок
      </button>
    </article>}</div>
  </section>
  <VideoLesson key={`${task}:${language}`} language={language} open={videoOpen} resource={video} notes={notes} task={task} chat={chat} readOnly={readOnly}
    onNotes={onNotes} onChat={onChat} onVideo={setVideo} onClose={() => setVideoOpen(false)} />
  {material && <TaskMaterial resource={material} task={task} onClose={() => setMaterial(null)} />}
  {quiz && <TaskQuiz resource={quiz} task={task} onClose={() => setQuiz(null)} />}</>;
}
