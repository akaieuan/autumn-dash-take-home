/**
 * Every metric an owner sees has one entry here: a plain label, the industry
 * term once, and a meaning an innkeeper understands. Components render labels
 * through these entries; no metric definition lives inline in a component.
 */
export type GlossaryKey =
  | "bookings" | "booking_value" | "autumn_fee" | "net_revenue" | "avg_booking_value"
  | "impressions" | "clicks" | "website_visits" | "ctr" | "conversion"
  | "cost_per_booking" | "ota_commission" | "new_visitors" | "pages_per_session"
  | "campaign" | "device" | "feeder_market"
  | "Brand Protection" | "Discovery & Competitors" | "Google Hotel Ads" | "Retargeting";

export interface GlossaryEntry { label: string; industryTerm?: string; meaning: string; purpose?: string }

export const glossary: Record<GlossaryKey, GlossaryEntry> = {
  bookings: { label: "Direct bookings from Autumn", industryTerm: "attributed bookings", meaning: "Stays booked on your own website after a guest saw or clicked an ad Autumn ran for you." },
  booking_value: { label: "Booking value", meaning: "The room revenue from those stays, before any fee." },
  autumn_fee: { label: "Autumn's fee", meaning: "Autumn pays for the ads and charges a percentage only on bookings it brought you. This is that amount for the period." },
  net_revenue: { label: "What you kept", meaning: "Booking value minus Autumn's fee. Money that stayed with the hotel." },
  avg_booking_value: { label: "Average booking", meaning: "Booking value divided by bookings. Higher in summer, when rates and stays are longer." },
  impressions: { label: "Saw your hotel", industryTerm: "impressions", meaning: "How many times your hotel appeared in Google search or Google Hotels because of Autumn's ads." },
  clicks: { label: "Clicked through", industryTerm: "clicks", meaning: "How many of those people clicked the ad." },
  website_visits: { label: "Visited your site", industryTerm: "sessions from ads", meaning: "Visits to your website that came from an Autumn ad. A few clicks never finish loading, so this is slightly under clicks." },
  ctr: { label: "People who clicked", industryTerm: "click-through rate (CTR)", meaning: "Of everyone who saw the ad, how many clicked. Shown as '1 in N'." },
  conversion: { label: "Visitors who booked", industryTerm: "conversion rate (CVR)", meaning: "Of everyone who clicked, how many went on to book. Shown as '1 in N'." },
  cost_per_booking: { label: "Cost per booking", meaning: "Autumn's fee divided by the bookings it brought you. Compare it with what an OTA would have charged on the same stays." },
  ota_commission: { label: "Commission you avoided", industryTerm: "OTA commission", meaning: "What an online travel agency such as Booking.com or Expedia would typically have charged (about 18%) on the same bookings had they come through it instead." },
  new_visitors: { label: "New visitors", meaning: "People visiting your website for the first time, from any source, not only ads." },
  pages_per_session: { label: "Pages per visit", meaning: "How many pages a visitor looks at. More pages usually means more interest in rooms and rates." },
  campaign: { label: "Campaigns", meaning: "The kinds of ads Autumn runs for you. Each does a different job." },
  device: { label: "Devices", meaning: "Whether guests found you on a phone, a computer or a tablet." },
  feeder_market: { label: "Where guests come from", industryTerm: "feeder markets", meaning: "The cities guests were in when they searched and booked." },
  "Brand Protection": { label: "Brand protection", meaning: "Ads on searches for your hotel's own name.", purpose: "Keeps you first when guests search your name, so OTAs don't take a booking that was already yours." },
  "Discovery & Competitors": { label: "Discovery", industryTerm: "non-brand search", meaning: "Ads on searches like 'South Haven inn' or 'Lake Michigan B&B'.", purpose: "Reaches travellers who don't know you yet." },
  "Google Hotel Ads": { label: "Google Hotel Ads", meaning: "Your direct rate shown next to OTA prices on Google Hotels.", purpose: "Wins the comparison so guests book with you, not them." },
  Retargeting: { label: "Reminders", industryTerm: "retargeting", meaning: "Ads shown to people who visited your site but didn't book.", purpose: "Brings back guests who were already interested." },
};

export const isGlossaryKey = (k: string): k is GlossaryKey => k in glossary;
/** Label for any breakdown value; campaign names have plain-language entries, others (devices, cities) are already plain. */
export const valueLabel = (value: string) => (isGlossaryKey(value) ? glossary[value].label : value);
