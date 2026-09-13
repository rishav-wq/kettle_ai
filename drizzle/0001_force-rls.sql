-- Row-level security normally exempts the table owner. Our app connects as the
-- owner (Neon's default role, and PGlite locally), so without FORCE the policies
-- in 0000_init.sql would never apply. With FORCE they apply to everyone, and a
-- query that forgets set_config('app.tenant_id') sees zero rows instead of all.
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_members" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "progress" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "free_watch_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral_codes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "courses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- The public tenant must exist before any user row can reference it.
INSERT INTO "tenants" ("id", "name", "type") VALUES ('public', 'Kettle', 'individual') ON CONFLICT DO NOTHING;
