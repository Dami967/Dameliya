import { matchesTargetLanguage } from './videoLanguage.ts';
import type { VideoCandidate } from './youtube.ts';

// Conservative fallback when semantic selection is unavailable: every meaningful
// word in the stage title must appear in the video title, never just its channel.
export function exactTopicCandidates(context: string, candidates: VideoCandidate[]) {
  const topic = context.match(/(?:Задание|Этап):\s*([^\n.]+)/iu)?.[1] ?? '';
  const ignored = new Set(['такое', 'такой', 'такие', 'изучить', 'изучи', 'узнать', 'научиться', 'первое', 'знакомство', 'основы']);
  const words = topic.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((word) => word.length >= 4 && !ignored.has(word)) ?? [];
  if (!words.length) return [];
  return candidates.filter((video) => {
    const title = video.title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    return matchesTargetLanguage(context, video.title, '')
      && !/official video|music video|клип|remix|karaoke/i.test(video.title)
      && words.every((word) => title.some((part) => part === word || part.slice(0, 5) === word.slice(0, 5)));
  });
}
