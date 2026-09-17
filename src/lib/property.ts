/**
 * Product constants that are the owner's to change (docs/decisions.md D6, D8).
 * There is no properties table in the two-table schema, so these live here.
 * `tests/property.test.ts` keeps this equal to the seed's own copy in
 * `scripts/seed/profile.ts`, so copy and fee always agree with the data.
 */
export const PROPERTY = {
  name: "Harbor House Inn",
  city: "South Haven",
  region: "Michigan",
  roomCount: 22,
  /** Autumn charges a percentage only on bookings it brought. 1500 bps = 15%. */
  feeRateBps: 1500,
} as const;

/** What an online travel agency would typically have charged on the same stay. */
export const OTA_COMMISSION_RATE = 0.18;
