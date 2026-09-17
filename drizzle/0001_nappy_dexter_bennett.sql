CREATE TABLE "campaign_events" (
	"id" integer PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"campaign_name" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"note" text NOT NULL,
	CONSTRAINT "campaign_events_kind_check" CHECK ("campaign_events"."kind" in ('launched', 'budget_change', 'copy_refresh', 'bid_change', 'seasonal_push'))
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"name" text PRIMARY KEY NOT NULL,
	"objective" text NOT NULL,
	"focus" text NOT NULL,
	"launched_on" date NOT NULL,
	"status" text NOT NULL,
	"monthly_budget" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "breakdowns" ADD COLUMN "spend" numeric(10, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN "spend" numeric(10, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_campaign_name_campaigns_name_fk" FOREIGN KEY ("campaign_name") REFERENCES "public"."campaigns"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_campaign_events_date" ON "campaign_events" USING btree ("date");