import { campaignKey, deviceKey, glossary, type CampaignKey, type DeviceKey } from "@/lib/glossary";

/** Identity colours for comparing things side by side (campaigns, cities, devices). Tokens live in globals.css. */
export const SERIES_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"] as const;
export const OTHER_COLOR = "var(--series-other)";

/** Colour follows position in a stable list; past the fourth item everything folds into the neutral. */
export const seriesColor = (index: number): string => SERIES_COLORS[index] ?? OTHER_COLOR;

/**
 * Identity colours by entity. Colour follows the campaign, never its rank, so Discovery is the same
 * amber on the Overview (ranked by bookings) as on the traffic screen (ranked by visits) and in the
 * efficiency table (ranked by value per visit). Anything the glossary does not know takes the neutral.
 */
const CAMPAIGN_COLOR: Record<CampaignKey, string> = {
  brand_protection: SERIES_COLORS[0],
  discovery: SERIES_COLORS[1],
  hotel_ads: SERIES_COLORS[2],
  retargeting: SERIES_COLORS[3],
};
const DEVICE_COLOR: Record<DeviceKey, string> = {
  device_mobile: SERIES_COLORS[0],
  device_desktop: SERIES_COLORS[1],
  device_tablet: SERIES_COLORS[2],
};

/** For a DTO that already carries the glossary key (`CampaignDto.key`), so no name round-trip is needed. */
export const campaignKeyColor = (key: CampaignKey | null): string => (key ? CAMPAIGN_COLOR[key] : OTHER_COLOR);
/** For a seeded campaign name ("Discovery & Competitors") or its plain label ("Discovery"). */
export const campaignColor = (seedName: string): string => campaignKeyColor(campaignKey(seedName) ?? labelKey(CAMPAIGN_COLOR, seedName));

export const deviceKeyColor = (key: DeviceKey | null): string => (key ? DEVICE_COLOR[key] : OTHER_COLOR);
/** For a seeded device name ("Mobile") or its plain label ("Phone"). */
export const deviceColor = (seedName: string): string => deviceKeyColor(deviceKey(seedName) ?? labelKey(DEVICE_COLOR, seedName));

/** Second chance for a value that arrives already translated: match the glossary label itself. */
function labelKey<K extends CampaignKey | DeviceKey>(table: Record<K, string>, label: string): K | null {
  const hit = (Object.keys(table) as K[]).find((k) => glossary[k].label === label);
  return hit ?? null;
}
