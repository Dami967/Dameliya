export type YoutubePlayer = { destroy: () => void; playVideo: () => void };
type YoutubeApi = { Player: new (element: HTMLElement, options: {
  events: { onReady: () => void; onError: (event: { data: number }) => void;
    onStateChange: (event: { data: number }) => void };
}) => YoutubePlayer };
declare global { interface Window { YT?: YoutubeApi; onYouTubeIframeAPIReady?: () => void } }
let loading: Promise<YoutubeApi> | null = null;
export function loadYoutubePlayerApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YoutubeApi>((resolve, reject) => {
    const timer = window.setTimeout(() => { loading = null; reject(new Error('Player timeout')); }, 15000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { clearTimeout(timer); loading = null; script.remove(); reject(new Error('Player unavailable')); };
    document.head.appendChild(script);
  });
  return loading;
}
