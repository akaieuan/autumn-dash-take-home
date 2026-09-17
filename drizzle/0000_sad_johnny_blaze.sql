CREATE TABLE "breakdowns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"dimension" text NOT NULL,
	"dimension_value" text NOT NULL,
	"impressions" integer NOT NULL,
	"clicks" integer NOT NULL,
	"bookings" integer NOT NULL,
	"booking_value" numeric(10, 2) NOT NULL,
	CONSTRAINT "breakdowns_dimension_check" CHECK ("breakdowns"."dimension" in ('campaign', 'device', 'feeder_market'))
);
--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"date" date PRIMARY KEY NOT NULL,
	"impressions" integer NOT NULL,
	"clicks" integer NOT NULL,
	"website_visits" integer NOT NULL,
	"bookings" integer NOT NULL,
	"booking_value" numeric(10, 2) NOT NULL,
	"new_visitors" integer NOT NULL,
	"pages_per_session" numeric(4, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "breakdowns" ADD CONSTRAINT "breakdowns_date_daily_metrics_date_fk" FOREIGN KEY ("date") REFERENCES "public"."daily_metrics"("date") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_breakdowns_date_dimension" ON "breakdowns" USING btree ("date","dimension");