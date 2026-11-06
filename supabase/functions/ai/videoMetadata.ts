import { matchesSpokenLanguage } from './videoLanguage.ts';
import { type VideoCandidate, videoResult } from './youtube.ts';

export async function availableLesson(context: string, candidates: VideoCandidate[]) {
  const results = await Promise.all(candidates.slice(0, 8).map(async (candidate) => {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${candidate.videoId}`)}&format=json`,
        { signal: AbortSignal.timeout(5000) });
      // A timeout/rate limit is not evidence that a public search result is deleted.
      // The embedded player remains the final check on this user's device.
      if (response.status === 429 || response.status >= 500) return videoResult(candidate, context);
      if (!response.ok) return null;
      const metadata = await response.json() as { title?: unknown; html?: unknown };
      if (typeof metadata.title !== 'string' || typeof metadata.html !== 'string'
        || !matchesSpokenLanguage(context, metadata.title)
        || !metadata.html.includes(`/embed/${candidate.videoId}`)) return null;
      return { ...videoResult(candidate, context), title: metadata.title };
    } catch {
      return videoResult(candidate, context);
    }
  }));
  return results.find((video) => video !== null) ?? null;
}
