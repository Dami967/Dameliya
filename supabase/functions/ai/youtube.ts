export type VideoCandidate = {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  published: string;
};

export type YoutubeVideoResult = {
  type: 'video';
  title: string;
  url: string;
  description: string;
};

const ignoredWords = new Set([
  'видео', 'урок', 'видеоурок', 'образовательный', 'задание', 'пользователя', 'цель',
  'этого', 'поможет', 'нужно', 'тема', 'youtube', 'video', 'lesson', 'tutorial',
]);

function collectVideos(value: unknown, videos: VideoCandidate[]) {
  if (!value || typeof value !== 'object' || videos.length >= 16) return;
  const object = value as Record<string, unknown>;
  const renderer = object.videoRenderer as Record<string, unknown> | undefined;
  const title = renderer?.title as { runs?: Array<{ text?: unknown }> } | undefined;
  const owner = renderer?.ownerText as { runs?: Array<{ text?: unknown }> } | undefined;
  const length = renderer?.lengthText as { simpleText?: unknown } | undefined;
  const published = renderer?.publishedTimeText as { simpleText?: unknown } | undefined;
  if (typeof renderer?.videoId === 'string' && typeof title?.runs?.[0]?.text === 'string'
    && typeof length?.simpleText === 'string'
    && !videos.some((video) => video.videoId === renderer.videoId)) {
    videos.push({ videoId: renderer.videoId, title: title.runs[0].text,
      channel: typeof owner?.runs?.[0]?.text === 'string' ? owner.runs[0].text : '',
      duration: length.simpleText,
      published: typeof published?.simpleText === 'string' ? published.simpleText : '' });
  }
  Object.values(object).forEach((child) => collectVideos(child, videos));
}

function words(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/)
    .filter((word) => word.length >= 4 && !ignoredWords.has(word));
}

function relevanceScore(query: string, video: Pick<VideoCandidate, 'title' | 'channel'>) {
  const queryWords = words(query);
  const videoWords = words(`${video.title} ${video.channel}`);
  const matches = queryWords.filter((queryWord) => videoWords.some((videoWord) =>
    queryWord === videoWord || queryWord.slice(0, 5) === videoWord.slice(0, 5))).length;
  const educational = /урок|обуч|разбор|курс|лекц|tutorial|guide|explained|how to/i.test(video.title) ? 2 : 0;
  const music = /music|song|lyrics?|audio|official video|клип|музык|песн|караоке|remix|саундтрек/i;
  const unrelatedMusic = music.test(`${video.title} ${video.channel}`) && !music.test(query) ? 20 : 0;
  return matches * 5 + educational - unrelatedMusic;
}

export async function searchVideos(query: string, excludedVideoId = '') {
  const search = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB',
      clientVersion: '2.20260730.00.00', hl: 'ru', gl: 'KZ' } },
      query: `${query} обучение урок -music -song -клип` }),
  });
  if (!search.ok) return [];
  const candidates: VideoCandidate[] = [];
  collectVideos(await search.json(), candidates);
  const ranked = candidates.filter((video) => video.videoId !== excludedVideoId)
    .filter((video) => !/минут|час|minute|hour/i.test(video.published))
    .map((video) => ({ ...video, score: relevanceScore(query, video) }))
    .filter((video) => video.score >= 0).sort((a, b) => b.score - a.score);
  return ranked.slice(0, 8);
}

export function videoResult(video: VideoCandidate, query: string): YoutubeVideoResult {
  return {
    type: 'video', title: video.title,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    description: `Видеоурок по теме «${query.slice(0, 120)}».`,
  };
}
