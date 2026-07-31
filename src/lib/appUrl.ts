const productionOrigin = 'https://dameliya-steel.vercel.app';

export function publicAppUrl(path: string) {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const origin = isLocal ? productionOrigin : window.location.origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
