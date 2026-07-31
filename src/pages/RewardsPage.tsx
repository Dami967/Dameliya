import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { CompetitionsPanel } from '../components/CompetitionsPanel';
import { ExpeditionsPanel } from '../components/ExpeditionsPanel';
import { RewardCard } from '../components/RewardCard';
import { RewardDetails } from '../components/RewardDetails';
import { RewardsHero } from '../components/RewardsHero';
import { isWearableReward, rewardCategories, rewards, type Reward, type RewardCategory } from '../lib/rewardsData';
import { equipRewardForCategory, loadUserRewards } from '../lib/userRewards';
import { useSession } from '../lib/useSession';
import { NewRewardToast } from '../components/NewRewardToast';
import { UserBalance } from '../components/UserBalance';

type Section = 'collection' | 'expeditions' | 'competitions';

export function RewardsPage() {
  const { session } = useSession();
  const [section, setSection] = useState<Section>(() => {
    const requested = new URLSearchParams(window.location.search).get('section');
    return requested === 'competitions' || requested === 'expeditions' ? requested : 'collection';
  });
  const [category, setCategory] = useState<RewardCategory | 'all'>('all');
  const [selected, setSelected] = useState<Reward | null>(null);
  const [equipped, setEquipped] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewReward, setShowNewReward] = useState(true);

  useEffect(() => {
    if (!session) return;
    void loadUserRewards(session.user.id).then(({ data }) => {
      setEquipped((data ?? []).filter((item) => item.equipped).map((item) => item.reward_id));
    });
  }, [session]);

  const visibleRewards = useMemo(
    () => category === 'all' ? rewards : rewards.filter((reward) => reward.category === category),
    [category],
  );
  const collected = rewards.filter((reward) => reward.unlocked).length;
  const equippedRewards = rewards.filter((reward) => equipped.includes(reward.id));

  async function equipReward() {
    if (!selected || !isWearableReward(selected)) return;
    const isEquipped = equipped.includes(selected.id);
    setSaving(true);
    const sameCategory = rewards.filter((item) => item.category === selected.category).map((item) => item.id);
    if (session) await equipRewardForCategory(session.user.id, selected, !isEquipped, sameCategory);
    setEquipped((current) => isEquipped ? current.filter((id) => id !== selected.id)
      : [...current.filter((id) => !sameCategory.includes(id)), selected.id]);
    setSaving(false);
  }

  return (
    <AppShell>
      <header className="page-header rewards-page-head">
        <div><span className="eyebrow">НАГРАДЫ И ПРИКЛЮЧЕНИЯ</span><h1>Твои достижения</h1>
          <p>Реальные дела превращаются в коллекцию, прогресс и дружеские победы.</p></div>
        <UserBalance />
      </header>

      <nav className="rewards-tabs" aria-label="Разделы наград">
        <button className={section === 'collection' ? 'is-active' : ''} onClick={() => setSection('collection')}>🎒 Коллекция</button>
        <button className={section === 'expeditions' ? 'is-active' : ''} onClick={() => setSection('expeditions')}>🗺️ Экспедиции</button>
        <button className={section === 'competitions' ? 'is-active' : ''} onClick={() => setSection('competitions')}>🏆 Соревнования</button>
      </nav>

      {section === 'collection' && <>
        <RewardsHero collected={collected} total={rewards.length} equipped={equippedRewards} />
        <div className="collection-heading"><div><h2>Коллекция наград</h2><p>Нажми на предмет, чтобы узнать условие или примерить его.</p></div>
          <span>{collected}/{rewards.length} открыто</span></div>
        <nav className="category-filter">
          {rewardCategories.map((item) => <button key={item.id} className={category === item.id ? 'is-active' : ''}
            onClick={() => setCategory(item.id)}><span>{item.icon}</span>{item.label}</button>)}
        </nav>
        <section className="rewards-grid">
          {visibleRewards.map((reward) => <RewardCard key={reward.id} reward={reward}
            equipped={equipped.includes(reward.id)} onSelect={setSelected} />)}
        </section>
      </>}
      {section === 'expeditions' && <ExpeditionsPanel />}
      {section === 'competitions' && <CompetitionsPanel />}
      {selected && <RewardDetails reward={selected} equipped={equipped.includes(selected.id)}
        saving={saving} onEquip={equipReward} onClose={() => setSelected(null)} />}
      {showNewReward && rewards.find((reward) => reward.isNew) && <NewRewardToast
        reward={rewards.find((reward) => reward.isNew)!} onClose={() => setShowNewReward(false)} />}
    </AppShell>
  );
}
