ALTER TABLE "daily_metrics" ADD COLUMN "site_sessions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD COLUMN "pageviews" integer DEFAULT 0 NOT NULL;