import { useEffect, useState } from 'react';
import { activities } from '../lib/socialData';
import { loadSocialState, saveSocialState, type StoredActivity } from '../lib/socialPersistence';
import { useSession } from '../lib/useSession';
import { SocialAvatar } from './SocialAvatar';

export function ActivityFeed() {
  const { session } = useSession();
  const [liked, setLiked] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, string[]>>({});
  useEffect(() => {
    if (!session) return;
    void Promise.all(activities.map(async (item) => {
      const { data } = await loadSocialState<StoredActivity>(session.user.id, 'activity', String(item.id));
      return { id: item.id, state: data?.payload };
    })).then((rows) => rows.forEach(({ id, state }) => {
      if (state?.reaction) setLiked((old) => ({ ...old, [id]: state.reaction! }));
      if (state?.comments) setComments((old) => ({ ...old, [id]: state.comments }));
    }));
  }, [session]);

  function persist(id: number, reaction: string | undefined, nextComments: string[]) {
    if (session) void saveSocialState<StoredActivity>(session.user.id, 'activity', String(id), {
      reaction, comments: nextComments,
    });
  }
  return (
    <section className="activity-feed">
      <div className="panel-title"><div><h2>Активность друзей</h2><p>Празднуй маленькие и большие победы вместе</p></div></div>
      {activities.map((item) => (
        <article className="activity-card" key={item.id}>
          <div className="activity-head"><SocialAvatar user={item.user} /><div><b>{item.user.name} {item.title}</b><small>{item.time} назад</small></div><span>{item.icon}</span></div>
          <p>{item.text}</p>
          <div className="reaction-row">
            {Object.entries(item.reactions).map(([emoji, count]) => (
              <button className={liked[item.id] === emoji ? 'is-selected' : ''} key={emoji}
                onClick={() => {
                  const reaction = liked[item.id] === emoji ? undefined : emoji;
                  setLiked((old) => ({ ...old, [item.id]: reaction ?? '' }));
                  persist(item.id, reaction, comments[item.id] ?? []);
                }}>{emoji} {count + (liked[item.id] === emoji ? 1 : 0)}</button>
            ))}
            <span>{comments[item.id]?.length ?? 0} комментариев</span>
          </div>
          <form className="comment-form" onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const input = new FormData(form).get('comment')?.toString().trim();
            if (input) {
              const next = [...(comments[item.id] ?? []), input];
              setComments((old) => ({ ...old, [item.id]: next }));
              persist(item.id, liked[item.id] || undefined, next);
            }
            form.reset();
          }}>
            <input name="comment" placeholder="Написать слова поддержки…" />
            <button>Отправить</button>
          </form>
          {comments[item.id]?.map((comment, index) => <p className="new-comment" key={`${comment}-${index}`}>{comment}</p>)}
        </article>
      ))}
    </section>
  );
}
