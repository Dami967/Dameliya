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
    {outfit && <span className="eagle-item eagle-item--outfit" title={outfit.title}>{outfit.icon}</span>}
    {accessory && <span className="eagle-item eagle-item--accessory" title={accessory.title}>{accessory.icon}</span>}
    {eagle && <span className={`eagle-item eagle-item--special special--${eagle.id}`} title={eagle.title}>{eagle.icon}</span>}
  </div>;
}
