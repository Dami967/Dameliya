const turnHost = 'staticauth.openrelay.metered.ca';
const turnSecret = 'openrelayprojectsecret';

export async function callRtcConfig(): Promise<RTCConfiguration> {
  const username = `${Math.floor(Date.now() / 1000) + 86_400}:goalquest`;
  const credential = await hmacCredential(username);
  return {
    iceCandidatePoolSize: 10,
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302', `stun:${turnHost}:80`] },
      {
        urls: [
          `turn:${turnHost}:80?transport=udp`,
          `turn:${turnHost}:80?transport=tcp`,
          `turn:${turnHost}:443?transport=tcp`,
          `turns:${turnHost}:443?transport=tcp`,
        ],
        username,
        credential,
      },
    ],
  };
}

async function hmacCredential(username: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(turnSecret),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(username));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
