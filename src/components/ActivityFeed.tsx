import { useEffect, useState } from 'react';
import type { SocialUser } from '../lib/socialData';
import { supabase } from '../lib/supabase';
import { SocialAvatar } from './SocialAvatar';

type RealActivity = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  description: string;
  created_at: string;
};

const icons: Record<string, string> = {
  level: '🚀', goal: '🎯', reward: '🏆', chest: '🎁', streak: '🔥', project: '✨',
};

export function ActivityFeed({ friends }: { friends: SocialUser[] }) {
  const [activities, setActivities] = useState<RealActivity[]>([]);
  useEffect(() => {
    if (!friends.length) { setActivities([]); return; }
    void supabase.from('social_activities').select('*').in('user_id', friends.map((friend) => friend.id))
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setActivities((data ?? []) as RealActivity[]));
  }, [friends]);

  return <section className="activity-feed">
    <div className="panel-title"><div><h2>Активность друзей</h2><p>Только настоящие события твоих друзей</p></div></div>
    {activities.map((item) => {
      const user = friends.find((friend) => friend.id === item.user_id);
      if (!user) return null;
      return <article className="activity-card" key={item.id}>
        <div className="activity-head"><SocialAvatar user={user} /><div><b>{user.name} {item.title}</b>
          <small>{new Date(item.created_at).toLocaleString('ru-RU')}</small></div><span>{icons[item.kind] ?? '✨'}</span></div>
        {item.description && <p>{item.description}</p>}
      </article>;
    })}
    {!activities.length && <p>Когда друзья поделятся достижениями, они появятся здесь.</p>}
  </section>;
}
