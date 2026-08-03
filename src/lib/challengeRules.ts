import type { ChallengeDraft } from './collaborationData';

export const randomChallengeTypes: ChallengeDraft['type'][] = ['xp', 'tasks', 'goal'];

export function randomChallengeType() {
  return randomChallengeTypes[Math.floor(Math.random() * randomChallengeTypes.length)];
}

export function challengeRule(type: string) {
  if (type === 'xp') return 'Побеждает тот, кто заработает больше XP за выполненные задания.';
  if (type === 'tasks') return 'Побеждает тот, кто пройдёт больше этапов. Один этап = 1 очко.';
  if (type === 'streak') return 'Побеждает тот, кто дольше выполняет хотя бы одно задание каждый день.';
  if (type === 'goal') return 'Побеждает тот, кто пройдёт больше этапов своей выбранной цели.';
  return 'Выполняйте задания и набирайте больше очков до окончания челленджа.';
}

export function challengeUnit(type: string) {
  return type === 'xp' || type === 'custom' ? 'XP' : type === 'streak' ? 'дн.' : 'этап.';
}
