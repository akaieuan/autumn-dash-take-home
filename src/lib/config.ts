/**
 * Product constants that are the owner's to change (docs/decisions.md D6, D8).
 * There is no properties table in the two-table schema, so these live here.
 */
export const PROPERTY = {
  name: "Harbor House Inn",
  city: "South Haven",
  region: "Michigan",
  roomCount: 22,
} as const;

/** Autumn charges a percentage only on bookings it brought. 1500 bps = 15%. */
export const FEE_RATE_BPS = 1500;

/** What an online travel agency would typically have charged on the same stay. */
export const OTA_COMMISSION_RATE = 0.18;
