import type { Reward } from '../lib/rewardsData';

export function DressedEagle({ equipped, size = 'large' }: {
  equipped: Reward[]; size?: 'profile' | 'large';
}) {
  const outfit = equipped.find((item) => item.category === 'outfits');
  const accessory = equipped.find((item) => item.category === 'accessories');
  const eagle = equipped.find((item) => item.category === 'eagle');
  const frame = equipped.find((item) => item.category === 'frames');
  const theme = equipped.find((item) => item.category === 'themes');

  return <div className={`dressed-eagle dressed-eagle--${size} eagle-frame--${frame?.id ?? 'default'} eagle-theme--${theme?.id ?? 'default'}`}>
    <span className="dressed-eagle__glow" />
    <img src="/goalquest-eagle.png" alt="Орлёнок Кью в выбранном образе" />
    {!!equipped.length && <span className="eagle-wardrobe">
      {[outfit, accessory, eagle].filter(Boolean).map((item) =>
        <i title={item!.title} key={item!.id}>{item!.icon}</i>)}
    </span>}
  </div>;
}
