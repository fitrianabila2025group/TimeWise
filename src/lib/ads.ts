import prisma from '@/lib/prisma';
import type { AdsSetting } from '@prisma/client';

let adsCache: AdsSetting | null | undefined;
let adsCacheTs = 0;
const ADS_CACHE_TTL = 60_000; // 1 minute

export async function getAdsSettings(): Promise<AdsSetting | null> {
  const now = Date.now();
  if (adsCache !== undefined && now - adsCacheTs < ADS_CACHE_TTL) {
    return adsCache;
  }
  try {
    const ads = await prisma.adsSetting.findFirst();
    adsCache = ads;
    adsCacheTs = now;
    return ads;
  } catch {
    return null;
  }
}

export function invalidateAdsCache() {
  adsCache = undefined;
  adsCacheTs = 0;
}

export interface SlotConfig {
  header?: string;
  sidebar?: string;
  inContent?: string;
  footer?: string;
  [key: string]: string | undefined;
}

export function parseSlots(slotsJson: string): SlotConfig {
  try {
    return JSON.parse(slotsJson) as SlotConfig;
  } catch {
    return {};
  }
}
