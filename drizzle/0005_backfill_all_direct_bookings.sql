-- Existing days predate the column: until the seed is rerun, treat every direct booking on record as Autumn's,
-- so the check constraint added in the next migration holds on a live table. The seed overwrites this.
UPDATE "daily_metrics" SET "all_direct_bookings" = "bookings" WHERE "all_direct_bookings" < "bookings";
