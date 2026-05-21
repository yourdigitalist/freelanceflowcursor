-- Client portal: per-client settings and unguessable access token
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_token uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_sections jsonb NOT NULL DEFAULT '{
    "details": true,
    "invoices": true,
    "proposals": true,
    "contracts": true,
    "approvals": true,
    "time": false,
    "time_visibility": "both"
  }'::jsonb;

COMMENT ON COLUMN public.clients.portal_enabled IS 'When true, client can access /portal/:portal_token';
COMMENT ON COLUMN public.clients.portal_token IS 'Secret token for client portal URL; generated when portal is first enabled';
COMMENT ON COLUMN public.clients.portal_sections IS 'Which sections to show and time_visibility: billable | non_billable | both';

CREATE UNIQUE INDEX IF NOT EXISTS clients_portal_token_idx
  ON public.clients (portal_token)
  WHERE portal_token IS NOT NULL;
