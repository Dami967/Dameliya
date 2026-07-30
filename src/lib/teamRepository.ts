import { supabase } from './supabase';
import type { CreatedTeam, TeamDraft } from './collaborationData';
import type { SocialUser } from './socialData';

type TeamRow = {
  id: string;
  name: string;
  topic: string;
  description: string;
  progress: number;
  visibility: 'public' | 'private';
  avatar_url: string | null;
};

type MembershipRow = {
  role: CreatedTeam['role'];
  teams: TeamRow | TeamRow[] | null;
};

export async function createStoredTeam(userId: string, draft: TeamDraft) {
  const { data, error } = await supabase.from('teams').insert({
    owner_id: userId,
    name: draft.name,
    topic: draft.category,
    description: draft.description,
    visibility: draft.visibility,
  }).select('id,name,topic,description,progress,visibility,avatar_url').single<TeamRow>();
  if (error || !data) return { data: null, error };
  const membership = await supabase.from('team_members').insert({
    team_id: data.id,
    user_id: userId,
    role: 'creator',
  });
  if (membership.error) return { data: null, error: membership.error };
  return { data: toCreatedTeam(data, 'creator', userId), error: null };
}

export async function loadStoredTeams(userId: string) {
  const { data, error } = await supabase.from('team_members')
    .select('role,teams(id,name,topic,description,progress,visibility,avatar_url)')
    .eq('user_id', userId).returns<MembershipRow[]>();
  if (error) return { data: [], error };
  return {
    data: (data ?? []).flatMap((item) => {
      const team = Array.isArray(item.teams) ? item.teams[0] : item.teams;
      return team ? [toCreatedTeam(team, item.role, userId)] : [];
    }),
    error: null,
  };
}

export type StoredTeamMember = {
  userId: string;
  name: string;
  username: string;
  role: CreatedTeam['role'];
};

export async function loadTeamMembers(teamId: string) {
  const memberships = await supabase.from('team_members').select('user_id,role').eq('team_id', teamId)
    .returns<{ user_id: string; role: CreatedTeam['role'] }[]>();
  const ids = (memberships.data ?? []).map((item) => item.user_id);
  const profiles = ids.length ? await supabase.from('public_profiles')
    .select('user_id,display_name,username').in('user_id', ids)
    .returns<{ user_id: string; display_name: string; username: string | null }[]>() : { data: [] };
  const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.user_id, profile]));
  return (memberships.data ?? []).map((item) => ({
    userId: item.user_id,
    name: profileMap.get(item.user_id)?.display_name || 'Участник',
    username: profileMap.get(item.user_id)?.username || '',
    role: item.role,
  }));
}

export function inviteTeamMember(teamId: string, username: string) {
  return supabase.rpc('add_team_member_by_username', { target_team: teamId, target_username: username });
}

export function changeTeamMemberRole(teamId: string, userId: string, role: 'admin' | 'member') {
  return supabase.rpc('set_team_member_role', { target_team: teamId, target_user: userId, next_role: role });
}

export function deleteStoredTeam(teamId: string) {
  return supabase.from('teams').delete().eq('id', teamId);
}

function toCreatedTeam(team: TeamRow, role: CreatedTeam['role'], userId: string): CreatedTeam {
  const currentUser: SocialUser = {
    id: userId, name: 'Ты', username: 'me', avatar: 'Я', level: 1, xp: 0,
    streak: 0, online: true, interests: [], goal: 'Общая цель команды',
  };
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    category: team.topic,
    visibility: team.visibility,
    avatarUrl: team.avatar_url ?? '',
    progress: team.progress,
    members: [currentUser],
    role,
  };
}
