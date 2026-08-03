export type SocialUser = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  online: boolean;
  interests: string[];
  goal: string;
  match?: number;
  pinned?: boolean;
};
