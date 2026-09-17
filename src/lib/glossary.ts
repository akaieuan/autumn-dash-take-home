/**
 * Every metric an owner sees has one entry here: a plain label, the industry
 * term once, and a meaning an innkeeper understands. Components render labels
 * through these entries; no metric definition lives inline in a component.
 */
export type CampaignKey = "brand_protection" | "discovery" | "hotel_ads" | "retargeting";
export type DeviceKey = "device_mobile" | "device_desktop" | "device_tablet";
export type GlossaryKey =
  | "direct_bookings" | "booking_value" | "autumn_fee" | "net_revenue" | "avg_booking_value"
  | "impressions" | "clicks" | "website_visits" | "ctr" | "conversion"
  | "cost_per_booking" | "ota_commission" | "new_visitors" | "pages_per_session"
  | "campaign" | "device" | "feeder_market" | "spend" | "events"
  | CampaignKey | DeviceKey;

export interface GlossaryEntry { label: string; industryTerm?: string; meaning: string; purpose?: string }

export const glossary: Record<GlossaryKey, GlossaryEntry> = {
  spend: { label: "What Autumn spent on ads", industryTerm: "ad spend", meaning: "The money Autumn paid Google to show your ads. Autumn funds this; you only pay the fee on bookings it brings." },
  events: { label: "What Autumn did", meaning: "Changes Autumn made to your campaigns: launches, budget and bid changes, refreshed ads, seasonal pushes. Each one can be compared before and after." },
  direct_bookings: { label: "Direct bookings from Autumn", industryTerm: "attributed bookings", meaning: "Stays booked on your own website after a guest saw or clicked an ad Autumn ran for you." },
  booking_value: { label: "Booking value", meaning: "The room revenue from those stays, before any fee." },
  autumn_fee: { label: "Autumn's fee", meaning: "Autumn pays for the ads and charges a percentage only on bookings it brought you. This is that amount for the period." },
  net_revenue: { label: "What you kept", meaning: "Booking value minus Autumn's fee. Money that stayed with the hotel." },
  avg_booking_value: { label: "Average booking", meaning: "Booking value divided by bookings. Higher in summer, when rates and stays are longer." },
  impressions: { label: "Saw your hotel", industryTerm: "impressions", meaning: "How many times your hotel appeared in Google search or Google Hotels because of Autumn's ads." },
  clicks: { label: "Clicked through", industryTerm: "clicks", meaning: "How many of those people clicked the ad." },
  website_visits: { label: "Visited your site", industryTerm: "sessions from ads", meaning: "Visits to your website that came from an Autumn ad. A few clicks never finish loading, so this is slightly under clicks." },
  ctr: { label: "People who clicked", industryTerm: "click-through rate, CTR", meaning: "Of everyone who saw the ad, how many clicked. Shown as '1 in N'." },
  conversion: { label: "Visitors who booked", industryTerm: "conversion rate, CVR", meaning: "Of everyone who clicked, how many went on to book. Shown as '1 in N'." },
  cost_per_booking: { label: "Cost per booking", meaning: "Autumn's fee divided by the bookings it brought you. Compare it with what an OTA would have charged on the same stays." },
  ota_commission: { label: "Commission you avoided", industryTerm: "OTA commission", meaning: "What an online travel agency such as Booking.com or Expedia would typically have charged (about 18%) on the same bookings had they come through it instead." },
  new_visitors: { label: "New visitors", meaning: "People visiting your website for the first time, from any source, not only ads." },
  pages_per_session: { label: "Pages per visit", meaning: "How many pages a visitor looks at. More pages usually means more interest in rooms and rates." },
  campaign: { label: "Campaigns", meaning: "The kinds of ads Autumn runs for you. Each does a different job." },
  device: { label: "Devices", meaning: "Whether guests found you on a phone, a computer or a tablet." },
  feeder_market: { label: "Where guests come from", industryTerm: "feeder markets", meaning: "The cities guests were in when they searched and booked." },
  brand_protection: { label: "Brand protection", meaning: "Ads on searches for your hotel's own name.", purpose: "Keeps you first when guests search your name, so OTAs don't take a booking that was already yours." },
  discovery: { label: "Discovery", industryTerm: "non-brand search", meaning: "Ads on searches like 'South Haven inn' or 'Lake Michigan B&B'.", purpose: "Reaches travellers who don't know you yet." },
  hotel_ads: { label: "Google Hotel Ads", meaning: "Your direct rate shown next to OTA prices on Google Hotels.", purpose: "Wins the comparison so guests book with you, not them." },
  retargeting: { label: "Reminders", industryTerm: "retargeting", meaning: "Ads shown to people who visited your site but didn't book.", purpose: "Brings back guests who were already interested." },
  device_mobile: { label: "Phone", meaning: "Visits and bookings made on a phone." },
  device_desktop: { label: "Computer", meaning: "Visits and bookings made on a laptop or desktop computer." },
  device_tablet: { label: "Tablet", meaning: "Visits and bookings made on a tablet." },
};

/** Seeded `breakdowns.value` → glossary key. Null for a label the glossary does not know. */
const CAMPAIGN_KEYS: Record<string, CampaignKey> = {
  "Brand Protection": "brand_protection",
  "Discovery & Competitors": "discovery",
  "Google Hotel Ads": "hotel_ads",
  Retargeting: "retargeting",
};
const DEVICE_KEYS: Record<string, DeviceKey> = { Mobile: "device_mobile", Desktop: "device_desktop", Tablet: "device_tablet" };

export const campaignKey = (seedLabel: string): CampaignKey | null => CAMPAIGN_KEYS[seedLabel] ?? null;
export const deviceKey = (seedLabel: string): DeviceKey | null => DEVICE_KEYS[seedLabel] ?? null;

/**
 * Label for any breakdown value. Campaign names carry a plain-language entry;
 * devices and cities are already plain and pass through, so a query row reads
 * the way the seed wrote it. A component that wants the softer device wording
 * ("Phone" for "Mobile") goes through `deviceKey` and the glossary itself.
 */
export const valueLabel = (value: string) => {
  const c = campaignKey(value);
  return c ? glossary[c].label : value;
};

/** Drive-time hints for the seeded feeder markets (copy only; South Haven, Michigan as origin). */
export const MARKET_HINTS: Record<string, string> = {
  "Chicago, IL": "2 h 15 drive",
  "Grand Rapids, MI": "1 h 10 drive",
  "Detroit, MI": "2 h 45 drive",
  "Indianapolis, IN": "3 h 30 drive",
  "Milwaukee, WI": "by ferry",
  "Kalamazoo, MI": "45 min drive",
  "Columbus, OH": "5 h drive",
  "St. Louis, MO": "5 h 30 drive",
  "Toronto, ON": "6 h drive",
};

/** Plain labels for `campaign_events.kind`. */
export const EVENT_KIND_LABELS = {
  launched: "Switched on", budget_change: "Budget changed", copy_refresh: "Ads refreshed", bid_change: "Bids adjusted", seasonal_push: "Seasonal push",
} as const;
