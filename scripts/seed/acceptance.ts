export interface Acceptance { days: number; from: string; to: string; dailyRows: number; breakdownRows: number; bookings: number; bookingValue: number }
/** A line a partial or wrong seed could not produce. db:seed prints it from the generator; db:verify re-derives it from the database. */
export const acceptanceLine = (a: Acceptance) =>
  `Seeded ${a.days} days ${a.from}..${a.to}: ${a.dailyRows} daily rows, ${a.breakdownRows} breakdown rows, ${a.bookings} bookings, $${a.bookingValue.toFixed(2)} booking value`;
