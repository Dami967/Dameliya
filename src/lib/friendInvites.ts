import { supabase } from './supabase';

export async function createFriendInvite(userId: string) {
  return supabase.from('friend_invites').insert({ inviter_id: userId })
    .select('token,expires_at').single<{ token: string; expires_at: string }>();
}

export async function acceptFriendInvite(token: string) {
  return supabase.rpc('accept_friend_invite', { invite_token: token })
    .single<{ inviter_id: string; inviter_name: string }>();
}

export function friendInviteUrl(token: string) {
  return `${window.location.origin}/friends/invite/${token}`;
}

export function readInviteToken(value: string) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i;
  const trimmed = value.trim();
  if (uuid.test(trimmed)) return trimmed;
  try {
    const parts = new URL(trimmed).pathname.split('/');
    const token = parts[parts.length - 1] ?? '';
    return uuid.test(token) ? token : null;
  } catch {
    return null;
  }
}
