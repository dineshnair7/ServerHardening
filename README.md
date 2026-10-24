# Windows Server hardening change planner

A browser-based planner that drafts a change plan and ServiceNow change text from entered findings. It does not change server settings or create ServiceNow records.

## Deploy

1. Create a dedicated Supabase project and run the SQL in `supabase/migrations/20261024062942_create_plans.sql`.
2. Put the project's URL and **publishable** key in `src/supabase-config.js`. Never use a secret or service role key in browser code.
3. In Supabase Auth URL Configuration, set the Site URL to the deployed Vercel origin and add the planner page URL as an allowed redirect URL. Email confirmation is enabled by default on hosted projects.
4. Run `npm ci` and `npm run build`.
5. Deploy `dist/` to Vercel, or configure a Vercel project with build command `npm run build` and output directory `dist`.

The database enables row level security. Signed-in users can read and change only their own saved plans. The public site remains usable for drafting without sign-in; only cloud saving requires an account.
