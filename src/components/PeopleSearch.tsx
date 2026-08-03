import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { SocialAvatar } from './SocialAvatar';
import type { SocialUser } from '../lib/socialData';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/useSession';
import { loadRealPeople, subscribeToPublicProfiles } from '../lib/friends';

export function PeopleSearch({ onOpen, onFriendsChanged }: {
  onOpen: (user: SocialUser) => void; onFriendsChanged: () => void;
}) {
  const { session } = useSession();
  const [query, setQuery] = useState('');
  const [following, setFollowing] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [people, setPeople] = useState<SocialUser[]>([]);
  useEffect(() => {
    if (!session) return;
    const refresh = () => void Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', session.user.id),
      loadRealPeople(session.user.id),
    ]).then(([follows, users]) => {
      setFollowing((follows.data ?? []).map((row) => row.following_id));
      setPeople(users.data ?? []);
    });
    refresh();
    const channel = subscribeToPublicProfiles(session.user.id, refresh);
    return () => { void channel.unsubscribe(); };
  }, [session]);
  const filtered = useMemo(() => people.filter((person) =>
    `${person.name} ${person.username} ${person.id}`.toLowerCase().includes(query.toLowerCase())), [people, query]);
  const shown = query ? filtered : showAll ? people : people.slice(0, 3);
  return (
    <section className="people-search">
      <div className="search-intro"><span>ПОЛЬЗОВАТЕЛИ GOALQUEST</span><h2>Найди реальных людей</h2><p>Здесь отображаются только зарегистрированные аккаунты.</p></div>
      <label className="search-box"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, username или ID" /></label>
      <div className="search-heading"><h3>{query ? 'Результаты поиска' : 'Подходят тебе'}</h3>
        <div><span>{query ? shown.length : people.length} человек</span>{!query && people.length > 3 && <button onClick={() => setShowAll((value) => !value)}>{showAll ? 'Свернуть' : 'Ещё'}</button>}</div>
      </div>
      <div className="people-grid">{shown.map((person) => {
        const isFollowing = following.includes(person.id);
        return <article className="person-card" key={person.id}>
          <button className="person-main" onClick={() => onOpen(person)}><SocialAvatar user={person} size="large" /><b>{person.name}</b><small>@{person.username}</small></button>
          <div className="interest-tags">{person.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
          <p>🎯 {person.goal}</p>
          <button className={isFollowing ? 'social-outline' : 'social-primary'} onClick={() => {
            const next = isFollowing ? following.filter((id) => id !== person.id) : [...following, person.id];
            setFollowing(next);
            if (session) {
              void (isFollowing
                ? supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', person.id)
                : supabase.from('follows').upsert({ follower_id: session.user.id, following_id: person.id }))
                .then(onFriendsChanged);
            }
          }}>
            {isFollowing ? 'Вы подписаны' : '+ Подписаться'}
          </button>
        </article>;
      })}</div>
      {!shown.length && <p>Пользователи не найдены. Можно пригласить друга по QR-коду или ссылке.</p>}
    </section>
  );
}
