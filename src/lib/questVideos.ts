import { searchYoutubeVideo } from './ai';
import type { QuestResource, QuestTaskDetails } from './questData';

export const VIDEO_VERSION_TAG = 'Проверено: video-v6';

const ignoredTaskWords = new Set([
  'что', 'такое', 'это', 'как', 'для', 'при', 'про', 'изучи', 'изучить',
  'узнать', 'научиться', 'основы', 'первое', 'знакомство', 'урок', 'задание',
]);

export function videoMatchesTask(topic: string, title: string) {
  const task = topic.match(/(?:Задание|Этап):\s*([^\n.]+)/iu)?.[1] ?? topic;
  const words = task.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)
    ?.filter((word) => word.length >= 4 && !ignoredTaskWords.has(word)) ?? [];
  if (!words.length) return true;
  const titleWords = title.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)
    ?.filter((word) => word.length >= 4) ?? [];
  return words.some((word) => titleWords.some((part) =>
    part === word || part.startsWith(word.slice(0, Math.min(6, word.length)))
      || word.startsWith(part.slice(0, Math.min(6, part.length)))));
}

export async function findVerifiedVideo(topic: string, excludedUrl = '') {
  return searchYoutubeVideo(topic, excludedUrl).catch(() => null);
}

export async function verifyDetailsResources(details: QuestTaskDetails, topic: string) {
  const resources: QuestResource[] = details.resources.filter((item) => item.type !== 'video');
  const video = await findVerifiedVideo(topic);
  if (video) resources.push({ ...video, description: `${video.description} ${VIDEO_VERSION_TAG}` });
  return { ...details, resources };
}

export function videoInLanguage(resource: QuestResource, language: string) {
  if (resource.language) return resource.language === language;
  if (language === 'ru') return /[а-яё]/i.test(resource.title);
  if (language === 'en') return /[a-z]/i.test(resource.title) && !/[а-яё]/i.test(resource.title);
  return false;
}

export function youtubeEmbed(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (!['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) return null;
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1)
      : url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : url.searchParams.get('v');
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
