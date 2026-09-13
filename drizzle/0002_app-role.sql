-- The application role. Every tenant transaction runs as this role (see
-- src/lib/db/tenant.ts), so row-level security applies whether the connection
-- owner is Neon's project role or PGlite's local superuser. It can log in
-- nowhere and owns nothing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kettle_app') THEN
    CREATE ROLE kettle_app NOLOGIN NOINHERIT;
  END IF;
END
$$;--> statement-breakpoint
-- Let the connecting role switch into it.
GRANT kettle_app TO CURRENT_USER;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO kettle_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kettle_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kettle_app;--> statement-breakpoint
-- Tables created by later migrations get the same grants automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kettle_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kettle_app;
