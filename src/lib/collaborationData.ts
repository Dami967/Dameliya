import type { SocialUser } from './socialData';

export type TeamDraft = {
  name: string;
  description: string;
  category: string;
  visibility: 'public' | 'private';
  avatarUrl: string;
};

export type CreatedTeam = TeamDraft & {
  id: string;
  progress: number;
  members: SocialUser[];
  role: 'creator' | 'admin' | 'member';
};

export type ChallengeDraft = {
  title: string;
  participantIds: string[];
  type: 'xp' | 'tasks' | 'streak' | 'goal' | 'custom';
  startsAt: string;
  endsAt: string;
  reward: string;
};

export type CreatedChallenge = ChallengeDraft & {
  id: string;
  participants: SocialUser[];
  status: 'invited' | 'active' | 'finished';
};

export const challengeLabels: Record<ChallengeDraft['type'], string> = {
  xp: 'Больше XP',
  tasks: 'Больше выполненных заданий',
  streak: 'Самая длинная серия',
  goal: 'Выполнение цели',
  custom: 'Собственный челлендж',
};
