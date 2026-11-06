import { useEffect, useRef, useState } from 'react';
import { searchYoutubeVideo } from './ai';
import type { QuestResource } from './questData';

export function useLessonVideos(task: string, resource: QuestResource | null, open: boolean) {
  const [videos, setVideos] = useState<QuestResource[]>(resource ? [resource] : []);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function find() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const next = await searchYoutubeVideo(task, videos[index]?.url ?? '', videos.map((item) => item.url));
      if (!mounted.current) return;
      if (!next) { setError(videos.length ? 'Других доступных уроков по этой теме пока не найдено.'
        : 'Не удалось найти доступный урок по этой теме. Попробуй повторить поиск.'); return; }
      if (videos.some((item) => item.url === next.url)) { setError('Этот урок уже есть в истории.'); return; }
      setVideos([...videos, next]); setIndex(videos.length);
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить видео.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (resource && !videos.length) { setVideos([resource]); setIndex(0); return; }
    if (open && !videos.length && !error) void find();
  }, [open, resource?.url]);
  return { video: videos[index] ?? null, index, count: videos.length, busy, error, find,
    previous: () => { setIndex((current) => Math.max(0, current - 1)); setError(''); },
    next: () => { setIndex((current) => Math.min(videos.length - 1, current + 1)); setError(''); } };
}
