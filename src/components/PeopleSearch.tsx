import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { SocialAvatar } from './SocialAvatar';
import { socialUsers, suggestions, type SocialUser } from '../lib/socialData';
import { supabase } from '../lib/supabase';
import { loadSocialState, saveSocialState } from '../lib/socialPersistence';
import { useSession } from '../lib/useSession';

export function PeopleSearch({ onOpen }: { onOpen: (user: SocialUser) => void }) {
  const { session } = useSession();
  const [query, setQuery] = useState('');
  const [following, setFollowing] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (!session) return;
    void Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', session.user.id),
      loadSocialState<{ ids: string[] }>(session.user.id, 'following', 'recommendations'),
    ]).then(([real, demo]) => {
      setFollowing([
        ...(real.data ?? []).map((row) => row.following_id),
        ...(demo.data?.payload.ids ?? []),
      ]);
    });
  }, [session]);
  const people = useMemo(() => [...socialUsers, ...suggestions].filter((person) =>
    `${person.name} ${person.username} ${person.id}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const shown = query ? people : showAll ? suggestions : suggestions.slice(0, 3);
  return (
    <section className="people-search">
      <div className="search-intro"><span>✨ AI-ПОДБОР</span><h2>Найди людей на своей волне</h2><p>Рекомендации учитывают интересы, возраст и направление развития.</p></div>
      <label className="search-box"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, username или ID" /></label>
      <div className="search-heading"><h3>{query ? 'Результаты поиска' : 'Подходят тебе'}</h3>
        <div><span>{query ? shown.length : suggestions.length} человек</span>{!query && <button onClick={() => setShowAll((value) => !value)}>{showAll ? 'Свернуть' : 'Ещё'}</button>}</div>
      </div>
      <div className="people-grid">{shown.map((person) => {
        const isFollowing = following.includes(person.id);
        return <article className="person-card" key={person.id}>
          {person.match && <span className="match-badge">{person.match}% совпадение</span>}
          <button className="person-main" onClick={() => onOpen(person)}><SocialAvatar user={person} size="large" /><b>{person.name}</b><small>@{person.username}</small></button>
          <div className="interest-tags">{person.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
          <p>🎯 {person.goal}</p>
          <button className={isFollowing ? 'social-outline' : 'social-primary'} onClick={() => {
            const next = isFollowing ? following.filter((id) => id !== person.id) : [...following, person.id];
            setFollowing(next);
            if (!session) return;
            if (isUuid(person.id)) {
              void (isFollowing
                ? supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', person.id)
                : supabase.from('follows').upsert({ follower_id: session.user.id, following_id: person.id }));
            } else {
              void saveSocialState(session.user.id, 'following', 'recommendations', {
                ids: next.filter((id) => !isUuid(id)),
              });
            }
          }}>
            {isFollowing ? 'Вы подписаны' : '+ Подписаться'}
          </button>
        </article>;
      })}</div>
    </section>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
