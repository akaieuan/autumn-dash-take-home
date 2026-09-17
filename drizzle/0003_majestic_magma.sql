ALTER TABLE "breakdowns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "idx_campaign_events_campaign" ON "campaign_events" USING btree ("campaign_name");