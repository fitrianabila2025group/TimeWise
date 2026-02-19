import { getAdsSettings, parseSlots } from '@/lib/ads';

interface AdSlotProps {
  position: 'header' | 'sidebar' | 'inContent' | 'footer';
  className?: string;
}

export default async function AdSlot({ position, className = '' }: AdSlotProps) {
  const ads = await getAdsSettings();
  if (!ads) return null;

  const slots = parseSlots(ads.slotsJson);
  const slotHtml = slots[position];
  if (!slotHtml) return null;

  return (
    <div
      className={`ad-slot ad-slot-${position} ${className}`}
      data-position={position}
      dangerouslySetInnerHTML={{ __html: slotHtml }}
    />
  );
}
