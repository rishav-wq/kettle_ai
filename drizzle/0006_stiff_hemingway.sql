CREATE TYPE "public"."sms_status" AS ENUM('queued', 'delivered', 'failed', 'unknown');--> statement-breakpoint
CREATE TABLE "sms_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_message_id" text,
	"phone" text NOT NULL,
	"purpose" text DEFAULT 'otp' NOT NULL,
	"status" "sms_status" DEFAULT 'queued' NOT NULL,
	"provider_status" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reported_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "sms_deliveries_message_idx" ON "sms_deliveries" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "sms_deliveries_sent_idx" ON "sms_deliveries" USING btree ("sent_at");