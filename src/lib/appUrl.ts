const productionOrigin = 'https://dameliya.vercel.app';

export function publicAppUrl(path: string) {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const origin = configured || (isLocal ? productionOrigin : window.location.origin);
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
